import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { MatchmakingService } from "./services/matchmaking.js";
import { JudgeService } from "./services/judge.js";
import { RemoteJudgeService } from "./services/remote-judge-service.js";
import { Judge0Service } from "./services/judge0-service.js";
import { MatchController } from "./services/match-controller.js";
import { EloRatingService } from "./services/elo-rating.js";
import { SharedDuelStateStore } from "./services/shared-duel-state.js";
import { getBlockingSanction, formatSanctionMessage } from "./services/sanctions.js";
import { createFeedbackRouter } from "./services/feedback/routes.js";
import { createLegalRouter } from "./services/legal/routes.js";
import { createDuelAdminRouter } from "./services/duel-admin/routes.js";
import { createDuelProblemAdminRouter } from "./services/duel-problems/routes.js";
import { createProgressionRouter } from "./services/progression/routes.js";
import { createBenchmarkRouter } from "./services/benchmark/routes.js";
import { createTeamsRouter } from "./services/teams/routes.js";
import { createAnalyticsRouter } from "./services/analytics/routes.js";
import { createLeadsRouter } from "./services/leads/routes.js";
import { createBillingRouter } from "./services/billing/routes.js";
import { createActivityRouter } from "./services/activity/routes.js";
import {
  formatAllowedOriginsError,
  getDevAllowedOrigins,
  isAllowedOriginForRequest,
  isLocalhostOrigin,
  resolveAllowedOrigins,
} from "./services/allowed-origins.js";

dotenv.config();

const NODE_ENV = (process.env.NODE_ENV || "development").toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";
const IS_RENDER = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID);
const ALLOW_INSECURE_LOCAL_JUDGE = process.env.ALLOW_INSECURE_LOCAL_JUDGE === "1";
const HAS_EXPLICIT_BROWSER_ORIGIN_CONFIG = ["DUEL_ALLOWED_ORIGINS", "API_ALLOWED_ORIGINS", "FRONTEND_URL"].some(
  (envKey) => String(process.env[envKey] || "").trim()
);
const ALLOW_RENDER_BROWSER_ORIGIN_FALLBACK =
  IS_RENDER && IS_PRODUCTION && !HAS_EXPLICIT_BROWSER_ORIGIN_CONFIG;
const ALLOW_LOCALHOST_DEV_ORIGINS =
  (process.env.ALLOW_LOCALHOST_DEV_ORIGINS || "").trim() === ""
    ? true
    : process.env.ALLOW_LOCALHOST_DEV_ORIGINS === "1";

const DUEL_ALLOWED_ORIGIN_ENV_KEYS = ["DUEL_ALLOWED_ORIGINS", "API_ALLOWED_ORIGINS", "FRONTEND_URL", "RENDER_EXTERNAL_URL"];
const { origins: allowedOrigins, sourceEnv: allowedOriginsSourceEnv } = resolveAllowedOrigins(DUEL_ALLOWED_ORIGIN_ENV_KEYS, {
  isProduction: IS_PRODUCTION,
});

const isRenderBrowserOriginFallbackAllowed = (origin) =>
  ALLOW_RENDER_BROWSER_ORIGIN_FALLBACK &&
  typeof origin === "string" &&
  /^https:\/\/[^/]+$/i.test(origin.trim());

const isLocalhostDevOriginAllowed = (origin) =>
  ALLOW_LOCALHOST_DEV_ORIGINS &&
  isLocalhostOrigin(origin) &&
  getDevAllowedOrigins().some((allowedOrigin) => allowedOrigin === String(origin).trim().replace(/\/+$/, ""));

const isOriginAllowed = (origin, req) =>
  isAllowedOriginForRequest(origin, allowedOrigins, IS_PRODUCTION, req) ||
  isRenderBrowserOriginFallbackAllowed(origin) ||
  isLocalhostDevOriginAllowed(origin);

const corsOptionsDelegate = (req, callback) => {
  callback(null, {
    origin(origin, originCallback) {
      if (isOriginAllowed(origin, req)) {
        originCallback(null, true);
        return;
      }
      originCallback(new Error("Origin not allowed by duel server CORS"));
    },
    credentials: true,
  });
};

