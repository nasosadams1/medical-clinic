import { createHash } from "crypto";
import { analyzeMatchForAntiCheat } from "./anti-cheat.js";
import { computeSubmissionMetrics, resolveResultStrength, resolveTimeLimitSeconds, normalizeDifficulty } from "./duel-competition.js";
import { assignCaseCluster } from "./duel-admin/case-management.js";
// services/match-controller.js
const DEBUG_DUEL = process.env.DEBUG_DUEL === "1";
function debugMatch(...args) {
  if (DEBUG_DUEL) console.log("[match]", ...args);
}
export class MatchController {
  constructor(supabase, io, judgeService, eloRatingService, sharedStateStore = null) {
    this.supabase = supabase;
    this.io = io;
    this.judgeService = judgeService;
    this.eloRatingService = eloRatingService;
    this.sharedStateStore = sharedStateStore;

    /** @type {Map<string, any>} */
    this.activeMatches = new Map();

    /** @type {Map<string, any>} */
    this.pendingMatches = new Map();

    /** @type {Map<string, NodeJS.Timeout>} */
    this.disconnectTimers = new Map();

    this.RECONNECT_GRACE_PERIOD_MS = 30_000;
    this.BASE_SUBMISSION_COOLDOWN_MS = 2_000;
    this.WRONG_SUBMISSION_COOLDOWN_MS = 750;
    this.MAX_SUBMISSION_COOLDOWN_MS = 8_000;
    this.MAX_SNAPSHOT_CODE_CHARS = 100_000;
  }

  /**
   * Starts a match and notifies both clients.
   */
  async startMatch(matchId, playerA, playerB, problem) {
    console.log(`Starting match ${matchId}`);

    const matchMeta = await this._loadMatchMeta(matchId);
    const matchType = matchMeta.matchType; // "ranked" | "casual"
    const isRanked = matchType === "ranked";

    const nowMs = Date.now();
    const difficulty = normalizeDifficulty(problem?.difficulty);
    const timeLimitSec = resolveTimeLimitSeconds(problem);
    const timeLimitMs = Math.max(5, timeLimitSec) * 1000;

    const supportedLanguages = (Array.isArray(problem?.supported_languages) ? problem.supported_languages : [])
      .map((x) => String(x).toLowerCase())
      .filter((x) => x === "javascript" || x === "js");

    const matchData = {
      matchId,
      playerA: { ...playerA },
      playerB: { ...playerB },
      problem: { ...problem, difficulty, time_limit_seconds: timeLimitSec },
      difficulty,
      startTimeMs: nowMs,
      timeLimitMs,
      timeLimitSec,
      submissions: new Map(),
      attempts: new Map(),
      wrongSubmissions: new Map(),
      lastSubmissionAtMs: new Map(),
      submissionLocks: new Set(),
      submissionSequence: new Map(),
      lastSubmissionHashes: new Map(),
      lastSnapshotHashes: new Map(),
      winnerId: null,
      resultStrength: "draw",
      status: "ACTIVE",
      matchType,
      isRanked,
      ending: false,
      timeoutHandle: null,
    };

    this.activeMatches.set(matchId, matchData);
    await this.sharedStateStore?.setPresenceActiveMatch?.([playerA?.userId, playerB?.userId], matchId);
    await this._syncRuntimeMatch(matchId, matchData, "ACTIVE");

    await this._safeUpdate("matches", { id: matchId }, {
      status: "ACTIVE",
      started_at: new Date().toISOString(),
      start_time: new Date().toISOString(),
      match_type: matchType,
      ranked: isRanked,
    });

    await this._safeInsert("match_events", {
      match_id: matchId,
      event_type: "match_start",
      user_id: playerA?.userId ?? null,
      payload: {
        player_a_id: playerA.userId,
        player_b_id: playerB.userId,
        problem_id: problem?.id,
        match_type: matchType,
        time_limit_seconds: timeLimitSec,
      },
    });

    const payload = {
      matchId,
      startTime: matchData.startTimeMs,
      timeLimit: timeLimitSec,
      matchType,
      problem: {
        id: problem.id,
        title: problem.title,
        statement: problem.statement,
        difficulty,
        timeLimit: timeLimitSec,
        supportedLanguages: supportedLanguages.length ? supportedLanguages : ["javascript"],
      },
    };

    this._emitToPlayer(playerA, "duel_started", payload);
    this._emitToPlayer(playerB, "duel_started", payload);

    matchData.timeoutHandle = setTimeout(() => {
      this.endMatchByTimeout(matchId).catch((e) => console.error("Timeout end error:", e));
    }, timeLimitMs);
  }

