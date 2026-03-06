export interface Avatar {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  unlocked: boolean;
}

export const avatars: Avatar[] = [
  {
    id: 'default',
    name: 'Core Profile',
    emoji: '\u{1F464}',
    price: 0,
    description: 'The clean default identity every account starts with.',
    rarity: 'Common',
    unlocked: true,
  },
  {
    id: 'coder',
    name: 'Terminal Ace',
    emoji: '\u{1F468}\u200D\u{1F4BB}',
    price: 120,
    description: 'A sharp everyday avatar for players building their first streaks.',
    rarity: 'Common',
    unlocked: false,
  },
  {
    id: 'scientist',
    name: 'Signal Analyst',
    emoji: '\u{1F469}\u200D\u{1F52C}',
    price: 240,
    description: 'Made for players who like patterns, systems, and precise thinking.',
    rarity: 'Common',
    unlocked: false,
  },
  {
    id: 'wizard',
    name: 'Arcane Debugger',
    emoji: '\u{1F9D9}\u200D\u2642\uFE0F',
    price: 450,
    description: 'A rare profile for players who make hard problems look easy.',
    rarity: 'Rare',
    unlocked: false,
  },
  {
    id: 'ninja',
    name: 'Shadow Runner',
    emoji: '\u{1F977}',
    price: 700,
    description: 'Fast, clean, and efficient. Built for precise duel players.',
    rarity: 'Rare',
    unlocked: false,
  },
  {
    id: 'robot',
    name: 'Quantum Unit',
    emoji: '\u{1F916}',
    price: 950,
    description: 'A polished cyber profile with high-rank energy.',
    rarity: 'Rare',
    unlocked: false,
  },
  {
    id: 'alien',
    name: 'Void Visitor',
    emoji: '\u{1F47D}',
    price: 1400,
    description: 'For players whose logic looks slightly inhuman.',
    rarity: 'Epic',
    unlocked: false,
  },
  {
    id: 'superhero',
    name: 'Skybreaker',
    emoji: '\u{1F9B8}\u200D\u2642\uFE0F',
    price: 1900,
    description: 'An epic unlock for players carrying full momentum into ranked play.',
    rarity: 'Epic',
    unlocked: false,
  },
  {
    id: 'dragon',
    name: 'Ashen Wyrm',
    emoji: '\u{1F409}',
    price: 2600,
    description: 'A heavyweight avatar for players who want a legendary silhouette.',
    rarity: 'Epic',
    unlocked: false,
  },
  {
    id: 'crown',
    name: 'Cipher Monarch',
    emoji: '\u{1F451}',
    price: 3600,
    description: 'A premium crown-tier identity built to stand out on the leaderboard.',
    rarity: 'Legendary',
    unlocked: false,
  },
  {
    id: 'master',
    name: 'Nebula Sovereign',
    emoji: '\u{1FA90}',
    price: 5000,
    description: 'Forge whole constellations out of pure logic and impossible code.',
    rarity: 'Legendary',
    unlocked: false,
  },
];

export const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'Common': return 'text-slate-700 bg-slate-100';
    case 'Rare': return 'text-sky-700 bg-sky-100';
    case 'Epic': return 'text-fuchsia-700 bg-fuchsia-100';
    case 'Legendary': return 'text-amber-700 bg-amber-100';
    default: return 'text-slate-700 bg-slate-100';
  }
};
