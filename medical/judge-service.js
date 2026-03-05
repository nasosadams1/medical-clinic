import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import crypto from "crypto";
import { JudgeService } from "./services/judge.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || process.env.JUDGE_SERVICE_PORT || 7000);
const SHARED_SECRET = process.env.JUDGE_SHARED_SECRET || "";
const CLOCK_SKEW_MS = Number(process.env.JUDGE_MAX_CLOCK_SKEW_MS || 5 * 60 * 1000);
const MAX_INFLIGHT = Math.max(1, Number(process.env.JUDGE_MAX_CONCURRENCY || 4));
const BODY_LIMIT = process.env.JUDGE_BODY_LIMIT || "300kb";
const RATE_WINDOW_MS = Number(process.env.JUDGE_RATE_WINDOW_MS || 60_000);
const RATE_MAX = Number(process.env.JUDGE_RATE_MAX || 120);

if (!SHARED_SECRET) {
  console.error("JUDGE_SHARED_SECRET is required");
  process.exit(1);
}

const judgeService = new JudgeService();
let inFlight = 0;

function hmacHex(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a, b) {
  const ab = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function rawBodySaver(req, _res, buf) {
  req.rawBody = buf?.toString("utf8") || "";
}

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: BODY_LIMIT, verify: rawBodySaver }));
app.use(
  rateLimit({
    windowMs: RATE_WINDOW_MS,
    max: RATE_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "judge-service",
    inFlight,
    maxInFlight: MAX_INFLIGHT,
    timestamp: new Date().toISOString(),
  });
});

app.post("/v1/judge/execute", async (req, res) => {
  const ts = req.header("x-timestamp") || "";
  const sig = req.header("x-signature") || "";
  const now = Date.now();
  const tsMs = Number(ts);

  if (!Number.isFinite(tsMs)) {
    return res.status(401).json({ error: "Missing or invalid x-timestamp" });
  }
  if (Math.abs(now - tsMs) > CLOCK_SKEW_MS) {
    return res.status(401).json({ error: "Timestamp outside allowed skew window" });
  }

  const rawBody = req.rawBody || "";
  const expectedSig = hmacHex(SHARED_SECRET, `${ts}.${rawBody}`);
  if (!safeEqualHex(sig, expectedSig)) {
    return res.status(401).json({ error: "Invalid request signature" });
  }

  if (inFlight >= MAX_INFLIGHT) {
    return res.status(503).json({ error: "Judge is at capacity, retry shortly" });
  }

  const { code, language, testCases } = req.body || {};
  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Missing code" });
  }
  if (typeof language !== "string" || !language.trim()) {
    return res.status(400).json({ error: "Missing language" });
  }
  if (!Array.isArray(testCases) || !testCases.length) {
    return res.status(400).json({ error: "Missing testCases" });
  }

  inFlight += 1;
  try {
    const out = await judgeService.executeCode(code, language, testCases);
    return res.json(out);
  } catch (err) {
    console.error("judge execution failed:", err);
    return res.status(500).json({ error: err?.message || "Judge execution failed" });
  } finally {
    inFlight -= 1;
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`judge-service listening on ${PORT}`);
});
