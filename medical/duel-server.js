import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { MatchmakingService } from "./services/matchmaking.js";
import { JudgeService } from "./services/judge.js";
import { RemoteJudgeService } from "./services/remote-judge-service.js";
import { Judge0Service } from "./services/judge0-service.js";
import { MatchController } from "./services/match-controller.js";
import { EloRatingService } from "./services/elo-rating.js";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = Number(process.env.PORT || process.env.DUEL_SERVER_PORT || 5000);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const JUDGE_PROVIDER = (process.env.JUDGE_PROVIDER || "local").toLowerCase();
const JUDGE_URL = process.env.JUDGE_URL;
const JUDGE_SHARED_SECRET = process.env.JUDGE_SHARED_SECRET;
const JUDGE_TIMEOUT_MS = Number(process.env.JUDGE_TIMEOUT_MS || 25_000);
const JUDGE0_URL = process.env.JUDGE0_URL;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST;


if (JUDGE_PROVIDER === "remote" && JUDGE_URL && !JUDGE_SHARED_SECRET) {
  console.error("JUDGE_SHARED_SECRET is required when JUDGE_PROVIDER=remote and JUDGE_URL is set");
  process.exit(1);
}
if (JUDGE_PROVIDER === "judge0" && !JUDGE0_URL) {
  console.error("JUDGE0_URL is required when JUDGE_PROVIDER=judge0");
  process.exit(1);
}

let supabase = null;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase server env not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log("Supabase client initialized");
}

let judgeService;
if (JUDGE_PROVIDER === "remote") {
  judgeService = new RemoteJudgeService({
    baseUrl: JUDGE_URL,
    sharedSecret: JUDGE_SHARED_SECRET,
    timeoutMs: JUDGE_TIMEOUT_MS,
  });
  console.log("Using remote HMAC judge:", JUDGE_URL);
} else if (JUDGE_PROVIDER === "judge0") {
  judgeService = new Judge0Service({
    baseUrl: JUDGE0_URL,
    apiKey: JUDGE0_API_KEY,
    apiHost: JUDGE0_API_HOST,
    timeoutMs: JUDGE_TIMEOUT_MS,
  });
  console.log("Using Judge0 API:", JUDGE0_URL);
} else {
  judgeService = new JudgeService();
  console.log("Using local judge service");
}

const eloRatingService = new EloRatingService();

const matchController = supabase ? new MatchController(supabase, io, judgeService, eloRatingService) : null;
const matchmakingService = supabase ? new MatchmakingService(supabase, io, matchController) : null;

const connectedPlayers = new Map();

function emitServerError(socket, message, details) {
  console.error("server_error:", message, details || "");
  socket.emit("server_error", { message, details });
}

