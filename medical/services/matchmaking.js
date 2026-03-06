import { normalizeDifficulty, resolveTimeLimitSeconds } from "./duel-competition.js";

export class MatchmakingService {
  constructor(supabase, io, matchController = null) {
    this.supabase = supabase;
    this.io = io;
    this.matchController = matchController;

    this.queues = { ranked: [], casual: [] };

    this.MATCHMAKING_TICK_MS = 1000;
    this.QUEUE_UPDATE_TICK_MS = 1000;
    this.BASE_RANGE = 75;
    this.MAX_RANGE = 350;
    this.RANGE_GROW_PER_SEC = 2;

    this.inFlight = new Set();

    this._mmTimer = null;
    this._qTimer = null;

    this.start();
  }

  start() {
    this.stop();

    this._mmTimer = setInterval(() => {
      this.processQueues().catch((e) => console.error("processQueues error:", e));
    }, this.MATCHMAKING_TICK_MS);

    this._qTimer = setInterval(() => {
      this.broadcastQueueStatus();
    }, this.QUEUE_UPDATE_TICK_MS);
  }

  stop() {
    if (this._mmTimer) clearInterval(this._mmTimer);
    if (this._qTimer) clearInterval(this._qTimer);
    this._mmTimer = null;
    this._qTimer = null;
  }

  getQueue(matchType = "ranked") {
    return this.queues[matchType] ?? this.queues.ranked;
  }

  _socket(socketId) {
    return this.io.sockets.sockets.get(socketId);
  }

  pruneDeadSockets(matchType) {
    const q = this.getQueue(matchType);
    for (let i = q.length - 1; i >= 0; i--) {
      if (!this._socket(q[i].socketId)) q.splice(i, 1);
    }
  }

  _computeRange(joinedAt) {
    const elapsedSeconds = Math.floor((Date.now() - joinedAt) / 1000);
    return Math.min(this.MAX_RANGE, this.BASE_RANGE + elapsedSeconds * this.RANGE_GROW_PER_SEC);
  }

  async addToQueue(player) {
    const matchType = player.matchType || "ranked";
    this.removeFromQueue(player.userId);

    const queuedPlayer = {
      userId: player.userId,
      username: player.username,
      rating: Number(player.rating) || 500,
      socketId: player.socketId,
      matchType,
      joinedAt: Date.now(),
    };

    this.getQueue(matchType).push(queuedPlayer);

    console.log(`Player ${queuedPlayer.username} joined ${matchType} queue (${this.getQueue(matchType).length})`);

    await this.processQueue(matchType);
    return null;
  }

  removeFromQueue(userId) {
    for (const t of ["ranked", "casual"]) {
      const q = this.getQueue(t);
      for (let i = q.length - 1; i >= 0; i--) {
        if (q[i].userId === userId) q.splice(i, 1);
      }
    }
  }

  isQueued(userId, matchType = null) {
    const types = matchType ? [matchType] : ["ranked", "casual"];
    return types.some((type) => this.getQueue(type).some((player) => player.userId === userId));
  }

  broadcastQueueStatus() {
    const now = Date.now();

    for (const matchType of ["ranked", "casual"]) {
      this.pruneDeadSockets(matchType);

      const q = this.getQueue(matchType);
      q.forEach((p, idx) => {
        const sock = this._socket(p.socketId);
        if (!sock) return;

        const waitTime = Math.floor((now - p.joinedAt) / 1000);
        const ratingRange = this._computeRange(p.joinedAt);

        sock.emit("queue_update", {
          matchType,
          waitTime,
          queuePosition: idx + 1,
          queueSize: q.length,
          ratingRange,
        });
      });
    }
  }

  async processQueues() {
    await this.processQueue("ranked");
    await this.processQueue("casual");
  }

  async processQueue(matchType) {
    this.pruneDeadSockets(matchType);

    const q = this.getQueue(matchType);
    if (q.length < 2) return;

    const enriched = q.map((p) => ({
      ...p,
      ratingRange: this._computeRange(p.joinedAt),
    }));

    enriched.sort((a, b) => a.rating - b.rating);

    for (let i = 0; i < enriched.length - 1; i++) {
      const a = enriched[i];
      const b = enriched[i + 1];

      const aInQ = q.find((x) => x.userId === a.userId);
      const bInQ = q.find((x) => x.userId === b.userId);
      if (!aInQ || !bInQ) continue;
      if (this.inFlight.has(a.userId) || this.inFlight.has(b.userId)) continue;

      const diff = Math.abs(a.rating - b.rating);
      const range = Math.max(a.ratingRange ?? this.BASE_RANGE, b.ratingRange ?? this.BASE_RANGE);
      if (diff > range) continue;

      this.inFlight.add(a.userId);
      this.inFlight.add(b.userId);

      try {
        const ok = await this.createMatch(aInQ, bInQ, matchType);
        if (ok) {
          this.removeFromQueue(a.userId);
          this.removeFromQueue(b.userId);
        }
      } finally {
        this.inFlight.delete(a.userId);
        this.inFlight.delete(b.userId);
      }

      return;
    }
  }

