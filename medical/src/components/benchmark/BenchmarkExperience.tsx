import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Gauge,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlanEntitlements } from '../../hooks/usePlanEntitlements';
import {
  getBenchmarkDurationSeconds,
  buildBenchmarkQuestions,
  buildBenchmarkReport,
  buildSampleBenchmarkReport,
  clearBenchmarkSetupPreset,
  getBenchmarkAttemptIndex,
  getBenchmarkBlueprintSummary,
  getProvisionalDifficultyFromAnswers,
  getRetakeTargetWeaknesses,
  readBenchmarkSetupPreset,
  readSavedBenchmarkHistory,
  saveBenchmarkReport,
  saveBenchmarkReportHistory,
  type BenchmarkAnswerRecord,
  type BenchmarkFormat,
  type BenchmarkGoal,
  type BenchmarkQuestion,
  type BenchmarkReport,
  type BenchmarkRoleLevel,
  type BenchmarkSetup,
  type BenchmarkTelemetrySummary,
} from '../../data/benchmarkCatalog';
import { interviewTracks, type LanguageSlug } from '../../data/siteContent';
import {
  BenchmarkApiUnavailableError,
  evaluateBenchmarkSubmission,
  fetchBenchmarkQualitySummary,
  listBenchmarkReports,
  persistBenchmarkReport,
  shareBenchmarkReport,
  unshareBenchmarkReport,
  type BenchmarkExecutionEvaluationResult,
  type BenchmarkQualitySummary,
} from '../../lib/benchmarkApi';
import { formatPlanRenewalDate } from '../../lib/billing';
import { trackEvent } from '../../lib/analytics';
import BenchmarkReportCard from './BenchmarkReportCard';
import CodeTypingEditor from '../CodeTypingEditor';
import {
  type CodeAssessmentResult,
  validateCodeAssessment,
} from '../../lib/codeAssessment';

