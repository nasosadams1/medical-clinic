import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlanAccess } from '../../hooks/usePlanAccess';
import {
  getBenchmarkDurationSeconds,
  buildBenchmarkQuestions,
  buildBenchmarkReport,
  clearBenchmarkSetupPreset,
  getBenchmarkAttemptIndex,
  getBenchmarkBlueprintSummary,
  getBenchmarkPackDefinition,
  getProvisionalDifficultyFromAnswers,
  getRetakeTargetWeaknesses,
  readBenchmarkSetupPreset,
  readSavedBenchmarkHistory,
  saveBenchmarkReport,
  saveBenchmarkReportHistory,
  type BenchmarkAnswerRecord,
  type BenchmarkCalibrationSignal,
  type BenchmarkFormat,
  type BenchmarkGoal,
  type BenchmarkQuestion,
  type BenchmarkReport,
  type BenchmarkRoleLevel,
  type BenchmarkSkillBucket,
  type BenchmarkSetup,
  type BenchmarkTelemetrySummary,
} from '../../data/benchmarkEngine';
import { getLessonCatalogEntry } from '../../data/lessonCatalog';
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
} from '../../lib/benchmarkApi';
import { formatPlanRenewalDate } from '../../lib/billing';
import { trackEvent } from '../../lib/analytics';
import BenchmarkReportCard from './BenchmarkReportCard';
import CodeTypingEditor from '../CodeTypingEditor';
import {
  type CodeAssessmentResult,
  validateCodeAssessment,
} from '../../lib/codeAssessment';
import { benchmarkFormatLabels } from '../../data/benchmarkModel';
import { FREE_SKILL_CHECK_LIMIT } from '../../lib/planAccess';

type AuthModalView = 'login' | 'signup';
type BenchmarkView = 'setup' | 'assessment' | 'report';
type BenchmarkStage = 'baseline' | 'full';
type BenchmarkCodeEvaluation = CodeAssessmentResult & {
  evaluationStrategy: 'typing' | 'execution';
  blocked?: boolean;
  requiresExecution?: boolean;
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
  selectionSeed: string;
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
  { value: 'skill_growth', title: 'Fundamentals', description: 'Measure core language fluency and route the next lessons.' },
  { value: 'interview_prep', title: 'Interview prep', description: 'Score role-focused readiness under timed pressure.' },
];

const languageOptions: Array<{ value: LanguageSlug; title: string; description: string }> = [
  { value: 'python', title: 'Python', description: 'Backend basics and problem solving.' },
  { value: 'javascript', title: 'JavaScript', description: 'Frontend logic and interview fundamentals.' },
  { value: 'java', title: 'Java', description: 'OOP, data structures, and class-ready assessment.' },
  { value: 'cpp', title: 'C++', description: 'Structured logic and early systems-style practice.' },
];

