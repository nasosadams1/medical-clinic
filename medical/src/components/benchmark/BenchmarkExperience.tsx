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
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlanEntitlements } from '../../hooks/usePlanEntitlements';
import {
  buildBenchmarkQuestions,
  buildBenchmarkReport,
  buildSampleBenchmarkReport,
  clearBenchmarkSetupPreset,
  getBenchmarkAttemptIndex,
  getBenchmarkBlueprintSummary,
  readBenchmarkSetupPreset,
  readSavedBenchmarkHistory,
  saveBenchmarkReport,
  saveBenchmarkReportHistory,
  type BenchmarkGoal,
  type BenchmarkQuestion,
  type BenchmarkReport,
  type BenchmarkRoleLevel,
  type BenchmarkSetup,
} from '../../data/benchmarkCatalog';
import { interviewTracks, type LanguageSlug } from '../../data/siteContent';
import { listBenchmarkReports, persistBenchmarkReport, shareBenchmarkReport, unshareBenchmarkReport } from '../../lib/benchmarkApi';
import { formatPlanRenewalDate } from '../../lib/billing';
import { trackEvent } from '../../lib/analytics';
import BenchmarkReportCard from './BenchmarkReportCard';

type AuthModalView = 'login' | 'signup';
type BenchmarkView = 'setup' | 'assessment' | 'report';
type BenchmarkSessionSnapshot = {
  setup: BenchmarkSetup;
  attemptIndex: number;
  questions: BenchmarkQuestion[];
  questionIndex: number;
  selectedAnswers: Record<string, number>;
  secondsLeft: number;
  updatedAt: string;
};
type UpgradeRecommendation = {
  plan: 'Pro' | 'Interview Sprint' | 'Teams';
  title: string;
  description: string;
  ctaLabel: string;
};

interface BenchmarkExperienceProps {
  mode?: 'public' | 'app';
  presetLanguage?: LanguageSlug;
  openAuthModal?: (view?: AuthModalView) => void;
}

const DURATION_SECONDS = 10 * 60;
const BENCHMARK_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

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

