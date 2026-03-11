export const PROVISIONAL_MATCHES = 15;
export const PROVISIONAL_K_FACTOR = 40;
export const WRONG_SUBMISSION_PENALTY = 5;
export const ACCEPTED_BASE_SCORE = 100;
export const MAX_SPEED_BONUS = 50;

export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    defaultTimeLimitSeconds: 5 * 60,
    kFactor: 16,
    multiplier: 1.0,
    partialCreditWeight: 0.45,
    closeSolveThreshold: 0.05,
    clearSolveThreshold: 0.2,
    partialDrawThreshold: 5,
    partialCloseThreshold: 15,
  },
  medium: {
    label: "Medium",
    defaultTimeLimitSeconds: 10 * 60,
    kFactor: 24,
    multiplier: 1.25,
    partialCreditWeight: 0.6,
    closeSolveThreshold: 0.05,
    clearSolveThreshold: 0.2,
    partialDrawThreshold: 6,
    partialCloseThreshold: 18,
  },
  hard: {
    label: "Hard",
    defaultTimeLimitSeconds: 20 * 60,
    kFactor: 32,
    multiplier: 1.6,
    partialCreditWeight: 0.75,
    closeSolveThreshold: 0.05,
    clearSolveThreshold: 0.2,
    partialDrawThreshold: 8,
    partialCloseThreshold: 22,
  },
};

export function normalizeDifficulty(difficulty) {
  const value = String(difficulty || "").trim().toLowerCase();
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return "medium";
}

export function getDifficultySettings(difficulty) {
  return DIFFICULTY_SETTINGS[normalizeDifficulty(difficulty)];
}

export function resolveTimeLimitSeconds(problem) {
  return getDifficultySettings(problem?.difficulty).defaultTimeLimitSeconds;
}

export function getDifficultyRatingField(difficulty) {
  return `${normalizeDifficulty(difficulty)}_rating`;
}

export function computeSubmissionMetrics({
  difficulty,
  passed,
  total,
  accepted,
  elapsedMs,
  timeLimitMs,
  wrongSubmissionCount = 0,
}) {
  const settings = getDifficultySettings(difficulty);
  const safeTotal = Math.max(1, Number(total) || 0);
  const safePassed = Math.min(safeTotal, Math.max(0, Number(passed) || 0));
  const passRatio = safePassed / safeTotal;
  const effectiveElapsedMs = Math.max(0, Number(elapsedMs) || 0);
  const effectiveTimeLimitMs = Math.max(1, Number(timeLimitMs) || settings.defaultTimeLimitSeconds * 1000);
  const timeRemainingFraction = Math.max(0, Math.min(1, 1 - effectiveElapsedMs / effectiveTimeLimitMs));
  const correctnessScore = accepted ? ACCEPTED_BASE_SCORE : 0;
  const speedBonus = accepted ? MAX_SPEED_BONUS * timeRemainingFraction : 0;
  const partialScore = accepted ? 0 : passRatio * ACCEPTED_BASE_SCORE * settings.partialCreditWeight;
  const penalty = Math.max(0, Number(wrongSubmissionCount) || 0) * WRONG_SUBMISSION_PENALTY;
  const weightedScore = (correctnessScore + speedBonus + partialScore) * settings.multiplier;
  const duelScore = Math.max(0, Math.round((weightedScore - penalty) * 10) / 10);

  return {
    passRatio,
    correctnessScore,
    speedBonus: Math.round(speedBonus * 10) / 10,
    partialScore: Math.round(partialScore * 10) / 10,
    penalty,
    duelScore,
  };
}

export function resolveResultStrength({
  difficulty,
  reason,
  winnerId,
  playerAId,
  playerASubmission,
  playerBSubmission,
}) {
  if (!winnerId) {
    return {
      playerAActualScore: 0.5,
      playerBActualScore: 0.5,
      resultStrength: "draw",
    };
  }

  if (typeof reason === "string" && reason.startsWith("disconnect")) {
    if (winnerId === playerAId) {
      return {
        playerAActualScore: 1.0,
        playerBActualScore: 0.0,
        resultStrength: "clear",
      };
    }

    return {
      playerAActualScore: 0.0,
      playerBActualScore: 1.0,
      resultStrength: "clear",
    };
  }

  const settings = getDifficultySettings(difficulty);
  const winnerSubmission = winnerId === playerAId ? playerASubmission : playerBSubmission;
  const loserSubmission = winnerId === playerAId ? playerBSubmission : playerASubmission;

  const winnerAccepted = (winnerSubmission?.result ?? "").toString().toLowerCase() === "accepted";
  const loserAccepted = (loserSubmission?.result ?? "").toString().toLowerCase() === "accepted";

  let resultStrength = "clear";

  if (winnerAccepted && loserAccepted) {
    const winnerElapsed = Number(winnerSubmission?.elapsedSeconds ?? Infinity);
    const loserElapsed = Number(loserSubmission?.elapsedSeconds ?? Infinity);
    if (Number.isFinite(winnerElapsed) && Number.isFinite(loserElapsed) && loserElapsed > 0) {
      const solveGap = Math.max(0, loserElapsed - winnerElapsed) / loserElapsed;
      if (solveGap <= settings.closeSolveThreshold) {
        resultStrength = "close";
      } else if (solveGap <= settings.clearSolveThreshold) {
        resultStrength = "standard";
      } else {
        resultStrength = "clear";
      }
    }
  } else if (!winnerAccepted && !loserAccepted) {
    const winnerScore = Number(winnerSubmission?.matchScore ?? 0);
    const loserScore = Number(loserSubmission?.matchScore ?? 0);
    const gap = Math.abs(winnerScore - loserScore);
    if (gap <= settings.partialDrawThreshold) {
      return {
        playerAActualScore: 0.5,
        playerBActualScore: 0.5,
        resultStrength: "draw",
      };
    }
    resultStrength = gap <= settings.partialCloseThreshold ? "close" : "clear";
  } else if (winnerAccepted && !loserAccepted) {
    resultStrength = "clear";
  } else {
    resultStrength = "close";
  }

  const winnerActualScore =
    resultStrength === "close" ? 0.85 :
    resultStrength === "standard" ? 0.93 :
    1.0;
  const loserActualScore =
    resultStrength === "close" ? 0.15 :
    resultStrength === "standard" ? 0.07 :
    0.0;

  if (winnerId === playerAId) {
    return {
      playerAActualScore: winnerActualScore,
      playerBActualScore: loserActualScore,
      resultStrength,
    };
  }

  return {
    playerAActualScore: loserActualScore,
    playerBActualScore: winnerActualScore,
    resultStrength,
  };
}

