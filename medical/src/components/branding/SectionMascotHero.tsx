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
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
            {eyebrow}
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">{description}</p>
          {metrics.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-lg font-bold text-white sm:text-xl">{metric.value}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/65">{metric.label}</div>
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
