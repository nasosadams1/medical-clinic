import React from 'react';
import { ArrowRight, Clock, Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react';

interface MatchResultsProps {
  matchData: any;
  userId: string;
  onClose: () => void;
  onViewReplay?: () => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export default function MatchResults({ matchData, userId, onClose, onViewReplay }: MatchResultsProps) {
  const isWinner = matchData.winnerId === userId;
  const isDraw = !matchData.winnerId;
  const isRankedMatch = (matchData.matchType ?? 'ranked') === 'ranked';
  const playerData = matchData.playerA.userId === userId ? matchData.playerA : matchData.playerB;
  const opponentData = matchData.playerA.userId === userId ? matchData.playerB : matchData.playerA;

  const getRatingChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-5 w-5 text-xp" />;
    if (change < 0) return <TrendingDown className="h-5 w-5 text-destructive" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getRatingChangeColor = (change: number) => {
    if (change > 0) return 'text-xp';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const difficultyLabel = (matchData.difficulty ?? 'medium')
    .toString()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());

  const bannerTone = isWinner
    ? 'from-xp/90 to-emerald-500'
    : isDraw
    ? 'from-secondary to-slate-600'
    : 'from-destructive to-pink-600';

  const bannerTitle = isWinner ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat';
  const bannerCopy = isWinner
    ? 'Well played. You won the duel under live judged conditions.'
    : isDraw
    ? 'The duel ended level. Both players finished with the same outcome signal.'
    : 'Better luck next time. Review the match signal and queue again.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className={`bg-gradient-to-r ${bannerTone} p-6 text-white sm:p-8`}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Trophy className="h-9 w-9" />
            </div>
            <h2 className="type-display-section text-white">{bannerTitle}</h2>
            <p className="type-body-md mx-auto mt-3 max-w-xl text-white/85">{bannerCopy}</p>
          </div>
        </div>

        <div className="max-h-[calc(92vh-180px)] overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-secondary/35 p-5">
                <div className="type-label text-primary">Match summary</div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <span className="font-semibold text-foreground">{difficultyLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{Math.floor(matchData.duration / 60)}:{(matchData.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <span className="text-sm text-muted-foreground">Result</span>
                    <span className="text-right font-semibold text-foreground">
                      {matchData.reason.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())}
                    </span>
                  </div>
                </div>
              </section>

              {isRankedMatch ? (
                <section className="rounded-2xl border border-border bg-secondary/35 p-5">
                  <div className="type-label text-primary">Rating changes</div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {[
                      {
                        label: 'You',
                        data: playerData,
                        tone: isWinner ? 'border-xp/30 bg-xp/10' : isDraw ? 'border-border bg-card' : 'border-destructive/30 bg-destructive/10',
                      },
                      {
                        label: 'Opponent',
                        data: opponentData,
                        tone: 'border-border bg-card',
                      },
                    ].map((entry) => (
                      <div key={entry.label} className={cx('rounded-xl border p-4', entry.tone)}>
                        <div className="text-sm text-muted-foreground">{entry.label}</div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="type-stat text-foreground">{entry.data.ratingBefore}</span>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                          <span className="type-stat text-foreground">{entry.data.ratingAfter}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {getRatingChangeIcon(entry.data.ratingChange)}
                          <span className={cx('font-semibold', getRatingChangeColor(entry.data.ratingChange))}>
                            {entry.data.ratingChange > 0 ? '+' : ''}{entry.data.ratingChange}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-secondary/35 p-5">
                <div className="type-label text-primary">Performance</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Your duel score</div>
                    <div className="type-stat mt-2 text-primary">
                      {Number(playerData.matchScore ?? playerData.submission?.matchScore ?? 0).toFixed(1)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {playerData.submission?.passed || 0}/{playerData.submission?.total || 0} tests passed
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Opponent duel score</div>
                    <div className="type-stat mt-2 text-foreground">
                      {Number(opponentData.matchScore ?? opponentData.submission?.matchScore ?? 0).toFixed(1)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {opponentData.submission?.passed || 0}/{opponentData.submission?.total || 0} tests passed
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-secondary/35 p-5">
                <div className="type-label text-primary">Next move</div>
                <p className="type-body-sm mt-3 text-muted-foreground">
                  {isWinner
                    ? 'Queue again while momentum is high or move back into practice to consolidate the win.'
                    : 'Review the outcome, sharpen the weak area in practice, and run another duel for a cleaner signal.'}
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {onViewReplay ? (
                    <button
                      type="button"
                      onClick={onViewReplay}
                      className="flex-1 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
                    >
                      View replay
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
