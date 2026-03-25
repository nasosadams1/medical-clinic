const PYTHON_LESSON_IDS = [
  'python-first-output',
  'python-variables',
  'python-arithmetic',
  'python-strings',
  'python-input',
  'python-booleans',
  'python-if',
  'python-if-else',
  'python-debugging-basics',
  'python-calculator-basics',
  'python-lists',
  'python-list-access',
  'python-for-loops',
  'python-while-loops',
  'python-loop-patterns',
  'python-break-continue',
  'python-nested-loops',
  'python-functions',
  'python-parameters',
  'python-return',
  'python-string-methods',
  'python-string-operations',
  'python-list-methods',
  'python-nested-structures',
  'python-built-in-functions',
  'python-dictionaries',
  'python-dict-methods',
  'python-sets',
  'python-nested-data',
  'python-text-analyzer-basics',
  'python-functions-advanced',
  'python-scope',
  'python-recursion-intro',
  'python-factorial',
  'python-linear-search',
  'python-sorting',
  'python-complexity-basics',
  'python-two-pointers',
  'python-mixed-problems',
  'python-data-processor',
  'python-file-reading',
  'python-file-writing',
  'python-error-handling',
  'python-modules',
  'python-libraries',
  'python-classes-intro',
  'python-constructor',
  'python-methods',
  'python-attributes-methods',
  'python-full-class-pattern',
];

const LESSON_REWARD_BANDS = {
  Beginner: {
    baseXp: [26, 42],
    baselineTime: [2, 3],
  },
  Intermediate: {
    baseXp: [42, 62],
    baselineTime: [3, 4],
  },
  Advanced: {
    baseXp: [62, 86],
    baselineTime: [4, 5],
  },
};

const interpolate = (start, end, progress) => start + (end - start) * progress;
const roundToHalfMinute = (value) => Math.round(value * 2) / 2;

const getDifficultyByIndex = (index) => {
  if (index < 17) return 'Beginner';
  if (index < 33) return 'Intermediate';
  return 'Advanced';
};

const buildRewardMeta = (difficulty, position, count) => {
  const rewardBand = LESSON_REWARD_BANDS[difficulty];
  const normalizedProgress = count <= 1 ? 0 : position / (count - 1);

  return {
    baseXP: Math.round(interpolate(rewardBand.baseXp[0], rewardBand.baseXp[1], normalizedProgress)),
    baselineTime: roundToHalfMinute(
      interpolate(rewardBand.baselineTime[0], rewardBand.baselineTime[1], normalizedProgress)
    ),
  };
};

const countsByDifficulty = {
  Beginner: PYTHON_LESSON_IDS.filter((_, index) => getDifficultyByIndex(index) === 'Beginner').length,
  Intermediate: PYTHON_LESSON_IDS.filter((_, index) => getDifficultyByIndex(index) === 'Intermediate').length,
  Advanced: PYTHON_LESSON_IDS.filter((_, index) => getDifficultyByIndex(index) === 'Advanced').length,
};

const positionsByDifficulty = {
  Beginner: 0,
  Intermediate: 0,
  Advanced: 0,
};

export const PYTHON_LESSON_META = PYTHON_LESSON_IDS.map((id, index) => {
  const difficulty = getDifficultyByIndex(index);
  const position = positionsByDifficulty[difficulty];
  positionsByDifficulty[difficulty] += 1;
  const rewardMeta = buildRewardMeta(difficulty, position, countsByDifficulty[difficulty]);

  return {
    id,
    difficulty,
    baseXP: rewardMeta.baseXP,
    baselineTime: rewardMeta.baselineTime,
    language: 'python',
  };
});
