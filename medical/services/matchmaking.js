// services/matchmaking.js
// ✅ Separate ranked/casual queues
// ✅ Expanding rating window over time
// ✅ Never resets waitTime by re-queueing on failures
// ✅ Only removes players AFTER a match is successfully created
// ✅ Emits match_found once
// ✅ Starts match via MatchController after countdown
// ✅ Backwards/forwards compatible match insert (handles matches.ranked column not existing)

export class MatchmakingService {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   * @param {import('socket.io').Server} io
   * @param {any} matchController optional (used to start match after countdown)
   */
  constructor(supabase, io, matchController = null) {
    this.supabase = supabase;
    this.io = io;
    this.matchController = matchController;

    /** @type {{ ranked: any[], casual: any[] }} */
    this.queues = { ranked: [], casual: [] };

    this.MATCHMAKING_TICK_MS = 1000;
    this.QUEUE_UPDATE_TICK_MS = 1000;

    // rating window expansion settings
    this.BASE_RANGE = 100;
    this.MAX_RANGE = 500;
    this.RANGE_GROW_PER_SEC = 10;

    // prevents creating multiple matches for same user
    this.inFlight = new Set(); // userId

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

  /**
   * player = { userId, username, rating, socketId, matchType?: 'ranked'|'casual' }
   */
  async addToQueue(player) {
    const matchType = player.matchType || "ranked";

    // Remove from any previous queue entry (avoid duplicates)
    this.removeFromQueue(player.userId);

    const queuedPlayer = {
      userId: player.userId,
      username: player.username,
      rating: Number(player.rating) || 1200,
      socketId: player.socketId,
      matchType,
      joinedAt: Date.now(),
    };

    this.getQueue(matchType).push(queuedPlayer);

    console.log(
      `👥 Player ${queuedPlayer.username} joined ${matchType} queue (${this.getQueue(matchType).length})`
    );

    // Try to match quickly (but DO NOT break queue if match creation fails)
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
    // Try ranked first (fast UX)
    await this.processQueue("ranked");
    await this.processQueue("casual");
  }

  /**
   * IMPORTANT: This function NEVER removes users unless match creation succeeds.
   */
  async processQueue(matchType) {
    this.pruneDeadSockets(matchType);

    const q = this.getQueue(matchType);
    if (q.length < 2) return;

    // compute ranges
    const enriched = q.map((p) => ({
      ...p,
      ratingRange: this._computeRange(p.joinedAt),
    }));

    // sort by rating, try adjacent pairings
    enriched.sort((a, b) => a.rating - b.rating);

    for (let i = 0; i < enriched.length - 1; i++) {
      const a = enriched[i];
      const b = enriched[i + 1];

      // still in queue?
      const aInQ = q.find((x) => x.userId === a.userId);
      const bInQ = q.find((x) => x.userId === b.userId);
      if (!aInQ || !bInQ) continue;

      // avoid double work
      if (this.inFlight.has(a.userId) || this.inFlight.has(b.userId)) continue;

      const diff = Math.abs(a.rating - b.rating);
      const range = Math.max(a.ratingRange ?? this.BASE_RANGE, b.ratingRange ?? this.BASE_RANGE);

      // require BOTH players to be within their current range window
      if (diff > range) continue;

      // Attempt to create match. If it fails, keep them in queue (NO reset).
      this.inFlight.add(a.userId);
      this.inFlight.add(b.userId);

      try {
        const ok = await this.createMatch(aInQ, bInQ, matchType);
        if (ok) {
          // remove only after success
          this.removeFromQueue(a.userId);
          this.removeFromQueue(b.userId);
        }
      } finally {
        this.inFlight.delete(a.userId);
        this.inFlight.delete(b.userId);
      }

      // Only try one pairing per tick to reduce race conditions
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

  // 🔴 HARD VALIDATION
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
    rating: Number(playerA.rating) || 1200,
    username: playerA.username || "Player",
  };

  const safeB = userB ?? {
    id: playerB.userId,
    rating: Number(playerB.rating) || 1200,
    username: playerB.username || "Player",
  };

  const { data: match, error } = await this.supabase
    .from("matches")
    .insert({
      match_type: matchType,
      problem_id: problem.id, // ✅ guaranteed valid
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
    return false;
  }

  console.log("Match created with problem:", problem.title);

  const countdown = 3;

  const payload = {
    matchId: match.id,
    opponent: null,
    problem: {
      id: problem.id,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      timeLimit: problem.time_limit_seconds,
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
    setTimeout(() => {
      this.matchController
        .startMatch(match.id, playerA, playerB, problem)
        .catch((e) => console.error("startMatch error:", e));
    }, countdown * 1000);
  }

  return true;
}


  async selectProblem(matchType, ratingA, ratingB) {
    const { data: problems, error } = await this.supabase
      .from("problems")
      .select("*")
      .eq("is_active", true);

    if (error || !problems || problems.length === 0) {
      throw new Error("No active problems available");
    }

    // casual: random
    if (matchType === "casual") {
      return problems[Math.floor(Math.random() * problems.length)];
    }

    // ranked: difficulty bucket based on avg rating
    const avg = (Number(ratingA) + Number(ratingB)) / 2;

    const bucket =
      avg < 1100 ? ["easy"] :
      avg < 1400 ? ["easy", "medium"] :
      avg < 1700 ? ["medium"] :
      ["medium", "hard"];

    const filtered = problems.filter((p) => bucket.includes(String(p.difficulty || "").toLowerCase()));
    const pool = filtered.length ? filtered : problems;

    return pool[Math.floor(Math.random() * pool.length)];
  }
}