function ackSafe(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

async function authenticateSocketUser(accessToken, expectedUserId) {
  if (!supabase) {
    return { user: null, error: "Server authentication is unavailable." };
  }

  if (!accessToken) {
    return { user: null, error: "Missing session token." };
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { user: null, error: "Invalid or expired session token." };
  }

  if (expectedUserId && data.user.id !== expectedUserId) {
    return { user: null, error: "Authenticated user does not match requested player." };
  }

  return { user: data.user, error: null };
}

io.on("connection", (socket) => {
  console.log("duel-server connection:", socket.id);
  socket.emit("server_identity", { name: "duel-server", port: PORT });

  socket.on("register_player", async (data, ack) => {
    console.log("register_player received", data);

    try {
      if (!supabase) {
        const msg = "Server not configured (missing Supabase env vars)";
        ackSafe(ack, { ok: false, message: msg });
        emitServerError(socket, msg, "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
        return;
      }

      const { userId, username, accessToken } = data || {};
      if (!userId) {
        const msg = "Missing userId";
        ackSafe(ack, { ok: false, message: msg });
        emitServerError(socket, msg);
        return;
      }

      const withTimeout = (p, ms) =>
        Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("DB timeout")), ms))]);

      const { user: authUser, error: authError } = await authenticateSocketUser(accessToken, userId);
      if (authError || !authUser) {
        const msg = authError || "Authentication failed";
        ackSafe(ack, { ok: false, message: msg });
        emitServerError(socket, "Authentication failed", msg);
        return;
      }

      let duelUser = null;
      try {
        const { data: row, error } = await withTimeout(
          supabase.from("duel_users").select("id, username, rating").eq("id", userId).maybeSingle(),
          8000
        );
        if (error) throw error;
        duelUser = row;
      } catch (e) {
        const msg = e?.message || "Database error";
        ackSafe(ack, { ok: false, message: msg });
        emitServerError(socket, "Supabase error", msg);
        return;
      }

      if (!duelUser) {
        try {
          const normalizedUsername = String(
            username ||
            authUser.user_metadata?.display_name ||
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.username ||
            authUser.email?.split("@")[0] ||
            "Player"
          ).trim().slice(0, 16) || "Player";
          const insertPayload = { id: userId, username: normalizedUsername, rating: 500 };
          const { data: created, error: insertErr } = await supabase
            .from("duel_users")
            .insert(insertPayload)
            .select("id, username, rating")
            .single();

          if (insertErr) throw insertErr;
          duelUser = created;
        } catch (e) {
          const msg = e?.message || `Failed to create duel user for id ${userId}`;
          ackSafe(ack, { ok: false, message: msg });
          emitServerError(socket, "Failed to create user", msg);
          return;
        }
      }

      const safeUsername = duelUser.username || String(username || "").trim() || "Player";
      const safeRating = duelUser.rating ?? 500;

      connectedPlayers.set(socket.id, {
        userId: duelUser.id,
        username: safeUsername,
        rating: safeRating,
        socketId: socket.id,
      });

      socket.userId = duelUser.id;
      socket.join(`user:${duelUser.id}`);

      console.log(`Player registered: ${safeUsername} (${duelUser.id}) rating=${safeRating}`);
      ackSafe(ack, { ok: true, rating: safeRating, username: safeUsername });
    } catch (e) {
      console.error("register_player exception:", e);
      const msg = e?.message || "Failed to register player";
      ackSafe(ack, { ok: false, message: msg });
      emitServerError(socket, "Failed to register player", msg);
    }
  });

  socket.on("join_matchmaking", async (data) => {
    try {
      if (!matchmakingService || !matchController) {
        emitServerError(socket, "Server not configured (missing Supabase env vars)");
        return;
      }

      const player = connectedPlayers.get(socket.id);
      if (!player) {
        emitServerError(socket, "Player not registered", "Call register_player first");
        return;
      }

      player.matchType = data?.matchType || "ranked";
      socket.emit("queue_joined", { message: "Searching for opponent...", status: "searching" });
      await matchmakingService.addToQueue(player);
    } catch (err) {
      console.error("Matchmaking error:", err);
      emitServerError(socket, "Failed to join matchmaking", err?.message);
    }
  });

  socket.on("leave_matchmaking", () => {
    try {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      if (matchmakingService) matchmakingService.removeFromQueue(player.userId);
      socket.emit("queue_left", { message: "Left matchmaking queue" });
    } catch (e) {
      emitServerError(socket, "Failed to leave matchmaking", e?.message);
    }
  });

  socket.on("submit_code", async (data) => {
    try {
      if (!matchController) throw new Error("Server not configured");
      const userId = socket.userId;
      if (!userId) throw new Error("Not registered");

      const matchId = (data?.matchId ?? "").toString();
      const language = (data?.language ?? "").toString();
      const code = (data?.code ?? "").toString();

      if (!matchId) throw new Error("Missing matchId");
      if (!language) throw new Error("Missing language");
      if (!code.trim()) throw new Error("Empty code submission");
      if (code.length > 100_000) throw new Error("Code too large (max 100k chars)");

      await matchController.handleSubmission(matchId, userId, language, code, socket);
    } catch (err) {
      console.error("Submission error:", err);
      socket.emit("submission_error", { message: err?.message || "Submission error" });
    }
  });

  socket.on("code_snapshot", async (data) => {
    try {
      if (!supabase) return;
      const userId = socket.userId;
      if (!userId) return;

      await supabase.from("code_snapshots").insert({
        match_id: data.matchId,
        user_id: userId,
        code: data.code,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Snapshot error:", err);
    }
  });

  socket.on("disconnect", async () => {
    try {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      if (matchmakingService) matchmakingService.removeFromQueue(player.userId);

      connectedPlayers.delete(socket.id);
      console.log(`Player disconnected: ${player.username} (${player.userId})`);

      if (matchController) {
        await matchController.handlePlayerDisconnect(player.userId);
      }
    } catch (e) {
      console.error("Disconnect forfeit error:", e);
    }
  });
});

app.get("/", (_req, res) => res.status(200).send("duel-server ok"));
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Duel server running on port ${PORT}`);
});


