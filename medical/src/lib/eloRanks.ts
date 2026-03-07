export type EloRankInfo = {
  tier: string;
  min: number;
  max: number | null;
  icon: string;
  color: string;
  bgColor: string;
};

export const ELO_RANKS: EloRankInfo[] = [
  { tier: 'Bronze', min: 300, max: 799, icon: '\u{1F949}', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  { tier: 'Silver', min: 800, max: 1099, icon: '\u{1F948}', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  { tier: 'Gold', min: 1100, max: 1399, icon: '\u{1F947}', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { tier: 'Platinum', min: 1400, max: 1699, icon: '\u{1F451}', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  { tier: 'Diamond', min: 1700, max: 1999, icon: '\u{1F48E}', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { tier: 'Master', min: 2000, max: 2299, icon: '\u{2694}', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  { tier: 'Grandmaster', min: 2300, max: 2599, icon: '\u{1F3C6}', color: 'text-rose-700', bgColor: 'bg-rose-100' },
  { tier: 'Legend', min: 2600, max: null, icon: '\u{1F31F}', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-100' },
];

export function getEloRankInfo(rating: number | null | undefined): EloRankInfo {
  const numericRating = Number(rating);
  const safeRating = Math.max(300, Number.isFinite(numericRating) ? numericRating : 500);
  return ELO_RANKS.find((rank) => safeRating >= rank.min && (rank.max === null || safeRating <= rank.max)) || ELO_RANKS[0];
}

