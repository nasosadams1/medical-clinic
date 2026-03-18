import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  buildBenchmarkQuestions,
  buildBenchmarkReport,
  buildSampleBenchmarkReport,
  readSavedBenchmarkReport,
  saveBenchmarkReport,
  type BenchmarkGoal,
  type BenchmarkReport,
  type BenchmarkRoleLevel,
  type BenchmarkSetup,
} from '../../data/benchmarkCatalog';
import { interviewTracks, type LanguageSlug } from '../../data/siteContent';
import { listBenchmarkReports, persistBenchmarkReport } from '../../lib/benchmarkApi';
import { trackEvent } from '../../lib/analytics';
import BenchmarkReportCard from './BenchmarkReportCard';

type AuthModalView = 'login' | 'signup';
type BenchmarkView = 'setup' | 'assessment' | 'report';

interface BenchmarkExperienceProps {
  mode?: 'public' | 'app';
  presetLanguage?: LanguageSlug;
  openAuthModal?: (view?: AuthModalView) => void;
}

const DURATION_SECONDS = 10 * 60;

const goalOptions: Array<{ value: BenchmarkGoal; title: string; description: string }> = [
  { value: 'interview_prep', title: 'Interview prep', description: 'Score readiness for technical screens.' },
  { value: 'class_improvement', title: 'Class improvement', description: 'Benchmark a cohort and spot the gaps fast.' },
  { value: 'skill_growth', title: 'General skill growth', description: 'Turn generic study into a focused practice plan.' },
];

const languageOptions: Array<{ value: LanguageSlug; title: string; description: string }> = [
  { value: 'python', title: 'Python', description: 'Backend basics and problem solving.' },
  { value: 'javascript', title: 'JavaScript', description: 'Frontend logic and interview fundamentals.' },
  { value: 'java', title: 'Java', description: 'OOP, data structures, and class-ready assessment.' },
  { value: 'cpp', title: 'C++', description: 'Structured logic and early systems-style practice.' },
];

const roleOptions: Array<{ value: BenchmarkRoleLevel; title: string; description: string }> = [
  { value: 'beginner', title: 'Beginner', description: 'Early language comfort and fundamentals.' },
  { value: 'intern', title: 'Intern', description: 'Internship readiness and classroom checkpoints.' },
  { value: 'junior', title: 'Junior', description: 'Job-seeking practice and screening prep.' },
  { value: 'general_practice', title: 'General practice', description: 'A neutral benchmark without a role target.' },
];

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const setupCardClassName = (active: boolean, activeClasses: string) =>
  `rounded-2xl border px-5 py-4 text-left transition ${
    active ? activeClasses : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
  }`;

const mergeReports = (...reportGroups: Array<Array<BenchmarkReport | null | undefined>>) => {
  const deduped = new Map<string, BenchmarkReport>();

  reportGroups.flat().forEach((report) => {
    if (!report?.id || deduped.has(report.id)) return;
    deduped.set(report.id, report);
  });

  return Array.from(deduped.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
};

const formatReportDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));