  /**
   * Handles a code submission.
   */
  async handleSubmission(matchId, userId, language, code, socket) {
    const match = this.activeMatches.get(matchId) ?? this.pendingMatches.get(matchId);
    debugMatch("submission_received", { matchId, userId, language, codeChars: (code ?? "").length, matchFound: !!match });

    if (!match) {
      socket?.emit?.("submission_error", { message: "Match not found or already ended" });
      return;
    }
    if (match.winnerId) {
      socket?.emit?.("submission_error", { message: "Match already has a winner" });
      return;
    }
    if (match.ending) {
      socket?.emit?.("submission_error", { message: "Match is ending" });
      return;
    }
    if (match.status !== "ACTIVE") {
      await this.logSecurityEvent(matchId, userId, "submission_before_match_start", {
        match_status: match.status,
      });
      socket?.emit?.("submission_error", { message: "Match has not started yet" });
      return;
    }

    const isPlayerA = userId === match.playerA.userId;
    const isPlayerB = userId === match.playerB.userId;
    if (!isPlayerA && !isPlayerB) {
      await this.logSecurityEvent(matchId, userId, "submission_unauthorized_player", {});
      socket?.emit?.("submission_error", { message: "User is not part of this match" });
      return;
    }

    console.log(`Submission for match ${matchId} from user ${userId}`);

    const lang = (language ?? "").toString().toLowerCase();
    const allowed = new Set(["javascript", "js"]);
    if (!allowed.has(lang)) {
      await this.logSecurityEvent(matchId, userId, "submission_invalid_language", { language: lang });
      socket?.emit?.("submission_error", { message: "Only JavaScript is currently supported." });
      return;
    }

    const normalizedCode = this._normalizeCode(code);
    const codeHash = this._hashCode(normalizedCode);
    const previousCodeHash = match.lastSubmissionHashes?.get(userId);
    if (previousCodeHash && previousCodeHash === codeHash) {
      await this.logSecurityEvent(matchId, userId, "duplicate_submission_blocked", {
        code_hash: codeHash,
      });
      socket?.emit?.("submission_error", { message: "This exact code was already submitted." });
      return;
    }

    if (match.submissionLocks?.has(userId)) {
      await this.logSecurityEvent(matchId, userId, "concurrent_submission_blocked", {});
      socket?.emit?.("submission_error", { message: "Your previous submission is still running." });
      return;
    }

    const lastAt = match.lastSubmissionAtMs.get(userId) ?? 0;
    const now = Date.now();
    const cooldownMs = this._getSubmissionCooldownMs(match, userId);
    if (now - lastAt < cooldownMs) {
      await this.logSecurityEvent(matchId, userId, "submission_rate_limited", {
        remaining_ms: cooldownMs - (now - lastAt),
        cooldown_ms: cooldownMs,
      });
      socket?.emit?.("submission_error", { message: "You're submitting too fast. Please wait a moment." });
      return;
    }

    match.lastSubmissionAtMs.set(userId, now);
    match.submissionLocks?.add(userId);

    socket?.emit?.("submission_running", { message: "Running tests..." });
    socket?.emit?.("submission_received", { message: "Running tests..." });

    try {
      console.log("SUBMIT_STAGE load_testcases", { matchId, problemId: match.problem.id, userId });
      const testCases = await this._loadTestCases(match.problem.id);
      console.log("TESTCASE_COUNT", Array.isArray(testCases) ? testCases.length : -1);
      debugMatch("testcases_loaded", { matchId, problemId: match.problem.id, count: Array.isArray(testCases) ? testCases.length : 0 });
      if (!Array.isArray(testCases) || testCases.length === 0) {
        socket?.emit?.("submission_error", { message: "This problem has no test cases configured." });
        return;
      }

      console.log("SUBMIT_STAGE judge_start", { matchId, userId, lang, tests: testCases.length });
      const judgeResults = await Promise.race([
        this.judgeService.executeCode(normalizedCode, lang, testCases),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Judge timeout after 20s")), 20_000)),
      ]);
      console.log("JUDGE_RESULT", JSON.stringify(judgeResults));
      debugMatch("judge_done", {
        matchId,
        userId,
        result: judgeResults?.result,
        passed: judgeResults?.passed,
        total: judgeResults?.total,
        score: judgeResults?.score,
        runtimeMs: judgeResults?.runtimeMs,
      });

      const submittedAtMs = Date.now();
      const elapsedMs = submittedAtMs - match.startTimeMs;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const accepted = (judgeResults.result ?? "").toString().toLowerCase() === "accepted";

      const attempts = (match.attempts.get(userId) ?? 0) + 1;
      match.attempts.set(userId, attempts);

      const priorWrongSubmissions = match.wrongSubmissions.get(userId) ?? 0;
      const wrongSubmissionCount = accepted ? priorWrongSubmissions : priorWrongSubmissions + 1;
      if (!accepted) {
        match.wrongSubmissions.set(userId, wrongSubmissionCount);
      }

      const submissionMetrics = computeSubmissionMetrics({
        difficulty: match.difficulty,
        passed: judgeResults?.passed ?? 0,
        total: judgeResults?.total ?? testCases.length,
        accepted,
        elapsedMs,
        timeLimitMs: match.timeLimitMs,
        wrongSubmissionCount,
      });

      const submissionSequence = (match.submissionSequence.get(userId) ?? 0) + 1;
      match.submissionSequence.set(userId, submissionSequence);

      const playerSession =
        match.playerA.userId === userId ? match.playerA.sessionEvidence || null : match.playerB.sessionEvidence || null;
      const connectionRiskFlags =
        match.playerA.userId === userId
          ? match.playerA.connectionRiskFlags || []
          : match.playerB.connectionRiskFlags || [];
      const auditMetadata = {
        sessionEvidence: playerSession,
        connectionRiskFlags,
        matchDifficulty: match.difficulty,
        attempts,
        wrongSubmissions: wrongSubmissionCount,
      };

      const savedSubmissionId = await this._saveSubmissionBestEffort({
        matchId,
        userId,
        code: normalizedCode,
        codeHash,
        language,
        judgeResults,
        testCasesCount: testCases.length,
        submissionSequence,
        submissionKind: "manual",
        auditMetadata,
      });

      const prev = match.submissions.get(userId);
      const prevMatchScore = prev?.matchScore ?? 0;

      const stored = {
        ...judgeResults,
        submittedAtMs,
        elapsedMs,
        elapsedSeconds,
        submissionId: savedSubmissionId,
        score: judgeResults?.score ?? 0,
        judgeScore: judgeResults?.score ?? 0,
        matchScore: submissionMetrics.duelScore,
        passRatio: submissionMetrics.passRatio,
        speedBonus: submissionMetrics.speedBonus,
        partialScore: submissionMetrics.partialScore,
        penalty: submissionMetrics.penalty,
        wrongSubmissionCount,
        attempts,
        runtimeMs: judgeResults?.runtimeMs ?? 0,
        result: judgeResults?.result ?? judgeResults?.verdict ?? null,
        code: normalizedCode,
        codeHash,
        submissionSequence,
        sessionEvidence: playerSession,
        connectionRiskFlags,
      };

      if (!prev || accepted || stored.matchScore >= prevMatchScore) {
        match.submissions.set(userId, stored);
      } else {
        match.submissions.set(userId, { ...prev, lastAttempt: stored });
      }
      match.lastSubmissionHashes?.set(userId, codeHash);

      await this._safeInsert("match_events", {
        match_id: matchId,
        event_type: "submission",
        user_id: userId,
        payload: {
          submission_id: savedSubmissionId,
          verdict: (judgeResults?.result ?? "").toString(),
          score: judgeResults?.score ?? 0,
          duel_score: submissionMetrics.duelScore,
          passed: judgeResults?.passed ?? 0,
          total: judgeResults?.total ?? testCases.length,
          runtime_ms: judgeResults?.runtimeMs ?? 0,
          wrong_submissions: wrongSubmissionCount,
        },
      });

      const resultPayload = {
        submissionId: savedSubmissionId,
        result: judgeResults.result,
        verdict: judgeResults.result,
        score: judgeResults.score,
        duelScore: submissionMetrics.duelScore,
        passed: judgeResults.passed,
        total: judgeResults.total,
        testResults: judgeResults.testResults,
        runtimeMs: judgeResults.runtimeMs,
        memoryKb: judgeResults.memoryKb,
        wrongSubmissions: wrongSubmissionCount,
        attempts,
      };

      this._emitToUser(userId, match, "submission_result", resultPayload);

      this._emitToOpponent(userId, match, "opponent_submitted", {
        accepted,
        verdict: judgeResults.result,
        attempts,
        wrongSubmissions: wrongSubmissionCount,
      });

      if (attempts >= this._getSuspiciousAttemptThreshold(match)) {
        await this.logSecurityEvent(matchId, userId, "high_submission_volume", {
          attempts,
          wrong_submissions: wrongSubmissionCount,
        });
      }

      if (accepted) {
        debugMatch("match_win", { matchId, winnerId: userId, elapsedSeconds, duelScore: submissionMetrics.duelScore });
        await this.endMatch(matchId, userId, "accepted_first", savedSubmissionId);
      }
    } finally {
      match.submissionLocks?.delete(userId);
    }
  }
  async endMatchByTimeout(matchId) {
    const match = this.activeMatches.get(matchId) ?? this.pendingMatches.get(matchId);
    if (!match || match.winnerId || match.ending) return;

    console.log(`Match ${matchId} ended by timeout`);

    const a = match.submissions.get(match.playerA.userId);
    const b = match.submissions.get(match.playerB.userId);

    const aAccepted = (a?.result ?? "").toString().toLowerCase() === "accepted";
    const bAccepted = (b?.result ?? "").toString().toLowerCase() === "accepted";
    const scoreA = a?.matchScore ?? 0;
    const scoreB = b?.matchScore ?? 0;

    let winnerId = null;
    let reason = "timeout_draw";

    if (aAccepted && bAccepted) {
      const solveA = a?.elapsedMs ?? Infinity;
      const solveB = b?.elapsedMs ?? Infinity;
      if (solveA < solveB) {
        winnerId = match.playerA.userId;
        reason = "faster_accepted_solution";
      } else if (solveB < solveA) {
        winnerId = match.playerB.userId;
        reason = "faster_accepted_solution";
      } else {
        reason = "draw_both_solved";
      }
    } else if (aAccepted && !bAccepted) {
      winnerId = match.playerA.userId;
      reason = "accepted_vs_partial";
    } else if (bAccepted && !aAccepted) {
      winnerId = match.playerB.userId;
      reason = "accepted_vs_partial";
    } else if (a && b) {
      if (Math.abs(scoreA - scoreB) <= 0.5) {
        reason = "draw_partial_tie";
      } else if (scoreA > scoreB) {
        winnerId = match.playerA.userId;
        reason = "higher_partial_score";
      } else {
        winnerId = match.playerB.userId;
        reason = "higher_partial_score";
      }
    } else if (a && !b) {
      winnerId = match.playerA.userId;
      reason = scoreA > 0 ? "partial_progress" : "opponent_no_submission";
    } else if (b && !a) {
      winnerId = match.playerB.userId;
      reason = scoreB > 0 ? "partial_progress" : "opponent_no_submission";
    } else {
      reason = "draw_no_submissions";
    }

    await this.endMatch(matchId, winnerId, reason, null);
  }