const surfaceCardClassName = 'rounded-[1.5rem] border border-border bg-card p-5 shadow-card sm:p-6';
const mutedPanelClassName = 'rounded-[1.35rem] border border-border bg-background/70';
const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60';
const setupCardClassName = (active: boolean, activeClasses: string) =>
  `rounded-2xl border px-5 py-4 text-left transition ${
    active
      ? activeClasses
      : 'border-border bg-background/70 text-foreground hover:border-primary/30 hover:bg-background'
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

const findPreviousComparableReport = (
  currentReport: BenchmarkReport | null,
  history: BenchmarkReport[]
) => {
  if (!currentReport) return null;

  const exactSetupMatch = history.find(
    (entry) =>
      entry.id !== currentReport.id &&
      entry.setup.language === currentReport.setup.language &&
      entry.setup.goal === currentReport.setup.goal &&
      entry.setup.roleLevel === currentReport.setup.roleLevel
  );

  if (exactSetupMatch) return exactSetupMatch;

  return (
    history.find(
      (entry) => entry.id !== currentReport.id && entry.setup.language === currentReport.setup.language
    ) || null
  );
};

const buildUpgradeRecommendation = (currentReport: BenchmarkReport | null): UpgradeRecommendation | null => {
  if (!currentReport) return null;

  if (currentReport.setup.goal === 'class_improvement') {
    return {
      plan: 'Teams',
      title: 'Turn this into a cohort workflow',
      description: 'Use team dashboards, assignments, and benchmark analytics to prove improvement across a class or cohort.',
      ctaLabel: 'See team plans',
    };
  }

  if (currentReport.setup.goal === 'interview_prep' && currentReport.overallScore >= 55) {
    return {
      plan: 'Interview Sprint',
      title: 'You are close enough for a focused sprint',
      description: 'A short, high-intent interview prep offer is the best fit when someone already has workable fundamentals and needs tighter execution.',
      ctaLabel: 'See Interview Sprint',
    };
  }

  return {
    plan: 'Pro',
    title: 'Unlock the full practice and history loop',
    description: 'Pro is the best fit for learners who need a deeper roadmap, unlimited assessed practice, and a clean history of score progression.',
    ctaLabel: 'View Pro plan',
  };
};

const getBenchmarkSessionStorageKey = (mode: 'public' | 'app', userId?: string | null) =>
  `codhak-benchmark-session:${mode}:${userId || 'anonymous'}`;

const readBenchmarkSession = (storageKey: string): BenchmarkSessionSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.sessionStorage.getItem(storageKey);
    if (!storedValue) return null;
    return JSON.parse(storedValue) as BenchmarkSessionSnapshot;
  } catch {
    return null;
  }
};

const writeBenchmarkSession = (storageKey: string, snapshot: BenchmarkSessionSnapshot) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Ignore session storage failures for the benchmark MVP.
  }
};

const clearBenchmarkSession = (storageKey: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore session storage failures for the benchmark MVP.
  }
};

const copyTextToClipboard = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Clipboard is not available.');
  }
};

export default function BenchmarkExperience({
  mode = 'public',
  presetLanguage,
  openAuthModal,
}: BenchmarkExperienceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, setNavigationCallback } = useAuth();
  const { getPlanEntitlement } = usePlanEntitlements();
  const [view, setView] = useState<BenchmarkView>('setup');
  const [setup, setSetup] = useState<BenchmarkSetup>({
    goal: 'interview_prep',
    language: presetLanguage ?? 'python',
    roleLevel: 'junior',
  });
  const [assessmentQuestions, setAssessmentQuestions] = useState<BenchmarkQuestion[]>([]);
  const [assessmentAttemptIndex, setAssessmentAttemptIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [savedReport, setSavedReport] = useState<BenchmarkReport | null>(null);
  const [reportHistory, setReportHistory] = useState<BenchmarkReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [sharingReportId, setSharingReportId] = useState<string | null>(null);
  const [unsharingReportId, setUnsharingReportId] = useState<string | null>(null);
  const trackedPageRef = useRef(false);
  const trackedReportRef = useRef<string | null>(null);
  const hasRestoredSessionRef = useRef(false);
  const nextAttemptIndex = useMemo(() => getBenchmarkAttemptIndex(setup, reportHistory), [reportHistory, setup]);
  const blueprintSummary = useMemo(() => getBenchmarkBlueprintSummary(setup), [setup]);
  const configuredQuestions = useMemo(
    () => buildBenchmarkQuestions(setup, { attemptIndex: nextAttemptIndex, recentReports: reportHistory }),
    [nextAttemptIndex, reportHistory, setup]
  );
  const activeQuestion = assessmentQuestions[questionIndex];
  const sampleReport = useMemo(() => buildSampleBenchmarkReport(), []);
  const reportQuestions = useMemo(
    () =>
      report?.questions?.length
        ? report.questions
        : report
        ? buildBenchmarkQuestions(report.setup, { attemptIndex: report.attemptIndex ?? 0 })
        : [],
    [report]
  );
  const primaryTrack = report?.recommendedTrackIds[0]
    ? interviewTracks.find((track) => track.id === report.recommendedTrackIds[0])
    : undefined;
  const previousComparableReport = useMemo(
    () => findPreviousComparableReport(report, reportHistory),
    [report, reportHistory]
  );
  const scoreDelta =
    report && previousComparableReport ? report.overallScore - previousComparableReport.overallScore : null;
  const upgradeRecommendation = useMemo(() => buildUpgradeRecommendation(report), [report]);
  const activeRecommendedEntitlement = useMemo(() => {
    if (!upgradeRecommendation) return null;
    if (upgradeRecommendation.plan === 'Pro') return getPlanEntitlement('pro_monthly');
    if (upgradeRecommendation.plan === 'Interview Sprint') return getPlanEntitlement('interview_sprint');
    return null;
  }, [getPlanEntitlement, upgradeRecommendation]);
  const benchmarkSessionKey = useMemo(
    () => getBenchmarkSessionStorageKey(mode, user?.id),
    [mode, user?.id]
  );
  const sharedReportUrl = useMemo(() => {
    if (!report?.isPublic || !report.shareToken) return null;
    if (typeof window === 'undefined' || !window.location?.origin) {
      return `/reports/${report.shareToken}`;
    }
    return `${window.location.origin}/reports/${report.shareToken}`;
  }, [report?.isPublic, report?.shareToken]);
  const updateReportSearchParam = (reportId?: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (reportId) {
      nextParams.set('report', reportId);
    } else {
      nextParams.delete('report');
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (presetLanguage && setup.language !== presetLanguage) {
      setSetup((current) => ({ ...current, language: presetLanguage }));
    }
  }, [presetLanguage, setup.language]);

  useEffect(() => {
    hasRestoredSessionRef.current = false;
  }, [benchmarkSessionKey]);

  useEffect(() => {
    if (hasRestoredSessionRef.current) return;
    if (searchParams.get('report') === 'latest') return;

    const storedSession = readBenchmarkSession(benchmarkSessionKey);
    if (!storedSession) {
      const presetSetup = readBenchmarkSetupPreset();
      if (presetSetup) {
        setSetup({
          ...presetSetup,
          language: presetLanguage ?? presetSetup.language,
        });
        setHistoryMessage('Benchmark setup was pre-filled from your practice workspace.');
        clearBenchmarkSetupPreset();
      }
      hasRestoredSessionRef.current = true;
      return;
    }

    const updatedAt = new Date(storedSession.updatedAt).getTime();
    const isExpired = Number.isNaN(updatedAt) || Date.now() - updatedAt > BENCHMARK_SESSION_TTL_MS;
    const restoredQuestions =
      storedSession.questions?.length > 0
        ? storedSession.questions
        : buildBenchmarkQuestions(storedSession.setup, { attemptIndex: storedSession.attemptIndex ?? 0 });
    const hasValidQuestionIndex =
      storedSession.questionIndex >= 0 && storedSession.questionIndex < restoredQuestions.length;

    if (isExpired || restoredQuestions.length === 0 || !hasValidQuestionIndex) {
      clearBenchmarkSession(benchmarkSessionKey);
      hasRestoredSessionRef.current = true;
      return;
    }

    hasRestoredSessionRef.current = true;
    setSetup(storedSession.setup);
    setAssessmentAttemptIndex(storedSession.attemptIndex ?? 0);
    setAssessmentQuestions(restoredQuestions);
    setQuestionIndex(storedSession.questionIndex);
    setSelectedAnswers(storedSession.selectedAnswers);
    setSecondsLeft(Math.max(1, Math.min(DURATION_SECONDS, storedSession.secondsLeft)));
    setView('assessment');
    setHistoryMessage('Restored your in-progress benchmark.');
    trackEvent('benchmark_session_restored', {
      mode,
      language: storedSession.setup.language,
      goal: storedSession.setup.goal,
      roleLevel: storedSession.setup.roleLevel,
    });
  }, [benchmarkSessionKey, mode, searchParams]);

  useEffect(() => {
    if (trackedPageRef.current) return;
    trackedPageRef.current = true;
    trackEvent('benchmark_page_view', { mode, presetLanguage: presetLanguage ?? 'none' });
  }, [mode, presetLanguage]);

  useEffect(() => {
    let cancelled = false;

    const syncHistory = async () => {
      const anonymousHistory = readSavedBenchmarkHistory();
      const localUserHistory = readSavedBenchmarkHistory(user?.id);
      const localHistory = mergeReports(localUserHistory, anonymousHistory);
      const requestedReportId = searchParams.get('report');

      setSavedReport(localHistory[0] ?? null);

      if (!user?.id) {
        setReportHistory(localHistory);
        setHistoryMessage(null);
        if (requestedReportId) {
          const targetReport =
            requestedReportId === 'latest'
              ? localHistory[0]
              : localHistory.find((entry) => entry.id === requestedReportId);

          if (targetReport) {
            setReport(targetReport);
            setView('report');
          }
        }
        return;
      }

      if (anonymousHistory.length > 0) {
        saveBenchmarkReportHistory(mergeReports(localUserHistory, anonymousHistory), user.id);
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
        if (requestedReportId) {
          const targetReport =
            requestedReportId === 'latest'
              ? merged[0]
              : merged.find((entry) => entry.id === requestedReportId);

          if (targetReport) {
            setReport(targetReport);
            setView('report');
          }
        }
        setHistoryMessage(
          merged.length > 0 ? 'Signed-in benchmark history is now connected to your workspace.' : null
        );
      } catch (error) {
        if (cancelled) return;
        setReportHistory(localHistory);
        setSavedReport(localHistory[0] ?? null);
        if (requestedReportId) {
          const targetReport =
            requestedReportId === 'latest'
              ? localHistory[0]
              : localHistory.find((entry) => entry.id === requestedReportId);

          if (targetReport) {
            setReport(targetReport);
            setView('report');
          }
        }
        setHistoryMessage(
          error instanceof Error ? error.message : 'Benchmark history is temporarily using local storage on this device.'
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
  }, [searchParams, setSearchParams, user?.id]);

  useEffect(() => {
    if (view !== 'assessment') return;
    if (isFinishing) return;
    if (secondsLeft <= 0) {
      void finishBenchmark();
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [isFinishing, secondsLeft, view]);

  useEffect(() => {
    if (view !== 'assessment') {
      clearBenchmarkSession(benchmarkSessionKey);
      return;
    }

    writeBenchmarkSession(benchmarkSessionKey, {
      setup,
      attemptIndex: assessmentAttemptIndex,
      questions: assessmentQuestions,
      questionIndex,
      selectedAnswers,
      secondsLeft,
      updatedAt: new Date().toISOString(),
    });
  }, [
    assessmentAttemptIndex,
    assessmentQuestions,
    benchmarkSessionKey,
    questionIndex,
    secondsLeft,
    selectedAnswers,
    setup,
    view,
  ]);

  useEffect(() => {
    if (view !== 'assessment') return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view]);

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
    if (!report || !upgradeRecommendation) return;
    trackEvent('pricing_plan_recommended', {
      plan: upgradeRecommendation.plan,
      language: report.setup.language,
      goal: report.setup.goal,
      roleLevel: report.setup.roleLevel,
      score: report.overallScore,
    });
  }, [report, upgradeRecommendation]);

  useEffect(() => {
    const targetPath =
      view === 'report' || savedReport
        ? `${mode === 'public' ? '/benchmark' : '/app?section=benchmark'}${mode === 'public' ? '?report=latest' : '&report=latest'}`
        : mode === 'public'
        ? '/benchmark'
        : '/app?section=benchmark';

    setNavigationCallback(() => {
      navigate(targetPath, { replace: true });
    });

    return () => {
      setNavigationCallback(() => {
        navigate('/app', { replace: true });
      });
    };
  }, [mode, navigate, savedReport, setNavigationCallback, view]);

  const openReport = (targetReport: BenchmarkReport) => {
    setReport(targetReport);
    setView('report');
    updateReportSearchParam(targetReport.id);
  };

  const applyUpdatedReport = (nextReport: BenchmarkReport) => {
    setReport(nextReport);
    setSavedReport((current) => (current?.id === nextReport.id ? nextReport : current));
    setReportHistory((current) => mergeReports([nextReport], current));
    updateReportSearchParam(nextReport.id);
  };

  const resetBenchmark = () => {
    clearBenchmarkSession(benchmarkSessionKey);
    setView('setup');
    setAssessmentQuestions([]);
    setAssessmentAttemptIndex(0);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setSecondsLeft(DURATION_SECONDS);
    setReport(null);
    setIsFinishing(false);
    updateReportSearchParam(null);
  };

  const startBenchmark = () => {
    if (configuredQuestions.length === 0) {
      toast.error('Benchmark questions are unavailable right now.');
      return;
    }
    setAssessmentQuestions(configuredQuestions);
    setAssessmentAttemptIndex(nextAttemptIndex);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setSecondsLeft(DURATION_SECONDS);
    setReport(null);
    setIsFinishing(false);
    setView('assessment');
    updateReportSearchParam(null);
    trackEvent('benchmark_start', {
      mode,
      language: setup.language,
      goal: setup.goal,
      roleLevel: setup.roleLevel,
      questionCount: configuredQuestions.length,
      attemptIndex: nextAttemptIndex,
    });
  };

  const finishBenchmark = async () => {
    if (isFinishing) return;
    if (assessmentQuestions.length === 0) {
      toast.error('Benchmark questions are unavailable right now.');
      setView('setup');
      return;
    }

    setIsFinishing(true);

    const answerRecords = assessmentQuestions.map((question) => {
      const selectedAnswer = selectedAnswers[question.id] ?? -1;
      return {
        questionId: question.id,
        selectedAnswer,
        isCorrect: selectedAnswer === question.correctAnswer,
      };
    });

    const nextReport = buildBenchmarkReport(setup, assessmentQuestions, answerRecords, {
      attemptIndex: assessmentAttemptIndex,
    });
    setHistoryMessage(null);
    saveBenchmarkReport(nextReport);
    if (user?.id) {
      saveBenchmarkReport(nextReport, user.id);
    }

    setSavedReport(nextReport);
    setReport(nextReport);
    setReportHistory((current) => mergeReports([nextReport], current));
    setView('report');
    updateReportSearchParam(nextReport.id);
    trackEvent('benchmark_complete', {
      mode,
      language: setup.language,
      goal: setup.goal,
      roleLevel: setup.roleLevel,
      score: nextReport.overallScore,
      attemptIndex: assessmentAttemptIndex,
    });

    if (!user?.id) {
      setIsFinishing(false);
      return;
    }

    try {
      const persistedReport = await persistBenchmarkReport(nextReport);
      setSavedReport(persistedReport);
      setReportHistory((current) => mergeReports([persistedReport], current));
      setHistoryMessage('Saved to your benchmark history and workspace.');
    } catch (error) {
      setHistoryMessage(
        error instanceof Error
          ? `${error.message} Local save is still available on this device.`
          : 'Local save is still available on this device.'
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const goToNextQuestion = () => {
    if (!activeQuestion) return;
    if (isFinishing) return;
    if (selectedAnswers[activeQuestion.id] === undefined) {
      toast.error('Choose an answer before continuing.');
      return;
    }
    if (questionIndex === assessmentQuestions.length - 1) {
      void finishBenchmark();
      return;
    }
    setQuestionIndex((current) => current + 1);
  };

  const copySummary = async () => {
    const targetReport = report ?? savedReport ?? sampleReport;
    const summary = [
      `Codhak benchmark: ${targetReport.overallScore}/100`,
      scoreDelta !== null ? `Score delta: ${scoreDelta > 0 ? '+' : ''}${scoreDelta} vs previous benchmark` : null,
      `Strengths: ${targetReport.strengths.join(', ')}`,
      `Focus next: ${targetReport.weaknesses.join(', ')}`,
    ].join('\n');
    try {
      await copyTextToClipboard(summary);
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

  const openRecommendedTrack = () => {
    if (mode === 'app' || user) {
      navigate('/app?section=practice');
      return;
    }

    const fallbackTrack = primaryTrack?.id ? `/tracks/${primaryTrack.id}` : `/languages/${report?.setup.language ?? setup.language}`;
    navigate(fallbackTrack);
  };

  const openPracticePath = () => {
    if (mode === 'app' || user) {
      navigate('/app?section=practice');
      return;
    }

    navigate(primaryTrack?.id ? `/tracks/${primaryTrack.id}` : `/languages/${report?.setup.language ?? setup.language}`);
  };

  const openUpgradePath = () => {
    if (!upgradeRecommendation) return;

    trackEvent('subscription_cta_clicked', {
      plan: upgradeRecommendation.plan,
      source: 'benchmark_report',
      language: report?.setup.language ?? setup.language,
      goal: report?.setup.goal ?? setup.goal,
      roleLevel: report?.setup.roleLevel ?? setup.roleLevel,
    });

    if (upgradeRecommendation.plan === 'Teams') {
      navigate('/teams');
      return;
    }

    if (activeRecommendedEntitlement) {
      navigate(upgradeRecommendation.plan === 'Interview Sprint' ? '/app?section=benchmark' : '/app?section=practice');
      return;
    }

    navigate(user ? '/app?section=store' : '/pricing');
  };

  const copySharedReportLink = async () => {
    if (!sharedReportUrl) return;

    try {
      await copyTextToClipboard(sharedReportUrl);
      toast.success('Public report link copied.');
      trackEvent('benchmark_report_shared', {
        action: 'copied',
        language: report?.setup.language ?? setup.language,
        goal: report?.setup.goal ?? setup.goal,
      });
    } catch {
      toast.error('Could not copy the public report link.');
    }
  };

  const handlePublishReport = async () => {
    if (!report?.id) return;
    if (!user) {
      unlockRoadmap();
      return;
    }

    setSharingReportId(report.id);
    try {
      await persistBenchmarkReport(report);
      const sharedReport = await shareBenchmarkReport(report.id);
      applyUpdatedReport(sharedReport);

      const nextUrl =
        sharedReport.shareToken && typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/reports/${sharedReport.shareToken}`
          : null;

      if (nextUrl) {
        await copyTextToClipboard(nextUrl);
        toast.success('Public report published and link copied.');
      } else {
        toast.success('Public report published.');
      }

      trackEvent('benchmark_report_shared', {
        action: 'published',
        language: sharedReport.setup.language,
        goal: sharedReport.setup.goal,
        roleLevel: sharedReport.setup.roleLevel,
        score: sharedReport.overallScore,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Could not publish the public benchmark report.');
    } finally {
      setSharingReportId(null);
    }
  };

  const handleUnshareReport = async () => {
    if (!report?.id) return;

    setUnsharingReportId(report.id);
    try {
      const nextReport = await unshareBenchmarkReport(report.id);
      applyUpdatedReport(nextReport);
      toast.success('Public report link disabled.');
      trackEvent('benchmark_report_shared', {
        action: 'disabled',
        language: nextReport.setup.language,
        goal: nextReport.setup.goal,
        roleLevel: nextReport.setup.roleLevel,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Could not disable the public benchmark link.');
    } finally {
      setUnsharingReportId(null);
    }
  };

  const historyPreview = reportHistory.slice(0, 3);
  const headerCard = (
    <div className={surfaceCardClassName}>
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{mode === 'public' ? 'Free coding skill benchmark' : 'Benchmark workspace'}</span>
      </div>
      <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Measure real coding skill in a short, structured benchmark.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
        Choose a goal, language, and target level. Codhak turns a short assessment into a score, a skill report, and a clear next step.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={`${mutedPanelClassName} px-4 py-4`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            {blueprintSummary.questionCount} calibrated questions
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            Stable difficulty for this setup, with rotated question variants across retakes.
          </div>
        </div>
        <div className={`${mutedPanelClassName} px-4 py-4`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-xp" />
            Difficulty mix
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {blueprintSummary.difficultyMix.beginner} foundational, {blueprintSummary.difficultyMix.intermediate} applied, {blueprintSummary.difficultyMix.advanced} stretch questions.
          </div>
        </div>
        <div className={`${mutedPanelClassName} px-4 py-4`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Target className="h-4 w-4 text-accent" />
            Measured competencies
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {blueprintSummary.competencies.slice(0, 3).join(', ')}
            {blueprintSummary.competencies.length > 3 ? ', and more.' : '.'}
          </div>
        </div>
      </div>
      {savedReport && view === 'setup' ? (
        <div className="mt-6 rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Latest saved benchmark</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{savedReport.overallScore}/100 overall score</div>
            </div>
            <button
              type="button"
              onClick={() => openReport(savedReport)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-card"
            >
              <span>View saved report</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
      {historyMessage ? (
        <div className="mt-4 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
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
          <div className={surfaceCardClassName}>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">How it works</div>
            <div className="mt-6 grid gap-4">
              {[
                ['Choose your target', 'Set the benchmark around interview prep, class improvement, or general skill growth.', Target],
                ['Complete the benchmark', 'Move through a short timed sequence built from existing lesson content.', Play],
                ['Get your report', 'See score, strengths, weaknesses, recommended tracks, and duel readiness.', Trophy],
              ].map(([title, description, IconComponent], index) => {
                const Icon = IconComponent as typeof Target;
                return (
                  <div key={title as string} className={`${mutedPanelClassName} px-5 py-4`}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step {index + 1}</div>
                        <div className="mt-1 text-base font-semibold text-foreground">{title}</div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {historyPreview.length > 0 || historyLoading ? (
            <div className={surfaceCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Benchmark history</div>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">See score progression, not just one attempt.</h3>
                </div>
                {historyLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
              </div>
              <div className="mt-6 grid gap-3">
                {historyPreview.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => openReport(entry)}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-background"
                  >
                    <div>
                      <div className="text-sm font-semibold text-foreground">{entry.setup.language.toUpperCase()} benchmark</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {entry.setup.goal.replace(/_/g, ' ')} - {formatReportDate(entry.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">{entry.overallScore}/100</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{entry.duelReadiness.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {view === 'setup' ? (
            <div className={surfaceCardClassName}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Benchmark setup</div>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">Start with the outcome you need.</h2>
                </div>
                <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {configuredQuestions.length} questions ready
                </div>
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-border bg-background/70 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current benchmark blueprint</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {setup.goal === 'interview_prep'
                    ? 'Emphasizes screening-style problem solving and pressure readiness.'
                    : setup.goal === 'class_improvement'
                    ? 'Emphasizes foundational coverage and instructional gap detection.'
                    : 'Emphasizes skill-growth coverage and repeatable practice planning.'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {blueprintSummary.competencies.map((competency) => (
                    <span
                      key={competency}
                      className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {competency}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-8 space-y-8">
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">1. Goal</div>
                  <div className="mt-4 grid gap-3">
                    {goalOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSetup((current) => ({ ...current, goal: option.value }))}
                        className={setupCardClassName(setup.goal === option.value, 'border-primary/40 bg-primary/10 text-foreground')}
                      >
                        <div className="text-base font-semibold">{option.title}</div>
                        <div className={`mt-1 text-sm leading-6 ${setup.goal === option.value ? 'text-foreground/80' : 'text-muted-foreground'}`}>{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">2. Language</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {languageOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSetup((current) => ({ ...current, language: option.value }))}
                        className={setupCardClassName(setup.language === option.value, 'border-primary/40 bg-primary/10')}
                      >
                        <div className="text-base font-semibold text-foreground">{option.title}</div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">3. Role level</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {roleOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSetup((current) => ({ ...current, roleLevel: option.value }))}
                        className={setupCardClassName(setup.roleLevel === option.value, 'border-primary/40 bg-primary/10')}
                      >
                        <div className="text-base font-semibold text-foreground">{option.title}</div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-border bg-background/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">You will get your report immediately after completion.</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Benchmark first. Save the roadmap after you see the value.</p>
                </div>
                <button type="button" onClick={startBenchmark} className={primaryButtonClassName}>
                  <span>Start free benchmark</span>
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {view === 'assessment' && activeQuestion ? (
            <div className={surfaceCardClassName}>
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Question {questionIndex + 1} of {assessmentQuestions.length}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">{activeQuestion.lessonTitle}</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Clock3 className="h-4 w-4" />
                  {formatDuration(secondsLeft)} left
                </div>
              </div>
              <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((questionIndex + 1) / Math.max(1, assessmentQuestions.length)) * 100}%` }}
                />
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-border bg-background/70 p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{activeQuestion.competency}</div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{activeQuestion.prompt}</h3>
                <div className="mt-6 grid gap-3">
                  {activeQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswers[activeQuestion.id] === optionIndex;
                    return (
                      <button
                        key={`${activeQuestion.id}-${optionIndex}`}
                        type="button"
                        onClick={() => setSelectedAnswers((current) => ({ ...current, [activeQuestion.id]: optionIndex }))}
                        className={`rounded-2xl border px-5 py-4 text-left transition ${isSelected ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-border bg-card hover:border-primary/25 hover:bg-background'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isSelected ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{String.fromCharCode(65 + optionIndex)}</div>
                          <span className={`text-sm leading-6 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={resetBenchmark} disabled={isFinishing} className={secondaryButtonClassName}>
                  <RefreshCcw className="h-4 w-4" />
                  Restart
                </button>
                <button type="button" onClick={goToNextQuestion} disabled={isFinishing} className={primaryButtonClassName}>
                  <span>
                    {isFinishing
                      ? 'Generating report...'
                      : questionIndex === assessmentQuestions.length - 1
                      ? 'Generate report'
                      : 'Next question'}
                  </span>
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
                  <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">What to do next</div>
                    <div className={`mt-4 grid gap-3 ${user ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                      <button type="button" onClick={openRecommendedTrack} className={primaryButtonClassName}>
                        <span>{primaryTrack ? 'Open recommended track' : 'Open practice path'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={openPracticePath} className={secondaryButtonClassName}>
                        <span>{mode === 'app' || user ? 'Open practice workspace' : 'Open practice path'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={copySummary} className={secondaryButtonClassName}>
                        <Copy className="h-4 w-4" />
                        <span>Copy progress summary</span>
                      </button>
                      {user ? (
                        <button
                          type="button"
                          onClick={sharedReportUrl ? copySharedReportLink : handlePublishReport}
                          disabled={sharingReportId === report.id}
                          className={secondaryButtonClassName}
                        >
                          {sharingReportId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          <span>{sharedReportUrl ? 'Copy public link' : 'Publish public report'}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {scoreDelta !== null ? (
                    <div className="rounded-[1.5rem] border border-xp/20 bg-xp/10 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-xp">Improvement signal</div>
                      <div className="mt-3 text-2xl font-semibold text-foreground">
                        {scoreDelta > 0 ? '+' : ''}
                        {scoreDelta} points vs previous benchmark
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground/80">
                        This is the kind of proof-of-progress signal that makes Codhak more valuable for both learners and team buyers.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Retention loop</div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Take the benchmark again after a focused practice block. The next report will show score delta and turn effort into visible progress.
                      </p>
                    </div>
                  )}
                  {upgradeRecommendation ? (
                    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        Recommended next path: {upgradeRecommendation.plan}
                      </div>
                      <div className="mt-3 text-xl font-semibold text-foreground">{upgradeRecommendation.title}</div>
                      <p className="mt-2 text-sm leading-6 text-foreground/80">{upgradeRecommendation.description}</p>
                      {activeRecommendedEntitlement ? (
                        <div className="mt-4 rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-sm text-foreground">
                          {upgradeRecommendation.plan} is already active
                          {activeRecommendedEntitlement.currentPeriodEnd ? (
                            <span className="text-foreground/75">
                              {' '}until {formatPlanRenewalDate(activeRecommendedEntitlement.currentPeriodEnd) || 'your current renewal date'}.
                            </span>
                          ) : (
                            '.'
                          )}
                        </div>
                      ) : null}
                      <button type="button" onClick={openUpgradePath} className={`${primaryButtonClassName} mt-4`}>
                        <span>{activeRecommendedEntitlement ? 'Open workspace' : upgradeRecommendation.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  {!user ? (
                    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                            <LockKeyhole className="h-4 w-4" />
                            Unlock full roadmap
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/80">Create a free account to save this report, track score history, and unlock the personalized roadmap.</p>
                        </div>
                        <button type="button" onClick={unlockRoadmap} className={primaryButtonClassName}>
                          <span>Create free account</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-xp/20 bg-xp/10 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-xp">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved to your workspace
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground/80">
                        Your report is saved to benchmark history when the API is available, with local fallback still preserved for this account.
                      </p>
                      <div className="mt-4 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground">
                        {sharedReportUrl ? (
                          <>
                            Public proof link is live.
                            <span className="text-foreground/75">
                              {' '}Anyone with the link can view this report.
                            </span>
                          </>
                        ) : (
                          <>
                            Keep this private by default, or publish a public proof-of-skill link when you want to share progress.
                          </>
                        )}
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={sharedReportUrl ? copySharedReportLink : handlePublishReport}
                          disabled={sharingReportId === report.id}
                          className={primaryButtonClassName}
                        >
                          {sharingReportId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          <span>{sharedReportUrl ? 'Copy public report link' : 'Publish public report'}</span>
                        </button>
                        {sharedReportUrl ? (
                          <button
                            type="button"
                            onClick={handleUnshareReport}
                            disabled={unsharingReportId === report.id}
                            className={secondaryButtonClassName}
                          >
                            {unsharingReportId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            <span>Disable public link</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={resetBenchmark} className={secondaryButtonClassName}>
                      <RefreshCcw className="h-4 w-4" />
                      Retake benchmark
                    </button>
                    <Link to="/report-sample" className={secondaryButtonClassName}>
                      <span>View sample report</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Question review</div>
                    <div className="mt-4 space-y-3">
                      {reportQuestions.map((question) => {
                        const answerRecord = report.answerRecords.find((entry) => entry.questionId === question.id);
                        const selectedAnswer =
                          answerRecord && answerRecord.selectedAnswer >= 0
                            ? question.options[answerRecord.selectedAnswer]
                            : 'No answer selected';

                        return (
                          <div key={question.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">{question.prompt}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{question.competency}</div>
                              </div>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${answerRecord?.isCorrect ? 'bg-xp/15 text-xp' : 'bg-coins/15 text-coins'}`}>
                                {answerRecord?.isCorrect ? 'Correct' : 'Review'}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl bg-background px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your answer</div>
                                <div className="mt-1 text-sm text-foreground">{selectedAnswer}</div>
                              </div>
                              <div className="rounded-2xl bg-background px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Correct answer</div>
                                <div className="mt-1 text-sm text-foreground">{question.options[question.correctAnswer]}</div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why it matters</div>
                              <div className="mt-1 text-sm leading-6 text-muted-foreground">{question.explanation}</div>
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
            <div className={surfaceCardClassName}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sample output</div>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">See the report before you start.</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">The sample report shows the score, strengths, gaps, and next steps you get at the end of the benchmark.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link to="/report-sample" className={secondaryButtonClassName}>
                  <span>View sample report</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {savedReport ? (
                  <button type="button" onClick={() => openReport(savedReport)} className={secondaryButtonClassName}>
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