export default function BenchmarkExperience({
  mode = 'public',
  presetLanguage,
  openAuthModal,
}: BenchmarkExperienceProps) {
  const navigate = useNavigate();
  const { user, setNavigationCallback } = useAuth();
  const [view, setView] = useState<BenchmarkView>('setup');
  const [setup, setSetup] = useState<BenchmarkSetup>({
    goal: 'interview_prep',
    language: presetLanguage ?? 'python',
    roleLevel: 'junior',
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [savedReport, setSavedReport] = useState<BenchmarkReport | null>(null);
  const [reportHistory, setReportHistory] = useState<BenchmarkReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const trackedPageRef = useRef(false);
  const trackedReportRef = useRef<string | null>(null);
  const questions = useMemo(() => buildBenchmarkQuestions(setup), [setup]);
  const activeQuestion = questions[questionIndex];
  const sampleReport = useMemo(() => buildSampleBenchmarkReport(), []);
  const reportQuestions = useMemo(() => (report ? buildBenchmarkQuestions(report.setup) : []), [report]);
  const primaryTrack = report?.recommendedTrackIds[0]
    ? interviewTracks.find((track) => track.id === report.recommendedTrackIds[0])
    : undefined;

  useEffect(() => {
    if (presetLanguage && setup.language !== presetLanguage) {
      setSetup((current) => ({ ...current, language: presetLanguage }));
    }
  }, [presetLanguage, setup.language]);

  useEffect(() => {
    if (trackedPageRef.current) return;
    trackedPageRef.current = true;
    trackEvent('benchmark_page_view', { mode, presetLanguage: presetLanguage ?? 'none' });
  }, [mode, presetLanguage]);

  useEffect(() => {
    let cancelled = false;

    const syncHistory = async () => {
      const anonymousReport = readSavedBenchmarkReport();
      const localUserReport = readSavedBenchmarkReport(user?.id);
      const localHistory = mergeReports([localUserReport], [anonymousReport]);

      setSavedReport(localHistory[0] ?? null);

      if (!user?.id) {
        setReportHistory(localHistory);
        setHistoryMessage(null);
        return;
      }

      if (anonymousReport && !localUserReport) {
        saveBenchmarkReport(anonymousReport, user.id);
      }

      setHistoryLoading(true);
      try {
        let remoteHistory = await listBenchmarkReports(8);
        const reportsToSync = localHistory.filter(
          (localReport) => !remoteHistory.some((remoteReport) => remoteReport.id === localReport.id)
        );

        for (const localReport of reportsToSync) {
          await persistBenchmarkReport(localReport);
        }

        if (reportsToSync.length > 0) {
          remoteHistory = await listBenchmarkReports(8);
        }

        if (cancelled) return;
        const merged = mergeReports(remoteHistory, localHistory);
        setReportHistory(merged);
        setSavedReport(merged[0] ?? null);
        setHistoryMessage(
          merged.length > 0 ? 'Signed-in benchmark history is now connected to your workspace.' : null
        );
      } catch (error) {
        if (cancelled) return;
        setReportHistory(localHistory);
        setSavedReport(localHistory[0] ?? null);
        setHistoryMessage(
          error instanceof Error ? error.message : 'Benchmark history is temporarily using local storage.'
        );
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void syncHistory();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (view !== 'assessment') return;
    if (secondsLeft <= 0) {
      void finishBenchmark();
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, view]);

  useEffect(() => {
    if (!report || trackedReportRef.current === report.id) return;
    trackedReportRef.current = report.id;
    trackEvent('benchmark_report_viewed', {
      language: report.setup.language,
      goal: report.setup.goal,
      roleLevel: report.setup.roleLevel,
      score: report.overallScore,
    });
  }, [report]);

  useEffect(() => {
    setNavigationCallback(() => {
      navigate('/app', { replace: true });
    });
  }, [navigate, setNavigationCallback]);

  const openReport = (targetReport: BenchmarkReport) => {
    setReport(targetReport);
    setView('report');
  };

  const resetBenchmark = () => {
    setView('setup');
    setQuestionIndex(0);
    setSelectedAnswers({});
    setSecondsLeft(DURATION_SECONDS);
    setReport(null);
  };

  const startBenchmark = () => {
    setQuestionIndex(0);
    setSelectedAnswers({});
    setSecondsLeft(DURATION_SECONDS);
    setReport(null);
    setView('assessment');
    trackEvent('benchmark_start', {
      mode,
      language: setup.language,
      goal: setup.goal,
      roleLevel: setup.roleLevel,
      questionCount: questions.length,
    });
  };

  const finishBenchmark = async () => {
    if (questions.length === 0) {
      toast.error('Benchmark questions are unavailable right now.');
      setView('setup');
      return;
    }

    const answerRecords = questions.map((question) => {
      const selectedAnswer = selectedAnswers[question.id] ?? -1;
      return {
        questionId: question.id,
        selectedAnswer,
        isCorrect: selectedAnswer === question.correctAnswer,
      };
    });

    const nextReport = buildBenchmarkReport(setup, questions, answerRecords);
    saveBenchmarkReport(nextReport);
    if (user?.id) {
      saveBenchmarkReport(nextReport, user.id);
    }

    setSavedReport(nextReport);
    setReport(nextReport);
    setReportHistory((current) => mergeReports([nextReport], current));
    setView('report');
    trackEvent('benchmark_complete', {
      mode,
      language: setup.language,
      goal: setup.goal,
      roleLevel: setup.roleLevel,
      score: nextReport.overallScore,
    });

    if (!user?.id) return;

    try {
      const persistedReport = await persistBenchmarkReport(nextReport);
      setSavedReport(persistedReport);
      setReportHistory((current) => mergeReports([persistedReport], current));
      setHistoryMessage('Saved to your benchmark history and workspace.');
    } catch (error) {
      setHistoryMessage(
        error instanceof Error
          ? `${error.message} Local save is still available for this session.`
          : 'Local save is still available for this session.'
      );
    }
  };

  const goToNextQuestion = () => {
    if (!activeQuestion) return;
    if (selectedAnswers[activeQuestion.id] === undefined) {
      toast.error('Choose an answer before continuing.');
      return;
    }
    if (questionIndex === questions.length - 1) {
      void finishBenchmark();
      return;
    }
    setQuestionIndex((current) => current + 1);
  };

  const copySummary = async () => {
    const targetReport = report ?? savedReport ?? sampleReport;
    const summary = [
      `Codhak benchmark: ${targetReport.overallScore}/100`,
      `Strengths: ${targetReport.strengths.join(', ')}`,
      `Focus next: ${targetReport.weaknesses.join(', ')}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Report summary copied.');
    } catch {
      toast.error('Could not copy the report summary.');
    }
  };

  const unlockRoadmap = () => {
    trackEvent('signup_after_report', {
      source: mode,
      language: report?.setup.language ?? setup.language,
      goal: report?.setup.goal ?? setup.goal,
      roleLevel: report?.setup.roleLevel ?? setup.roleLevel,
    });
    openAuthModal?.('signup');
  };

  const historyPreview = reportHistory.slice(0, 3);
  const headerCard = (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{mode === 'public' ? 'Free coding skill benchmark' : 'Benchmark workspace'}</span>
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Measure real coding skill in a short, structured benchmark.
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">
        Choose a goal, language, and target level. Codhak turns a short assessment into a score, a skill report, and a clear next step.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Clock3 className="h-4 w-4 text-sky-600" />
            10-minute window
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">Fast enough for onboarding, real enough to be useful.</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Skill report
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">See strengths, gaps, duel readiness, and your recommended next track.</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Target className="h-4 w-4 text-violet-600" />
            Outcome-first
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">Built for interview prep, cohorts, and measurable improvement.</div>
        </div>
      </div>
      {savedReport && view === 'setup' ? (
        <div className="mt-6 rounded-[1.75rem] border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Latest saved benchmark</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{savedReport.overallScore}/100 overall score</div>
            </div>
            <button
              type="button"
              onClick={() => openReport(savedReport)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <span>View saved report</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
      {historyMessage ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {historyMessage}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={mode === 'public' ? 'mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20' : 'px-3 py-4 sm:px-4 lg:px-8 lg:py-8'}>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          {headerCard}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">How it works</div>
            <div className="mt-6 grid gap-4">
              {[
                ['Choose your target', 'Set the benchmark around interview prep, class improvement, or general skill growth.', Target],
                ['Complete the benchmark', 'Move through a short timed sequence built from existing lesson content.', Play],
                ['Get your report', 'See score, strengths, weaknesses, recommended tracks, and duel readiness.', Trophy],
              ].map(([title, description, IconComponent], index) => {
                const Icon = IconComponent as typeof Target;
                return (
                  <div key={title as string} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <Icon className="h-5 w-5 text-slate-900" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                        <div className="mt-1 text-base font-semibold text-slate-950">{title}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {historyPreview.length > 0 || historyLoading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Benchmark history</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">See score progression, not just one attempt.</h3>
                </div>
                {historyLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
              </div>
              <div className="mt-6 grid gap-3">
                {historyPreview.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => openReport(entry)}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{entry.setup.language.toUpperCase()} benchmark</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {entry.setup.goal.replace(/_/g, ' ')} - {formatReportDate(entry.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-950">{entry.overallScore}/100</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{entry.duelReadiness.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {view === 'setup' ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Benchmark setup</div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Start with the outcome you need.</h2>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{questions.length} questions ready</div>
              </div>
              <div className="mt-8 space-y-8">
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">1. Goal</div>
                  <div className="mt-4 grid gap-3">
                    {goalOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSetup((current) => ({ ...current, goal: option.value }))}
                        className={setupCardClassName(setup.goal === option.value, 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10')}
                      >
                        <div className="text-base font-semibold">{option.title}</div>
                        <div className={`mt-1 text-sm leading-6 ${setup.goal === option.value ? 'text-slate-200' : 'text-slate-600'}`}>{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">2. Language</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {languageOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSetup((current) => ({ ...current, language: option.value }))}
                        className={setupCardClassName(setup.language === option.value, 'border-sky-200 bg-sky-50 shadow-sm')}
                      >
                        <div className="text-base font-semibold text-slate-950">{option.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">3. Role level</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {roleOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSetup((current) => ({ ...current, roleLevel: option.value }))}
                        className={setupCardClassName(setup.roleLevel === option.value, 'border-emerald-200 bg-emerald-50 shadow-sm')}
                      >
                        <div className="text-base font-semibold text-slate-950">{option.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-8 flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-950">You will get your report immediately after completion.</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Benchmark first. Save the roadmap after you see the value.</p>
                </div>
                <button type="button" onClick={startBenchmark} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                  <span>Start free benchmark</span>
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {view === 'assessment' && activeQuestion ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Question {questionIndex + 1} of {questions.length}</div>
                  <div className="mt-2 text-xl font-semibold text-slate-950">{activeQuestion.lessonTitle}</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  <Clock3 className="h-4 w-4" />
                  {formatDuration(secondsLeft)} left
                </div>
              </div>
              <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-violet-500 transition-all" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
              </div>
              <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{activeQuestion.competency}</div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{activeQuestion.prompt}</h3>
                <div className="mt-6 grid gap-3">
                  {activeQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswers[activeQuestion.id] === optionIndex;
                    return (
                      <button
                        key={`${activeQuestion.id}-${optionIndex}`}
                        type="button"
                        onClick={() => setSelectedAnswers((current) => ({ ...current, [activeQuestion.id]: optionIndex }))}
                        className={`rounded-2xl border px-5 py-4 text-left transition ${isSelected ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isSelected ? 'border-white bg-white/10 text-white' : 'border-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + optionIndex)}</div>
                          <span className={`text-sm leading-6 ${isSelected ? 'text-slate-50' : 'text-slate-700'}`}>{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={resetBenchmark} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <RefreshCcw className="h-4 w-4" />
                  Restart
                </button>
                <button type="button" onClick={goToNextQuestion} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                  <span>{questionIndex === questions.length - 1 ? 'Generate report' : 'Next question'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {view === 'report' && report ? (
            <BenchmarkReportCard
              report={report}
              actions={
                <div className="flex flex-col gap-4">
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">What to do next</div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <Link to={primaryTrack ? `/tracks/${primaryTrack.id}` : `/languages/${report.setup.language}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                        <span>{primaryTrack ? 'Open recommended track' : 'Open practice path'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button type="button" onClick={() => navigate('/app?section=practice')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        <span>Open practice workspace</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={copySummary} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        <Copy className="h-4 w-4" />
                        <span>Copy report summary</span>
                      </button>
                    </div>
                  </div>
                  {!user ? (
                    <div className="rounded-[1.75rem] border border-violet-200 bg-violet-50/80 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                            <LockKeyhole className="h-4 w-4" />
                            Unlock full roadmap
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-900">Create a free account to save this report, track score history, and unlock the personalized roadmap.</p>
                        </div>
                        <button type="button" onClick={unlockRoadmap} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-800">
                          <span>Create free account</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/70 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved to your workspace
                      </div>
                      <p className="mt-2 text-sm leading-6 text-emerald-900">Your report is saved to benchmark history when the API is available, with local fallback still preserved for this account.</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={resetBenchmark} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                      <RefreshCcw className="h-4 w-4" />
                      Retake benchmark
                    </button>
                    <Link to="/report-sample" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                      <span>View sample report</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Question review</div>
                    <div className="mt-4 space-y-3">
                      {reportQuestions.map((question) => {
                        const answerRecord = report.answerRecords.find((entry) => entry.questionId === question.id);
                        const selectedAnswer =
                          answerRecord && answerRecord.selectedAnswer >= 0
                            ? question.options[answerRecord.selectedAnswer]
                            : 'No answer selected';

                        return (
                          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900">{question.prompt}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{question.competency}</div>
                              </div>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${answerRecord?.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {answerRecord?.isCorrect ? 'Correct' : 'Review'}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your answer</div>
                                <div className="mt-1 text-sm text-slate-700">{selectedAnswer}</div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Correct answer</div>
                                <div className="mt-1 text-sm text-slate-700">{question.options[question.correctAnswer]}</div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Why it matters</div>
                              <div className="mt-1 text-sm leading-6 text-slate-600">{question.explanation}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              }
            />
          ) : null}

          {view === 'setup' ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 sm:p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Sample output</div>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">See the report before you start.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">The sample report shows the score, strengths, gaps, and next steps you get at the end of the benchmark.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link to="/report-sample" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <span>View sample report</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {savedReport ? (
                  <button type="button" onClick={() => openReport(savedReport)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    <span>Open last report</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
