import React from 'react';
import { ArrowRight, Award, BarChart3, CheckCircle2, Swords, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BenchmarkReport } from '../../data/benchmarkCatalog';
import { getLessonById } from '../../data/lessons';
import { interviewTracks } from '../../data/siteContent';

interface BenchmarkReportCardProps {
  report: BenchmarkReport;
  actions?: React.ReactNode;
}

export default function BenchmarkReportCard({ report, actions }: BenchmarkReportCardProps) {
  const recommendedTracks = report.recommendedTrackIds
    .map((trackId) => interviewTracks.find((track) => track.id === trackId))
    .filter((track) => Boolean(track));

  const suggestedLessons = report.suggestedLessonIds
    .map((lessonId) => getLessonById(lessonId))
    .filter((lesson) => Boolean(lesson));

  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {report.isSample ? 'Sample Report' : 'Benchmark Report'}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {report.overallScore}/100 overall skill score
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{report.summary}</p>
        </div>

        <div className="grid gap-3 sm:min-w-[220px]">
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Correct answers</div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {report.correctAnswers}/{report.totalQuestions}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duel readiness</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{report.duelReadiness.label}</div>
            <div className="text-sm text-muted-foreground">{report.duelReadiness.confidencePercent}% confidence</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-xp" />
            Strengths
          </div>
          <ul className="mt-4 space-y-3">
            {report.strengths.map((strength) => (
              <li key={strength} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Target className="h-4 w-4 text-coins" />
            Focus next
          </div>
          <ul className="mt-4 space-y-3">
            {report.weaknesses.map((weakness) => (
              <li key={weakness} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
                {weakness}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Next move
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
            <div className="text-sm font-semibold text-foreground">{report.duelReadiness.label}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.duelReadiness.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Award className="h-4 w-4 text-accent" />
            Recommended track
          </div>
          <div className="mt-4 space-y-4">
            {recommendedTracks.length > 0 ? (
              recommendedTracks.map((track) => (
                <div key={track!.id} className="rounded-2xl border border-border bg-card px-4 py-4">
                  <div className="text-lg font-semibold text-foreground">{track!.title}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{track!.description}</p>
                  <Link
                    to={`/tracks/${track!.id}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent"
                  >
                    <span>Open track page</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                Codhak will route this report into a practice track as more language- and role-specific tracks are added.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Suggested lessons</div>
            {suggestedLessons.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {suggestedLessons.map((lesson) => (
                  <li key={lesson!.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">{lesson!.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{lesson!.category}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                Suggested lessons appear here when the benchmark identifies specific gaps to remediate.
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Swords className="h-4 w-4 text-primary" />
              Duel-ready prompts
            </div>
            {report.suggestedDuelProblemTitles.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {report.suggestedDuelProblemTitles.map((problemTitle) => (
                  <li key={problemTitle} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
                    {problemTitle}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                Duel recommendations appear once the benchmark can map your score into the duel problem catalog.
              </div>
            )}
          </div>
        </div>
      </div>

      {actions ? <div className="mt-6 border-t border-border pt-6">{actions}</div> : null}
    </div>
  );
}
