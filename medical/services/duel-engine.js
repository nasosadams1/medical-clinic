// services/duel-engine.js

export class DuelEngine {
  constructor(io, supabase, problemService, judge) {
    this.io = io;
    this.supabase = supabase;
    this.problemService = problemService;
    this.judge = judge;

    this.activeMatches = new Map();
  }

  /* ===============================
     START MATCH
  =============================== */

  async startMatch(matchId, player1, player2) {
    const problem = await this.problemService.getRandomActiveProblem();
    const tests = await this.problemService.getTestCases(problem.id);

    this.activeMatches.set(matchId, {
      problem,
      tests,
      players: [player1, player2],
      startTime: Date.now(),
      solvedBy: null,
      ended: false
    });

    this.io.to(matchId).emit("duel_start", {
      problem: {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        time_limit_ms: problem.time_limit_ms,
        samples: tests.samples
      }
    });
  }

  /* ===============================
     HANDLE SUBMISSION
  =============================== */

  async handleSubmission(matchId, userId, code) {
    const match = this.activeMatches.get(matchId);
    if (!match || match.ended) return;

    const results = await this.judge.runAgainstTests(
      code,
      match.tests.hidden,
      match.problem.time_limit_ms
    );

    const passedAll = results.every(r => r.passed);

    // Store submission in DB
    await this.supabase.from("duel_submissions").insert({
      match_id: matchId,
      user_id: userId,
      code,
      passed_all: passedAll,
      created_at: new Date().toISOString()
    });

    this.io.to(userId).emit("submission_result", { results });

    if (passedAll && !match.solvedBy) {
      match.solvedBy = userId;
      match.ended = true;

      await this.updateRatings(matchId, userId);

      this.io.to(matchId).emit("duel_end", {
        winnerId: userId
      });

      this.activeMatches.delete(matchId);
    }
  }

  /* ===============================
     ELO UPDATE
  =============================== */

  async updateRatings(matchId, winnerId) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    const [p1, p2] = match.players;
    const loserId = p1 === winnerId ? p2 : p1;

    const { data: players } = await this.supabase
      .from("duel_users")
      .select("*")
      .in("id", [winnerId, loserId]);

    const winner = players.find(p => p.id === winnerId);
    const loser = players.find(p => p.id === loserId);

    const K = winner.rating < 1600 ? 32 : 20;

    const expectedWinner =
      1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));

    const expectedLoser =
      1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

    const newWinnerRating =
      Math.round(winner.rating + K * (1 - expectedWinner));

    const newLoserRating =
      Math.round(loser.rating + K * (0 - expectedLoser));

    await this.supabase
      .from("duel_users")
      .update({ rating: newWinnerRating })
      .eq("id", winnerId);

    await this.supabase
      .from("duel_users")
      .update({ rating: newLoserRating })
      .eq("id", loserId);
  }
}