  /**
   * Ends match safely. winnerId can be null for draw.
   */
  async endMatch(matchId, winnerId, reason, winningSubmissionId = null) {
    const match = this.activeMatches.get(matchId) ?? this.pendingMatches.get(matchId);
    if (!match || match.winnerId) return;
    if (match.ending) return;

    match.ending = true;

    if (match.timeoutHandle) clearTimeout(match.timeoutHandle);
    if (match.countdownHandle) clearTimeout(match.countdownHandle);

    match.winnerId = winnerId ?? null;
    match.status = "FINISHED";

    const endTimeMs = Date.now();
    const durationSeconds = Math.max(0, Math.floor((endTimeMs - match.startTimeMs) / 1000));

    const [playerARes, playerBRes] = await Promise.all([
      this.supabase.from("duel_users").select("*").eq("id", match.playerA.userId).single(),
      this.supabase.from("duel_users").select("*").eq("id", match.playerB.userId).single(),
    ]);

    if (playerARes.error) console.error("Fetch duel user A error:", playerARes.error);
    if (playerBRes.error) console.error("Fetch duel user B error:", playerBRes.error);

    const playerAData = playerARes.data;
    const playerBData = playerBRes.data;

    const aRatingBefore = playerAData?.rating ?? match.playerA.rating ?? 500;
    const bRatingBefore = playerBData?.rating ?? match.playerB.rating ?? 500;
    const isRanked = (match.matchType || "ranked") === "ranked";

    const playerASubmission = match.submissions.get(match.playerA.userId) ?? null;
    const playerBSubmission = match.submissions.get(match.playerB.userId) ?? null;
    const isCountdownDisconnect = reason === "disconnect_before_start";
    const isActiveDisconnect = reason === "disconnect_during_match";
    const resolvedStrength = resolveResultStrength({
      difficulty: match.difficulty,
      reason,
      winnerId,
      playerAId: match.playerA.userId,
      playerBId: match.playerB.userId,
      playerASubmission,
      playerBSubmission,
    });
    match.resultStrength = isCountdownDisconnect
      ? "countdown_forfeit"
      : isActiveDisconnect
        ? "clear"
        : resolvedStrength.resultStrength;

    let ratings = null;
    if (isRanked) {
      if (isCountdownDisconnect) {
        ratings = this._calculateCountdownDisconnectRatings({
          match,
          winnerId,
          playerAData,
          playerBData,
        });
      } else if (typeof this.eloRatingService?.calculateMatchRatings === "function") {
        ratings = this.eloRatingService.calculateMatchRatings(
          playerAData ?? { id: match.playerA.userId, rating: aRatingBefore },
          playerBData ?? { id: match.playerB.userId, rating: bRatingBefore },
          winnerId,
          !winnerId,
          {
            difficulty: match.difficulty,
            playerAActualScore: resolvedStrength.playerAActualScore,
            playerBActualScore: resolvedStrength.playerBActualScore,
            resultStrength: match.resultStrength,
          }
        );
      }
    }

    const playerARating = ratings?.playerA ?? {
      ratingBefore: aRatingBefore,
      ratingAfter: aRatingBefore,
      ratingChange: 0,
      actualScore: resolvedStrength.playerAActualScore,
      expectedScore: 0.5,
      subratingField: `${match.difficulty}_rating`,
      subratingBefore: playerAData?.[`${match.difficulty}_rating`] ?? aRatingBefore,
      subratingAfter: playerAData?.[`${match.difficulty}_rating`] ?? aRatingBefore,
      subratingChange: 0,
      tier: this.eloRatingService?.getTier?.(aRatingBefore) ?? "Bronze",
      division: this.eloRatingService?.getDivision?.(aRatingBefore) ?? "III",
    };
    const playerBRating = ratings?.playerB ?? {
      ratingBefore: bRatingBefore,
      ratingAfter: bRatingBefore,
      ratingChange: 0,
      actualScore: resolvedStrength.playerBActualScore,
      expectedScore: 0.5,
      subratingField: `${match.difficulty}_rating`,
      subratingBefore: playerBData?.[`${match.difficulty}_rating`] ?? bRatingBefore,
      subratingAfter: playerBData?.[`${match.difficulty}_rating`] ?? bRatingBefore,
      subratingChange: 0,
      tier: this.eloRatingService?.getTier?.(bRatingBefore) ?? "Bronze",
      division: this.eloRatingService?.getDivision?.(bRatingBefore) ?? "III",
    };

    const playerAJudgeScore = playerASubmission?.score ?? 0;
    const playerBJudgeScore = playerBSubmission?.score ?? 0;
    const playerAMatchScore = playerASubmission?.matchScore ?? 0;
    const playerBMatchScore = playerBSubmission?.matchScore ?? 0;

    await this._safeUpdate("matches", { id: matchId }, {
      status: "FINISHED",
      winner_id: winnerId,
      reason: reason ?? null,
      completed_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_seconds: durationSeconds,
      time_limit_seconds: match.timeLimitSec,
      problem_difficulty: match.difficulty,
      duel_result_strength: match.resultStrength,
      player_a_rating_after: playerARating.ratingAfter,
      player_b_rating_after: playerBRating.ratingAfter,
      player_a_rating_change: playerARating.ratingChange ?? 0,
      player_b_rating_change: playerBRating.ratingChange ?? 0,
      player_a_subrating_field: playerARating.subratingField ?? null,
      player_b_subrating_field: playerBRating.subratingField ?? null,
      player_a_subrating_before: playerARating.subratingBefore ?? null,
      player_b_subrating_before: playerBRating.subratingBefore ?? null,
      player_a_subrating_after: playerARating.subratingAfter ?? null,
      player_b_subrating_after: playerBRating.subratingAfter ?? null,
      player_a_subrating_change: playerARating.subratingChange ?? 0,
      player_b_subrating_change: playerBRating.subratingChange ?? 0,
      player_a_score: playerAMatchScore,
      player_b_score: playerBMatchScore,
      player_a_partial_score: playerAMatchScore,
      player_b_partial_score: playerBMatchScore,
      player_a_wrong_submissions: match.wrongSubmissions.get(match.playerA.userId) ?? 0,
      player_b_wrong_submissions: match.wrongSubmissions.get(match.playerB.userId) ?? 0,
    });

    if (isRanked) {
      await Promise.all([
        this._safeUpdate("duel_users", { id: match.playerA.userId }, this._buildUserUpdate(playerAData, {
          ratingData: playerARating,
          won: winnerId === match.playerA.userId,
          lost: winnerId === match.playerB.userId,
          drew: !winnerId,
        })),
        this._safeUpdate("duel_users", { id: match.playerB.userId }, this._buildUserUpdate(playerBData, {
          ratingData: playerBRating,
          won: winnerId === match.playerB.userId,
          lost: winnerId === match.playerA.userId,
          drew: !winnerId,
        })),
      ]);
    }

    if (winningSubmissionId) {
      await this._safeUpdate("submissions", { id: winningSubmissionId }, {
        is_winning_submission: true,
      });
    }

    await this._safeInsert("match_events", {
      match_id: matchId,
      event_type: "match_end",
      user_id: winnerId ?? null,
      payload: {
        winner_id: winnerId,
        reason,
        duration_seconds: durationSeconds,
        difficulty: match.difficulty,
        result_strength: match.resultStrength,
        player_a_actual_score: isCountdownDisconnect ? playerARating.actualScore : resolvedStrength.playerAActualScore,
        player_b_actual_score: isCountdownDisconnect ? playerBRating.actualScore : resolvedStrength.playerBActualScore,
      },
    });

        await this.createReplay(matchId, match).catch((e) => console.error("Replay error:", e));
    await this.createAntiCheatCase(matchId, match).catch((e) => console.error("Anti-cheat case error:", e));

    const matchEndData = {
      matchId,
      winnerId: winnerId ?? null,
      reason,
      resultStrength: match.resultStrength,
      duration: durationSeconds,
      matchType: match.matchType,
      difficulty: match.difficulty,
      timeLimit: match.timeLimitSec,
      playerA: {
        userId: match.playerA.userId,
        username: match.playerA.username,
        ratingBefore: playerARating.ratingBefore,
        ratingAfter: playerARating.ratingAfter,
        ratingChange: playerARating.ratingChange ?? 0,
        score: playerAJudgeScore,
        matchScore: playerAMatchScore,
        actualScore: playerARating.actualScore,
        subratingField: playerARating.subratingField,
        subratingBefore: playerARating.subratingBefore,
        subratingAfter: playerARating.subratingAfter,
        subratingChange: playerARating.subratingChange,
        submission: playerASubmission,
      },
      playerB: {
        userId: match.playerB.userId,
        username: match.playerB.username,
        ratingBefore: playerBRating.ratingBefore,
        ratingAfter: playerBRating.ratingAfter,
        ratingChange: playerBRating.ratingChange ?? 0,
        score: playerBJudgeScore,
        matchScore: playerBMatchScore,
        actualScore: playerBRating.actualScore,
        subratingField: playerBRating.subratingField,
        subratingBefore: playerBRating.subratingBefore,
        subratingAfter: playerBRating.subratingAfter,
        subratingChange: playerBRating.subratingChange,
        submission: playerBSubmission,
      },
    };
    this._emitToPlayer(match.playerA, "match_end", matchEndData);
    this._emitToPlayer(match.playerB, "match_end", matchEndData);

    this.activeMatches.delete(matchId);
    this.pendingMatches.delete(matchId);
    await this._clearRuntimeMatch(matchId, match);
    console.log(`Match ${matchId} ended. Winner: ${winnerId || "Draw"}`);
  }

