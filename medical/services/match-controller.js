// services/match-controller.js
const DEBUG_DUEL = process.env.DEBUG_DUEL === "1";
function debugMatch(...args) {
  if (DEBUG_DUEL) console.log("[match]", ...args);
}
export class MatchController {
  constructor(supabase, io, judgeService, eloRatingService) {
    this.supabase = supabase;
    this.io = io;
    this.judgeService = judgeService;
    this.eloRatingService = eloRatingService;

    /** @type {Map<string, any>} */
    this.activeMatches = new Map();

    /** @type {Map<string, NodeJS.Timeout>} */
    this.disconnectTimers = new Map();

    this.RECONNECT_GRACE_PERIOD_MS = 30_000;
  }

  /**
   * Starts a match and notifies both clients.
   */
  async startMatch(matchId, playerA, playerB, problem) {
    console.log(`▶️ Starting match ${matchId}`);

    const matchMeta = await this._loadMatchMeta(matchId);
    const matchType = matchMeta.matchType; // "ranked" | "casual"
    const isRanked = matchType === "ranked";

    const nowMs = Date.now();
    const timeLimitSec = Number(problem?.time_limit_seconds ?? 60);
    const timeLimitMs = Math.max(5, timeLimitSec) * 1000;

    const matchData = {
      matchId,
      playerA,
      playerB,
      problem,
      startTimeMs: nowMs,
      timeLimitMs,
      submissions: new Map(),
      lastSubmissionAtMs: new Map(),
      winnerId: null,
      status: "ACTIVE",
      matchType,
      isRanked,
      ending: false,
      timeoutHandle: null,
    };

    this.activeMatches.set(matchId, matchData);

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
        difficulty: problem.difficulty,
        timeLimit: timeLimitSec,
        supportedLanguages: problem.supported_languages,
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
    const match = this.activeMatches.get(matchId);
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

    const isPlayerA = userId === match.playerA.userId;
    const isPlayerB = userId === match.playerB.userId;
    if (!isPlayerA && !isPlayerB) {
      socket?.emit?.("submission_error", { message: "User is not part of this match" });
      return;
    }

    console.log(`🧪 Submission for match ${matchId} from user ${userId}`);

    const lang = (language ?? "").toString().toLowerCase();
    const allowed = new Set(["javascript", "js", "python", "py"]);
    if (!allowed.has(lang)) {
      socket?.emit?.("submission_error", { message: `Unsupported language: ${language}` });
      return;
    }

    // rate limit
    const lastAt = match.lastSubmissionAtMs.get(userId) ?? 0;
    const now = Date.now();
    if (now - lastAt < 1200) {
      socket?.emit?.("submission_error", { message: "You're submitting too fast. Please wait a moment." });
      return;
    }
    match.lastSubmissionAtMs.set(userId, now);

    socket?.emit?.("submission_running", { message: "Running tests..." });
    socket?.emit?.("submission_received", { message: "Running tests..." });

    const testCases = await this._loadTestCases(match.problem.id);
    debugMatch("testcases_loaded", { matchId, problemId: match.problem.id, count: Array.isArray(testCases) ? testCases.length : 0 });
    if (!Array.isArray(testCases) || testCases.length === 0) {
      socket?.emit?.("submission_error", { message: "This problem has no test cases configured." });
      return;
    }

    // Judge
    const judgeResults = await this.judgeService.executeCode(code, lang, testCases);
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
    const elapsedSeconds = Math.floor((submittedAtMs - match.startTimeMs) / 1000);

    const savedSubmissionId = await this._saveSubmissionBestEffort({
      matchId,
      userId,
      code,
      language,
      judgeResults,
      testCasesCount: testCases.length,
    });

    const prev = match.submissions.get(userId);
    const prevScore = prev?.score ?? prev?.result?.score ?? 0;
    const newScore = judgeResults?.score ?? 0;

    const stored = {
      ...judgeResults,
      submittedAtMs,
      elapsedSeconds,
      submissionId: savedSubmissionId,
      score: newScore,
      runtimeMs: judgeResults?.runtimeMs ?? 0,
      result: judgeResults?.result ?? judgeResults?.verdict ?? null,
    };

    if (!prev || newScore >= prevScore) {
      match.submissions.set(userId, stored);
    } else {
      match.submissions.set(userId, { ...prev, lastAttempt: stored });
    }

    await this._safeInsert("match_events", {
      match_id: matchId,
      event_type: "submission",
      user_id: userId,
      payload: {
        submission_id: savedSubmissionId,
        verdict: (judgeResults?.result ?? "").toString(),
        score: judgeResults?.score ?? 0,
        passed: judgeResults?.passed ?? 0,
        total: judgeResults?.total ?? testCases.length,
        runtime_ms: judgeResults?.runtimeMs ?? 0,
      },
    });

    const resultPayload = {
      submissionId: savedSubmissionId,
      result: judgeResults.result,
      verdict: judgeResults.result,
      score: judgeResults.score,
      passed: judgeResults.passed,
      total: judgeResults.total,
      testResults: judgeResults.testResults,
      runtimeMs: judgeResults.runtimeMs,
      memoryKb: judgeResults.memoryKb,
    };

    // ✅ With room-based emit, this reaches the submitter already.
    this._emitToUser(userId, match, "submission_result", resultPayload);

    this._emitToOpponent(userId, match, "opponent_submitted", {
      result: judgeResults.result,
      verdict: judgeResults.result,
      score: judgeResults.score,
      passed: judgeResults.passed,
      total: judgeResults.total,
    });

    if ((judgeResults.result ?? "").toLowerCase() === "accepted") {
      debugMatch("match_win", { matchId, winnerId: userId });
      await this.endMatch(matchId, userId, "correct_solution", savedSubmissionId);
    }
  }