type AuthModalView = 'login' | 'signup';
type BenchmarkView = 'setup' | 'assessment' | 'report';
type BenchmarkStage = 'baseline' | 'full';
type BenchmarkCodeEvaluation = CodeAssessmentResult & {
  evaluationStrategy: 'typing' | 'execution';
  testResults?: Array<{
    label?: string;
    passed: boolean;
    reason: string;
    hidden?: boolean;
    actual?: string;
    stderr?: string;
  }>;
  runtimeMs?: number;
};
type BenchmarkSessionSnapshot = {
  setup: BenchmarkSetup;
  format: BenchmarkFormat;
  stage: BenchmarkStage;
  attemptIndex: number;
  questions: BenchmarkQuestion[];
  questionIndex: number;
  selectedAnswers: Record<string, number>;
  codeAnswers: Record<string, string>;
  codeEvaluations: Record<string, BenchmarkCodeEvaluation | null>;
  questionRunCounts: Record<string, number>;
  questionLatencies: Record<string, number>;
  telemetrySummary: BenchmarkTelemetrySummary;
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

const BENCHMARK_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const createEmptyTelemetrySummary = (): BenchmarkTelemetrySummary => ({
  blurCount: 0,
  copyPasteCount: 0,
  codeRunCount: 0,
  activeTypingSeconds: 0,
  suspiciousFlags: [],
});

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

const formatOptions: Array<{ value: BenchmarkFormat; title: string; description: string }> = [
  { value: 'quick', title: 'Quick', description: '12 min signal.' },
  { value: 'full', title: 'Full', description: '35 min deep read.' },
  { value: 'retake', title: 'Retake', description: 'Focused progress check.' },
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
      title: 'Run this as a cohort',
      description: 'Use teams, assignments, and reports.',
      ctaLabel: 'See team plans',
    };
  }

  if (currentReport.setup.goal === 'interview_prep' && currentReport.overallScore >= 55) {
    return {
      plan: 'Interview Sprint',
      title: 'Good fit for Interview Sprint',
      description: 'Use a short, focused prep block.',
      ctaLabel: 'See Interview Sprint',
    };
  }

  return {
    plan: 'Pro',
    title: 'Unlock full history',
    description: 'Save reports and practice more.',
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

const toTypingEvaluation = (
  submittedCode: string,
  setupLanguage: LanguageSlug,
  question: BenchmarkQuestion
): BenchmarkCodeEvaluation => {
  const evaluation = validateCodeAssessment(submittedCode, {
    language: setupLanguage,
    starterCode: question.starterCode || '',
    referenceCode: question.referenceCode || '',
    validationMode: question.validationMode || 'exact',
    requiredSnippets: question.requiredSnippets,
    edgeCaseSnippets: question.edgeCaseSnippets,
    qualitySignals: question.qualitySignals,
    efficiencySignals: question.efficiencySignals,
    forbiddenPatterns: question.forbiddenPatterns,
    weights: question.weights,
  });

  return {
    ...evaluation,
    evaluationStrategy: 'typing',
  };
};

const toExecutionEvaluation = (
  payload: BenchmarkExecutionEvaluationResult
): BenchmarkCodeEvaluation => ({
  passed: payload.passed,
  message: payload.message,
  missingSnippets: [],
  scorePercent: payload.scorePercent,
  rubricScores: {
    correctness: payload.rubricBreakdown.correctness,
    edgeCaseHandling: payload.rubricBreakdown.edgeCaseHandling,
    codeQuality: payload.rubricBreakdown.codeQuality,
    efficiency: payload.rubricBreakdown.efficiency,
  },
  matchedSignals: [],
  flaggedPatterns: [],
  evaluationStrategy: 'execution',
  testResults: payload.testResults || [],
  runtimeMs: payload.runtimeMs,
});

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
  const [benchmarkFormat, setBenchmarkFormat] = useState<BenchmarkFormat>('quick');
  const [assessmentStage, setAssessmentStage] = useState<BenchmarkStage>('baseline');
  const [assessmentQuestions, setAssessmentQuestions] = useState<BenchmarkQuestion[]>([]);
  const [assessmentAttemptIndex, setAssessmentAttemptIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [codeEvaluations, setCodeEvaluations] = useState<Record<string, BenchmarkCodeEvaluation | null>>({});
  const [questionRunCounts, setQuestionRunCounts] = useState<Record<string, number>>({});
  const [questionLatencies, setQuestionLatencies] = useState<Record<string, number>>({});
  const [telemetrySummary, setTelemetrySummary] = useState<BenchmarkTelemetrySummary>(createEmptyTelemetrySummary);
  const [secondsLeft, setSecondsLeft] = useState(getBenchmarkDurationSeconds('quick'));
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [savedReport, setSavedReport] = useState<BenchmarkReport | null>(null);
  const [reportHistory, setReportHistory] = useState<BenchmarkReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [qualitySummary, setQualitySummary] = useState<BenchmarkQualitySummary | null>(null);
  const [qualityMessage, setQualityMessage] = useState<string | null>(null);
  const [sharingReportId, setSharingReportId] = useState<string | null>(null);
  const [unsharingReportId, setUnsharingReportId] = useState<string | null>(null);
  const trackedPageRef = useRef(false);
  const trackedReportRef = useRef<string | null>(null);
  const hasRestoredSessionRef = useRef(false);
  const questionStartedAtRef = useRef<number | null>(null);
  const lastTypingAtRef = useRef<number | null>(null);
  const nextAttemptIndex = useMemo(() => getBenchmarkAttemptIndex(setup, reportHistory), [reportHistory, setup]);
  const retakeTargetWeaknesses = useMemo(
    () => (benchmarkFormat === 'retake' ? getRetakeTargetWeaknesses(setup, reportHistory) : []),
    [benchmarkFormat, reportHistory, setup]
  );
  const blueprintSummary = useMemo(
    () => getBenchmarkBlueprintSummary(setup, benchmarkFormat, retakeTargetWeaknesses),
    [benchmarkFormat, retakeTargetWeaknesses, setup]
  );
  const configuredQuestions = useMemo(
    () =>
      buildBenchmarkQuestions(setup, {
        attemptIndex: nextAttemptIndex,
        recentReports: reportHistory,
        format: benchmarkFormat,
        stage: 'baseline',
        targetWeaknesses: retakeTargetWeaknesses,
      }),
    [benchmarkFormat, nextAttemptIndex, reportHistory, retakeTargetWeaknesses, setup]
  );
  const activeQuestion = assessmentQuestions[questionIndex];
  const assessmentSections = useMemo(
    () => Array.from(new Set(assessmentQuestions.map((question) => question.section))),
    [assessmentQuestions]
  );
  const activeSectionIndex = activeQuestion ? assessmentSections.indexOf(activeQuestion.section) : -1;
  const activeSectionQuestions = useMemo(
    () =>
      activeQuestion
        ? assessmentQuestions.filter((question) => question.section === activeQuestion.section)
        : [],
    [activeQuestion, assessmentQuestions]
  );
  const activeSectionQuestionIndex = useMemo(() => {
    if (!activeQuestion) return 0;
    let count = 0;
    for (let index = 0; index <= questionIndex; index += 1) {
      if (assessmentQuestions[index]?.section === activeQuestion.section) {
        count += 1;
      }
    }
    return count;
  }, [activeQuestion, assessmentQuestions, questionIndex]);
  const sampleReport = useMemo(() => buildSampleBenchmarkReport(), []);
  const reportQuestions = useMemo(
    () =>
      report?.questions?.length
        ? report.questions
        : report
        ? buildBenchmarkQuestions(report.setup, {
            attemptIndex: report.attemptIndex ?? 0,
            format: report.format || 'quick',
          })
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
    if (view === 'setup') {
      setSecondsLeft(getBenchmarkDurationSeconds(benchmarkFormat));
    }
  }, [benchmarkFormat, view]);

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
        setHistoryMessage('Setup added from practice.');
        clearBenchmarkSetupPreset();
      }
      hasRestoredSessionRef.current = true;
      return;
    }

    const updatedAt = new Date(storedSession.updatedAt).getTime();
    const isExpired = Number.isNaN(updatedAt) || Date.now() - updatedAt > BENCHMARK_SESSION_TTL_MS;
    const restoredQuestions =
      storedSession.questions?.length > 0
        ? storedSession.questions.map((question) => ({
            ...question,
            section: question.section || 'implementation',
            sectionLabel: question.sectionLabel || 'Code implementation',
            assessmentType: question.assessmentType || (question.kind === 'code' ? 'implementation' : 'theory'),
            dimensions:
              Array.isArray(question.dimensions) && question.dimensions.length > 0
                ? question.dimensions
                : question.kind === 'code'
                ? ['code_writing', 'problem_solving']
                : ['language_fluency'],
            anchor: Boolean(question.anchor),
          }))
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
    setBenchmarkFormat(storedSession.format || 'quick');
    setAssessmentStage(storedSession.stage || 'full');
    setAssessmentAttemptIndex(storedSession.attemptIndex ?? 0);
    setAssessmentQuestions(restoredQuestions);
    setQuestionIndex(storedSession.questionIndex);
    setSelectedAnswers(storedSession.selectedAnswers);
    setCodeAnswers(storedSession.codeAnswers ?? {});
    setCodeEvaluations(storedSession.codeEvaluations ?? {});
    setQuestionRunCounts(storedSession.questionRunCounts ?? {});
    setQuestionLatencies(storedSession.questionLatencies ?? {});
    setTelemetrySummary(storedSession.telemetrySummary ?? createEmptyTelemetrySummary());
    setSecondsLeft(
      Math.max(
        1,
        Math.min(getBenchmarkDurationSeconds(storedSession.format || 'quick'), storedSession.secondsLeft)
      )
    );
    setView('assessment');
    setHistoryMessage('Restored your benchmark.');
    trackEvent('benchmark_session_restored', {
      mode,
      language: storedSession.setup.language,
      goal: storedSession.setup.goal,
      roleLevel: storedSession.setup.roleLevel,
    });
  }, [benchmarkSessionKey, mode, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const loadQualitySummary = async () => {
      try {
        const summary = await fetchBenchmarkQualitySummary();
        if (!cancelled) {
          setQualitySummary(summary);
          setQualityMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setQualitySummary(null);
          setQualityMessage(
            error instanceof Error ? error.message : 'Benchmark calibration details are temporarily unavailable.'
          );
        }
      }
    };

    void loadQualitySummary();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setHistoryMessage(merged.length > 0 ? 'Benchmark history is synced.' : null);
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
      format: benchmarkFormat,
      stage: assessmentStage,
      questionIndex,
      selectedAnswers,
      codeAnswers,
      codeEvaluations,
      questionRunCounts,
      questionLatencies,
      telemetrySummary,
      secondsLeft,
      updatedAt: new Date().toISOString(),
    });
  }, [
    assessmentAttemptIndex,
    assessmentQuestions,
    assessmentStage,
    benchmarkSessionKey,
    benchmarkFormat,
    codeAnswers,
    codeEvaluations,
    questionIndex,
    questionLatencies,
    questionRunCounts,
    secondsLeft,
    selectedAnswers,
    setup,
    telemetrySummary,
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
    if (view !== 'assessment') return;
    questionStartedAtRef.current = Date.now();
  }, [questionIndex, view]);

  useEffect(() => {
    if (view !== 'assessment') return;

    const registerFlag = (flag: string) => {
      setTelemetrySummary((current) => ({
        ...current,
        suspiciousFlags: current.suspiciousFlags.includes(flag)
          ? current.suspiciousFlags
          : [...current.suspiciousFlags, flag],
      }));
    };

    const handleBlur = () => {
      setTelemetrySummary((current) => ({
        ...current,
        blurCount: current.blurCount + 1,
      }));
      registerFlag('tab_switch_detected');
    };

    const handlePaste = () => {
      setTelemetrySummary((current) => ({
        ...current,
        copyPasteCount: current.copyPasteCount + 1,
      }));
      registerFlag('copy_paste_detected');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBlur();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('copy', handlePaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('copy', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    if (report?.format) {
      setBenchmarkFormat(report.format);
    }
  }, [report?.format]);

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
    setBenchmarkFormat(targetReport.format || 'quick');
    setReport(targetReport);
    setView('report');
    updateReportSearchParam(targetReport.id);
  };

  const applyUpdatedReport = (nextReport: BenchmarkReport) => {
    setBenchmarkFormat(nextReport.format || 'quick');
    setReport(nextReport);
    setSavedReport((current) => (current?.id === nextReport.id ? nextReport : current));
    setReportHistory((current) => mergeReports([nextReport], current));
    updateReportSearchParam(nextReport.id);
  };

  const recordQuestionLatency = (questionId: string) => {
    const startedAt = questionStartedAtRef.current;
    if (!startedAt) return;
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    setQuestionLatencies((current) => ({
      ...current,
      [questionId]: Math.max(current[questionId] || 0, elapsedMs),
    }));
  };

  const registerSuspiciousFlag = (flag: string) => {
    setTelemetrySummary((current) => ({
      ...current,
      suspiciousFlags: current.suspiciousFlags.includes(flag)
        ? current.suspiciousFlags
        : [...current.suspiciousFlags, flag],
    }));
  };

  const buildAnswerRecordsForQuestions = (
    questions: BenchmarkQuestion[],
    evaluationMap: Record<string, BenchmarkCodeEvaluation | null> = codeEvaluations,
    runCountMap: Record<string, number> = questionRunCounts,
    latencyMap: Record<string, number> = questionLatencies
  ): BenchmarkAnswerRecord[] =>
    questions.map((question) => {
      const selectedAnswer =
        question.kind === 'multiple_choice' ? selectedAnswers[question.id] ?? -1 : undefined;
      const submittedCode = question.kind === 'code' ? codeAnswers[question.id] ?? '' : undefined;
      const evaluation =
        question.kind === 'code'
          ? evaluationMap[question.id] ??
            toTypingEvaluation(submittedCode || '', setup.language, question)
          : null;
      const mcqCorrect = question.kind === 'multiple_choice' ? selectedAnswer === question.correctAnswer : false;

      return {
        questionId: question.id,
        selectedAnswer,
        submittedCode,
        evaluationMessage: evaluation?.message,
        evaluationStrategy: question.kind === 'code' ? evaluation?.evaluationStrategy || 'typing' : 'choice',
        scorePercent: question.kind === 'multiple_choice' ? (mcqCorrect ? 100 : 0) : evaluation?.scorePercent,
        rubricBreakdown: question.kind === 'code' ? evaluation?.rubricScores : undefined,
        testResults: question.kind === 'code' ? evaluation?.testResults : undefined,
        latencyMs: latencyMap[question.id] || undefined,
        runCount: question.kind === 'code' ? runCountMap[question.id] || 0 : undefined,
        isCorrect:
          question.kind === 'multiple_choice' ? mcqCorrect : Boolean(evaluation?.passed),
      };
    });

  const evaluateCodeQuestion = async (
    question: BenchmarkQuestion,
    submittedCode: string,
    options: { silent?: boolean } = {}
  ) => {
    if (question.evaluationStrategy === 'execution') {
      try {
        const result = await evaluateBenchmarkSubmission({
          templateId: question.templateId,
          language: setup.language as 'python' | 'javascript' | 'java' | 'cpp',
          submittedCode,
        });
        return toExecutionEvaluation(result);
      } catch (error) {
        const fallback = toTypingEvaluation(submittedCode, setup.language, question);
        const degradedMessage =
          error instanceof BenchmarkApiUnavailableError
            ? 'Execution runner unavailable. Used a local structural check instead.'
            : error instanceof Error
            ? `${error.message} Used a local structural check instead.`
            : 'Execution runner unavailable. Used a local structural check instead.';

        if (!options.silent) {
          toast.error(degradedMessage);
        }

        registerSuspiciousFlag('execution_runner_unavailable');
        return {
          ...fallback,
          message: degradedMessage,
          evaluationStrategy: 'typing',
        } satisfies BenchmarkCodeEvaluation;
      }
    }

    return toTypingEvaluation(submittedCode, setup.language, question);
  };

  const appendAdaptiveFollowupIfNeeded = () => {
    if (assessmentStage !== 'baseline') {
      return false;
    }

    const baselineAnswers = buildAnswerRecordsForQuestions(assessmentQuestions);
    const provisionalDifficulty = getProvisionalDifficultyFromAnswers(assessmentQuestions, baselineAnswers);
    const followupQuestions = buildBenchmarkQuestions(setup, {
      attemptIndex: assessmentAttemptIndex,
      recentReports: reportHistory,
      format: benchmarkFormat,
      stage: 'followup',
      provisionalDifficulty,
      targetWeaknesses: retakeTargetWeaknesses,
    });

    if (followupQuestions.length === 0) {
      setAssessmentStage('full');
      return false;
    }

    setAssessmentQuestions((current) => [...current, ...followupQuestions]);
    setAssessmentStage('full');
    trackEvent('benchmark_branch_established', {
      format: benchmarkFormat,
      language: setup.language,
      provisionalDifficulty,
      followupCount: followupQuestions.length,
    });
    return true;
  };

  const resetBenchmark = (nextFormat: BenchmarkFormat = benchmarkFormat) => {
    clearBenchmarkSession(benchmarkSessionKey);
    setView('setup');
    setAssessmentQuestions([]);
    setAssessmentStage('baseline');
    setAssessmentAttemptIndex(0);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setCodeAnswers({});
    setCodeEvaluations({});
    setQuestionRunCounts({});
    setQuestionLatencies({});
    setTelemetrySummary(createEmptyTelemetrySummary());
    questionStartedAtRef.current = null;
    lastTypingAtRef.current = null;
    setSecondsLeft(getBenchmarkDurationSeconds(nextFormat));
    setReport(null);
    setIsFinishing(false);
    setIsCheckingCode(false);
    updateReportSearchParam(null);
  };

  const startBenchmark = () => {
    if (configuredQuestions.length === 0) {
      toast.error('Benchmark questions are unavailable right now.');
      return;
    }
    setAssessmentQuestions(configuredQuestions);
    setAssessmentStage('baseline');
    setAssessmentAttemptIndex(nextAttemptIndex);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setCodeAnswers(
      configuredQuestions.reduce<Record<string, string>>((drafts, question) => {
        if (question.kind === 'code') {
          drafts[question.id] = question.starterCode || '';
        }
        return drafts;
      }, {})
    );
    setCodeEvaluations({});
    setQuestionRunCounts({});
    setQuestionLatencies({});
    setTelemetrySummary(createEmptyTelemetrySummary());
    questionStartedAtRef.current = Date.now();
    lastTypingAtRef.current = null;
    setSecondsLeft(getBenchmarkDurationSeconds(benchmarkFormat));
    setReport(null);
    setIsFinishing(false);
    setView('assessment');
    updateReportSearchParam(null);
    trackEvent('benchmark_start', {
      mode,
      format: benchmarkFormat,
      language: setup.language,
      goal: setup.goal,
      roleLevel: setup.roleLevel,
      questionCount: blueprintSummary.questionCount,
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
    const nextLatencyMap = { ...questionLatencies };
    if (activeQuestion) {
      recordQuestionLatency(activeQuestion.id);
      const startedAt = questionStartedAtRef.current;
      if (startedAt) {
        nextLatencyMap[activeQuestion.id] = Math.max(
          nextLatencyMap[activeQuestion.id] || 0,
          Date.now() - startedAt
        );
      }
    }

    const nextEvaluationMap: Record<string, BenchmarkCodeEvaluation | null> = { ...codeEvaluations };
    const nextRunCountMap = { ...questionRunCounts };
    for (const question of assessmentQuestions) {
      if (question.kind !== 'code' || nextEvaluationMap[question.id]) continue;
      const submittedCode = codeAnswers[question.id] ?? '';
      nextEvaluationMap[question.id] = await evaluateCodeQuestion(question, submittedCode, { silent: true });
      nextRunCountMap[question.id] = Math.max(1, nextRunCountMap[question.id] || 0);
    }

    setCodeEvaluations(nextEvaluationMap);
    setQuestionRunCounts(nextRunCountMap);
    setQuestionLatencies(nextLatencyMap);
    const answerRecords = buildAnswerRecordsForQuestions(
      assessmentQuestions,
      nextEvaluationMap,
      nextRunCountMap,
      nextLatencyMap
    );
    const totalTypingSeconds = Math.round(
      Math.max(
        telemetrySummary.activeTypingSeconds,
        Object.values(nextLatencyMap).reduce((total, value) => total + value, 0) / 1000 * 0.42
      )
    );
    const nextTelemetrySummary: BenchmarkTelemetrySummary = {
      ...telemetrySummary,
      codeRunCount: Object.values(nextRunCountMap).reduce((total, value) => total + value, 0),
      activeTypingSeconds: totalTypingSeconds,
    };

    const nextReport = buildBenchmarkReport(setup, assessmentQuestions, answerRecords, {
      attemptIndex: assessmentAttemptIndex,
      format: benchmarkFormat,
      recentReports: reportHistory,
      telemetrySummary: nextTelemetrySummary,
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
      format: benchmarkFormat,
      language: setup.language,
      goal: setup.goal,
      roleLevel: setup.roleLevel,
      score: nextReport.overallScore,
      attemptIndex: assessmentAttemptIndex,
      codeQuestionCount: assessmentQuestions.filter((question) => question.kind === 'code').length,
    });

    if (!user?.id) {
      setIsFinishing(false);
      return;
    }

    try {
      const persistedReport = await persistBenchmarkReport(nextReport);
      setSavedReport(persistedReport);
      setReportHistory((current) => mergeReports([persistedReport], current));
      setHistoryMessage('Saved to your history.');
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
    recordQuestionLatency(activeQuestion.id);
    if (activeQuestion.kind === 'code') {
      if (!codeEvaluations[activeQuestion.id]) {
        toast.error('Check your code before continuing.');
        return;
      }
      if (questionIndex === assessmentQuestions.length - 1) {
        if (appendAdaptiveFollowupIfNeeded()) {
          setQuestionIndex((current) => current + 1);
          return;
        }
        void finishBenchmark();
        return;
      }
      setQuestionIndex((current) => current + 1);
      return;
    }
    if (selectedAnswers[activeQuestion.id] === undefined) {
      toast.error('Choose an answer before continuing.');
      return;
    }
    if (questionIndex === assessmentQuestions.length - 1) {
      if (appendAdaptiveFollowupIfNeeded()) {
        setQuestionIndex((current) => current + 1);
        return;
      }
      void finishBenchmark();
      return;
    }
    setQuestionIndex((current) => current + 1);
  };

  const handleCodeChange = (question: BenchmarkQuestion, value: string) => {
    const previousValue = codeAnswers[question.id] ?? question.starterCode ?? '';
    const now = Date.now();
    const deltaMs = lastTypingAtRef.current ? Math.min(now - lastTypingAtRef.current, 4000) : 1600;
    lastTypingAtRef.current = now;

    if (value.length - previousValue.length > 180) {
      registerSuspiciousFlag('large_code_insertion');
    }

    setCodeAnswers((current) => ({ ...current, [question.id]: value }));
    setCodeEvaluations((current) => ({ ...current, [question.id]: null }));
    setTelemetrySummary((current) => ({
      ...current,
      activeTypingSeconds:
        Math.round((current.activeTypingSeconds + Math.max(0.2, Math.min(deltaMs / 1000, 2.5))) * 10) / 10,
    }));
  };

  const handleCodeCheck = async () => {
    if (!activeQuestion || activeQuestion.kind !== 'code' || isCheckingCode) return;

    try {
      const currentCode = codeAnswers[activeQuestion.id] ?? '';
      setIsCheckingCode(true);
      const evaluation = await evaluateCodeQuestion(activeQuestion, currentCode);

      setCodeEvaluations((current) => ({
        ...current,
        [activeQuestion.id]: evaluation,
      }));
      setQuestionRunCounts((current) => {
        const nextRunCount = (current[activeQuestion.id] || 0) + 1;
        return {
          ...current,
          [activeQuestion.id]: nextRunCount,
        };
      });
      setTelemetrySummary((current) => ({
        ...current,
        codeRunCount: current.codeRunCount + 1,
      }));

      if (evaluation.passed) {
        toast.success('Code check passed.');
      } else {
        toast.error(evaluation.message);
      }
    } finally {
      setIsCheckingCode(false);
    }
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
        Pick a goal, language, and level. Get a score and next step.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={`${mutedPanelClassName} px-4 py-4`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            {benchmarkFormat === 'full' ? 'Full benchmark' : benchmarkFormat === 'retake' ? 'Retake benchmark' : 'Quick benchmark'}
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {Math.round(getBenchmarkDurationSeconds(benchmarkFormat) / 60)} min / {blueprintSummary.questionCount} items.
          </div>
        </div>
        <div className={`${mutedPanelClassName} px-4 py-4`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Gauge className="h-4 w-4 text-xp" />
            Adaptive path
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            Anchor baseline first. Follow-up difficulty adjusts to the attempt.
          </div>
        </div>
        <div className={`${mutedPanelClassName} px-4 py-4`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Signal integrity
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            Execution checks, trust flags, and stable retake comparisons.
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
    <div
      className={
        mode === 'public'
          ? 'mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8 xl:px-10 lg:py-16 xl:py-20'
          : 'px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3 xl:py-4'
      }
    >
      <div className="grid gap-3 lg:gap-4 xl:min-h-[calc(100dvh-4rem)] xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <div className="min-w-0 space-y-6">
          {headerCard}
          <div className={surfaceCardClassName}>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">How it works</div>
            <div className="mt-6 grid gap-4">
              {[
                  ['Choose your target', 'Pick the setup.', Target],
                  ['Complete the benchmark', 'Finish the timed assessment.', Play],
                  ['Get your report', 'See score and next step.', Trophy],
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

          <div className={surfaceCardClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calibration signal</div>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">Benchmark quality</h3>
              </div>
              {qualitySummary?.available ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Activity className="h-5 w-5 text-muted-foreground" />}
            </div>
            {qualitySummary ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className={`${mutedPanelClassName} px-4 py-4`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reports observed</div>
                    <div className="mt-2 text-2xl font-semibold text-foreground">{qualitySummary.benchmarkCount}</div>
                  </div>
                  <div className={`${mutedPanelClassName} px-4 py-4`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Average trust</div>
                    <div className="mt-2 text-2xl font-semibold text-foreground">{qualitySummary.averageTrustScore}/100</div>
                  </div>
                  <div className={`${mutedPanelClassName} px-4 py-4`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lesson follow-through</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {qualitySummary.validation.lessonFollowThroughRate !== null
                        ? `${qualitySummary.validation.lessonFollowThroughRate}%`
                        : 'Pending'}
                    </div>
                  </div>
                  <div className={`${mutedPanelClassName} px-4 py-4`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Duel follow-through</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {qualitySummary.validation.duelParticipationRate !== null
                        ? `${qualitySummary.validation.duelParticipationRate}%`
                        : 'Pending'}
                    </div>
                  </div>
                </div>
                {qualitySummary.itemSignals.length > 0 ? (
                  <div className="mt-4 rounded-[1.35rem] border border-border bg-background/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top calibrated items</div>
                    <div className="mt-3 grid gap-2">
                      {qualitySummary.itemSignals.slice(0, 3).map((item) => (
                        <div key={item.templateId} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{item.templateId}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {item.calibrationState}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-foreground">{item.passRate}% pass</div>
                            <div className="mt-1 text-xs text-muted-foreground">{item.exposureCount} exposures</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                {qualityMessage || 'Calibration details are loading.'}
              </div>
            )}
          </div>

          {historyPreview.length > 0 || historyLoading ? (
            <div className={surfaceCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Benchmark history</div>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">See score progression.</h3>
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

        <div className="min-w-0 space-y-6">
          {view === 'setup' ? (
            <div className={surfaceCardClassName}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Benchmark setup</div>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">Start with the outcome you need.</h2>
                </div>
                <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {blueprintSummary.questionCount} questions planned
                </div>
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-border bg-background/70 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current benchmark blueprint</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {benchmarkFormat === 'retake'
                    ? 'Re-check the same competencies with rotated variants.'
                    : setup.goal === 'interview_prep'
                    ? 'Baseline, code, debugging, and reading under pressure.'
                    : setup.goal === 'class_improvement'
                    ? 'Baseline first, then applied gaps and debugging.'
                    : 'Baseline first, then implementation and code reading.'}
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
                {benchmarkFormat === 'retake' && retakeTargetWeaknesses.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground">
                    Retake focus: {retakeTargetWeaknesses.join(', ')}.
                  </div>
                ) : null}
              </div>
              <div className="mt-8 space-y-8">
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">1. Format</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {formatOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setBenchmarkFormat(option.value)}
                        className={setupCardClassName(
                          benchmarkFormat === option.value,
                          'border-primary/40 bg-primary/10 text-foreground'
                        )}
                      >
                        <div className="text-base font-semibold">{option.title}</div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">2. Goal</div>
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
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">3. Language</div>
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
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">4. Role level</div>
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
                  <div className="text-sm font-semibold text-foreground">Get a layered skill report.</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {Math.round(getBenchmarkDurationSeconds(benchmarkFormat) / 60)} min. Mostly typed code.
                  </p>
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
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Section {activeSectionIndex + 1}</span>
                    <span className="text-foreground">{activeQuestion.sectionLabel}</span>
                    <span>
                      {activeSectionQuestionIndex}/{Math.max(1, activeSectionQuestions.length)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span>{benchmarkFormat}</span>
                    <span className="text-foreground/60">/</span>
                    <span>{assessmentStage === 'baseline' ? 'baseline path' : 'adaptive follow-up'}</span>
                    <span className="text-foreground/60">/</span>
                    <span>{activeQuestion.evaluationStrategy === 'execution' ? 'execution-graded' : activeQuestion.kind === 'code' ? 'typed code' : 'concept check'}</span>
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{activeQuestion.competency}</div>
                  {activeQuestion.dimensions.map((dimension) => (
                    <span
                      key={dimension}
                      className="inline-flex rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {dimension.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{activeQuestion.prompt}</h3>
                {activeQuestion.kind === 'multiple_choice' ? (
                  <div className="mt-6 grid gap-3">
                    {(activeQuestion.options || []).map((option, optionIndex) => {
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
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {activeQuestion.evaluationStrategy === 'execution'
                        ? 'Write code and run the benchmark tests.'
                        : 'Type your answer. Theory may still use multiple choice.'}
                    </div>
                    {activeQuestion.publicTestCases?.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeQuestion.publicTestCases.map((testCase) => (
                          <div key={`${activeQuestion.id}-${testCase.label}`} className="rounded-2xl border border-border bg-card px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {testCase.label}
                            </div>
                            <div className="mt-2 text-sm text-foreground">Input: {testCase.inputPreview}</div>
                            <div className="mt-1 text-sm text-muted-foreground">Expected: {testCase.expectedPreview}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <CodeTypingEditor
                      language={setup.language}
                      value={codeAnswers[activeQuestion.id] ?? activeQuestion.starterCode ?? ''}
                      onChange={(value) => handleCodeChange(activeQuestion, value)}
                      height="320px"
                    />
                    {codeEvaluations[activeQuestion.id] ? (
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                          codeEvaluations[activeQuestion.id]?.passed
                            ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                        }`}
                      >
                        <div className="font-semibold">
                          {codeEvaluations[activeQuestion.id]?.passed
                            ? activeQuestion.evaluationStrategy === 'execution'
                              ? 'Execution tests passed'
                              : 'Code accepted'
                            : 'Keep refining this answer'}
                        </div>
                        <div className="mt-1">{codeEvaluations[activeQuestion.id]?.message}</div>
                        {codeEvaluations[activeQuestion.id]?.runtimeMs ? (
                          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/70">
                            Runtime {codeEvaluations[activeQuestion.id]?.runtimeMs}ms
                          </div>
                        ) : null}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {Object.entries(codeEvaluations[activeQuestion.id]?.rubricScores || {}).map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
                                {label.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-white">{value}%</div>
                            </div>
                          ))}
                        </div>
                        {codeEvaluations[activeQuestion.id]?.testResults?.length ? (
                          <div className="mt-3 grid gap-2">
                            {codeEvaluations[activeQuestion.id]?.testResults
                              ?.filter((entry) => !entry.hidden)
                              .map((entry, index) => (
                                <div key={`${entry.label || 'test'}-${index}`} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs">
                                  <div className="font-semibold">{entry.label || `Test ${index + 1}`}</div>
                                  <div className="mt-1 text-white/80">
                                    {entry.passed ? 'Passed' : entry.reason}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={resetBenchmark} disabled={isFinishing} className={secondaryButtonClassName}>
                  <RefreshCcw className="h-4 w-4" />
                  Restart
                </button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {activeQuestion.kind === 'code' ? (
                    <button type="button" onClick={handleCodeCheck} disabled={isFinishing || isCheckingCode} className={secondaryButtonClassName}>
                      <span>{activeQuestion.evaluationStrategy === 'execution' ? 'Run tests' : 'Check code'}</span>
                      {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </button>
                  ) : null}
                  <button type="button" onClick={goToNextQuestion} disabled={isFinishing || isCheckingCode} className={primaryButtonClassName}>
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
            </div>
          ) : null}

          {view === 'report' && report ? (
            <BenchmarkReportCard
              report={report}
              actions={
                <div className="flex flex-col gap-4">
                  <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next step</div>
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
                        Clear progress between attempts.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Retention loop</div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Retake after practice to measure progress.
                      </p>
                    </div>
                  )}
                  {upgradeRecommendation ? (
                    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        Recommended plan: {upgradeRecommendation.plan}
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
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/80">Create an account to save this report and roadmap.</p>
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
                        Saved to your benchmark history.
                      </p>
                      <div className="mt-4 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground">
                        {sharedReportUrl ? (
                          <>
                            Public link is live.
                            <span className="text-foreground/75">
                              {' '}Anyone with the link can view it.
                            </span>
                          </>
                        ) : (
                          <>
                            Private by default. Publish when ready.
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
                    <button
                      type="button"
                      onClick={() => {
                        setBenchmarkFormat('retake');
                        resetBenchmark('retake');
                      }}
                      className={secondaryButtonClassName}
                    >
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
                          answerRecord &&
                          typeof answerRecord.selectedAnswer === 'number' &&
                          answerRecord.selectedAnswer >= 0 &&
                          Array.isArray(question.options)
                            ? question.options[answerRecord.selectedAnswer]
                            : 'No answer selected';

                        return (
                          <div key={question.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">{question.prompt}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  <span>{question.sectionLabel}</span>
                                  <span className="text-foreground/60">/</span>
                                  <span>{question.competency}</span>
                                  <span className="text-foreground/60">/</span>
                                  <span>{question.evaluationStrategy}</span>
                                </div>
                              </div>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${answerRecord?.isCorrect ? 'bg-xp/15 text-xp' : 'bg-coins/15 text-coins'}`}>
                                {answerRecord?.isCorrect ? 'Correct' : 'Review'}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              {question.kind === 'multiple_choice' ? (
                                <>
                                  <div className="rounded-2xl bg-background px-4 py-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your answer</div>
                                    <div className="mt-1 text-sm text-foreground">{selectedAnswer}</div>
                                  </div>
                                  <div className="rounded-2xl bg-background px-4 py-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Correct answer</div>
                                    <div className="mt-1 text-sm text-foreground">
                                      {Array.isArray(question.options) && typeof question.correctAnswer === 'number'
                                        ? question.options[question.correctAnswer]
                                        : 'Reference answer unavailable'}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="rounded-2xl bg-background px-4 py-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your code</div>
                                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950/90 p-3 text-xs leading-6 text-slate-100">
                                      {answerRecord?.submittedCode?.trim() || 'No code submitted'}
                                    </pre>
                                  </div>
                                  <div className="rounded-2xl bg-background px-4 py-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reference code</div>
                                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-950/90 p-3 text-xs leading-6 text-emerald-200">
                                      {question.referenceCode?.trim() || 'Reference answer unavailable'}
                                    </pre>
                                  </div>
                                </>
                              )}
                            </div>
                            {answerRecord?.rubricBreakdown ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                {Object.entries(answerRecord.rubricBreakdown).map(([label, value]) => (
                                  <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                      {label.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">{value}%</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {answerRecord?.testResults?.length ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {answerRecord.testResults
                                  .filter((entry) => !entry.hidden)
                                  .map((entry, index) => (
                                    <div key={`${question.id}-review-test-${index}`} className="rounded-xl border border-border bg-background px-3 py-2">
                                      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                        {entry.label || `Test ${index + 1}`}
                                      </div>
                                      <div className="mt-1 text-sm font-medium text-foreground">
                                        {entry.passed ? 'Passed' : entry.reason}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : null}
                            <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why it matters</div>
                              <div className="mt-1 text-sm leading-6 text-muted-foreground">{question.explanation}</div>
                              {answerRecord?.evaluationMessage ? (
                                <div className="mt-2 text-sm text-foreground/80">{answerRecord.evaluationMessage}</div>
                              ) : null}
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
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Preview the report.</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">See score, gaps, and next step.</p>
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