  /**
   * Disconnect handling: countdown forfeits immediately, active matches use a grace period.
   */
  async handlePlayerDisconnectLifecycle(userId) {
    for (const [matchId, match] of this.pendingMatches.entries()) {
      if (!match || match.winnerId || match.ending) continue;
      if (userId !== match.playerA?.userId && userId !== match.playerB?.userId) continue;

      if (match.countdownHandle) {
        clearTimeout(match.countdownHandle);
        match.countdownHandle = null;
      }

      const opponentId = userId === match.playerA.userId ? match.playerB.userId : match.playerA.userId;
      await this.endMatch(matchId, opponentId, "disconnect_before_start", null);
      return true;
    }

    return this.handlePlayerDisconnect(userId);
  }

  async handlePlayerDisconnect(userId) {
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (!match || match.winnerId || match.ending) continue;

      const inMatch = userId === match.playerA.userId || userId === match.playerB.userId;
      if (!inMatch) continue;

      if (this.disconnectTimers.has(userId)) return true;

      console.log(`Player ${userId} disconnected (grace ${this.RECONNECT_GRACE_PERIOD_MS}ms)`);

      const timer = setTimeout(async () => {
        try {
          const currentMatch = this.activeMatches.get(matchId);
          if (!currentMatch || currentMatch.winnerId || currentMatch.ending) return;

          const opponentId =
            userId === currentMatch.playerA.userId ? currentMatch.playerB.userId : currentMatch.playerA.userId;

          await this._safeInsert("match_events", {
            match_id: matchId,
            event_type: "disconnect",
            user_id: userId,
            payload: { reason: "disconnect_during_match" },
          });

          await this.endMatch(matchId, opponentId, "disconnect_during_match", null);
        } finally {
          this.disconnectTimers.delete(userId);
        }
      }, this.RECONNECT_GRACE_PERIOD_MS);

      this.disconnectTimers.set(userId, timer);
      return true;
    }

