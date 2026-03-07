import {
  DIFFICULTY_SETTINGS,
  PROVISIONAL_K_FACTOR,
  PROVISIONAL_MATCHES,
  getDifficultyRatingField,
  getDifficultySettings,
  normalizeDifficulty,
} from "./duel-competition.js";

export class EloRatingService {
  constructor() {
    this.STARTING_RATING = 500;
    this.MIN_RATING = 300;
    this.RANKS = [
      { tier: 'Bronze', min: 300, max: 799 },
      { tier: 'Silver', min: 800, max: 1099 },
      { tier: 'Gold', min: 1100, max: 1399 },
      { tier: 'Platinum', min: 1400, max: 1699 },
      { tier: 'Diamond', min: 1700, max: 1999 },
      { tier: 'Master', min: 2000, max: 2299 },
      { tier: 'Grandmaster', min: 2300, max: 2599 },
      { tier: 'Legend', min: 2600, max: null },
    ];
  }

  normalizeRating(rating) {
    const numericRating = Number(rating);
    return Math.max(this.MIN_RATING, Number.isFinite(numericRating) ? numericRating : this.STARTING_RATING);
  }

  getExpectedScore(playerRating, opponentRating) {
    const safePlayerRating = this.normalizeRating(playerRating);
    const safeOpponentRating = this.normalizeRating(opponentRating);
    return 1 / (1 + Math.pow(10, (safeOpponentRating - safePlayerRating) / 400));
  }

  getKFactor(gamesPlayed, difficulty = 'medium') {
    const safeGamesPlayed = Math.max(0, Number(gamesPlayed) || 0);
    if (safeGamesPlayed < PROVISIONAL_MATCHES) return PROVISIONAL_K_FACTOR;
    return getDifficultySettings(difficulty).kFactor;
  }

  calculateRatingChange(playerRating, opponentRating, actualScore, gamesPlayed = 0, difficulty = 'medium') {
    const expectedScore = this.getExpectedScore(playerRating, opponentRating);
    const rawRatingChange = Math.round(this.getKFactor(gamesPlayed, difficulty) * (actualScore - expectedScore));
    let ratingChange = rawRatingChange;

    if (actualScore > 0.5) {
      const minimumWinGain = actualScore >= 0.93 ? 6 : 4;
      ratingChange = Math.max(rawRatingChange, minimumWinGain);
    } else if (actualScore < 0.5) {
      const minimumLossMagnitude = actualScore <= 0.07 ? 5 : 4;
      ratingChange = Math.min(rawRatingChange, -minimumLossMagnitude);
    }

    return {
      expectedScore,
      ratingChange,
    };
  }

  getTier(rating) {
    const safeRating = this.normalizeRating(rating);
    return this.RANKS.find((rank) => safeRating >= rank.min && (rank.max === null || safeRating <= rank.max))?.tier || 'Bronze';
  }

  getDivision(rating) {
    const safeRating = this.normalizeRating(rating);
    const rank = this.RANKS.find((entry) => safeRating >= entry.min && (entry.max === null || safeRating <= entry.max)) || this.RANKS[0];

    if (rank.max === null) return 'I';

    const tierSize = rank.max - rank.min + 1;
    const divisionSize = tierSize / 3;
    const positionInTier = safeRating - rank.min;

    if (positionInTier >= divisionSize * 2) return 'I';
    if (positionInTier >= divisionSize) return 'II';
    return 'III';
  }

  _getGamesPlayed(playerData) {
    return playerData.games_played ?? playerData.matches_played ?? playerData.total_matches ?? 0;
  }

  _resolveActualScores(playerAData, playerBData, winnerId, isDraw, options) {
    if (typeof options.playerAActualScore === 'number' && typeof options.playerBActualScore === 'number') {
      return {
        playerAActualScore: options.playerAActualScore,
        playerBActualScore: options.playerBActualScore,
      };
    }

    if (isDraw) {
      return { playerAActualScore: 0.5, playerBActualScore: 0.5 };
    }

    if (winnerId === playerAData.id) {
      return { playerAActualScore: 1, playerBActualScore: 0 };
    }

    return { playerAActualScore: 0, playerBActualScore: 1 };
  }