  /**
   * Ends match due to timeout.
   */
  async endMatchByTimeout(matchId) {
    const match = this.activeMatches.get(matchId);
    if (!match || match.winnerId || match.ending) return;

    console.log(`⏱️ Match ${matchId} ended by timeout`);

    const a = match.submissions.get(match.playerA.userId);
    const b = match.submissions.get(match.playerB.userId);

    const scoreA = a?.score ?? a?.result?.score ?? 0;
    const scoreB = b?.score ?? b?.result?.score ?? 0;

    let winnerId = null;
    let reason = "timeout";

    if (a && b) {
      if (scoreA > scoreB) {
        winnerId = match.playerA.userId;
        reason = "higher_score";
      } else if (scoreB > scoreA) {
        winnerId = match.playerB.userId;
        reason = "higher_score";
      } else {
        const runtimeA = a?.runtimeMs ?? Infinity;
        const runtimeB = b?.runtimeMs ?? Infinity;
        if (runtimeA < runtimeB) {
          winnerId = match.playerA.userId;
          reason = "faster_runtime";
        } else if (runtimeB < runtimeA) {
          winnerId = match.playerB.userId;
          reason = "faster_runtime";
        } else {
          reason = "draw";
        }
      }
    } else if (a && !b) {
      winnerId = match.playerA.userId;
      reason = "opponent_no_submission";
    } else if (b && !a) {
      winnerId = match.playerB.userId;
      reason = "opponent_no_submission";
    } else {
      reason = "draw_no_submissions";
    }

    await this.endMatch(matchId, winnerId, reason, null);
  }

