// services/duel-judge-handler.js
import { SubmissionValidator } from "./submission-validator.js";

export class DuelJudgeHandler {
  /**
   * @param {{
   *  supabase: import("@supabase/supabase-js").SupabaseClient,
   *  io: import("socket.io").Server,
   *  judgeService: any,
   *  matchController: any
   * }} deps
   */
  constructor({ supabase, io, judgeService, matchController }) {
    this.supabase = supabase;
    this.io = io;
    this.judgeService = judgeService;
    this.matchController = matchController;

    this.validator = new SubmissionValidator(supabase);

    // Per-match “soft lock” so two near-simultaneous submissions can’t race winner updates
    /** @type {Map<string, Promise<any>>} */
    this.matchLocks = new Map();
  }

  _withMatchLock(matchId, fn) {
    const prev = this.matchLocks.get(matchId) ?? Promise.resolve();
    const next = prev
      .catch(() => {}) // don’t break the chain
      .then(fn)
      .finally(() => {
        // cleanup if we’re still the tail
        if (this.matchLocks.get(matchId) === next) this.matchLocks.delete(matchId);
      });

    this.matchLocks.set(matchId, next);
    return next;
  }

  async handle({ matchId, userId, language, code, socket, lastSubmitAtMs }) {
    return this._withMatchLock(matchId, async () => {
      const v = await this.validator.validate({
        matchId,
        userId,
        language,
        code,
        lastSubmitAtMs,
      });

      if (!v.ok) {
        socket?.emit?.("submission_error", { message: v.message });
        return { ok: false, message: v.message };
      }

      socket?.emit?.("submission_running", { message: "Running tests..." });
      socket?.emit?.("submission_received", { message: "Running tests..." });

      // Load test cases (match-controller already has a loader, but this handler can be used standalone too)
      const testCases = await this._loadTestCases(v.match.problem_id);
      if (!Array.isArray(testCases) || testCases.length === 0) {
        socket?.emit?.("submission_error", { message: "This problem has no test cases configured." });
        return { ok: false, message: "No test cases configured" };
      }

      // Run judge
      const judgeResults = await this.judgeService.executeCode(code, v.lang, testCases);

      // Persist submission (best-effort)
      const submissionId = await this._saveSubmissionBestEffort({
        matchId,
        userId,
        code,
        language: v.lang,
        judgeResults,
        testCasesCount: testCases.length,
      });

      // Notify submitter
      const resultPayload = {
        submissionId,
        result: judgeResults.result,
        verdict: judgeResults.result,
        score: judgeResults.score,
        passed: judgeResults.passed,
        total: judgeResults.total,
        testResults: judgeResults.testResults,
        runtimeMs: judgeResults.runtimeMs,
      };

      socket?.emit?.("submission_result", resultPayload);

      // Notify opponent (minimal)
      const opponentId = userId === v.match.player_a_id ? v.match.player_b_id : v.match.player_a_id;
      if (opponentId) {
        this.io?.to?.(`user:${opponentId}`)?.emit?.("opponent_submitted", {
          result: judgeResults.result,
          verdict: judgeResults.result,
          score: judgeResults.score,
          passed: judgeResults.passed,
          total: judgeResults.total,
        });
      }

      // If accepted, end match via authoritative controller (handles ELO + replay + DB updates)
      if ((judgeResults.result ?? "").toString().toLowerCase() === "accepted") {
        // Important: controller also guards “already ended”
        await this.matchController.endMatch(matchId, userId, "correct_solution", submissionId);
      }

      return { ok: true, submissionId, judgeResults };
    });
  }

  async _loadTestCases(problemId) {
    // Primary: problems.test_cases jsonb
    const { data: problem, error } = await this.supabase
      .from("problems")
      .select("test_cases")
      .eq("id", problemId)
      .single();

    if (!error && problem?.test_cases) {
      let tc = problem.test_cases;
      if (typeof tc === "string") {
        try {
          tc = JSON.parse(tc);
        } catch {
          // Ignore malformed JSON and fall back to other loaders.
        }
      }
      if (Array.isArray(tc)) return tc;
    }

    // Optional fallback if you ever add a test_cases table
    try {
      const { data, error: e2 } = await this.supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", problemId)
        .order("order_index", { ascending: true });
      if (!e2 && Array.isArray(data) && data.length) return data;
    } catch {
      // Ignore optional fallback load failures and return an empty list.
    }

    return [];
  }

  async _saveSubmissionBestEffort({ matchId, userId, code, language, judgeResults, testCasesCount }) {
    // Your schema has both "passed_count/total_count" and also "passed_tests/total_tests" variants used in code.
    // We’ll insert the columns that exist in your provided schema and also keep compatibility extras.
    try {
      const { data, error } = await this.supabase
        .from("submissions")
        .insert({
          match_id: matchId,
          user_id: userId,
          code,
          language,
          verdict: judgeResults.result ?? "pending",
          passed_count: judgeResults.passed ?? 0,
          total_count: judgeResults.total ?? testCasesCount,
          execution_time_ms: judgeResults.runtimeMs ?? 0,
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!error) return data?.id ?? null;
      console.error("saveSubmission error:", error);
    } catch (e) {
      console.error("saveSubmission exception:", e);
    }
    return null;
  }
}