import React from 'react';
import type { MascotKey } from '../../lib/mascots';
import MascotArtwork from './MascotArtwork';

type HeroMetric = {
  label: string;
  value: string;
};

type SectionMascotHeroProps = {
  mascot: MascotKey;
  eyebrow: string;
  title: string;
  description: string;
  metrics?: HeroMetric[];
};

const shellMap: Record<MascotKey, string> = {
  learn: 'from-slate-900 via-cyan-900 to-emerald-700',
  duel: 'from-slate-950 via-sky-900 to-blue-600',
  leaderboard: 'from-slate-900 via-amber-700 to-cyan-700',
};

export default function SectionMascotHero({
  mascot,
  eyebrow,
  title,
  description,
  metrics = [],
}: SectionMascotHeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${shellMap[mascot]} p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.24)] sm:p-8`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.2),transparent_24%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span className="type-kicker inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/80">
            {eyebrow}
          </span>
          <h1 className="type-display-section mt-4 max-w-2xl text-white">{title}</h1>
          <p className="type-body-md mt-3 max-w-2xl text-white/80">{description}</p>
          {metrics.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="type-title-md text-white sm:text-xl">{metric.value}</div>
                  <div className="type-label text-white/65">{metric.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <MascotArtwork mascot={mascot} className="border-white/15 bg-white/10" imageClassName="max-w-[280px]" />
      </div>
    </section>
  );
}