  /**
   * Ends match safely. winnerId can be null for draw.
   */
  async endMatch(matchId, winnerId, reason, winningSubmissionId = null) {
    const match = this.activeMatches.get(matchId);
    if (!match || match.winnerId) return;
    if (match.ending) return;

    match.ending = true;

    if (match.timeoutHandle) clearTimeout(match.timeoutHandle);

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

    const aRatingBefore = playerAData?.rating ?? match.playerA.rating ?? 1200;
    const bRatingBefore = playerBData?.rating ?? match.playerB.rating ?? 1200;

    const outcomeA =
      winnerId === match.playerA.userId ? 1 :
      winnerId === match.playerB.userId ? 0 :
      0.5;

    const matchesPlayedA =
      (playerAData?.matches_played ?? playerAData?.total_matches ?? playerAData?.games_played ?? 0);

    const isRanked = (match.matchType || "ranked") === "ranked";

    let ratingChanges = { playerAChange: 0, playerBChange: 0 };
    let newRatingA = aRatingBefore;
    let newRatingB = bRatingBefore;

    if (isRanked) {
      if (typeof this.eloRatingService?.calculateRatingChange === "function") {
        ratingChanges = this.eloRatingService.calculateRatingChange(
          aRatingBefore,
          bRatingBefore,
          outcomeA,
          matchesPlayedA
        );
        newRatingA = aRatingBefore + (ratingChanges.playerAChange ?? 0);
        newRatingB = bRatingBefore + (ratingChanges.playerBChange ?? 0);
      } else if (typeof this.eloRatingService?.calculateMatchRatings === "function") {
        const isDraw = !winnerId;
        const ratings = this.eloRatingService.calculateMatchRatings(
          playerAData ?? { rating: aRatingBefore },
          playerBData ?? { rating: bRatingBefore },
          winnerId,
          isDraw
        );
        newRatingA = ratings?.playerA?.ratingAfter ?? aRatingBefore;
        newRatingB = ratings?.playerB?.ratingAfter ?? bRatingBefore;
        ratingChanges.playerAChange = ratings?.playerA?.ratingChange ?? 0;
        ratingChanges.playerBChange = ratings?.playerB?.ratingChange ?? 0;
      }
    }

    const playerAScore = match.submissions.get(match.playerA.userId)?.score ?? 0;
    const playerBScore = match.submissions.get(match.playerB.userId)?.score ?? 0;

    await this._safeUpdate("matches", { id: matchId }, {
      status: "FINISHED",
      winner_id: winnerId,
      reason: reason ?? null,
      completed_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_seconds: durationSeconds,
      player_a_rating_after: newRatingA,
      player_b_rating_after: newRatingB,
      player_a_rating_change: ratingChanges.playerAChange ?? 0,
      player_b_rating_change: ratingChanges.playerBChange ?? 0,
      player_a_score: playerAScore,
      player_b_score: playerBScore,
    });

    if (isRanked) {
      await Promise.all([
        this._safeUpdate("duel_users", { id: match.playerA.userId }, this._buildUserUpdate(playerAData, {
          newRating: newRatingA,
          won: winnerId === match.playerA.userId,
          lost: winnerId === match.playerB.userId,
          drew: !winnerId,
        })),
        this._safeUpdate("duel_users", { id: match.playerB.userId }, this._buildUserUpdate(playerBData, {
          newRating: newRatingB,
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
      payload: { winner_id: winnerId, reason, duration_seconds: durationSeconds },
    });

    await this.createReplay(matchId, match).catch((e) => console.error("Replay error:", e));

    const matchEndData = {
      matchId,
      winnerId: winnerId ?? null,
      reason,
      duration: durationSeconds,
      matchType: match.matchType,
      playerA: {
        userId: match.playerA.userId,
        username: match.playerA.username,
        ratingBefore: aRatingBefore,
        ratingAfter: newRatingA,
        ratingChange: ratingChanges.playerAChange ?? 0,
        score: playerAScore,
        submission: match.submissions.get(match.playerA.userId) ?? null,
      },
      playerB: {
        userId: match.playerB.userId,
        username: match.playerB.username,
        ratingBefore: bRatingBefore,
        ratingAfter: newRatingB,
        ratingChange: ratingChanges.playerBChange ?? 0,
        score: playerBScore,
        submission: match.submissions.get(match.playerB.userId) ?? null,
      },
    };

    this._emitToPlayer(match.playerA, "match_end", matchEndData);
    this._emitToPlayer(match.playerB, "match_end", matchEndData);

    this.activeMatches.delete(matchId);
    console.log(`🏁 Match ${matchId} ended. Winner: ${winnerId || "Draw"}`);
  }

  /**
   * Disconnect handling: grace period; if not reconnected, opponent wins.
   */
  async handlePlayerDisconnect(userId) {
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (!match || match.winnerId || match.ending) continue;

      const inMatch = userId === match.playerA.userId || userId === match.playerB.userId;
      if (!inMatch) continue;

      if (this.disconnectTimers.has(userId)) return;

      console.log(`⚠️ Player ${userId} disconnected (grace ${this.RECONNECT_GRACE_PERIOD_MS}ms)`);

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
            payload: { reason: "forfeit_disconnect" },
          });

          await this.endMatch(matchId, opponentId, "forfeit_disconnect", null);
        } finally {
          this.disconnectTimers.delete(userId);
        }
      }, this.RECONNECT_GRACE_PERIOD_MS);

