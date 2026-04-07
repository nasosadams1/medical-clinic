import React from 'react';
import { AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Sparkles, Target } from 'lucide-react';
import { hydrateBenchmarkReport, type BenchmarkReport } from '../../data/benchmarkEngine';
import { getLessonCatalogEntry } from '../../data/lessonCatalog';

interface BenchmarkReportCardProps {
  report: BenchmarkReport;
  actions?: React.ReactNode;
  accessLevel?: 'starter' | 'full';
}

interface QuestionInsight {
  question: BenchmarkReport['questions'][number];
  answer?: BenchmarkReport['answerRecords'][number];
  scorePercent: number;
  pointsLost: number;
  timeRatio: number | null;
  answered: boolean;
  evidence: string;
}

interface DiagnosisRow {
  bucket: string;
  label: string;
  score: number;
  questionCount: number;
  missedCount: number;
  pointsLost: number;
  evidence: string;
  nextLesson: string | null;
  nextAction: string | null;
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

const truncateText = (value: string | undefined | null, maxLength = 150) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const joinLabels = (labels: string[]) => {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

const getBarTone = (score: number): 'primary' | 'success' | 'warning' => {
  if (score >= 72) return 'success';
  if (score >= 48) return 'primary';
  return 'warning';
};

const getQuestionProofLabel = (question: BenchmarkReport['questions'][number]) => {
  switch (question.questionType) {
    case 'debugging':
      return 'Debugging miss';
    case 'code_tracing':
    case 'output_prediction':
      return 'Execution trace miss';
    case 'code_reading_comprehension':
      return 'Code-reading miss';
    case 'code_completion':
      return 'Completion miss';
    case 'short_function_writing':
      return 'Function-writing miss';
    case 'applied_mini_problem':
      return 'Applied problem miss';
    case 'choose_the_best_fix':
      return 'Fix-selection miss';
    default:
      return 'Benchmark miss';
  }
};

const getQuestionRemediationTitle = (question: BenchmarkReport['questions'][number]) => {
  const directRemediationTitle =
    (question.remediationLessonIds || [])
      .map((lessonId) => getLessonCatalogEntry(lessonId)?.title)
      .find(Boolean) || null;
  return directRemediationTitle || question.lessonTitle || null;
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

  const recommendedLessons = React.useMemo(
    () =>
      hydratedReport.nextStepPlan.recommendedLessonIds
        .map((lessonId) => getLessonCatalogEntry(lessonId))
        .filter((lesson): lesson is NonNullable<ReturnType<typeof getLessonCatalogEntry>> => Boolean(lesson))
        .slice(0, 3),
    [hydratedReport.nextStepPlan.recommendedLessonIds]
  );

  const questionInsights = React.useMemo<QuestionInsight[]>(() => {
    const answerLookup = new Map(
      (hydratedReport.answerRecords || []).map((answer) => [answer.questionId, answer])
    );
    const totalWeight = hydratedReport.questions.reduce(
      (total, question) => total + Math.max(question.weight || 0, 0),
      0
    );

    return hydratedReport.questions.map((question) => {
      const answer = answerLookup.get(question.id);
      const scorePercent =
        typeof answer?.scorePercent === 'number'
          ? Math.max(0, Math.min(100, answer.scorePercent))
          : answer?.isCorrect
          ? 100
          : 0;
      const answered =
        typeof answer?.selectedAnswer === 'number' ||
        Boolean(answer?.submittedCode?.trim()) ||
        typeof answer?.isCorrect === 'boolean';
      const targetSeconds = question.expectedDurationSeconds || 0;
      const timeRatio =
        typeof answer?.latencyMs === 'number' && targetSeconds > 0
          ? answer.latencyMs / (targetSeconds * 1000)
          : null;
      const pointsLost =
        totalWeight > 0
          ? Math.round((Math.max(question.weight || 0, 0) * (100 - scorePercent)) / totalWeight)
          : 0;
      const evidence = truncateText(
        answer?.evaluationMessage ||
          (scorePercent < 100
            ? question.explanation
            : `Handled ${question.skillBucketLabel.toLowerCase()} more cleanly than the rest of the run.`)
      );

      return {
        question,
        answer,
        scorePercent,
        pointsLost,
        timeRatio,
        answered,
        evidence,
      };
    });
  }, [hydratedReport]);

  const diagnosisRows = React.useMemo<DiagnosisRow[]>(() => {
    return (hydratedReport.topicBreakdown || [])
      .map((topic, index) => {
        const relatedQuestions = questionInsights.filter(
          (entry) => entry.question.skillBucket === topic.bucket
        );
        const primaryMiss =
          [...relatedQuestions]
            .filter((entry) => entry.scorePercent < 100 || !entry.answered)
            .sort(
              (left, right) =>
                right.pointsLost - left.pointsLost || left.scorePercent - right.scorePercent
            )[0] || null;
        const missedCount = relatedQuestions.filter((entry) => entry.scorePercent < 100).length;
        const pointsLost = relatedQuestions.reduce((total, entry) => total + entry.pointsLost, 0);
        const timeRatios = relatedQuestions
          .map((entry) => entry.timeRatio)
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        const averageTimeRatio =
          timeRatios.length > 0
            ? timeRatios.reduce((total, value) => total + value, 0) / timeRatios.length
            : null;
        const evidenceParts = [
          `${missedCount}/${Math.max(1, relatedQuestions.length)} missed`,
          averageTimeRatio && averageTimeRatio > 1.08
            ? `${averageTimeRatio.toFixed(1)}x target time`
            : null,
          `${pointsLost} pts lost`,
        ].filter(Boolean);

        return {
          bucket: topic.bucket,
          label: topic.label,
          score: topic.score,
          questionCount: topic.questionCount,
          missedCount,
          pointsLost,
          evidence: evidenceParts.join(' / '),
          nextLesson:
            (primaryMiss ? getQuestionRemediationTitle(primaryMiss.question) : null) ||
            recommendedLessons[index]?.title ||
            null,
          nextAction:
            primaryMiss?.question.remediationPracticeLabel ||
            (topic.label ? `Run one short ${topic.label.toLowerCase()} drill before the retake.` : null),
        };
      })
      .sort((left, right) => right.pointsLost - left.pointsLost || left.score - right.score)
      .slice(0, 3);
  }, [hydratedReport.topicBreakdown, questionInsights, recommendedLessons]);

  const proofRows = React.useMemo(
    () =>
      [...questionInsights]
        .sort((left, right) => right.pointsLost - left.pointsLost || left.scorePercent - right.scorePercent)
        .filter((entry) => entry.scorePercent < 100 || entry.pointsLost > 0)
        .slice(0, 3),
    [questionInsights]
  );

  const heldUpSignals = React.useMemo(
    () =>
      [...(hydratedReport.topicBreakdown || [])]
        .filter((topic) => topic.score >= 55)
        .sort((left, right) => right.score - left.score)
        .slice(0, 2)
        .map((topic) => `${topic.label} ${topic.score}/100`),
    [hydratedReport.topicBreakdown]
  );

  const isLowScore = hydratedReport.overallScore <= 30;
  const estimatedFixMinutes = Math.max(
    12,
    recommendedLessons.length * 6 +
      Math.min(2, hydratedReport.nextStepPlan.shortPracticeSet.length) * 4
  );
  const estimatedFixTimeLabel = `${estimatedFixMinutes}-${estimatedFixMinutes + 6} min`;
  const trustEnoughToAct =
    hydratedReport.confidenceBand.percent >= 70 && hydratedReport.trustSignal.score >= 70;
  const answeredQuestionCount = questionInsights.filter((entry) => entry.answered).length;

  const diagnosisLead =
    diagnosisRows.length > 0
      ? isLowScore
        ? `You are not ready for another blind benchmark yet. Fix ${joinLabels(
            diagnosisRows.map((row) => row.label.toLowerCase())
          )} first, then rerun weak areas.`
        : `Most of the score dropped on ${joinLabels(
            diagnosisRows.map((row) => row.label.toLowerCase())
          )}. Fix those first, then retake this same pack.`
      : hydratedReport.summary;

  const trustSummary = trustEnoughToAct
    ? `You answered ${answeredQuestionCount}/${hydratedReport.totalQuestions} questions across the tracked skills, so this result is reliable enough to guide the next practice block.`
    : `This run is useful for the first fix block, but rerun this same pack before you treat it as a stable comparison.`;

  const nextMoveSummary =
    diagnosisRows.length > 0
      ? isLowScore
        ? `Spend ${estimatedFixTimeLabel} fixing the three misses below, then rerun ${hydratedReport.nextStepPlan.retryWeakAreasLabel.toLowerCase()}. Do not jump to a full benchmark yet.`
        : `Spend ${estimatedFixTimeLabel} on the corrective plan below, then rerun ${hydratedReport.nextStepPlan.retryWeakAreasLabel.toLowerCase()}.`
      : `Run the corrective plan below for ${estimatedFixTimeLabel}, then retake this same pack.`;

  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card sm:p-6">
      <section className="rounded-[1.4rem] border border-primary/15 bg-gradient-to-br from-primary/12 via-card to-card p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{formatLabel}</span>
            </div>

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Current result
              </div>
              <div className="mt-2 flex items-end gap-3">
                <div className="text-[2.7rem] font-semibold tracking-[-0.05em] text-foreground sm:text-[3.15rem]">
                  {hydratedReport.overallScore}
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
                <div className="mb-1 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {hydratedReport.readinessVerdict.label}
                </div>
              </div>
            </div>

            <h2 className="mt-4 text-[1.45rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[1.72rem]">
              {hydratedReport.packTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{diagnosisLead}</p>

            <div className="mt-5 rounded-2xl border border-border bg-background/70">
              {diagnosisRows.map((row, index) => (
                <div
                  key={row.bucket}
                  className={`grid gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.95fr)] sm:items-start ${
                    index > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <div className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {index === 0 ? 'Fix first' : index === 1 ? 'Fix second' : 'Fix third'}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-foreground">{row.label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.evidence}</div>
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground sm:text-right">
                    <div className="font-semibold text-foreground">
                      {row.nextLesson ? `Start with ${row.nextLesson}` : 'Repair this area next'}
                    </div>
                    <div className="mt-1">{row.nextAction || 'Run the fix block next.'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/75 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Next move
              </div>
              <div className="mt-3 text-xl font-semibold text-foreground">
                {isLowScore
                  ? 'Do this repair block now.'
                  : 'Run one repair block, then retake this same pack.'}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {nextMoveSummary}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <div className="text-muted-foreground">
                  Fix block:{' '}
                  <span className="font-semibold text-foreground">{estimatedFixTimeLabel}</span>
                </div>
                <div className="text-muted-foreground">
                  Retake after:{' '}
                  <span className="font-semibold text-foreground">
                    {hydratedReport.nextStepPlan.retryWeakAreasLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/75 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                How reliable is this result?
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {trustEnoughToAct
                  ? 'Reliable enough to guide the next practice block'
                  : 'Useful first read, but confirm it with a retake'}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{trustSummary}</p>
              <div className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Result confidence {hydratedReport.confidenceBand.percent}/100
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="self-start rounded-[1.35rem] border border-border bg-background/70 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-coins" />
              Why the score dropped
            </div>

            <div className="mt-4 divide-y divide-border/80">
              {diagnosisRows.map((row) => (
                <div key={row.bucket} className="grid gap-3 py-4 sm:grid-cols-[0.9fr_1.1fr_auto] sm:items-start">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{row.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {row.questionCount} question{row.questionCount === 1 ? '' : 's'} / {row.score}/100
                    </div>
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    <div>{row.evidence}</div>
                    <div className="mt-1 text-foreground/80">
                      {row.nextAction || (row.nextLesson ? `Next lesson: ${row.nextLesson}` : 'Use the fix block next.')}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-foreground sm:text-right">
                    {row.pointsLost} pts
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      points lost
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {heldUpSignals.length > 0 ? (
            <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Small wins worth keeping
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {heldUpSignals.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <section className="self-start rounded-[1.35rem] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Question proof
          </div>
          <div className="mt-4 space-y-3">
            {proofRows.map((entry, index) => (
              <div
                key={entry.question.id}
                className={`rounded-2xl border bg-card px-4 py-4 ${
                  index === 0 ? 'border-primary/30 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {entry.question.sectionLabel} / {entry.question.skillBucketLabel}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {entry.question.blueprintLabel || entry.question.lessonTitle}
                    </div>
                    <div className="mt-2 inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {index === 0 ? 'Highest cost miss' : index === 1 ? 'Next biggest miss' : 'Pattern to watch'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">{entry.scorePercent}/100</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {entry.pointsLost} pts
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Mistake type
                    </div>
                    <div className="mt-1 text-foreground/88">{getQuestionProofLabel(entry.question)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Why it hurt
                    </div>
                    <div className="mt-1">{entry.evidence}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Correction rule
                    </div>
                    <div className="mt-1 text-foreground/88">
                      Fix with {getQuestionRemediationTitle(entry.question) || entry.question.lessonTitle}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
            <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Topic breakdown
                </div>
                <div className="mt-4 grid gap-3">
                  {hydratedReport.topicBreakdown.map((topic) => {
                    const pointsLost =
                      diagnosisRows.find((row) => row.bucket === topic.bucket)?.pointsLost ?? 0;
                    return (
                      <div key={topic.bucket} className="rounded-2xl border border-border bg-card px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{topic.label}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {topic.questionCount} question{topic.questionCount === 1 ? '' : 's'} / {pointsLost} pts lost
                            </div>
                          </div>
                          <div className="text-lg font-semibold text-foreground">{topic.score}</div>
                        </div>
                        {detailBar(topic.score, getBarTone(topic.score))}
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="grid gap-4">
                <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Benchmark internals
                  </div>
                  <div className="mt-4 grid gap-3">
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
                        {detailBar(score as number, getBarTone(score as number))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                    Expected range {hydratedReport.confidenceInterval.low}-{hydratedReport.confidenceInterval.high}.{' '}
                    {hydratedReport.trustSignal.description} Result quality sits at {hydratedReport.confidenceBand.percent}/100.
                  </div>
                </section>

                <section className="rounded-[1.35rem] border border-border bg-background/70 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Full question review
                  </div>
                  <div className="mt-4 space-y-3">
                    {questionInsights.slice(0, 5).map((entry) => (
                      <div key={entry.question.id} className="rounded-2xl border border-border bg-card px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-foreground">
                            {entry.question.sectionLabel} / {entry.question.blueprintLabel}
                          </div>
                          <div className="text-sm font-semibold text-foreground">{entry.scorePercent}/100</div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">{entry.evidence}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-[1.35rem] border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-foreground/85">
          Free includes the main diagnosis, corrective lessons, and the next retake step. Upgrade to unlock full history,
          retakes, and deeper report layers.
        </div>
      )}

      {actions ? <div className="mt-6 border-t border-border pt-6">{actions}</div> : null}
    </div>
  );
}
