import { normalizeDifficulty, resolveTimeLimitSeconds } from "./duel-competition.js";

export class MatchmakingService {
  constructor(supabase, io, matchController = null, stateStore = null) {
    this.supabase = supabase;
    this.io = io;
    this.matchController = matchController;
    this.stateStore = stateStore;

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
      this.broadcastQueueStatus().catch((e) => console.error("broadcastQueueStatus error:", e));
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

  async _emitPlayerEvent(player, event, payload) {
    if (!player?.userId) return;
    const socket = this._socket(player.socketId);
    if (socket) socket.emit(event, payload);
    await this.stateStore?.dispatchSocketEventToUser?.(player.userId, event, payload);
  }

  pruneDeadSockets(matchType) {
    const q = this.getQueue(matchType);
    for (let index = q.length - 1; index >= 0; index -= 1) {
      if (!this._socket(q[index].socketId)) q.splice(index, 1);
    }
  }

  _computeRange(joinedAt) {
    const joinedAtMs = joinedAt instanceof Date ? joinedAt.getTime() : Date.parse(joinedAt) || Number(joinedAt) || Date.now();
    const elapsedSeconds = Math.floor((Date.now() - joinedAtMs) / 1000);
    return Math.min(this.MAX_RANGE, this.BASE_RANGE + elapsedSeconds * this.RANGE_GROW_PER_SEC);
  }

  async _getSharedQueue(matchType) {
    return this.stateStore ? this.stateStore.listQueue(matchType) : this.getQueue(matchType);
  }

  async addToQueue(player) {
    const matchType = player.matchType || "ranked";
    await this.removeFromQueue(player.userId);

    const queuedPlayer = {
      userId: player.userId,
      username: player.username,
      rating: Number(player.rating) || 500,
      socketId: player.socketId,
      sessionEvidence: player.sessionEvidence || null,
      connectionRiskFlags: Array.isArray(player.connectionRiskFlags) ? [...player.connectionRiskFlags] : [],
      matchType,
      joinedAt: Date.now(),
    };

    if (this.stateStore) {
      await this.stateStore.enqueuePlayer(queuedPlayer);
    } else {
      this.getQueue(matchType).push(queuedPlayer);
    }

    console.log(`Player ${queuedPlayer.username} joined ${matchType} queue`);

    await this.processQueue(matchType);
    return null;
  }

  async removeFromQueue(userId) {
    if (this.stateStore) {
      await this.stateStore.removeFromQueue(userId);
      return;
    }

    for (const type of ["ranked", "casual"]) {
      const q = this.getQueue(type);
      for (let index = q.length - 1; index >= 0; index -= 1) {
        if (q[index].userId === userId) q.splice(index, 1);
      }
    }
  }

  async isQueued(userId, matchType = null) {
    if (this.stateStore) {
      return this.stateStore.isQueued(userId, matchType);
    }

    const types = matchType ? [matchType] : ["ranked", "casual"];
    return types.some((type) => this.getQueue(type).some((player) => player.userId === userId));
  }

  async broadcastQueueStatus() {
    const now = Date.now();

    for (const matchType of ["ranked", "casual"]) {
      if (!this.stateStore) {
        this.pruneDeadSockets(matchType);
      }

      const queue = await this._getSharedQueue(matchType);
      queue.forEach((player, index) => {
        const socketId = player.socket_id || player.socketId;
        const socket = this._socket(socketId);
        if (!socket) return;

        const waitTime = Math.floor((now - (Date.parse(player.joined_at || player.joinedAt) || now)) / 1000);
        const ratingRange = this._computeRange(player.joined_at || player.joinedAt);

        socket.emit("queue_update", {
          matchType,
          waitTime,
          queuePosition: index + 1,
          queueSize: queue.length,
          ratingRange,
        });
      });
    }
  }

  async processQueues() {
    await this.processQueue("ranked");
    await this.processQueue("casual");
  }

  async _claimSharedPair(matchType) {
    const claimed = await this.stateStore.claimMatchPair(matchType, {
      baseRange: this.BASE_RANGE,
      maxRange: this.MAX_RANGE,
      rangeGrowPerSec: this.RANGE_GROW_PER_SEC,
    });

    if (!claimed?.playerA?.user_id || !claimed?.playerB?.user_id) {
      return null;
    }

    return {
      a: {
        userId: claimed.playerA.user_id,
        username: claimed.playerA.username,
        rating: claimed.playerA.rating,
        socketId: claimed.playerA.socket_id,
        sessionEvidence: claimed.playerA.session_evidence || null,
        connectionRiskFlags: claimed.playerA.connection_risk_flags || [],
        matchType: claimed.playerA.match_type || matchType,
        joinedAt: claimed.playerA.joined_at,
      },
      b: {
        userId: claimed.playerB.user_id,
        username: claimed.playerB.username,
        rating: claimed.playerB.rating,
        socketId: claimed.playerB.socket_id,
        sessionEvidence: claimed.playerB.session_evidence || null,
        connectionRiskFlags: claimed.playerB.connection_risk_flags || [],
        matchType: claimed.playerB.match_type || matchType,
        joinedAt: claimed.playerB.joined_at,
      },
    };
  }

  async processQueue(matchType) {
    if (!this.stateStore) {
      this.pruneDeadSockets(matchType);
    }

    const queue = await this._getSharedQueue(matchType);
    if (queue.length < 2) return;

    if (this.stateStore) {
      const claimedPair = await this._claimSharedPair(matchType);
      if (!claimedPair) return;
      await this.createMatch(claimedPair.a, claimedPair.b, matchType);
      return;
    }

    const enriched = queue.map((player) => ({
      ...player,
      ratingRange: this._computeRange(player.joinedAt),
    }));

    enriched.sort((left, right) => left.rating - right.rating);

    for (let index = 0; index < enriched.length - 1; index += 1) {
      const a = enriched[index];
      const b = enriched[index + 1];

      const aInQueue = queue.find((entry) => entry.userId === a.userId);
      const bInQueue = queue.find((entry) => entry.userId === b.userId);
      if (!aInQueue || !bInQueue) continue;
      if (this.inFlight.has(a.userId) || this.inFlight.has(b.userId)) continue;

      const ratingDiff = Math.abs(a.rating - b.rating);
      const ratingRange = Math.max(a.ratingRange ?? this.BASE_RANGE, b.ratingRange ?? this.BASE_RANGE);
      if (ratingDiff > ratingRange) continue;

      this.inFlight.add(a.userId);
      this.inFlight.add(b.userId);

      try {
        const ok = await this.createMatch(aInQueue, bInQueue, matchType);
        if (ok) {
          await this.removeFromQueue(a.userId);
          await this.removeFromQueue(b.userId);
        }
      } finally {
        this.inFlight.delete(a.userId);
        this.inFlight.delete(b.userId);
      }

      return;
    }
  }

  async createMatch(playerA, playerB, matchType) {
    const socketA = this._socket(playerA.socketId);
    const socketB = this._socket(playerB.socketId);

    if (!this.stateStore && (!socketA || !socketB)) {
      console.warn("createMatch: socket missing");
      await this.removeFromQueue(playerA.userId);
      await this.removeFromQueue(playerB.userId);
      return false;
    }

    if (this.stateStore) {
      const [presenceA, presenceB] = await Promise.all([
        this.stateStore.getPresence(playerA.userId),
        this.stateStore.getPresence(playerB.userId),
      ]);

      if (!presenceA || !presenceB) {
        console.warn("createMatch: runtime presence missing", { playerA: !!presenceA, playerB: !!presenceB });
        await this.removeFromQueue(playerA.userId);
        await this.removeFromQueue(playerB.userId);
        return false;
      }
    }

    let problem;
    try {
      problem = await this.selectProblem(matchType, playerA.rating, playerB.rating);
    } catch (error) {
      console.error("Problem selection failed:", error);
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
      playerA: { ...playerA },
      playerB: { ...playerB },
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
      countdown,
    };

    await this._emitPlayerEvent(playerA, "match_found", {
      ...payload,
      opponent: { username: safeB.username, rating: safeB.rating },
    });

    await this._emitPlayerEvent(playerB, "match_found", {
      ...payload,
      opponent: { username: safeA.username, rating: safeA.rating },
    });

    await this.stateStore?.setPresenceActiveMatch?.([playerA.userId, playerB.userId], match.id);

    if (this.matchController?.startMatch) {
      const countdownHandle = setTimeout(() => {
        if (this.matchController?.pendingMatches) {
          this.matchController.pendingMatches.delete(match.id);
        }
        this.matchController
          .startMatch(match.id, playerA, playerB, problem)
          .catch((error) => console.error("startMatch error:", error));
      }, countdown * 1000);

      const pendingMatch = {
        matchId: match.id,
        playerA: { ...playerA },
        playerB: { ...playerB },
        problem: { ...problem, difficulty, time_limit_seconds: timeLimit },
        difficulty,
        startTimeMs: Date.now(),
        timeLimitMs: Math.max(5, timeLimit) * 1000,
        timeLimitSec: timeLimit,
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
        status: "COUNTDOWN",
        matchType,
        isRanked: matchType === "ranked",
        ending: false,
        timeoutHandle: null,
        countdownHandle,
      };

      if (this.matchController?.pendingMatches) {
        this.matchController.pendingMatches.set(match.id, pendingMatch);
      }

      await this.stateStore?.upsertRuntimeMatch?.(match.id, {
        status: "COUNTDOWN",
        leaseExpiresAt: new Date(Date.now() + 30_000).toISOString(),
        matchType,
        difficulty,
        problemId: problem.id,
        playerAUserId: playerA.userId,
        playerBUserId: playerB.userId,
        state: {
          matchType,
          difficulty,
          countdown,
          playerA: { userId: playerA.userId, username: playerA.username, rating: safeA.rating },
          playerB: { userId: playerB.userId, username: playerB.username, rating: safeB.rating },
          problem: { id: problem.id, title: problem.title, difficulty },
        },
      });
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
    void matchType;
    void ratingA;
    void ratingB;
    const { data: problems, error } = await this.supabase
      .from("problems")
      .select("id, title, statement, difficulty, time_limit_seconds, memory_limit_mb, supported_languages, starter_code, tags, short_story, input_format, output_format, constraints_text, solution_explanation, estimated_time_minutes, rating_weight, is_active, created_at")
      .eq("is_active", true);

    if (error || !problems || problems.length === 0) {
      throw new Error("No active problems available");
    }

    return problems[Math.floor(Math.random() * problems.length)];
  }
}