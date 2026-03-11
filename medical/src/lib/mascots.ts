export const mascots = {
  learn: {
    src: '/mascots/learnmascot.png',
    alt: 'Fox mascot wearing headphones and reading a book',
  },
  duel: {
    src: '/mascots/duelsmascot.png',
    alt: 'Fox mascot typing in battle mode',
  },
  store: {
    src: '/mascots/storemascot.png',
    alt: 'Fox mascot for the Codhak store',
  },
  leaderboard: {
    src: '/mascots/leaderboardmascot.png',
    alt: 'Fox mascot holding a trophy',
  },
} as const;

export type MascotKey = keyof typeof mascots;