const app = express();
app.set("trust proxy", 1);
app.use(cors(corsOptionsDelegate));
app.use(express.json({ limit: process.env.API_JSON_LIMIT || "20mb" }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowRequest(req, callback) {
    if (isOriginAllowed(req.headers?.origin, req)) {
      callback(null, true);
      return;
    }
    callback("Origin not allowed by duel server CORS", false);
  },
});

const PORT = Number(process.env.PORT || process.env.DUEL_SERVER_PORT || 5000);
const SERVER_INSTANCE_ID = process.env.DUEL_SERVER_INSTANCE_ID || `duel-${process.pid}-${randomUUID().slice(0, 8)}`;

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
if (IS_PRODUCTION && allowedOrigins.length === 0) {
  console.error(formatAllowedOriginsError("Duel server", DUEL_ALLOWED_ORIGIN_ENV_KEYS));
  process.exit(1);
}
if (IS_PRODUCTION && JUDGE_PROVIDER === "local" && !ALLOW_INSECURE_LOCAL_JUDGE) {
  if (IS_RENDER) {
    console.warn(
      "Starting duel-server on Render with the insecure local judge because no external judge was configured. Set JUDGE_PROVIDER=remote or JUDGE_PROVIDER=judge0 for production isolation."
    );
  } else {
    console.error(
      "Refusing to start duel-server in production with the insecure local judge. Use JUDGE_PROVIDER=remote or JUDGE_PROVIDER=judge0."
    );
    process.exit(1);
  }
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

if (allowedOrigins.length > 0) {
  console.log(`Duel server CORS origins loaded from ${allowedOriginsSourceEnv}: ${allowedOrigins.join(", ")}`);
}
if (ALLOW_RENDER_BROWSER_ORIGIN_FALLBACK) {
  console.warn(
    "Duel server is allowing HTTPS browser origins because only Render self-origin config was detected. Set DUEL_ALLOWED_ORIGINS or FRONTEND_URL to lock this down."
  );
}
if (ALLOW_LOCALHOST_DEV_ORIGINS) {
  console.log(`Duel server localhost dev origins enabled: ${getDevAllowedOrigins().join(", ")}`);
}

const eloRatingService = new EloRatingService();
const duelStateStore = SharedDuelStateStore.isEnabled(supabase) ? new SharedDuelStateStore(supabase, SERVER_INSTANCE_ID) : null;
const matchController = supabase ? new MatchController(supabase, io, judgeService, eloRatingService, duelStateStore) : null;
const matchmakingService = supabase ? new MatchmakingService(supabase, io, matchController, duelStateStore) : null;
const RUNTIME_LEASE_HEARTBEAT_MS = 5_000;
const connectedPlayers = new Map();
const latestSocketByUserId = new Map();

if (matchmakingService) {
  matchmakingService.getOnlinePlayerCount = () => latestSocketByUserId.size;
}

app.use("/api/feedback", createFeedbackRouter({ supabaseAdmin: supabase }));
app.use("/api/legal", createLegalRouter({ supabaseAdmin: supabase }));
app.use("/api/duel/admin", createDuelAdminRouter({ supabaseAdmin: supabase }));
app.use("/api/duel/problems", createDuelProblemAdminRouter({ supabaseAdmin: supabase }));
app.use("/api/progression", createProgressionRouter({ supabaseAdmin: supabase }));
app.use("/api/benchmark", createBenchmarkRouter({ supabaseAdmin: supabase, judgeService }));
app.use("/api/teams", createTeamsRouter({ supabaseAdmin: supabase }));
app.use("/api/analytics", createAnalyticsRouter({ supabaseAdmin: supabase }));
app.use("/api/leads", createLeadsRouter({ supabaseAdmin: supabase }));
app.use("/api/billing", createBillingRouter({ supabaseAdmin: supabase }));
app.use("/api/activity", createActivityRouter({ supabaseAdmin: supabase }));

function emitServerError(socket, message, details) {
  console.error("server_error:", message, details || "");
  socket.emit("server_error", { message, details });
}

function ackSafe(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

function emitUserRoomEvent(userId, event, payload) {
  if (!userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitDistributedUserEvent(userId, event, payload) {
  emitUserRoomEvent(userId, event, payload);
  void duelStateStore?.dispatchSocketEventToUser?.(userId, event, payload);
}

function createProxySocket(userId) {
  return {
    emit(event, payload) {
      emitDistributedUserEvent(userId, event, payload);
    },
  };
}

function isRuntimeLeaseExpired(runtimeMatch) {
  const leaseExpiresAt = Date.parse(runtimeMatch?.lease_expires_at || "");
  return Number.isFinite(leaseExpiresAt) && leaseExpiresAt <= Date.now();
}

async function clearStaleRuntimeOwnership(runtimeMatch) {
  if (!runtimeMatch?.match_id) return;
  await duelStateStore?.clearPresenceActiveMatch?.([runtimeMatch.player_a_user_id, runtimeMatch.player_b_user_id]);
  await duelStateStore?.removeRuntimeMatch?.(runtimeMatch.match_id);
}

async function forwardRuntimeAction(matchId, messageType, payload, userId = null) {
  const runtimeMatch = await duelStateStore?.getRuntimeMatch?.(matchId);
  if (!runtimeMatch) {
    return false;
  }
  if (isRuntimeLeaseExpired(runtimeMatch)) {
    await clearStaleRuntimeOwnership(runtimeMatch);
    return false;
  }
  if (!runtimeMatch.owner_instance_id || runtimeMatch.owner_instance_id === SERVER_INSTANCE_ID) {
    return false;
  }

  await duelStateStore.dispatchRuntimeMessage(runtimeMatch.owner_instance_id, messageType, payload, userId);
  return true;
}

async function notifyRemoteReconnect(userId) {
  const runtimeMatch = await duelStateStore?.getRuntimeMatchForUser?.(userId);
  if (!runtimeMatch) {
    return false;
  }
  if (isRuntimeLeaseExpired(runtimeMatch)) {
    await clearStaleRuntimeOwnership(runtimeMatch);
    return false;
  }
  if (!runtimeMatch.owner_instance_id || runtimeMatch.owner_instance_id === SERVER_INSTANCE_ID) {
    return false;
  }

  await duelStateStore.dispatchRuntimeMessage(
    runtimeMatch.owner_instance_id,
    "player_reconnect",
    { userId, matchId: runtimeMatch.match_id },
    userId
  );
  return true;
}

async function notifyRemoteDisconnect(userId) {
  const runtimeMatch = await duelStateStore?.getRuntimeMatchForUser?.(userId);
  if (!runtimeMatch) {
    return false;
  }
  if (isRuntimeLeaseExpired(runtimeMatch)) {
    await clearStaleRuntimeOwnership(runtimeMatch);
    return false;
  }
  if (!runtimeMatch.owner_instance_id || runtimeMatch.owner_instance_id === SERVER_INSTANCE_ID) {
    return false;
  }

  await duelStateStore.dispatchRuntimeMessage(
    runtimeMatch.owner_instance_id,
    "player_disconnect",
    { userId, matchId: runtimeMatch.match_id },
    userId
  );
  return true;
}

async function consumeRuntimeMessages() {
  if (!duelStateStore || !matchController) return;
  const messages = await duelStateStore.consumeRuntimeMessages(100);

  for (const message of messages) {
    let shouldAcknowledge = false;

    try {
      const payload = message.payload || {};
      switch (message.message_type) {
        case "socket_event":
          emitUserRoomEvent(payload.userId || message.target_user_id, payload.event, payload.payload);
          shouldAcknowledge = true;
          break;
        case "submit_code":
          await matchController.handleSubmission(payload.matchId, payload.userId, payload.language, payload.code, createProxySocket(payload.userId));
          shouldAcknowledge = true;
          break;
        case "code_snapshot":
          await matchController.recordCodeSnapshot(payload.matchId, payload.userId, payload.code);
          shouldAcknowledge = true;
          break;
        case "editor_telemetry":
          await matchController.recordEditorTelemetry(payload.matchId, payload.userId, payload.telemetry, payload.sessionEvidence || null);
          shouldAcknowledge = true;
          break;
        case "player_disconnect":
          await matchController.handlePlayerDisconnectLifecycle(payload.userId);
          shouldAcknowledge = true;
          break;
        case "player_reconnect":
          matchController.handlePlayerReconnect(payload.userId);
          shouldAcknowledge = true;
          break;
        default:
          console.warn("Unknown duel runtime message type:", message.message_type);
          shouldAcknowledge = true;
          break;
      }
    } catch (error) {
      console.error("Duel runtime message processing error:", error);
    }

    if (shouldAcknowledge) {
      await duelStateStore.markRuntimeMessageDelivered(message.id);
    }
  }
}

if (duelStateStore) {
  setInterval(() => {
    consumeRuntimeMessages().catch((error) => console.error("consumeRuntimeMessages error:", error));
  }, 250);

  setInterval(() => {
    matchController?.syncRuntimeLeases?.().catch((error) => console.error("syncRuntimeLeases error:", error));
  }, RUNTIME_LEASE_HEARTBEAT_MS);
}

function isLatestSocketForUser(userId, socketId) {
  return !!userId && latestSocketByUserId.get(userId) === socketId;
}

function getSocketIpAddress(socket) {
  const forwardedFor = socket?.handshake?.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return (
      forwardedFor
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)[0] || null
    );
  }

  return socket?.handshake?.address || socket?.conn?.remoteAddress || null;
}

function sanitizeClientMeta(rawClientMeta) {
  const clientMeta = rawClientMeta && typeof rawClientMeta === "object" ? rawClientMeta : {};
  const toSafeString = (value, maxLength) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : null;
  const toSafeDimension = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.min(Math.floor(parsed), 10000);
  };
  const toSafeInteger = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
  };

  return {
    deviceClusterId: toSafeString(clientMeta.deviceClusterId, 128),
    timezone: toSafeString(clientMeta.timezone, 64),
    platform: toSafeString(clientMeta.platform, 64),
    language: toSafeString(clientMeta.language, 32),
    origin: toSafeString(clientMeta.origin, 200),
    hardwareConcurrency: toSafeInteger(clientMeta.hardwareConcurrency, 1, 256),
    screen:
      clientMeta.screen && typeof clientMeta.screen === "object"
        ? {
            width: toSafeDimension(clientMeta.screen.width),
            height: toSafeDimension(clientMeta.screen.height),
          }
        : null,
    viewport:
      clientMeta.viewport && typeof clientMeta.viewport === "object"
        ? {
            width: toSafeDimension(clientMeta.viewport.width),
            height: toSafeDimension(clientMeta.viewport.height),
          }
        : null,
  };
}

