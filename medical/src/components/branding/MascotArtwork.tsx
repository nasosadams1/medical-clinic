import React from 'react';
import { mascots, type MascotKey } from '../../lib/mascots';

type MascotArtworkProps = {
  mascot: MascotKey;
  className?: string;
  imageClassName?: string;
};

const toneMap: Record<MascotKey, string> = {
  learn: 'from-cyan-100 via-white to-emerald-100',
  duel: 'from-sky-100 via-white to-blue-100',
  leaderboard: 'from-amber-100 via-white to-cyan-100',
};

export default function MascotArtwork({ mascot, className = '', imageClassName = '' }: MascotArtworkProps) {
  const asset = mascots[mascot];

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br ${toneMap[mascot]} p-4 ${className}`}>
      <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-white/60 blur-xl" />
      <div className="absolute -right-6 top-10 h-20 w-20 rounded-full bg-white/50 blur-xl" />
      <img
        src={asset.src}
        alt={asset.alt}
        className={`relative z-10 mx-auto block h-auto w-full max-w-[320px] object-contain object-center ${imageClassName}`}
        loading="lazy"
      />
    </div>
  );
}