  async createMatch(playerA, playerB, matchType) {
    const sockA = this._socket(playerA.socketId);
    const sockB = this._socket(playerB.socketId);

    if (!sockA || !sockB) {
      console.warn("createMatch: socket missing");
      return false;
    }

    let problem;
    try {
      problem = await this.selectProblem(matchType, playerA.rating, playerB.rating);
    } catch (e) {
      console.error("Problem selection failed:", e);
      return false;
    }

    if (!problem || !problem.id) {
      console.error("Invalid problem selected:", problem);
      return false;
    }

    const [{ data: userA }, { data: userB }] = await Promise.all([
      this.supabase.from("duel_users").select("id, rating, username").eq("id", playerA.userId).maybeSingle(),
      this.supabase.from("duel_users").select("id, rating, username").eq("id", playerB.userId).maybeSingle(),
    ]);

    const safeA = userA ?? {
      id: playerA.userId,
      rating: Number(playerA.rating) || 500,
      username: playerA.username || "Player",
    };

    const safeB = userB ?? {
      id: playerB.userId,
      rating: Number(playerB.rating) || 500,
      username: playerB.username || "Player",
    };

    const match = await this._insertMatchRecord({
      matchType,
      playerA,
      playerB,
      safeA,
      safeB,
      problem,
    });

    if (!match) return false;

    const countdown = 3;
    const difficulty = normalizeDifficulty(problem.difficulty);
    const timeLimit = resolveTimeLimitSeconds(problem);

    const payload = {
      matchId: match.id,
      opponent: null,
      problem: {
        id: problem.id,
        title: problem.title,
        statement: problem.statement,
        difficulty,
        timeLimit,
        supportedLanguages: problem.supported_languages,
        testCases: problem.test_cases,
        starterCode: problem.starter_code,
      },
      countdown,
    };

    sockA.emit("match_found", {
      ...payload,
      opponent: { username: safeB.username, rating: safeB.rating },
    });

    sockB.emit("match_found", {
      ...payload,
      opponent: { username: safeA.username, rating: safeA.rating },
    });

    if (this.matchController?.startMatch) {
      const countdownHandle = setTimeout(() => {
        if (this.matchController?.pendingMatches) {
          this.matchController.pendingMatches.delete(match.id);
        }
        this.matchController
          .startMatch(match.id, playerA, playerB, problem)
          .catch((e) => console.error("startMatch error:", e));
      }, countdown * 1000);

      if (this.matchController?.pendingMatches) {
        this.matchController.pendingMatches.set(match.id, {
          matchId: match.id,
          playerA,
          playerB,
          problem: { ...problem, difficulty, time_limit_seconds: timeLimit },
          difficulty,
          startTimeMs: Date.now(),
          timeLimitMs: Math.max(5, timeLimit) * 1000,
          timeLimitSec: timeLimit,
          submissions: new Map(),
          attempts: new Map(),
          wrongSubmissions: new Map(),
          lastSubmissionAtMs: new Map(),
          winnerId: null,
          resultStrength: "draw",
          status: "COUNTDOWN",
          matchType,
          isRanked: matchType === "ranked",
          ending: false,
          timeoutHandle: null,
          countdownHandle,
        });
      }
    }

    return true;
  }

  async _insertMatchRecord({ matchType, playerA, playerB, safeA, safeB, problem }) {
    const primaryPayload = {
      match_type: matchType,
      problem_id: problem.id,
      problem_difficulty: normalizeDifficulty(problem.difficulty),
      time_limit_seconds: resolveTimeLimitSeconds(problem),
      player_a_id: playerA.userId,
      player_b_id: playerB.userId,
      player_a_rating_before: safeA.rating,
      player_b_rating_before: safeB.rating,
      status: 'WAITING',
    };

    try {
      const { data: match, error } = await this.supabase
        .from("matches")
        .insert(primaryPayload)
        .select()
        .single();

      if (!error && match) {
        console.log("Match created with problem:", problem.title);
        return match;
      }
      console.error("Match insert failed (extended schema):", error);
    } catch (error) {
      console.error("Match insert exception (extended schema):", error);
    }

    try {
      const { data: match, error } = await this.supabase
        .from("matches")
        .insert({
          match_type: matchType,
          problem_id: problem.id,
          player_a_id: playerA.userId,
          player_b_id: playerB.userId,
          player_a_rating_before: safeA.rating,
          player_b_rating_before: safeB.rating,
          status: 'WAITING',
        })
        .select()
        .single();

      if (error || !match) {
        console.error("Match insert failed:", error);
        return null;
      }

      console.log("Match created with problem:", problem.title);
      return match;
    } catch (error) {
      console.error("Match insert exception:", error);
      return null;
    }
  }

  async selectProblem(matchType, ratingA, ratingB) {
    const { data: problems, error } = await this.supabase
      .from("problems")
      .select("*")
      .eq("is_active", true);

    if (error || !problems || problems.length === 0) {
      throw new Error("No active problems available");
    }

    return problems[Math.floor(Math.random() * problems.length)];
  }
}

