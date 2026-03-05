export class EloRatingService {
  calculateRatingChange(playerRating, opponentRating, result, gamesPlayed = 0, tier = 'Gold') {
    const K = this.getKFactor(gamesPlayed, tier);

    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

    const ratingChange = Math.round(K * (actualScore - expectedScore));

    return ratingChange;
  }

  getKFactor(gamesPlayed, tier) {
    if (gamesPlayed < 20) {
      return 40;
    }

    if (tier === 'Diamond' || tier === 'Master') {
      return 24;
    }

    return 32;
  }

  getTier(rating) {
    if (rating >= 1800) return 'Master';
    if (rating >= 1600) return 'Diamond';
    if (rating >= 1400) return 'Platinum';
    if (rating >= 1200) return 'Gold';
    if (rating >= 1000) return 'Silver';
    return 'Bronze';
  }

  getDivision(rating) {
    let tierBase;
    let tierSize = 200;

    if (rating >= 1800) {
      return 'I';
    } else if (rating >= 1600) {
      tierBase = 1600;
    } else if (rating >= 1400) {
      tierBase = 1400;
    } else if (rating >= 1200) {
      tierBase = 1200;
    } else if (rating >= 1000) {
      tierBase = 1000;
    } else {
      tierBase = 0;
      tierSize = 1000;
    }

    const positionInTier = rating - tierBase;
    const divisionSize = tierSize / 3;

    if (positionInTier >= divisionSize * 2) {
      return 'I';
    } else if (positionInTier >= divisionSize) {
      return 'II';
    } else {
      return 'III';
    }
  }

  calculateMatchRatings(playerAData, playerBData, winnerId, isDraw = false) {
    const playerARating = playerAData.rating;
    const playerBRating = playerBData.rating;
    const playerAGames = playerAData.games_played;
    const playerBGames = playerBData.games_played;

    const playerATier = this.getTier(playerARating);
    const playerBTier = this.getTier(playerBRating);

    let playerAResult, playerBResult;

    if (isDraw) {
      playerAResult = 'draw';
      playerBResult = 'draw';
    } else if (winnerId === playerAData.id) {
      playerAResult = 'win';
      playerBResult = 'loss';
    } else {
      playerAResult = 'loss';
      playerBResult = 'win';
    }

    const playerAChange = this.calculateRatingChange(
      playerARating,
      playerBRating,
      playerAResult,
      playerAGames,
      playerATier
    );

    const playerBChange = this.calculateRatingChange(
      playerBRating,
      playerARating,
      playerBResult,
      playerBGames,
      playerBTier
    );

    return {
      playerA: {
        ratingBefore: playerARating,
        ratingAfter: playerARating + playerAChange,
        ratingChange: playerAChange,
      },
      playerB: {
        ratingBefore: playerBRating,
        ratingAfter: playerBRating + playerBChange,
        ratingChange: playerBChange,
      },
    };
  }
}