const roleOptions: Array<{ value: BenchmarkRoleLevel; title: string; description: string }> = [
  { value: 'beginner', title: 'Beginner', description: 'Build the foundation before harder benchmark pressure.' },
  { value: 'junior', title: 'Junior', description: 'Benchmark for job-style reasoning and screening pressure.' },
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
  `rounded-[1.15rem] border px-3.5 py-3 text-left transition ${
    active
      ? `${activeClasses} ring-1 ring-primary/40 shadow-[0_0_0_1px_rgba(56,189,248,0.16)]`
      : 'border-border/55 bg-background/20 text-foreground/78 hover:border-primary/18 hover:bg-background/45'
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

const benchmarkDifficultyLabels: Record<BenchmarkQuestion['difficulty'], string> = {
  beginner: 'Easy',
  intermediate: 'Medium',
  advanced: 'Hard',
};

const benchmarkQuestionTypeLabels: Record<BenchmarkQuestion['questionType'], string> = {
  code_tracing: 'Code tracing',
  debugging: 'Debugging',
  code_completion: 'Code completion',
  choose_the_best_fix: 'Best fix',
  short_function_writing: 'Function writing',
  output_prediction: 'Output prediction',
  code_reading_comprehension: 'Code reading',
  applied_mini_problem: 'Mini problem',
};

const formatQuestionDurationLabel = (seconds: number) => {
  if (seconds < 60) return `~${Math.round(seconds / 5) * 5 || seconds} sec`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `~${minutes} min`;
};

const createBenchmarkSelectionSeed = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const looksLikeBenchmarkCode = (value: string) => {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) return false;
  const lines = normalized.split('\n');
  if (lines.length < 2) return false;
  return lines.some((line) =>
    /(^\s*(def |function |class |for |while |if |return |print\(|console\.log|System\.out|std::|#include|let |const |var |public |private |static |int |double |bool |char |\{)|[;{}]|=>)/.test(
      line
    )
  );
};

const getBenchmarkQuestionSupportText = (question: BenchmarkQuestion) => {
  switch (question.questionType) {
    case 'output_prediction':
    case 'code_tracing':
      return 'Read the snippet and choose the correct output.';
    case 'code_reading_comprehension':
      return 'Read the snippet and choose the correct result.';
    case 'debugging':
    case 'choose_the_best_fix':
      return 'Inspect the code and choose the strongest fix.';
    case 'code_completion':
      return 'Complete the missing logic using the existing structure.';
    case 'short_function_writing':
      return 'Write the required function, then run the benchmark check.';
    case 'applied_mini_problem':
      return 'Solve the mini-problem using the required function signature.';
    default:
      return 'Use the prompt, answer carefully, and move the benchmark forward.';
  }
};

const buildBenchmarkQuestionPresentation = (question: BenchmarkQuestion) => {
  const normalizedPrompt = question.prompt.replace(/\r\n/g, '\n').trim();
  const blocks = normalizedPrompt
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({
      type: looksLikeBenchmarkCode(block) ? ('code' as const) : ('text' as const),
      content: block,
    }));
  const titleBlockIndex = blocks.findIndex((block) => block.type === 'text');
  const title =
    titleBlockIndex >= 0
      ? blocks[titleBlockIndex].content.replace(/\s+/g, ' ').trim()
      : question.blueprintLabel || question.lessonTitle;

  return {
    title,
    supportText: getBenchmarkQuestionSupportText(question),
    blocks: blocks.filter((_, index) => index !== titleBlockIndex),
  };
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

const toExecutionBlockedEvaluation = (message: string): BenchmarkCodeEvaluation => ({
  passed: false,
  message,
  missingSnippets: [],
  scorePercent: 0,
  rubricScores: {
    correctness: 0,
    edgeCaseHandling: 0,
    codeQuality: 0,
    efficiency: 0,
  },
  matchedSignals: [],
  flaggedPatterns: ['execution_runner_unavailable'],
  evaluationStrategy: 'execution',
  blocked: true,
  requiresExecution: true,
});

const toExecutionMissingEvaluation = (): BenchmarkCodeEvaluation => ({
  passed: false,
  message: 'Write code before running benchmark tests.',
  missingSnippets: [],
  scorePercent: 0,
  rubricScores: {
    correctness: 0,
    edgeCaseHandling: 0,
    codeQuality: 0,
    efficiency: 0,
  },
  matchedSignals: [],
  flaggedPatterns: [],
  evaluationStrategy: 'execution',
  testResults: [],
  requiresExecution: true,
});

export default function BenchmarkExperience({
  mode = 'public',
  presetLanguage,
  openAuthModal,
}: BenchmarkExperienceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, setNavigationCallback } = useAuth();
  const { getPlanEntitlement, hasAnyTeamPlan, hasPaidLearnerAccess } = usePlanAccess();
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
  const [assessmentSelectionSeed, setAssessmentSelectionSeed] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [codeEvaluations, setCodeEvaluations] = useState<Record<string, BenchmarkCodeEvaluation | null>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [questionRunCounts, setQuestionRunCounts] = useState<Record<string, number>>({});
  const [questionLatencies, setQuestionLatencies] = useState<Record<string, number>>({});
  const [telemetrySummary, setTelemetrySummary] = useState<BenchmarkTelemetrySummary>(createEmptyTelemetrySummary);
  const [secondsLeft, setSecondsLeft] = useState(getBenchmarkDurationSeconds('quick'));
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [savedReport, setSavedReport] = useState<BenchmarkReport | null>(null);
  const [reportHistory, setReportHistory] = useState<BenchmarkReport[]>([]);
  const [globalCalibrationSignals, setGlobalCalibrationSignals] = useState<BenchmarkCalibrationSignal[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
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
  const buildQuestionSet = (
    selectionSeed: string,
    stage: 'baseline' | 'followup' | 'full' = 'baseline',
    options: {
      attemptIndex?: number;
      excludedTemplateIds?: string[];
      provisionalDifficulty?: BenchmarkQuestion['difficulty'];
    } = {}
  ) =>
    buildBenchmarkQuestions(setup, {
      attemptIndex: options.attemptIndex ?? nextAttemptIndex,
      recentReports: reportHistory,
      globalItemSignals: globalCalibrationSignals,
      format: benchmarkFormat,
      stage,
      provisionalDifficulty: options.provisionalDifficulty,
      targetWeaknesses: retakeTargetWeaknesses,
      selectionSeed,
      excludedTemplateIds: options.excludedTemplateIds,
    });
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
  const primaryTrack = report?.recommendedTrackIds[0]
    ? interviewTracks.find((track) => track.id === report.recommendedTrackIds[0])
    : undefined;
  const reportSuggestedLessons = useMemo(
    () => (report?.suggestedLessonIds || []).map((lessonId) => getLessonCatalogEntry(lessonId)).filter(Boolean).slice(0, 3),
    [report?.suggestedLessonIds]
  );
  const scoreDelta = report?.deltaFromLastAttempt ?? null;
  const reportComparisonMessage =
    report && scoreDelta === null && !report.comparisonSignal.deltaEligible
      ? `${report.comparisonSignal.label}. ${report.comparisonSignal.description}`
      : null;
  const retakeSuggestionLabel = report
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(new Date(report.createdAt).getTime() + 48 * 60 * 60 * 1000))
    : null;
  const upgradeRecommendation = useMemo(() => buildUpgradeRecommendation(report), [report]);
  const activeRecommendedEntitlement = useMemo(() => {
    if (!upgradeRecommendation) return null;
    if (upgradeRecommendation.plan === 'Pro') return getPlanEntitlement('pro_monthly');
    if (upgradeRecommendation.plan === 'Interview Sprint') return getPlanEntitlement('interview_sprint');
    return null;
  }, [getPlanEntitlement, upgradeRecommendation]);
  const hasFreeSkillCheckRemaining = hasPaidLearnerAccess || reportHistory.length < FREE_SKILL_CHECK_LIMIT;
  const canAccessSelectedFormat = hasPaidLearnerAccess || benchmarkFormat === 'quick';
  const canAccessSelectedGoal =
    setup.goal === 'skill_growth' ||
    (setup.goal === 'interview_prep' ? hasPaidLearnerAccess : hasAnyTeamPlan);
  const canViewFullReport = hasPaidLearnerAccess;
  const canViewReportHistory = hasPaidLearnerAccess;
  const canRetakeBenchmark = hasPaidLearnerAccess;
  const canShareBenchmarkReport = hasPaidLearnerAccess;
  const setupRestrictionMessage = useMemo(() => {
    if (!hasFreeSkillCheckRemaining) {
      return 'Free includes one skill check. Upgrade to unlock more attempts, full history, and retakes.';
    }
    if (!canAccessSelectedFormat) {
      return 'Full benchmarks and retakes unlock with Pro or Interview Sprint.';
    }
    if (!canAccessSelectedGoal && setup.goal === 'interview_prep') {
      return 'Interview-focused skill checks unlock with Pro or Interview Sprint.';
    }
    if (!canAccessSelectedGoal && setup.goal === 'class_improvement') {
      return 'Class improvement skill checks unlock with a Teams plan.';
    }
    return null;
  }, [canAccessSelectedFormat, canAccessSelectedGoal, hasFreeSkillCheckRemaining, setup.goal]);
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
    if (!hasPaidLearnerAccess && benchmarkFormat !== 'quick') {
      setBenchmarkFormat('quick');
    }
  }, [benchmarkFormat, hasPaidLearnerAccess]);

  useEffect(() => {
    if (setup.goal === 'interview_prep' && !hasPaidLearnerAccess) {
      setSetup((current) => ({ ...current, goal: 'skill_growth', roleLevel: 'beginner' }));
      return;
    }

    if (setup.goal === 'class_improvement' && !hasAnyTeamPlan) {
      setSetup((current) => ({ ...current, goal: hasPaidLearnerAccess ? 'interview_prep' : 'skill_growth' }));
    }
  }, [hasAnyTeamPlan, hasPaidLearnerAccess, setup.goal]);

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
        : buildBenchmarkQuestions(storedSession.setup, {
            attemptIndex: storedSession.attemptIndex ?? 0,
            format: storedSession.format || 'quick',
            stage: storedSession.stage || 'baseline',
            globalItemSignals: globalCalibrationSignals,
            selectionSeed: storedSession.selectionSeed || `restore:${storedSession.attemptIndex ?? 0}`,
          });
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
    setAssessmentSelectionSeed(storedSession.selectionSeed || '');
    setAssessmentQuestions(restoredQuestions);
    setQuestionIndex(storedSession.questionIndex);
    setSelectedAnswers(storedSession.selectedAnswers);
    setCodeAnswers(storedSession.codeAnswers ?? {});
    setCodeEvaluations(storedSession.codeEvaluations ?? {});
    setRevealedHints({});
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
  }, [benchmarkSessionKey, globalCalibrationSignals, mode, searchParams]);

  useEffect(() => {
    if (trackedPageRef.current) return;
    trackedPageRef.current = true;
    trackEvent('benchmark_page_view', { mode, presetLanguage: presetLanguage ?? 'none' });
  }, [mode, presetLanguage]);

  useEffect(() => {
    let cancelled = false;

    const loadCalibrationSignals = async () => {
      try {
        const summary = await fetchBenchmarkQualitySummary();
        if (cancelled || !summary?.available) return;
        setGlobalCalibrationSignals(summary.itemSignals || []);
      } catch {
        if (!cancelled) {
          setGlobalCalibrationSignals([]);
        }
      }
    };

    void loadCalibrationSignals();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncHistory = async () => {
      const anonymousHistory = readSavedBenchmarkHistory();
      const localUserHistory = readSavedBenchmarkHistory(user?.id);
      const localHistory = mergeReports(localUserHistory, anonymousHistory);
      const visibleLocalHistory = hasPaidLearnerAccess ? localHistory : localHistory.slice(0, 1);
      const requestedReportId = searchParams.get('report');

      setSavedReport(visibleLocalHistory[0] ?? null);

      if (!user?.id) {
        setReportHistory(localHistory);
        setHistoryMessage(null);
        if (requestedReportId) {
          const targetReport =
            requestedReportId === 'latest'
              ? visibleLocalHistory[0]
              : visibleLocalHistory.find((entry) => entry.id === requestedReportId);

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
        const visibleMerged = hasPaidLearnerAccess ? merged : merged.slice(0, 1);
        setReportHistory(merged);
        setSavedReport(visibleMerged[0] ?? null);
        if (requestedReportId) {
          const targetReport =
            requestedReportId === 'latest'
              ? visibleMerged[0]
              : visibleMerged.find((entry) => entry.id === requestedReportId);

          if (targetReport) {
            setReport(targetReport);
            setView('report');
          }
        }
        setHistoryMessage(merged.length > 0 ? 'Benchmark history is synced.' : null);
      } catch (error) {
        if (cancelled) return;
        setReportHistory(localHistory);
        setSavedReport(visibleLocalHistory[0] ?? null);
        if (requestedReportId) {
          const targetReport =
            requestedReportId === 'latest'
              ? visibleLocalHistory[0]
              : visibleLocalHistory.find((entry) => entry.id === requestedReportId);

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
  }, [hasPaidLearnerAccess, searchParams, setSearchParams, user?.id]);

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
      selectionSeed: assessmentSelectionSeed,
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
    assessmentSelectionSeed,
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
      format: report.format,
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
      format: report.format,
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
            (question.evaluationStrategy === 'execution'
              ? null
              : toTypingEvaluation(submittedCode || '', setup.language, question))
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
        blocked: question.kind === 'code' ? Boolean(evaluation?.blocked) : undefined,
        requiresExecution: question.kind === 'code' ? Boolean(evaluation?.requiresExecution) : undefined,
        isCorrect:
          question.kind === 'multiple_choice' ? mcqCorrect : Boolean(evaluation?.passed && !evaluation?.blocked),
      };
    });

  const evaluateCodeQuestion = async (
    question: BenchmarkQuestion,
    submittedCode: string,
    options: { silent?: boolean } = {}
  ) => {
    if (question.evaluationStrategy === 'execution') {
      if (!submittedCode.trim()) {
        return toExecutionMissingEvaluation();
      }
      try {
        const result = await evaluateBenchmarkSubmission({
          templateId: question.templateId,
          language: setup.language as 'python' | 'javascript' | 'java' | 'cpp',
          submittedCode,
          starterCode: question.starterCode,
          referenceCode: question.referenceCode,
          executionCases: question.executionCases,
        });
        return toExecutionEvaluation(result);
      } catch (error) {
        const blockedMessage =
          error instanceof BenchmarkApiUnavailableError
            ? 'Execution runner unavailable. This benchmark code task cannot be scored until execution is available.'
            : error instanceof Error
            ? `${error.message} This benchmark code task cannot be scored until execution is available.`
            : 'Execution runner unavailable. This benchmark code task cannot be scored until execution is available.';

        if (!options.silent) {
          toast.error(blockedMessage);
        }

        registerSuspiciousFlag('execution_runner_unavailable');
        return toExecutionBlockedEvaluation(blockedMessage);
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
    const followupQuestions = buildQuestionSet(
      assessmentSelectionSeed || `followup:${assessmentAttemptIndex}`,
      'followup',
      {
        attemptIndex: assessmentAttemptIndex,
        provisionalDifficulty,
        excludedTemplateIds: assessmentQuestions.map((question) => question.templateId),
      }
    );

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
    setAssessmentSelectionSeed('');
    setQuestionIndex(0);
    setSelectedAnswers({});
    setCodeAnswers({});
    setCodeEvaluations({});
    setRevealedHints({});
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
    if (!hasFreeSkillCheckRemaining) {
      toast.error('Free includes one skill check. Upgrade to unlock more attempts.');
      navigate('/pricing?intent=pro');
      return;
    }
    if (!canAccessSelectedFormat) {
      toast.error('Full benchmarks and retakes unlock with Pro or Interview Sprint.');
      navigate('/pricing?intent=pro');
      return;
    }
    if (!canAccessSelectedGoal) {
      toast.error(
        setup.goal === 'class_improvement'
          ? 'Class improvement skill checks unlock with a Teams plan.'
          : 'Interview-focused skill checks unlock with Pro or Interview Sprint.'
      );
      navigate(setup.goal === 'class_improvement' ? '/teams' : '/pricing?intent=interview_sprint');
      return;
    }

    const nextSelectionSeed = createBenchmarkSelectionSeed();
    const nextQuestions = buildQuestionSet(nextSelectionSeed, 'baseline');
    if (nextQuestions.length === 0) {
      toast.error('Benchmark questions are unavailable right now.');
      return;
    }

    setAssessmentQuestions(nextQuestions);
    setAssessmentStage('baseline');
    setAssessmentAttemptIndex(nextAttemptIndex);
    setAssessmentSelectionSeed(nextSelectionSeed);
    setQuestionIndex(0);
    setSelectedAnswers({});
    setCodeAnswers(
      nextQuestions.reduce<Record<string, string>>((drafts, question) => {
        if (question.kind === 'code') {
          drafts[question.id] = question.starterCode || '';
        }
        return drafts;
      }, {})
    );
    setCodeEvaluations({});
    setRevealedHints({});
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
    const blockedExecutionQuestionIndex = assessmentQuestions.findIndex(
      (question) =>
        question.kind === 'code' &&
        question.evaluationStrategy === 'execution' &&
        Boolean(nextEvaluationMap[question.id]?.blocked || !nextEvaluationMap[question.id])
    );

    if (blockedExecutionQuestionIndex >= 0) {
      setQuestionIndex(blockedExecutionQuestionIndex);
      toast.error('Execution-backed benchmark questions require the runner. Run the check again when execution is available.');
      setIsFinishing(false);
      return;
    }

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
      setHistoryMessage(
        hasPaidLearnerAccess ? 'Saved to your history.' : 'Starter report saved. Upgrade for full history and retakes.'
      );
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
      if (codeEvaluations[activeQuestion.id]?.blocked) {
        toast.error('This benchmark code task must complete a real execution check before you continue.');
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

      if (evaluation.blocked) {
        return;
      }

      if (evaluation.passed) {
        toast.success('Code check passed.');
      } else {
        toast.error(evaluation.message);
      }
    } finally {
      setIsCheckingCode(false);
    }
  };

  const unlockRoadmap = () => {
    trackEvent('signup_after_report', {
      source: mode,
      format: report?.format ?? benchmarkFormat,
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
      format: report?.format ?? benchmarkFormat,
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
    if (!canShareBenchmarkReport) {
      toast.error('Public report sharing unlocks with Pro or Interview Sprint.');
      navigate('/pricing?intent=interview_sprint');
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
    if (!canShareBenchmarkReport) return;

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

  const historyPreview = (canViewReportHistory ? reportHistory : reportHistory.slice(0, 1)).slice(0, 3);
  const benchmarkDurationMinutes = Math.round(getBenchmarkDurationSeconds(benchmarkFormat) / 60);
  const selectedPack = getBenchmarkPackDefinition(setup);
  const selectedGoalOption = goalOptions.find((option) => option.value === setup.goal) ?? goalOptions[0];
  const selectedLanguageOption = languageOptions.find((option) => option.value === setup.language) ?? languageOptions[0];
  const selectedRoleOption = roleOptions.find((option) => option.value === setup.roleLevel) ?? roleOptions[0];
  const visibleHistory = canViewReportHistory ? reportHistory : historyPreview;
  const bestHistoryEntry =
    visibleHistory.length > 0
      ? visibleHistory.reduce((best, entry) => (entry.overallScore > best.overallScore ? entry : best), visibleHistory[0])
      : null;
  const savedReportDelta = savedReport?.deltaFromLastAttempt ?? null;
  const savedReportComparisonLabel =
    savedReport && savedReportDelta === null && !savedReport.comparisonSignal.deltaEligible
      ? savedReport.comparisonSignal.label
      : null;
  const benchmarkBlueprintDescription =
    benchmarkFormat === 'retake'
      ? 'Focused on the weak areas from your last attempt so the retake measures real improvement instead of random variation.'
      : selectedPack.simulatorPromise;
  const benchmarkMetaLine = `${benchmarkDurationMinutes} min / ${blueprintSummary.questionCount} questions / ${selectedRoleOption.title} / ${selectedGoalOption.title}`;
  const benchmarkValueProps = [
    { title: 'Score', description: 'See where you stand right now.', icon: BarChart3 },
    { title: 'Weak spots', description: 'Know exactly what still breaks.', icon: Gauge },
    { title: 'Next lesson', description: 'Get the fastest corrective path.', icon: Target },
    { title: 'Duel readiness', description: 'See whether to drill more or compete.', icon: Trophy },
  ];
  const latestHistoryEntry = historyPreview[0] ?? null;
  const benchmarkTopicsPreview = blueprintSummary.topics.slice(0, 4);
  const benchmarkQuestionMixPreview = blueprintSummary.questionMixLabels.slice(0, 4);
  const assessmentQuestionStates = assessmentQuestions.map((question) => {
    if (question.kind === 'multiple_choice') {
      return selectedAnswers[question.id] !== undefined ? 'answered' : 'skipped';
    }

    if (codeEvaluations[question.id]?.passed) {
      return 'answered';
    }

    return (codeAnswers[question.id] ?? question.starterCode ?? '').trim() ? 'draft' : 'skipped';
  });
  const unansweredQuestionIndexes = assessmentQuestionStates
    .map((state, index) => (state === 'answered' ? null : index))
    .filter((value): value is number => value !== null);
  const nextSkippedQuestionIndex = unansweredQuestionIndexes.find((index) => index !== questionIndex);
  const answeredQuestionCount = assessmentQuestionStates.filter((state) => state === 'answered').length;
  const questionProgressPercent =
    assessmentQuestions.length > 0 ? ((questionIndex + 1) / assessmentQuestions.length) * 100 : 0;

  const goToQuestion = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= assessmentQuestions.length || nextIndex === questionIndex) return;
    if (activeQuestion) {
      recordQuestionLatency(activeQuestion.id);
    }
    setQuestionIndex(nextIndex);
  };

  const queueWeakAreaRetake = (sourceReport?: BenchmarkReport | null) => {
    const nextReport = sourceReport ?? savedReport ?? latestHistoryEntry ?? report;
    if (!nextReport) return;

    clearBenchmarkSession(benchmarkSessionKey);
    setSetup({
      goal: nextReport.setup.goal,
      language: nextReport.setup.language,
      roleLevel: nextReport.setup.roleLevel,
    });
    setBenchmarkFormat('retake');
    setView('setup');
    setReport(null);
    updateReportSearchParam(null);
    setHistoryMessage('Weak-area retake ready.');
  };

  const restartInFormat = (nextFormat: BenchmarkFormat) => {
    setBenchmarkFormat(nextFormat);
    resetBenchmark(nextFormat);
  };

  const renderSetupSelectorGroup = (
    label: string,
    options: Array<{ value: string; title: string; description: string }>,
    selectedValue: string,
    onSelect: (value: string) => void,
    lockResolver?: (value: string) => { locked: boolean; label?: string; message?: string; target?: string }
  ) => (
    <section className="space-y-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {options.map((option) => {
          const lockState = lockResolver?.(option.value) ?? { locked: false };
          const isActive = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (lockState.locked) {
                  if (lockState.message) {
                    toast.error(lockState.message);
                  }
                  if (lockState.target) {
                    navigate(lockState.target);
                  }
                  return;
                }
                onSelect(option.value);
              }}
              className={setupCardClassName(
                isActive,
                'border-primary/50 bg-primary/16 text-foreground shadow-[0_0_0_1px_rgba(56,189,248,0.18)]'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">{option.title}</div>
                {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                {lockState.locked ? (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {lockState.label || 'Locked'}
                  </span>
                ) : null}
              </div>
              <div className={`mt-1 text-xs leading-5 ${isActive ? 'text-foreground/75' : 'text-muted-foreground'}`}>
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );

  if (view === 'setup') {
    return (
      <div
        className={
          mode === 'public'
            ? 'mx-auto w-full max-w-[1220px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 lg:py-10'
            : 'mx-auto w-full max-w-[1220px] px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3'
        }
      >
        <div className="space-y-3.5 lg:space-y-4">
          <section className={surfaceCardClassName}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.98fr)_minmax(360px,0.92fr)] xl:gap-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 type-kicker text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Skill check</span>
                </div>
                <h1 className="mt-3 max-w-2xl text-[1.45rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[1.72rem]">
                  Measure your current coding level in 12 minutes.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Choose the target, preview the benchmark, then start one timed diagnostic that turns directly into the next lesson plan.
                </p>

                {historyMessage ? (
                  <div className="mt-3 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                    {historyMessage}
                  </div>
                ) : null}

                <div className="mt-4 space-y-4">
                  <section>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Format</div>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                      {formatOptions.map((option) => {
                        const isLocked = !hasPaidLearnerAccess && option.value !== 'quick';
                        const isActive = benchmarkFormat === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (isLocked) {
                                toast.error('Full benchmarks and retakes unlock with Pro or Interview Sprint.');
                                navigate('/pricing?intent=pro');
                                return;
                              }
                              setBenchmarkFormat(option.value);
                            }}
                            className={setupCardClassName(
                              isActive,
                              'border-primary/45 bg-primary/12 text-foreground'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-base font-semibold">{option.title}</div>
                              {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                              {isLocked ? (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                  Pro
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Goal</div>
                    <div className="mt-2.5 grid gap-2.5">
                      {goalOptions.map((option) => {
                        const isLocked =
                          option.value === 'class_improvement'
                            ? !hasAnyTeamPlan
                            : option.value === 'interview_prep'
                            ? !hasPaidLearnerAccess
                            : false;
                        const isActive = setup.goal === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (isLocked) {
                                toast.error(
                                  option.value === 'class_improvement'
                                    ? 'Class improvement skill checks unlock with a Teams plan.'
                                    : 'Interview-focused skill checks unlock with Pro or Interview Sprint.'
                                );
                                navigate(option.value === 'class_improvement' ? '/teams' : '/pricing?intent=interview_sprint');
                                return;
                              }
                              setSetup((current) => ({ ...current, goal: option.value }));
                            }}
                            className={setupCardClassName(isActive, 'border-primary/45 bg-primary/12 text-foreground')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-base font-semibold">{option.title}</div>
                              {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                              {isLocked ? (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                  {option.value === 'class_improvement' ? 'Teams' : 'Paid'}
                                </span>
                              ) : null}
                            </div>
                            <div className={`mt-1 text-sm leading-6 ${isActive ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                              {option.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <section className="rounded-[1.35rem] border border-border bg-background/70 p-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Language</div>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-2">
                      {languageOptions.map((option) => {
                        const isActive = setup.language === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSetup((current) => ({ ...current, language: option.value }))}
                            className={setupCardClassName(isActive, 'border-primary/45 bg-primary/12')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-base font-semibold text-foreground">{option.title}</div>
                              {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-[1.35rem] border border-border bg-background/70 p-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Role level</div>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-2">
                      {roleOptions.map((option) => {
                        const isActive = setup.roleLevel === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSetup((current) => ({ ...current, roleLevel: option.value }))}
                            className={setupCardClassName(isActive, 'border-primary/45 bg-primary/12')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-base font-semibold text-foreground">{option.title}</div>
                              {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="rounded-[1.45rem] border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card p-4 shadow-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Selected benchmark</div>
                      <h2 className="mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">
                        {selectedPack.title} - {benchmarkFormatLabels[benchmarkFormat]}
                      </h2>
                      <div className="mt-2 text-sm font-medium text-foreground/85">{benchmarkMetaLine}</div>
                    </div>
                    <div className="rounded-full border border-primary/15 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {blueprintSummary.questionCount} questions
                    </div>
                  </div>

                  <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{benchmarkBlueprintDescription}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {benchmarkTopicsPreview.map((competency) => (
                      <span
                        key={competency}
                        className="inline-flex rounded-full border border-border/80 bg-card/85 px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {competency}
                      </span>
                    ))}
                  </div>

                  {benchmarkFormat === 'retake' && retakeTargetWeaknesses.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground">
                      Retake focus: {retakeTargetWeaknesses.map((bucket) => bucket.replace(/_/g, ' ')).join(', ')}.
                    </div>
                  ) : null}

                  {setupRestrictionMessage ? (
                    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
                      <div className="font-semibold text-primary">Upgrade boundary</div>
                      <div className="mt-1">{setupRestrictionMessage}</div>
                    </div>
                  ) : null}

                  {savedReport ? (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-background/80 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Last benchmark</div>
                        <div className="mt-1 text-sm font-medium text-foreground">
                          {savedReport.overallScore}/100
                          {savedReportDelta !== null ? ` / ${savedReportDelta > 0 ? '+' : ''}${savedReportDelta} vs last similar run` : ''}
                        </div>
                        {savedReportComparisonLabel ? (
                          <div className="mt-1 text-xs text-muted-foreground">{savedReportComparisonLabel}</div>
                        ) : null}
                      </div>
                      <button type="button" onClick={() => openReport(savedReport)} className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary">
                        <span>Resume last report</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={startBenchmark} className={`${primaryButtonClassName} min-w-[220px] sm:flex-1`}>
                      <span>{setupRestrictionMessage ? 'Unlock to continue' : 'Start benchmark'}</span>
                      <Play className="h-4 w-4" />
                    </button>
                    {savedReport ? (
                      <button type="button" onClick={() => queueWeakAreaRetake(savedReport)} className={`${secondaryButtonClassName} min-w-[180px]`}>
                        <RefreshCcw className="h-4 w-4" />
                        <span>Retry weak areas</span>
                      </button>
                    ) : (
                      <button type="button" onClick={() => setBenchmarkFormat('quick')} className={`${secondaryButtonClassName} min-w-[160px]`}>
                        <RefreshCcw className="h-4 w-4" />
                        <span>Reset to quick</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={surfaceCardClassName}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">What you get</div>
              <h3 className="mt-2 text-xl font-semibold text-foreground">Score, weak spots, next step.</h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {[
                  ['Score', 'One benchmark score.', BarChart3],
                  ['Weak spots', 'See what still breaks.', Gauge],
                  ['Next lesson', 'Get the next path fast.', Target],
                  ['Duel readiness', 'Know if you should drill or compete.', Trophy],
                ].map(([title, description, IconComponent]) => {
                  const Icon = IconComponent as typeof BarChart3;

                  return (
                    <div key={title as string} className={`${mutedPanelClassName} px-4 py-3.5`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card">
                          <Icon className="h-4.5 w-4.5 text-foreground" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{title}</div>
                          <p className="mt-1 text-sm leading-5.5 text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={surfaceCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {canViewReportHistory ? 'Recent benchmarks' : 'Latest benchmark'}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">
                    {historyPreview.length > 0 ? 'Compare fast and retry weak areas.' : 'Your next result will land here.'}
                  </h3>
                </div>
                {historyLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
              </div>

              {historyPreview.length > 0 ? (
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <div className={`${mutedPanelClassName} px-4 py-3.5`}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Most recent</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">{historyPreview[0].overallScore}/100</div>
                    <div className="mt-1 text-sm text-muted-foreground">{formatReportDate(historyPreview[0].createdAt)}</div>
                  </div>
                  <div className={`${mutedPanelClassName} px-4 py-3.5`}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Best score</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">{bestHistoryEntry?.overallScore ?? 0}/100</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {bestHistoryEntry ? `${bestHistoryEntry.setup.language.toUpperCase()} / ${bestHistoryEntry.setup.goal.replace(/_/g, ' ')}` : 'No benchmark yet'}
                    </div>
                  </div>
                </div>
              ) : null}

              {historyPreview.length > 0 ? (
                <div className="mt-4 grid gap-2.5">
                  {historyPreview.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-4 text-left"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">{entry.setup.language.toUpperCase()} benchmark</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {entry.setup.goal.replace(/_/g, ' ')} / {formatReportDate(entry.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-foreground">{entry.overallScore}/100</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{entry.duelReadiness.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.35rem] border border-border bg-background/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  Take one benchmark and the latest report will show up here so you can resume or compare later.
                </div>
              )}

              {savedReport ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => openReport(savedReport)} className={secondaryButtonClassName}>
                    <span>Open latest report</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => queueWeakAreaRetake(savedReport)} className={secondaryButtonClassName}>
                    <RefreshCcw className="h-4 w-4" />
                    <span>Retry weak areas</span>
                  </button>
                </div>
              ) : null}

              {!canViewReportHistory ? (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
                  Upgrade to unlock benchmark history, retakes, and score progression over time.
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'assessment' && activeQuestion) {
    const questionPresentation = buildBenchmarkQuestionPresentation(activeQuestion);
    const activeEvaluation = codeEvaluations[activeQuestion.id];
    const hintIsVisible = Boolean(revealedHints[activeQuestion.id]);
    const roundedProgressPercent = Math.max(1, Math.round(questionProgressPercent));
    const reviewCount = unansweredQuestionIndexes.length;
    const questionMetaLabel = `${activeSectionQuestionIndex}/${Math.max(1, activeSectionQuestions.length)}`;

    return (
      <div
        className={
          mode === 'public'
            ? 'mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 lg:py-10'
            : 'mx-auto w-full max-w-[1240px] px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3'
        }
      >
        <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {selectedPack.title} / {activeQuestion.sectionLabel} / Progress
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Question {questionIndex + 1} of {assessmentQuestions.length}
                </span>
                <span className="text-border">/</span>
                <span>Section {activeSectionIndex + 1}</span>
                <span className="text-border">/</span>
                <span>{questionMetaLabel}</span>
                <span className="text-border">/</span>
                <span>Autosave on</span>
              </div>
            </div>
            <div className="flex items-center gap-4 self-start sm:text-right">
              <div>
                <div className="text-lg font-semibold text-foreground">{roundedProgressPercent}%</div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  complete
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary">
                <Clock3 className="h-4 w-4" />
                {formatDuration(secondsLeft)}
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {benchmarkQuestionTypeLabels[activeQuestion.questionType]}
              </span>
              <span className="text-sm font-medium text-foreground">{benchmarkDifficultyLabels[activeQuestion.difficulty]}</span>
              <span className="text-sm text-muted-foreground">{formatQuestionDurationLabel(activeQuestion.expectedDurationSeconds)}</span>
            </div>

            <h2 className="mt-4 text-[1.75rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[1.95rem]">
              {questionPresentation.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{questionPresentation.supportText}</p>

            <div className="mt-5 space-y-4">
              {questionPresentation.blocks.map((block, index) =>
                block.type === 'text' ? (
                  <p
                    key={`${activeQuestion.id}-text-${index}`}
                    className="whitespace-pre-line text-sm leading-6 text-foreground/88"
                  >
                    {block.content}
                  </p>
                ) : (
                  <div
                    key={`${activeQuestion.id}-code-${index}`}
                    className="overflow-hidden rounded-[1.35rem] border border-border bg-background/80"
                  >
                    <div className="overflow-x-auto px-4 py-4">
                      <div className="min-w-[480px] font-mono text-[13px] leading-6 text-foreground/92">
                        {block.content.split('\n').map((line, lineIndex) => (
                          <div
                            key={`${activeQuestion.id}-line-${index}-${lineIndex}`}
                            className="grid grid-cols-[2rem_1fr] gap-4"
                          >
                            <span className="select-none text-right text-muted-foreground/55">{lineIndex + 1}</span>
                            <span className="whitespace-pre">{line || ' '}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

              {activeQuestion.kind === 'multiple_choice' ? (
                <div className="mt-6 grid gap-3">
                  {(activeQuestion.options || []).map((option, optionIndex) => {
                    const isSelected = selectedAnswers[activeQuestion.id] === optionIndex;
                    return (
                      <button
                        key={`${activeQuestion.id}-${optionIndex}`}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((current) => ({ ...current, [activeQuestion.id]: optionIndex }))
                        }
                        className={`rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-border bg-card hover:border-primary/25 hover:bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              isSelected
                                ? 'border-primary/40 bg-primary/15 text-primary'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </div>
                          <span className={`text-sm leading-6 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {option}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {activeQuestion.evaluationStrategy === 'execution'
                      ? 'Write code and run the benchmark check.'
                      : 'Write the requested solution, then validate the structure before moving on.'}
                  </div>

                  {activeQuestion.publicTestCases?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeQuestion.publicTestCases.map((testCase) => (
                        <div
                          key={`${activeQuestion.id}-${testCase.label}`}
                          className="rounded-2xl border border-border bg-background/70 px-4 py-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {testCase.label}
                          </div>
                          <div className="mt-1 text-sm text-foreground">{testCase.input || 'No input'}</div>
                          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Expected
                          </div>
                          <div className="mt-1 text-sm text-foreground">{testCase.expectedOutput}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <CodeTypingEditor
                    value={codeAnswers[activeQuestion.id] ?? activeQuestion.starterCode ?? ''}
                    onChange={(value) => handleCodeChange(activeQuestion, value)}
                    language={activeQuestion.language ?? setup.language}
                    prompt={activeQuestion.prompt}
                    height={benchmarkFormat === 'full' ? 400 : 340}
                  />

                  {activeEvaluation ? (
                    <div className="rounded-[1.35rem] border border-border bg-background/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Code check
                          </div>
                          <div className="mt-1 text-base font-semibold text-foreground">
                            {activeEvaluation.blocked
                              ? 'Execution required'
                              : activeEvaluation.passed
                              ? 'Ready for the benchmark'
                              : 'Still needs work'}
                          </div>
                        </div>
                        {activeEvaluation.runtimeMs ? (
                          <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                            {activeEvaluation.runtimeMs} ms
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeEvaluation.message}</p>
                      {activeEvaluation.missingSnippets?.length ? (
                        <div className="mt-3 grid gap-2">
                          {activeEvaluation.missingSnippets.map((snippet) => (
                            <div
                              key={snippet}
                              className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
                            >
                              Still missing: {snippet}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {activeEvaluation.testResults?.length ? (
                        <div className="mt-3 grid gap-2">
                          {activeEvaluation.testResults
                            .filter((entry) => !entry.hidden)
                            .map((entry, index) => (
                              <div
                                key={`${entry.label || 'test'}-${index}`}
                                className="rounded-xl border border-border bg-card px-3 py-2 text-xs"
                              >
                                <div className="font-semibold text-foreground">{entry.label || `Test ${index + 1}`}</div>
                                <div className="mt-1 text-muted-foreground">{entry.passed ? 'Passed' : entry.reason}</div>
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            {hintIsVisible ? (
              <div className="mt-5 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-6 text-foreground">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Hint</div>
                <p className="mt-2 text-sm leading-6 text-foreground/88">{activeQuestion.explanation}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setRevealedHints((current) => ({
                    ...current,
                    [activeQuestion.id]: !current[activeQuestion.id],
                  }))
                }
                className={secondaryButtonClassName}
              >
                {hintIsVisible ? 'Hide hint' : 'Hint'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextIndex =
                    unansweredQuestionIndexes.find((index) => index > questionIndex) ??
                    nextSkippedQuestionIndex ??
                    Math.min(questionIndex + 1, assessmentQuestions.length - 1);
                  if (nextIndex !== questionIndex) {
                    goToQuestion(nextIndex);
                  }
                }}
                disabled={assessmentQuestions.length <= 1 || isFinishing}
                className={secondaryButtonClassName}
              >
                Skip for now
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="text-sm text-muted-foreground sm:mr-3">
                {nextSkippedQuestionIndex !== undefined
                  ? `${reviewCount} question${reviewCount === 1 ? '' : 's'} left to review.`
                  : 'All answered items are ready to score.'}
              </div>
              {activeQuestion.kind === 'code' ? (
                <button
                  type="button"
                  onClick={handleCodeCheck}
                  disabled={isFinishing || isCheckingCode}
                  className={secondaryButtonClassName}
                >
                  <span>{activeQuestion.evaluationStrategy === 'execution' ? 'Run check' : 'Check answer'}</span>
                  {isCheckingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
              ) : null}
              {questionIndex === assessmentQuestions.length - 1 && nextSkippedQuestionIndex !== undefined ? (
                <>
                  <button
                    type="button"
                    onClick={() => void finishBenchmark()}
                    disabled={isFinishing || isCheckingCode}
                    className={secondaryButtonClassName}
                  >
                    Finish now
                  </button>
                  <button
                    type="button"
                    onClick={() => goToQuestion(nextSkippedQuestionIndex)}
                    disabled={isFinishing || isCheckingCode}
                    className={primaryButtonClassName}
                  >
                    <span>Review skipped</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={isFinishing || isCheckingCode}
                  className={primaryButtonClassName}
                >
                  <span>
                    {isFinishing
                      ? 'Generating report...'
                      : questionIndex === assessmentQuestions.length - 1
                      ? 'Generate report'
                      : activeQuestion.kind === 'multiple_choice'
                      ? 'Submit answer'
                      : 'Next question'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (view === 'report' && report) {
    return (
      <div
        className={
          mode === 'public'
            ? 'mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 lg:py-10'
            : 'mx-auto w-full max-w-[1240px] px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3'
        }
      >
        <div className="space-y-4">
          <section className={surfaceCardClassName}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 type-kicker text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Skill check result</span>
                </div>
                <h1 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[1.72rem]">
                  Score, weak spots, and the next corrective step.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use this result to fix the weak areas, then retake with purpose instead of guessing what to study.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Score</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{report.overallScore}/100</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Format</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{benchmarkFormatLabels[report.format || 'quick']}</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Taken</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{formatReportDate(report.createdAt)}</div>
                </div>
              </div>
            </div>
          </section>

          <BenchmarkReportCard
            report={report}
            accessLevel={canViewFullReport ? 'full' : 'starter'}
            actions={
              <div className="flex flex-col gap-4">
                <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next actions</div>
                  <div className="mt-3 text-xl font-semibold text-foreground">Fix, retake, then move up.</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Use the weak areas from this benchmark to drive the next practice block instead of guessing what to study.
                  </p>
                  {reportSuggestedLessons.length > 0 ? (
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                      {reportSuggestedLessons.map((lesson) => (
                        <div key={lesson!.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                          <div className="text-sm font-semibold text-foreground">{lesson!.title}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {lesson!.language.toUpperCase()} / {lesson!.difficulty}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <button type="button" onClick={openPracticePath} className={primaryButtonClassName}>
                      <span>Open lesson plan</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {canRetakeBenchmark ? (
                      <button
                        type="button"
                        onClick={() => queueWeakAreaRetake(report)}
                        className={secondaryButtonClassName}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        <span>{report.nextStepPlan.retryWeakAreasLabel}</span>
                      </button>
                    ) : (
                      <button type="button" onClick={openUpgradePath} className={secondaryButtonClassName}>
                        <LockKeyhole className="h-4 w-4" />
                        <span>Unlock retakes</span>
                      </button>
                    )}
                    <button type="button" onClick={() => restartInFormat('full')} className={secondaryButtonClassName}>
                      <Play className="h-4 w-4" />
                      <span>{report.nextStepPlan.fullRetakeLabel}</span>
                    </button>
                    {report.nextStepPlan.duelReadinessLabel ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (mode === 'app' || user) {
                            navigate('/app?section=duels');
                            return;
                          }
                          openAuthModal?.('signup');
                        }}
                        className={secondaryButtonClassName}
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Prepare for duels</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`rounded-[1.5rem] p-5 ${
                    scoreDelta !== null ? 'border border-xp/20 bg-xp/10' : 'border border-border bg-background/70'
                  }`}
                >
                  <div
                    className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                      scoreDelta !== null ? 'text-xp' : 'text-muted-foreground'
                    }`}
                  >
                    Retake loop
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">
                    {scoreDelta !== null
                      ? `${scoreDelta > 0 ? '+' : ''}${scoreDelta} points vs last similar run`
                      : 'Turn weak areas into the next review block'}
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${scoreDelta !== null ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                    {canRetakeBenchmark
                      ? scoreDelta !== null
                        ? `Do the corrective lessons, then retake around ${retakeSuggestionLabel || 'your next review window'}.`
                        : reportComparisonMessage ||
                          `Do the corrective lessons, then retake around ${retakeSuggestionLabel || 'your next review window'}.`
                      : 'Upgrade to unlock retakes and a full corrective loop.'}
                  </p>
                </div>

                {historyPreview.length > 0 ? (
                  <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent benchmarks</div>
                        <div className="mt-2 text-xl font-semibold text-foreground">Compare progress over time.</div>
                      </div>
                      {historyLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
                    </div>
                    <div className="mt-4 grid gap-2.5">
                      {historyPreview.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{entry.setup.language.toUpperCase()} benchmark</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {entry.setup.goal.replace(/_/g, ' ')} / {formatReportDate(entry.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-foreground">{entry.overallScore}/100</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{entry.duelReadiness.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {canViewFullReport ? (
                  <div className="rounded-[1.5rem] border border-xp/20 bg-xp/10 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-xp">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved to your workspace
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground/80">Saved to your benchmark history.</p>
                    <div className="mt-4 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground">
                      {sharedReportUrl ? (
                        <>
                          Public link is live.
                          <span className="text-foreground/75"> Anyone with the link can view it.</span>
                        </>
                      ) : (
                        <>Private by default. Publish when ready.</>
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
                ) : (
                  <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      <LockKeyhole className="h-4 w-4" />
                      Starter report saved
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground/80">
                      Free saves one starter report. Upgrade to unlock the full roadmap, benchmark history, retakes, and public sharing.
                    </p>
                    <button type="button" onClick={() => navigate('/pricing?intent=pro')} className={`${primaryButtonClassName} mt-4`}>
                      <span>Unlock Pro</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={mode === 'public' ? 'mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 lg:py-10' : 'mx-auto w-full max-w-[1240px] px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3'}>
      <div className={`${surfaceCardClassName} text-sm text-muted-foreground`}>
        Preparing the benchmark workspace...
      </div>
    </div>
  );
}