    return false;
  }

  handlePlayerReconnect(userId) {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
      console.log(`Player ${userId} reconnected in time`);
      return true;
    }
    return false;
  }

  async createReplay(matchId, match) {
    const [snapshotRes, eventRes, submissionRes] = await Promise.all([
      this.supabase
        .from("code_snapshots")
        .select("*")
        .eq("match_id", matchId)
        .order("timestamp", { ascending: true }),
      this.supabase
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true }),
      this.supabase
        .from("submissions")
        .select("*")
        .eq("match_id", matchId)
        .order("submitted_at", { ascending: true }),
    ]);

    if (snapshotRes.error) console.error("Snapshot fetch error:", snapshotRes.error);
    if (eventRes.error) console.error("Match event fetch error:", eventRes.error);
    if (submissionRes.error) console.error("Submission fetch error:", submissionRes.error);

    const snapshots = snapshotRes.data ?? [];
    const eventRows = eventRes.data ?? [];
    const submissionRows = submissionRes.data ?? [];

    const buildTimeline = (playerId) =>
      snapshots
        .filter((snapshot) => snapshot.user_id === playerId)
        .map((snapshot) => ({
          timestamp: snapshot.timestamp,
          code: snapshot.code,
          codeHash: this._hashCode(snapshot.code),
          codeChars: String(snapshot.code ?? "").length,
        }));

    const playerATimeline = buildTimeline(match.playerA.userId);
    const playerBTimeline = buildTimeline(match.playerB.userId);

    const finalSubmissionA = match.submissions.get(match.playerA.userId) ?? null;
    const finalSubmissionB = match.submissions.get(match.playerB.userId) ?? null;

    const events = eventRows.map((event) => ({
      id: event.id,
      type: event.event_type,
      userId: event.user_id,
      timestamp: event.created_at,
      payload: event.payload ?? {},
    }));

    const replayData = {
      matchId,
      status: match.status,
      matchType: match.matchType,
      difficulty: match.difficulty,
      resultStrength: match.resultStrength,
      startTimeMs: match.startTimeMs,
      timeLimitSec: match.timeLimitSec,
      winnerId: match.winnerId,
      playerA: {
        userId: match.playerA.userId,
        username: match.playerA.username,
        sessionEvidence: match.playerA.sessionEvidence ?? null,
        connectionRiskFlags: match.playerA.connectionRiskFlags ?? [],
      },
      playerB: {
        userId: match.playerB.userId,
        username: match.playerB.username,
        sessionEvidence: match.playerB.sessionEvidence ?? null,
        connectionRiskFlags: match.playerB.connectionRiskFlags ?? [],
      },
      problem: {
        id: match.problem?.id ?? null,
        title: match.problem?.title ?? null,
        difficulty: match.problem?.difficulty ?? match.difficulty,
        timeLimit: match.problem?.time_limit_seconds ?? match.timeLimitSec,
      },
      finalSubmissions: {
        playerA: finalSubmissionA
          ? {
              verdict: finalSubmissionA.result ?? null,
              score: finalSubmissionA.score ?? 0,
              duelScore: finalSubmissionA.matchScore ?? 0,
              submittedAtMs: finalSubmissionA.submittedAtMs ?? null,
              elapsedMs: finalSubmissionA.elapsedMs ?? null,
              attempts: finalSubmissionA.attempts ?? 0,
              wrongSubmissions: finalSubmissionA.wrongSubmissionCount ?? 0,
              codeHash: finalSubmissionA.codeHash ?? null,
            }
          : null,
        playerB: finalSubmissionB
          ? {
              verdict: finalSubmissionB.result ?? null,
              score: finalSubmissionB.score ?? 0,
              duelScore: finalSubmissionB.matchScore ?? 0,
              submittedAtMs: finalSubmissionB.submittedAtMs ?? null,
              elapsedMs: finalSubmissionB.elapsedMs ?? null,
              attempts: finalSubmissionB.attempts ?? 0,
              wrongSubmissions: finalSubmissionB.wrongSubmissionCount ?? 0,
              codeHash: finalSubmissionB.codeHash ?? null,
            }
          : null,
      },
      persistedSubmissionCount: submissionRows.length,
      securityEventCount: eventRows.filter((entry) => entry.event_type === "security_event").length,
      generatedAt: new Date().toISOString(),
    };

    await this._safeInsert("match_replays", {
      match_id: matchId,
      replay_data: replayData,
      player_a_timeline: playerATimeline,
      player_b_timeline: playerBTimeline,
      events,
    });
  }

  async createAntiCheatCase(matchId, match) {
    const finalSubmissionA = match.submissions.get(match.playerA.userId) ?? null;
    const finalSubmissionB = match.submissions.get(match.playerB.userId) ?? null;

    if (!finalSubmissionA && !finalSubmissionB) {
      return null;
    }

    const [existingCaseRes, eventRes, submissionRes, snapshotRes] = await Promise.all([
      this.supabase.from("anti_cheat_cases").select("id").eq("match_id", matchId).maybeSingle(),
      this.supabase
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true }),
      this.supabase
        .from("submissions")
        .select("*")
        .eq("match_id", matchId)
        .order("submitted_at", { ascending: true }),
      this.supabase
        .from("code_snapshots")
        .select("*")
        .eq("match_id", matchId)
        .order("timestamp", { ascending: true }),
    ]);

    const existingCase = existingCaseRes.data;
    if (existingCaseRes.error) {
      console.error("Anti-cheat case existence check failed:", existingCaseRes.error);
      return null;
    }
    if (existingCase?.id) {
      return existingCase.id;
    }
    if (eventRes.error) {
      console.error("Anti-cheat event load failed:", eventRes.error);
      return null;
    }
    if (submissionRes.error) {
      console.error("Anti-cheat submission load failed:", submissionRes.error);
      return null;
    }
    if (snapshotRes.error) {
      console.error("Anti-cheat snapshot load failed:", snapshotRes.error);
      return null;
    }

    const analysis = analyzeMatchForAntiCheat({
      matchId,
      playerA: match.playerA,
      playerB: match.playerB,
      playerASubmission: finalSubmissionA,
      playerBSubmission: finalSubmissionB,
      matchEvents: eventRes.data ?? [],
      submissions: submissionRes.data ?? [],
      snapshots: snapshotRes.data ?? [],
    });

    if (!analysis.shouldCreateCase) {
      return null;
    }

    const { data: insertedCase, error: insertError } = await this.supabase
      .from("anti_cheat_cases")
      .insert({
        match_id: matchId,
        risk_score: analysis.riskScore,
        summary: analysis.summary,
        evidence: analysis.evidence,
        status: "new",
      })
      .select("*")
      .single();

    if (insertError || !insertedCase) {
      console.error("Anti-cheat case insert failed:", insertError);
      return null;
    }

    await assignCaseCluster(this.supabase, insertedCase).catch((clusterError) => {
      console.error("Anti-cheat case clustering failed:", clusterError);
    });

    await this._safeInsert("anti_cheat_case_events", {
      case_id: insertedCase.id,
      actor_user_id: null,
      action: "created",
      details: {
        risk_score: analysis.riskScore,
        summary: analysis.summary,
        flags: analysis.evidence?.flags ?? [],
        history_samples: analysis.evidence?.longitudinal?.historySamples ?? 0,
      },
    });

    return insertedCase.id;
  }

  /* ------------------------- helpers ------------------------- */

  async _loadMatchMeta(matchId) {
    let matchType = "ranked";
    try {
      const { data, error } = await this.supabase
        .from("matches")
        .select("match_type, ranked")
        .eq("id", matchId)
        .single();

      if (!error && data) {
        if (typeof data.match_type === "string" && data.match_type.length) {
          matchType = data.match_type;
        } else if (typeof data.ranked === "boolean") {
          matchType = data.ranked ? "ranked" : "casual";
        }
      }
    } catch (e) {
      console.error("Failed to load match meta:", e);
    }
    if (matchType !== "ranked" && matchType !== "casual") matchType = "ranked";
    return { matchType };
  }

  async _loadTestCases(problemId) {
    try {
      const { data: problemData, error: problemErr } = await this.supabase
        .from("problems")
        .select("test_cases")
        .eq("id", problemId)
        .single();

      if (!problemErr && problemData?.test_cases) {
        let tc = problemData.test_cases;
        if (typeof tc === "string") {
          try { tc = JSON.parse(tc); } catch {
            // Ignore malformed JSON and keep the raw test-case payload.
          }
        }
        if (Array.isArray(tc)) return tc;
      }
    } catch {
      // Ignore primary test-case load failures and try the fallback table.
    }

    try {
      const { data, error } = await this.supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", problemId)
        .order("order_index", { ascending: true });

      if (!error && Array.isArray(data) && data.length) return data;
    } catch {
      // Ignore fallback test-case load failures and return an empty list.
    }

    return [];
  }

  getMatch(matchId) {
    return this.activeMatches.get(matchId) ?? this.pendingMatches.get(matchId) ?? null;
  }

  isAuthorizedPlayer(matchId, userId) {
    const match = this.getMatch(matchId);
    if (!match || !userId) return false;
    return match.playerA?.userId === userId || match.playerB?.userId === userId;
  }

  async recordCodeSnapshot(matchId, userId, code) {
    const match = this.activeMatches.get(matchId);
    if (!match) return { ok: false, reason: "inactive_match" };
    if (!this.isAuthorizedPlayer(matchId, userId)) {
      await this.logSecurityEvent(matchId, userId, "snapshot_unauthorized", {});
      return { ok: false, reason: "unauthorized" };
    }

    const normalizedCode = this._normalizeCode(code);
    if (normalizedCode.length > this.MAX_SNAPSHOT_CODE_CHARS) {
      await this.logSecurityEvent(matchId, userId, "snapshot_too_large", {
        code_chars: normalizedCode.length,
      });
      return { ok: false, reason: "too_large" };
    }

    const hash = this._hashCode(normalizedCode);
    const previousHash = match.lastSnapshotHashes?.get(userId);
    if (previousHash && previousHash === hash) {
      return { ok: false, reason: "unchanged" };
    }

    match.lastSnapshotHashes?.set(userId, hash);
    await this.supabase.from("code_snapshots").insert({
      match_id: matchId,
      user_id: userId,
      code: normalizedCode,
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  async recordEditorTelemetry(matchId, userId, telemetry, sessionEvidence = null) {
    const match = this.activeMatches.get(matchId);
    if (!match) return { ok: false, reason: "inactive_match" };
    if (!this.isAuthorizedPlayer(matchId, userId)) {
      await this.logSecurityEvent(matchId, userId, "telemetry_unauthorized", {});
      return { ok: false, reason: "unauthorized" };
    }

    const payload = {
      pasteEvents: Math.max(0, Math.min(500, Number(telemetry?.pasteEvents || 0))),
      largePasteEvents: Math.max(0, Math.min(200, Number(telemetry?.largePasteEvents || 0))),
      pasteChars: Math.max(0, Math.min(500000, Number(telemetry?.pasteChars || 0))),
      majorEdits: Math.max(0, Math.min(2000, Number(telemetry?.majorEdits || 0))),
      focusLosses: Math.max(0, Math.min(200, Number(telemetry?.focusLosses || 0))),
      reason: String(telemetry?.reason || "interval").slice(0, 64),
      clientTimestamp: Number(telemetry?.clientTimestamp || Date.now()),
      language: String(telemetry?.language || "javascript").slice(0, 32),
      deviceClusterId: sessionEvidence?.deviceClusterId || null,
      timezone: sessionEvidence?.clientMeta?.timezone || null,
      platform: sessionEvidence?.clientMeta?.platform || null,
      localeLanguage: sessionEvidence?.clientMeta?.language || null,
      origin: sessionEvidence?.clientMeta?.origin || null,
    };

    await this._safeInsert("match_events", {
      match_id: matchId,
      event_type: "editor_telemetry",
      user_id: userId,
      payload,
    });

    if (payload.largePasteEvents >= 2 || payload.pasteChars >= 2000 || payload.focusLosses >= 4) {
      await this.logSecurityEvent(matchId, userId, "suspicious_editor_telemetry", {
        paste_events: payload.pasteEvents,
        large_paste_events: payload.largePasteEvents,
        paste_chars: payload.pasteChars,
        focus_losses: payload.focusLosses,
        reason: payload.reason,
      });
    }

    return { ok: true };
  }
  _normalizeCode(code) {
    return String(code ?? "").replace(/\r\n/g, "\n").trim();
  }

  _hashCode(code) {
    return createHash("sha256").update(this._normalizeCode(code)).digest("hex");
  }

  _getSubmissionCooldownMs(match, userId) {
    const attempts = match.attempts.get(userId) ?? 0;
    const wrongSubmissions = match.wrongSubmissions.get(userId) ?? 0;
    const extraPenaltyMs = Math.min(
      this.MAX_SUBMISSION_COOLDOWN_MS - this.BASE_SUBMISSION_COOLDOWN_MS,
      Math.max(0, wrongSubmissions - 1) * this.WRONG_SUBMISSION_COOLDOWN_MS
    );
    const attemptPenaltyMs = Math.min(2000, Math.max(0, attempts - 2) * 250);

    return Math.min(
      this.MAX_SUBMISSION_COOLDOWN_MS,
      this.BASE_SUBMISSION_COOLDOWN_MS + extraPenaltyMs + attemptPenaltyMs
    );
  }

  _getSuspiciousAttemptThreshold(match) {
    switch (normalizeDifficulty(match?.difficulty)) {
      case "hard":
        return 10;
      case "medium":
        return 12;
      default:
        return 14;
    }
  }

  async logSecurityEvent(matchId, userId, eventType, payload = {}) {
    await this._safeInsert("match_events", {
      match_id: matchId,
      event_type: "security_event",
      user_id: userId ?? null,
      payload: {
        type: eventType,
        ...payload,
        recorded_at: new Date().toISOString(),
      },
    });
  }
  async _saveSubmissionBestEffort({
    matchId,
    userId,
    code,
    codeHash,
    language,
    judgeResults,
    testCasesCount,
    submissionSequence = null,
    submissionKind = "manual",
    auditMetadata = {},
  }) {
    const testSummary = {
      result: judgeResults.result ?? judgeResults.verdict ?? null,
      passed: judgeResults.passed ?? 0,
      total: judgeResults.total ?? testCasesCount,
      runtimeMs: judgeResults.runtimeMs ?? 0,
      score: judgeResults.score ?? 0,
    };

    try {
      const { data, error } = await this.supabase
        .from("submissions")
        .insert({
          match_id: matchId,
          user_id: userId,
          code,
          code_hash: codeHash,
          language,
          test_results: judgeResults.testResults ?? [],
          passed_tests: judgeResults.passed ?? 0,
          total_tests: judgeResults.total ?? testCasesCount,
          execution_time_ms: judgeResults.runtimeMs ?? 0,
          submitted_at: new Date().toISOString(),
          verdict: judgeResults.result ?? null,
          score: judgeResults.score ?? null,
          passed_count: judgeResults.passed ?? null,
          failed_count:
            judgeResults.total != null && judgeResults.passed != null
              ? Math.max(0, judgeResults.total - judgeResults.passed)
              : null,
          total_count: judgeResults.total ?? null,
          runtime_ms: judgeResults.runtimeMs ?? null,
          submission_sequence: submissionSequence,
          compile_log: judgeResults.compileLog ?? "",
          execution_log: judgeResults.stderr ?? "",
          test_summary: testSummary,
          audit_metadata: auditMetadata,
          submission_kind: submissionKind,
        })
        .select("id")
        .single();

      if (!error) return data?.id ?? null;
      console.error("Error saving submission (schema A):", error);
    } catch (e) {
      console.error("Submission insert exception (schema A):", e);
    }

    try {
      const { data, error } = await this.supabase
        .from("submissions")
        .insert({
          match_id: matchId,
          user_id: userId,
          code,
          code_hash: codeHash,
          language,
          verdict: judgeResults.result ?? null,
          score: judgeResults.score ?? 0,
          runtime_ms: judgeResults.runtimeMs ?? 0,
          test_results: judgeResults.testResults ?? [],
          audit_metadata: auditMetadata,
        })
        .select("id")
        .single();

      if (!error) return data?.id ?? null;
      console.error("Error saving submission (schema B):", error);
    } catch (e) {
      console.error("Submission insert exception (schema B):", e);
    }

    return null;
  }

  _buildStaticRatingData({
    userRow,
    ratingBefore,
    ratingAfter,
    actualScore,
    expectedScore,
    difficulty,
    subratingBefore = null,
    subratingAfter = null,
  }) {
    const normalizedDifficulty = normalizeDifficulty(difficulty);
    const subratingField = `${normalizedDifficulty}_rating`;
    const safeRatingBefore = this.eloRatingService?.normalizeRating?.(ratingBefore) ?? Math.max(300, Number(ratingBefore) || 500);
    const safeRatingAfter = this.eloRatingService?.normalizeRating?.(ratingAfter) ?? Math.max(300, Number(ratingAfter) || 500);
    const resolvedSubratingBefore = subratingBefore ?? userRow?.[subratingField] ?? safeRatingBefore;
    const resolvedSubratingAfter = subratingAfter ?? resolvedSubratingBefore;

    return {
      actualScore,
      expectedScore,
      ratingBefore: safeRatingBefore,
      ratingAfter: safeRatingAfter,
      ratingChange: safeRatingAfter - safeRatingBefore,
      tier: this.eloRatingService?.getTier?.(safeRatingAfter) ?? "Bronze",
      division: this.eloRatingService?.getDivision?.(safeRatingAfter) ?? "III",
      subratingField,
      subratingBefore: resolvedSubratingBefore,
      subratingAfter: resolvedSubratingAfter,
      subratingChange: resolvedSubratingAfter - resolvedSubratingBefore,
    };
  }

  _calculateCountdownDisconnectRatings({ match, winnerId, playerAData, playerBData }) {
    if (!winnerId || !this.eloRatingService) return null;

    const difficulty = normalizeDifficulty(match.difficulty);
    const subratingField = `${difficulty}_rating`;
    const playerAResolved = playerAData ?? { id: match.playerA.userId, rating: match.playerA.rating ?? 500 };
    const playerBResolved = playerBData ?? { id: match.playerB.userId, rating: match.playerB.rating ?? 500 };
    const loserId = winnerId === match.playerA.userId ? match.playerB.userId : match.playerA.userId;
    const loserIsPlayerA = loserId === match.playerA.userId;

    const winnerRow = loserIsPlayerA ? playerBResolved : playerAResolved;
    const loserRow = loserIsPlayerA ? playerAResolved : playerBResolved;
    const winnerRatingBefore = this.eloRatingService.normalizeRating(winnerRow.rating);
    const loserRatingBefore = this.eloRatingService.normalizeRating(loserRow.rating);
    const winnerExpectedScore = this.eloRatingService.getExpectedScore(winnerRatingBefore, loserRatingBefore);
    const loserGamesPlayed = this.eloRatingService._getGamesPlayed?.(loserRow) ?? loserRow?.games_played ?? 0;
    const loserGlobal = this.eloRatingService.calculateRatingChange(
      loserRatingBefore,
      winnerRatingBefore,
      0,
      loserGamesPlayed,
      difficulty,
    );

    const winnerSubratingBefore = this.eloRatingService.normalizeRating(winnerRow[subratingField] ?? winnerRatingBefore);
    const loserSubratingBefore = this.eloRatingService.normalizeRating(loserRow[subratingField] ?? loserRatingBefore);
    const loserSubrating = this.eloRatingService.calculateRatingChange(
      loserSubratingBefore,
      winnerSubratingBefore,
      0,
      loserGamesPlayed,
      difficulty,
    );

    const winnerRatingData = this._buildStaticRatingData({
      userRow: winnerRow,
      ratingBefore: winnerRatingBefore,
      ratingAfter: winnerRatingBefore,
      actualScore: 1,
      expectedScore: winnerExpectedScore,
      difficulty,
      subratingBefore: winnerSubratingBefore,
      subratingAfter: winnerSubratingBefore,
    });

    const loserRatingData = this._buildStaticRatingData({
      userRow: loserRow,
      ratingBefore: loserRatingBefore,
      ratingAfter: loserRatingBefore + loserGlobal.ratingChange,
      actualScore: 0,
      expectedScore: loserGlobal.expectedScore,
      difficulty,
      subratingBefore: loserSubratingBefore,
      subratingAfter: loserSubratingBefore + loserSubrating.ratingChange,
    });

    return loserIsPlayerA
      ? { playerA: loserRatingData, playerB: winnerRatingData }
      : { playerA: winnerRatingData, playerB: loserRatingData };
  }
  _buildUserUpdate(userRow, { ratingData, won, lost, drew }) {
    const wins = userRow?.wins ?? 0;
    const losses = userRow?.losses ?? 0;
    const draws = userRow?.draws ?? 0;

    const matchesPlayed = userRow?.matches_played ?? null;
    const totalMatches = userRow?.total_matches ?? null;
    const gamesPlayed = userRow?.games_played ?? null;
    const subratingField = ratingData?.subratingField;

    const base = {
      rating: ratingData?.ratingAfter ?? userRow?.rating ?? 500,
      wins: won ? wins + 1 : wins,
      losses: lost ? losses + 1 : losses,
      draws: drew ? draws + 1 : draws,
      updated_at: new Date().toISOString(),
    };

    if (subratingField && Object.prototype.hasOwnProperty.call(userRow ?? {}, subratingField)) {
      base[subratingField] = ratingData?.subratingAfter ?? userRow?.[subratingField] ?? base.rating;
    }

    if (matchesPlayed !== null) base.matches_played = matchesPlayed + 1;
    if (totalMatches !== null) base.total_matches = totalMatches + 1;
    if (gamesPlayed !== null) base.games_played = gamesPlayed + 1;

    return base;
  }
  // ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ FIX: room-based emit (reconnect-safe)
  async _syncRuntimeMatch(matchId, match, status = null) {
    if (!this.sharedStateStore?.upsertRuntimeMatch || !matchId || !match) return;
    const nextStatus = status || match.status || "UNKNOWN";
    await this.sharedStateStore.upsertRuntimeMatch(matchId, {
      status: nextStatus,
      leaseExpiresAt: new Date(Date.now() + 30_000).toISOString(),
      matchType: match.matchType || "ranked",
      difficulty: match.difficulty || null,
      problemId: match.problem?.id || null,
      playerAUserId: match.playerA?.userId || null,
      playerBUserId: match.playerB?.userId || null,
      state: {
        matchId,
        status: nextStatus,
        matchType: match.matchType || "ranked",
        difficulty: match.difficulty || null,
        startTimeMs: match.startTimeMs || null,
        timeLimitSec: match.timeLimitSec || null,
        playerA: match.playerA ? { userId: match.playerA.userId, username: match.playerA.username, rating: match.playerA.rating ?? 500 } : null,
        playerB: match.playerB ? { userId: match.playerB.userId, username: match.playerB.username, rating: match.playerB.rating ?? 500 } : null,
        problem: match.problem ? { id: match.problem.id, title: match.problem.title, difficulty: match.problem.difficulty || match.difficulty || null } : null,
      },
    });
  }

  async _clearRuntimeMatch(matchId, match) {
    await this.sharedStateStore?.clearPresenceActiveMatch?.([match?.playerA?.userId, match?.playerB?.userId]);
    await this.sharedStateStore?.removeRuntimeMatch?.(matchId);
  }

  async syncRuntimeLeases() {
    if (!this.sharedStateStore?.upsertRuntimeMatch) return;

    const entries = [ ...this.pendingMatches.entries(), ...this.activeMatches.entries() ];
    await Promise.all(entries.map(([matchId, match]) => this._syncRuntimeMatch(matchId, match, match?.status || null)));
  }

  _emitToPlayer(player, event, payload) {
    if (!player?.userId) return;
    this.io?.to?.(`user:${player.userId}`)?.emit?.(event, payload);
    void this.sharedStateStore?.dispatchSocketEventToUser?.(player.userId, event, payload);
  }

  _emitToUser(userId, match, event, payload) {
    if (userId === match.playerA.userId) return this._emitToPlayer(match.playerA, event, payload);
    if (userId === match.playerB.userId) return this._emitToPlayer(match.playerB, event, payload);
  }

  _emitToOpponent(userId, match, event, payload) {
    if (userId === match.playerA.userId) return this._emitToPlayer(match.playerB, event, payload);
    if (userId === match.playerB.userId) return this._emitToPlayer(match.playerA, event, payload);
  }

  async _safeUpdate(table, whereEq, patch) {
    try {
      let q = this.supabase.from(table).update(patch);
      Object.entries(whereEq).forEach(([k, v]) => { q = q.eq(k, v); });
      const { error } = await q;
      if (error) console.error(`[DB] update ${table} failed:`, error);
    } catch (e) {
      console.error(`[DB] update ${table} exception:`, e);
    }
  }

  async _safeInsert(table, row) {
    try {
      const { error } = await this.supabase.from(table).insert(row);
      if (error) console.error(`[DB] insert ${table} failed:`, error);
    } catch (e) {
      console.error(`[DB] insert ${table} exception:`, e);
    }
  }
}