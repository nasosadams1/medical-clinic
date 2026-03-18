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
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {report.isSample ? 'Sample Report' : 'Benchmark Report'}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {report.overallScore}/100 overall skill score
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{report.summary}</p>
        </div>

        <div className="grid gap-3 sm:min-w-[220px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Correct answers</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {report.correctAnswers}/{report.totalQuestions}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Duel readiness</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{report.duelReadiness.label}</div>
            <div className="text-sm text-slate-500">{report.duelReadiness.confidencePercent}% confidence</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Strengths
          </div>
          <ul className="mt-4 space-y-3">
            {report.strengths.map((strength) => (
              <li key={strength} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Target className="h-4 w-4 text-amber-600" />
            Focus next
          </div>
          <ul className="mt-4 space-y-3">
            {report.weaknesses.map((weakness) => (
              <li key={weakness} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                {weakness}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <BarChart3 className="h-4 w-4 text-sky-600" />
            Next move
          </div>
          <div className="mt-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">{report.duelReadiness.label}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{report.duelReadiness.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Award className="h-4 w-4 text-violet-600" />
            Recommended track
          </div>
          <div className="mt-4 space-y-4">
            {recommendedTracks.map((track) => (
              <div key={track!.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-lg font-semibold text-slate-900">{track!.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{track!.description}</p>
                <Link
                  to={`/tracks/${track!.id}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  <span>Open track page</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-slate-200 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested lessons</div>
            <ul className="mt-4 space-y-3">
              {suggestedLessons.map((lesson) => (
                <li key={lesson!.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{lesson!.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{lesson!.category}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Swords className="h-4 w-4 text-sky-600" />
              Duel-ready prompts
            </div>
            <ul className="mt-4 space-y-3">
              {report.suggestedDuelProblemTitles.map((problemTitle) => (
                <li key={problemTitle} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {problemTitle}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {actions ? <div className="mt-6 border-t border-slate-200 pt-6">{actions}</div> : null}
    </div>
  );
}