      this.disconnectTimers.set(userId, timer);
      break;
    }
  }

  handlePlayerReconnect(userId) {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
      console.log(`🔄 Player ${userId} reconnected in time`);
    }
  }

  async createReplay(matchId, match) {
    const { data: snapshots, error } = await this.supabase
      .from("code_snapshots")
      .select("*")
      .eq("match_id", matchId)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Snapshot fetch error:", error);
      return;
    }

    const playerATimeline = (snapshots ?? [])
      .filter((s) => s.user_id === match.playerA.userId)
      .map((s) => ({ timestamp: s.timestamp, code: s.code }));

    const playerBTimeline = (snapshots ?? [])
      .filter((s) => s.user_id === match.playerB.userId)
      .map((s) => ({ timestamp: s.timestamp, code: s.code }));

    const events = [];
    const a = match.submissions.get(match.playerA.userId);
    const b = match.submissions.get(match.playerB.userId);

    if (a) events.push({ type: "submission", userId: match.playerA.userId, timestamp: a.submittedAtMs, result: a.result, score: a.score });
    if (b) events.push({ type: "submission", userId: match.playerB.userId, timestamp: b.submittedAtMs, result: b.result, score: b.score });

    await this._safeInsert("match_replays", {
      match_id: matchId,
      player_a_timeline: playerATimeline,
      player_b_timeline: playerBTimeline,
      events,
    });
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
          try { tc = JSON.parse(tc); } catch {}
        }
        if (Array.isArray(tc)) return tc;
      }
    } catch {}

    try {
      const { data, error } = await this.supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", problemId)
        .order("order_index", { ascending: true });

      if (!error && Array.isArray(data) && data.length) return data;
    } catch {}

    return [];
  }

  async _saveSubmissionBestEffort({ matchId, userId, code, language, judgeResults, testCasesCount }) {
    try {
      const { data, error } = await this.supabase
        .from("submissions")
        .insert({
          match_id: matchId,
          user_id: userId,
          code,
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
          language,
          verdict: judgeResults.result ?? null,
          score: judgeResults.score ?? 0,
          runtime_ms: judgeResults.runtimeMs ?? 0,
          test_results: judgeResults.testResults ?? [],
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

  _buildUserUpdate(userRow, { newRating, won, lost, drew }) {
    const wins = userRow?.wins ?? 0;
    const losses = userRow?.losses ?? 0;
    const draws = userRow?.draws ?? 0;

    const matchesPlayed = userRow?.matches_played ?? null;
    const totalMatches = userRow?.total_matches ?? null;
    const gamesPlayed = userRow?.games_played ?? null;

    const base = {
      rating: newRating,
      wins: won ? wins + 1 : wins,
      losses: lost ? losses + 1 : losses,
      draws: drew ? draws + 1 : draws,
      updated_at: new Date().toISOString(),
    };

    if (matchesPlayed !== null) base.matches_played = matchesPlayed + 1;
    if (totalMatches !== null) base.total_matches = totalMatches + 1;
    if (gamesPlayed !== null) base.games_played = gamesPlayed + 1;

    return base;
  }

  // ✅ FIX: room-based emit (reconnect-safe)
  _emitToPlayer(player, event, payload) {
    if (!player?.userId) return;
    this.io?.to?.(`user:${player.userId}`)?.emit?.(event, payload);
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
