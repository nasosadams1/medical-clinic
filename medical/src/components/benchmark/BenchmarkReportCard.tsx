import React from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { hydrateBenchmarkReport, type BenchmarkReport } from '../../data/benchmarkEngine';
import { getLessonCatalogEntry } from '../../data/lessonCatalog';

interface BenchmarkReportCardProps {
  report: BenchmarkReport;
  actions?: React.ReactNode;
  accessLevel?: 'starter' | 'full';
}

const detailBar = (score: number, tone: 'primary' | 'success' | 'warning' = 'primary') => {
  const toneClass =
    tone === 'success' ? 'bg-xp' : tone === 'warning' ? 'bg-coins' : 'bg-primary';
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
      <div className={`h-full rounded-full ${toneClass} transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
};

export default function BenchmarkReportCard({
  report,
  actions,
  accessLevel = 'full',
}: BenchmarkReportCardProps) {
  const [showAdvancedDetails, setShowAdvancedDetails] = React.useState(false);
  const hydratedReport = React.useMemo(
    () => hydrateBenchmarkReport(report as BenchmarkReport),
    [report]
  );
  const isStarterReport = accessLevel === 'starter';
  const formatLabel =
    hydratedReport.format === 'full'
      ? 'Full benchmark'
      : hydratedReport.format === 'retake'
      ? 'Weak-area retake'
      : 'Quick benchmark';
  const deltaLabel =
    hydratedReport.deltaFromLastAttempt === null
      ? hydratedReport.comparisonSignal.deltaEligible
        ? 'First tracked attempt'
        : hydratedReport.comparisonSignal.label
      : `${hydratedReport.deltaFromLastAttempt > 0 ? '+' : ''}${hydratedReport.deltaFromLastAttempt} vs last attempt`;
  const recommendedLessons = hydratedReport.nextStepPlan.recommendedLessonIds
    .map((lessonId) => getLessonCatalogEntry(lessonId))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card sm:p-6">
      <section className="rounded-[1.4rem] border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{formatLabel}</span>
            </div>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[1.85rem]">
              {hydratedReport.packTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{hydratedReport.summary}</p>
          </div>

          <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:w-[320px] lg:grid-cols-1">
            <div className="rounded-2xl border border-border bg-background/75 px-4 py-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Score summary
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {hydratedReport.overallScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
                <div className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {hydratedReport.readinessVerdict.label}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{deltaLabel}</div>
              {hydratedReport.deltaFromLastAttempt === null && !hydratedReport.comparisonSignal.deltaEligible ? (
                <div className="mt-2 text-xs leading-5 text-muted-foreground">{hydratedReport.comparisonSignal.description}</div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-background/75 px-4 py-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Evidence quality
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{hydratedReport.confidenceBand.label}</span>
                <span className="text-sm font-semibold text-foreground">{hydratedReport.confidenceBand.percent}%</span>
              </div>
              {detailBar(hydratedReport.confidenceBand.percent)}
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Run integrity</span>
                <span className="font-semibold text-foreground">{hydratedReport.trustSignal.label}</span>
              </div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">{hydratedReport.trustSignal.description}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/75 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              Accuracy
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">{hydratedReport.scoreComponents.accuracy}/100</div>
          </div>
          <div className="rounded-2xl border border-border bg-background/75 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              Difficulty-weighted
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {hydratedReport.scoreComponents.difficultyWeighted}/100
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/75 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 text-primary" />
              Blueprint
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">
              {hydratedReport.totalQuestions} questions / {hydratedReport.setup.language.toUpperCase()} / {hydratedReport.setup.roleLevel}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
        <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-xp" />
            Strengths
          </div>
          <ul className="mt-4 space-y-3">
            {hydratedReport.strengths.slice(0, 3).map((strength) => (
              <li key={strength} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                {strength}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Target className="h-4 w-4 text-coins" />
            Weak spots
          </div>
          <ul className="mt-4 space-y-3">
            {hydratedReport.weaknesses.slice(0, 3).map((weakness) => (
              <li key={weakness} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground">
                {weakness}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ArrowRight className="h-4 w-4 text-primary" />
            Next step plan
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card px-4 py-4">
              <div className="text-sm font-semibold text-foreground">Recommended lessons</div>
              {recommendedLessons.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {recommendedLessons.map((lesson) => (
                    <li key={lesson!.id} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                      {lesson!.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Codhak will route this result into the next corrective lesson pack.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card px-4 py-4">
              <div className="text-sm font-semibold text-foreground">Short practice set</div>
              <ul className="mt-3 space-y-2">
                {hydratedReport.nextStepPlan.shortPracticeSet.slice(0, 3).map((item) => (
                  <li key={item} className="text-sm leading-6 text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
              {hydratedReport.nextStepPlan.optionalProjectCheckpoint ? (
                <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                  Optional project checkpoint: {hydratedReport.nextStepPlan.optionalProjectCheckpoint}
                </div>
              ) : null}
              {hydratedReport.nextStepPlan.duelReadinessLabel ? (
                <div className="mt-3 rounded-xl border border-xp/20 bg-xp/10 px-3 py-2 text-sm text-foreground">
                  Duel readiness: {hydratedReport.nextStepPlan.duelReadinessLabel}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {!isStarterReport ? (
        <>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowAdvancedDetails((current) => !current)}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-card"
            >
              {showAdvancedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>{showAdvancedDetails ? 'Hide full report' : 'See full report'}</span>
            </button>
          </div>

          {showAdvancedDetails ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Topic breakdown
                </div>
                <div className="mt-4 grid gap-3">
                  {hydratedReport.topicBreakdown.map((topic) => (
                    <div key={topic.bucket} className="rounded-2xl border border-border bg-card px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{topic.label}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {topic.questionCount} question{topic.questionCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-foreground">{topic.score}</div>
                      </div>
                      {detailBar(topic.score, topic.score >= 70 ? 'success' : topic.score >= 50 ? 'primary' : 'warning')}
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4">
                <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Score composition
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Accuracy', hydratedReport.scoreComponents.accuracy],
                      ['Difficulty-weighted', hydratedReport.scoreComponents.difficultyWeighted],
                      ['Speed under pressure', hydratedReport.scoreComponents.speedUnderPressure],
                    ].map(([label, score]) => (
                      <div key={label as string} className="rounded-2xl border border-border bg-card px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{label}</span>
                          <span className="text-sm font-semibold text-foreground">{score as number}/100</span>
                        </div>
                        {detailBar(score as number)}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Verdict stability
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="text-base font-semibold text-foreground">{hydratedReport.confidenceBand.label}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {hydratedReport.confidenceBand.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Expected range {hydratedReport.confidenceInterval.low}-{hydratedReport.confidenceInterval.high}</span>
                      <span>{hydratedReport.trustSignal.label}</span>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-muted-foreground">
                      {hydratedReport.comparisonSignal.label}. {hydratedReport.comparisonSignal.description}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-[1.35rem] border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-foreground/85">
          Free includes the score summary, weak spots, and one corrective next step. Upgrade to unlock full history,
          retakes, and detailed report layers.
        </div>
      )}

      {actions ? <div className="mt-6 border-t border-border pt-6">{actions}</div> : null}
    </div>
  );
}
