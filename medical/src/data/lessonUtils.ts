export type LessonDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export const calculateXP = (
  xp: number,
  difficulty: LessonDifficulty,
  lessonIndex: number,
  totalLessons: number,
  actualTime: number,
  baselineTime: number
): number => {
  const difficultyMultiplier = {
    Beginner: 1,
    Intermediate: 1.5,
    Advanced: 2,
  }[difficulty];

  const safeTotalLessons = Math.max(1, totalLessons);
  const safeBaselineTime = Math.max(1, baselineTime);
  const maxMultiplier = 0.5;
  const progressMultiplier = 1 + (lessonIndex / safeTotalLessons) * maxMultiplier;
  const timeMultiplier = 0.2;
  const timeBonus = Math.max(0, ((safeBaselineTime - actualTime) / safeBaselineTime) * timeMultiplier);

  return Math.round(xp * difficultyMultiplier * progressMultiplier * (1 + timeBonus));
};