  _calculateTrackUpdate({ playerRating, opponentRating, gamesPlayed, actualScore, difficulty }) {
    const { expectedScore, ratingChange } = this.calculateRatingChange(
      playerRating,
      opponentRating,
      actualScore,
      gamesPlayed,
      difficulty
    );

    return {
      expectedScore,
      ratingBefore: playerRating,
      ratingAfter: Math.max(this.MIN_RATING, playerRating + ratingChange),
      ratingChange,
    };
  }

  calculateMatchRatings(playerAData, playerBData, winnerId, isDraw = false, options = {}) {
    const difficulty = normalizeDifficulty(options.difficulty);
    const playerAGames = this._getGamesPlayed(playerAData);
    const playerBGames = this._getGamesPlayed(playerBData);
    const { playerAActualScore, playerBActualScore } = this._resolveActualScores(
      playerAData,
      playerBData,
      winnerId,
      isDraw,
      options
    );

    const playerARating = this.normalizeRating(playerAData.rating);
    const playerBRating = this.normalizeRating(playerBData.rating);
    const playerAGlobal = this._calculateTrackUpdate({
      playerRating: playerARating,
      opponentRating: playerBRating,
      gamesPlayed: playerAGames,
      actualScore: playerAActualScore,
      difficulty,
    });
    const playerBGlobal = this._calculateTrackUpdate({
      playerRating: playerBRating,
      opponentRating: playerARating,
      gamesPlayed: playerBGames,
      actualScore: playerBActualScore,
      difficulty,
    });

    const subratingField = getDifficultyRatingField(difficulty);
    const playerASubratingBefore = this.normalizeRating(playerAData[subratingField] ?? playerAData.rating);
    const playerBSubratingBefore = this.normalizeRating(playerBData[subratingField] ?? playerBData.rating);
    const playerASubrating = this._calculateTrackUpdate({
      playerRating: playerASubratingBefore,
      opponentRating: playerBSubratingBefore,
      gamesPlayed: playerAGames,
      actualScore: playerAActualScore,
      difficulty,
    });
    const playerBSubrating = this._calculateTrackUpdate({
      playerRating: playerBSubratingBefore,
      opponentRating: playerASubratingBefore,
      gamesPlayed: playerBGames,
      actualScore: playerBActualScore,
      difficulty,
    });

    return {
      difficulty,
      kFactor: DIFFICULTY_SETTINGS[difficulty].kFactor,
      provisional: {
        playerA: playerAGames < PROVISIONAL_MATCHES,
        playerB: playerBGames < PROVISIONAL_MATCHES,
      },
      playerA: {
        actualScore: playerAActualScore,
        expectedScore: playerAGlobal.expectedScore,
        ratingBefore: playerAGlobal.ratingBefore,
        ratingAfter: playerAGlobal.ratingAfter,
        ratingChange: playerAGlobal.ratingChange,
        tier: this.getTier(playerAGlobal.ratingAfter),
        division: this.getDivision(playerAGlobal.ratingAfter),
        subratingField,
        subratingBefore: playerASubrating.ratingBefore,
        subratingAfter: playerASubrating.ratingAfter,
        subratingChange: playerASubrating.ratingChange,
      },
      playerB: {
        actualScore: playerBActualScore,
        expectedScore: playerBGlobal.expectedScore,
        ratingBefore: playerBGlobal.ratingBefore,
        ratingAfter: playerBGlobal.ratingAfter,
        ratingChange: playerBGlobal.ratingChange,
        tier: this.getTier(playerBGlobal.ratingAfter),
        division: this.getDivision(playerBGlobal.ratingAfter),
        subratingField,
        subratingBefore: playerBSubrating.ratingBefore,
        subratingAfter: playerBSubrating.ratingAfter,
        subratingChange: playerBSubrating.ratingChange,
      },
    };
  }
}


