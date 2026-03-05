// services/submission-validator.js
// Authoritative validation for 1v1 submissions (Supabase-backed)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(x) {
  return typeof x === "string" && UUID_RE.test(x);
}

function normalizeLang(language) {
  const l = (language ?? "").toString().trim().toLowerCase();
  if (l === "js") return "javascript";
  if (l === "py") return "python";
  return l;
}

// Very lightweight “payload hardening” (sandbox is the real security boundary)
function basicCodeHeuristics(code) {
  const s = (code ?? "").toString();
  const lowered = s.toLowerCase();

  // Don’t block normal code, just catch the obvious “oops / abuse”
  const forbidden = [
    "child_process",
    "process.env",
    "require('fs')",
    "require(\"fs\")",
    "import fs",
    "net.",
    "dgram",
    "worker_threads",
  ];

  for (const needle of forbidden) {
    if (lowered.includes(needle)) {
      return { ok: false, message: `Forbidden API usage detected: ${needle}` };
    }
  }
  return { ok: true };
}

export class SubmissionValidator {
  /**
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
    this.MAX_CODE_CHARS = 100_000;
    this.MIN_SUBMIT_INTERVAL_MS = 1200;
  }

  /**
   * Loads match + problem and validates:
   * - match exists and ACTIVE
   * - user is participant
   * - time remaining
   * - language supported
   */
  async validate({ matchId, userId, language, code, lastSubmitAtMs }) {
    if (!isUuid(matchId)) return { ok: false, message: "Invalid matchId" };
    if (!isUuid(userId)) return { ok: false, message: "Invalid userId" };

    const lang = normalizeLang(language);
    if (!["javascript", "python"].includes(lang)) {
      return { ok: false, message: `Unsupported language: ${language}` };
    }

    const src = (code ?? "").toString();
    if (!src.trim()) return { ok: false, message: "Empty code submission" };
    if (src.length > this.MAX_CODE_CHARS) {
      return { ok: false, message: `Code too large (max ${this.MAX_CODE_CHARS} chars)` };
    }

    const heur = basicCodeHeuristics(src);
    if (!heur.ok) return heur;

    // Rate limit (per-player, per-match – caller passes last timestamp)
    const now = Date.now();
    if (lastSubmitAtMs && now - lastSubmitAtMs < this.MIN_SUBMIT_INTERVAL_MS) {
      return { ok: false, message: "You're submitting too fast. Please wait a moment." };
    }

    // Load match
    const { data: match, error: matchErr } = await this.supabase
      .from("matches")
      .select("id, status, player_a_id, player_b_id, problem_id, started_at, created_at, match_type")
      .eq("id", matchId)
      .single();

    if (matchErr || !match) return { ok: false, message: "Match not found" };

    const status = (match.status ?? "").toString().toUpperCase();
    if (!["ACTIVE", "IN_PROGRESS"].includes(status)) {
      return { ok: false, message: `Match not active (status=${match.status})` };
    }

    const isParticipant = userId === match.player_a_id || userId === match.player_b_id;
    if (!isParticipant) return { ok: false, message: "User is not part of this match" };

    if (!match.problem_id) return { ok: false, message: "Match has no problem assigned" };

    // Load problem for time limit + supported langs
    const { data: problem, error: probErr } = await this.supabase
      .from("problems")
      .select("id, time_limit_seconds, supported_languages")
      .eq("id", match.problem_id)
      .single();

    if (probErr || !problem) return { ok: false, message: "Problem not found" };

    const supported = Array.isArray(problem.supported_languages)
      ? new Set(problem.supported_languages.map((x) => String(x).toLowerCase()))
      : new Set(["javascript", "python"]);

    if (!supported.has(lang)) {
      return { ok: false, message: `Language not supported for this problem: ${lang}` };
    }

    // Enforce match clock using started_at if available, else created_at
    const startIso = match.started_at ?? match.created_at;
    const startMs = startIso ? Date.parse(startIso) : NaN;

    const timeLimitSec = Math.max(5, Number(problem.time_limit_seconds ?? 900));
    const timeLimitMs = timeLimitSec * 1000;

    if (Number.isFinite(startMs)) {
      const elapsed = now - startMs;
      if (elapsed > timeLimitMs) {
        return { ok: false, message: "Match time has expired" };
      }
    }

    return {
      ok: true,
      lang,
      match,
      problem,
      timeLimitSec,
    };
  }
}