function buildSessionEvidence(socket, rawClientMeta) {
  const clientMeta = sanitizeClientMeta(rawClientMeta);
  return {
    socketId: socket.id,
    connectedAt: new Date().toISOString(),
    ipAddress: getSocketIpAddress(socket),
    userAgent:
      typeof socket?.handshake?.headers?.["user-agent"] === "string"
        ? socket.handshake.headers["user-agent"].trim().slice(0, 512)
        : null,
    transport:
      typeof socket?.conn?.transport?.name === "string"
        ? socket.conn.transport.name
        : null,
    deviceClusterId: clientMeta.deviceClusterId,
    clientMeta,
  };
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
  socket.emit("server_identity", { name: "duel-server", port: PORT, instanceId: SERVER_INSTANCE_ID });

  socket.on("register_player", async (data, ack) => {
    console.log("register_player received", {
      userId: data?.userId,
      username: data?.username,
      hasAccessToken: !!data?.accessToken,
    });

    try {
      if (!supabase) {
        const msg = "Server not configured (missing Supabase env vars)";
        ackSafe(ack, { ok: false, message: msg });
        emitServerError(socket, msg, "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
        return;
      }

      const { userId, username, accessToken, clientMeta: rawClientMeta } = data || {};
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

      const duelSanction = await getBlockingSanction(supabase, userId, ["duels"]);
      if (duelSanction) {
        const msg = formatSanctionMessage(duelSanction, "Duel access is temporarily restricted.");
        ackSafe(ack, { ok: false, message: msg });
        emitServerError(socket, "Duel access restricted", msg);
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
      const sessionEvidence = buildSessionEvidence(socket, rawClientMeta);
      const connectionRiskFlags = [];
      if (!sessionEvidence.deviceClusterId) {
        connectionRiskFlags.push("missing_device_cluster");
      }
      if (!sessionEvidence.clientMeta?.timezone) {
        connectionRiskFlags.push("missing_timezone");
      }
      const hasSharedDeviceCluster = Array.from(connectedPlayers.values()).some((entry) => {
        if (!entry || entry.userId === duelUser.id) return false;
        return !!sessionEvidence.deviceClusterId && entry.sessionEvidence?.deviceClusterId === sessionEvidence.deviceClusterId;
      });
      if (hasSharedDeviceCluster) {
        connectionRiskFlags.push("shared_device_cluster_live");
      }
      const hasSharedIp = Array.from(connectedPlayers.values()).some((entry) => {
        if (!entry || entry.userId === duelUser.id) return false;
        return !!sessionEvidence.ipAddress && entry.sessionEvidence?.ipAddress === sessionEvidence.ipAddress;
      });
      if (hasSharedIp) {
        connectionRiskFlags.push("shared_ip_live");
      }
      const existingOwnerSocketId = latestSocketByUserId.get(duelUser.id);

      if (existingOwnerSocketId === socket.id && connectedPlayers.has(socket.id)) {
        connectedPlayers.set(socket.id, {
          ...connectedPlayers.get(socket.id),
          userId: duelUser.id,
          username: safeUsername,
          rating: safeRating,
          socketId: socket.id,
          sessionEvidence,
          connectionRiskFlags,
        });
        socket.userId = duelUser.id;
        socket.sessionEvidence = sessionEvidence;
        socket.join(`user:${duelUser.id}`);
        await duelStateStore?.upsertPresence?.({
          userId: duelUser.id,
          username: safeUsername,
          rating: safeRating,
          socketId: socket.id,
          matchType: connectedPlayers.get(socket.id)?.matchType || "ranked",
          sessionEvidence,
          connectionRiskFlags,
        });
        matchController?.handlePlayerReconnect?.(duelUser.id);
        await notifyRemoteReconnect(duelUser.id);
        ackSafe(ack, { ok: true, rating: safeRating, username: safeUsername });
        return;
      }

      if (matchmakingService) {
        await matchmakingService.removeFromQueue(duelUser.id);
      }

      for (const [existingSocketId, existingPlayer] of connectedPlayers.entries()) {
        if (existingPlayer.userId !== duelUser.id || existingSocketId === socket.id) continue;
        connectedPlayers.delete(existingSocketId);
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) oldSocket.disconnect(true);
      }

      connectedPlayers.set(socket.id, {
        userId: duelUser.id,
        username: safeUsername,
        rating: safeRating,
        socketId: socket.id,
        sessionEvidence,
        connectionRiskFlags,
      });
      latestSocketByUserId.set(duelUser.id, socket.id);

      socket.userId = duelUser.id;
      socket.sessionEvidence = sessionEvidence;
      socket.join(`user:${duelUser.id}`);
      await duelStateStore?.upsertPresence?.({
        userId: duelUser.id,
        username: safeUsername,
        rating: safeRating,
        socketId: socket.id,
        matchType: "ranked",
        sessionEvidence,
        connectionRiskFlags,
      });
      matchController?.handlePlayerReconnect?.(duelUser.id);
      await notifyRemoteReconnect(duelUser.id);

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
      if (!isLatestSocketForUser(player.userId, socket.id)) {
        emitServerError(socket, "Stale duel connection", "A newer connection for this user is already active.");
        return;
      }

      player.matchType = data?.matchType || "ranked";
      await duelStateStore?.upsertPresence?.({ ...player, socketId: socket.id, matchType: player.matchType });
      if (await matchmakingService.isQueued(player.userId, player.matchType)) {
        socket.emit("queue_joined", { message: "Already searching for an opponent.", status: "searching" });
        return;
      }
      socket.emit("queue_joined", { message: "Searching for opponent...", status: "searching" });
      await matchmakingService.addToQueue(player);
    } catch (err) {
      console.error("Matchmaking error:", err);
      emitServerError(socket, "Failed to join matchmaking", err?.message);
    }
  });

  socket.on("leave_matchmaking", async () => {
    try {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;
      if (!isLatestSocketForUser(player.userId, socket.id)) return;

      if (matchmakingService) await matchmakingService.removeFromQueue(player.userId);
      await duelStateStore?.upsertPresence?.({ ...player, socketId: socket.id, matchType: player.matchType || "ranked" });
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
      if (!isLatestSocketForUser(userId, socket.id)) throw new Error("Stale duel connection");

      const matchId = (data?.matchId ?? "").toString();
      const language = (data?.language ?? "").toString();
      const code = (data?.code ?? "").toString();

      if (!matchId) throw new Error("Missing matchId");
      if (!language) throw new Error("Missing language");
      if (!code.trim()) throw new Error("Empty code submission");
      if (code.length > 100_000) throw new Error("Code too large (max 100k chars)");

      const handledRemotely = await forwardRuntimeAction(matchId, "submit_code", { matchId, userId, language, code }, userId);
      if (handledRemotely) {
        return;
      }

      await matchController.handleSubmission(matchId, userId, language, code, socket);
    } catch (err) {
      console.error("Submission error:", err);
      socket.emit("submission_error", { message: err?.message || "Submission error" });
    }
  });

  socket.on("code_snapshot", async (data) => {
    try {
      if (!matchController) return;
      const userId = socket.userId;
      if (!userId) return;
      if (!isLatestSocketForUser(userId, socket.id)) return;

      const handledRemotely = await forwardRuntimeAction(data?.matchId, "code_snapshot", { matchId: data?.matchId, userId, code: data?.code }, userId);
      if (handledRemotely) {
        return;
      }

      const result = await matchController.recordCodeSnapshot(data?.matchId, userId, data?.code);
      if (!result?.ok && result?.reason && result.reason !== "unchanged" && result.reason !== "inactive_match") {
        console.warn("Snapshot rejected", { userId, matchId: data?.matchId, reason: result.reason });
      }
    } catch (err) {
      console.error("Snapshot error:", err);
    }
  });

  socket.on("editor_telemetry", async (data) => {
    try {
      if (!matchController) return;
      const userId = socket.userId;
      if (!userId) return;
      if (!isLatestSocketForUser(userId, socket.id)) return;

      const handledRemotely = await forwardRuntimeAction(
        data?.matchId,
        "editor_telemetry",
        { matchId: data?.matchId, userId, telemetry: data?.telemetry, sessionEvidence: socket.sessionEvidence || null },
        userId
      );
      if (handledRemotely) {
        return;
      }

      const result = await matchController.recordEditorTelemetry(
        data?.matchId,
        userId,
        data?.telemetry,
        socket.sessionEvidence || null
      );
      if (!result?.ok && result?.reason && result.reason !== "inactive_match") {
        console.warn("Editor telemetry rejected", { userId, matchId: data?.matchId, reason: result.reason });
      }
    } catch (err) {
      console.error("Editor telemetry error:", err);
    }
  });

  socket.on("disconnect", async () => {
    try {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      connectedPlayers.delete(socket.id);
      if (isLatestSocketForUser(player.userId, socket.id)) {
        latestSocketByUserId.delete(player.userId);
      }

      const hasReplacementSocket = Array.from(connectedPlayers.values()).some((entry) => entry.userId === player.userId);
      if (hasReplacementSocket) {
        console.log(`Ignoring stale disconnect for ${player.username} (${player.userId})`);
        return;
      }

      if (matchmakingService) await matchmakingService.removeFromQueue(player.userId);
      await duelStateStore?.removePresence?.(player.userId);

      console.log(`Player disconnected: ${player.username} (${player.userId})`);

      if (!matchController) return;

      const handledLocal = await matchController.handlePlayerDisconnectLifecycle?.(player.userId);
      if (!handledLocal) {
        await notifyRemoteDisconnect(player.userId);
      }
    } catch (e) {
      console.error("Disconnect forfeit error:", e);
    }
  });
});

app.get("/", (_req, res) => res.status(200).send("duel-server ok"));
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Duel server running on port ${PORT} (${SERVER_INSTANCE_ID})`);
});
