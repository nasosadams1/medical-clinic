import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, ArrowRight, BookOpen, RotateCcw, ArrowLeft } from "lucide-react";
import { useUser } from "../context/UserContext";
import { getLessonCatalogEntry, getLessonCountByLanguage } from "../data/lessonCatalog";
import { loadLessonsModule } from "../data/lessonsLoader";
import { calculateXP } from "../data/lessonUtils";
import CodeTypingEditor from "./CodeTypingEditor";
import { validateCodeAssessment, type CodeAssessmentResult } from "../lib/codeAssessment";
import { evaluateLessonPractice, type LessonExecutionEvaluationResult } from "../lib/lessonEvaluation";

interface LessonModalProps {
  content?: any;
  lesson: any;
  allLessons?: any[];
  onClose: () => void;
  onHeartLoss?: () => void;
  onRedirectToLearn?: () => void;
  completeLesson?: (id: string, xp: number, coins: number, actualTimeMinutes?: number) => void | Promise<void>;
  calculateXPOverride?: typeof calculateXP;
  loseHeartOverride?: (count?: number) => void;
  resetHeartLossOverride?: () => void;
  forceSkipQuiz?: boolean;
}

const renderWithNewlines = (text?: string | null) => {
  if (text == null) return null;
  if (typeof text !== "string") return text;
  return text.split("\n").map((line, idx, lines) => (
    <React.Fragment key={idx}>
      {line}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

const practiceInlineTokenPattern =
  /(`[^`]+`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_][A-Za-z0-9_]*\([^()\n]{0,32}\)|\[[^\]\n]{1,32}\]|(?:[A-Za-z_][A-Za-z0-9_]*\s*(?:>=|<=|==|!=|>|<)\s*-?\d+))/g;
const practiceInlineTokenCheckPattern =
  /^(`[^`]+`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_][A-Za-z0-9_]*\([^()\n]{0,32}\)|\[[^\]\n]{1,32}\]|(?:[A-Za-z_][A-Za-z0-9_]*\s*(?:>=|<=|==|!=|>|<)\s*-?\d+))$/;

const renderPracticeInlineText = (text: string, tone: "heading" | "body" | "muted" = "body") => {
  const tokenClassName =
    tone === "heading"
      ? "inline-code-token inline-code-token--heading"
      : tone === "muted"
      ? "inline-code-token inline-code-token--body border-white/10 bg-white/[0.04] text-slate-100 shadow-none"
      : "inline-code-token inline-code-token--body";

  return text.split(practiceInlineTokenPattern).map((part, index) => {
    if (!part) return null;
    if (practiceInlineTokenCheckPattern.test(part)) {
      const token = part.replace(/^`|`$/g, "");
      return (
        <span key={`${tone}-${index}`} className={tokenClassName}>
          {token}
        </span>
      );
    }
    return <React.Fragment key={`${tone}-${index}`}>{part}</React.Fragment>;
  });
};

const renderPracticeCopy = (text?: string | null, tone: "heading" | "body" | "muted" = "body") => {
  if (text == null) return null;
  if (typeof text !== "string") return text;

  return text.split("\n").map((line, idx, lines) => (
    <React.Fragment key={`${tone}-${idx}`}>
      {renderPracticeInlineText(line, tone)}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

const splitPromptAndCode = (text?: string | null) => {
  const normalized = String(text || "").trim();
  if (!normalized) return { prompt: "", code: "" };

  const [prompt, ...rest] = normalized.split(/\n{2,}/);
  return {
    prompt: prompt.trim(),
    code: rest.join("\n\n").trim(),
  };
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${Math.round(seconds % 60)}s`;
};

const lessonLanguageLabelMap: Record<"python" | "javascript" | "cpp" | "java", string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
};

const shell =
  "rounded-[1.5rem] border border-white/8 bg-slate-950/92 shadow-[0_20px_60px_rgba(2,6,23,0.48)]";
const secondaryButton =
  "inline-flex min-h-[3.2rem] min-w-[9.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.06]";
const primaryButton =
  "inline-flex min-h-[3.2rem] min-w-[11rem] items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.16)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";

const isCodePracticeStep = (step: any) =>
  Boolean(
    step &&
      step.code?.trim?.() &&
      ((step.type === "theory" && step.practiceMode !== "none") || step.type === "practice")
  );

const isPassiveTheoryStep = (step: any) => step?.type === "theory" && step?.practiceMode === "none";

const collectVisibleStepGroups = (steps: any[]) => {
  const groups: Array<{ start: number; end: number; steps: any[] }> = [];
  let index = 0;

  while (index < steps.length) {
    const step = steps[index];
    if (step?.type === "question" && !step?.question) {
      index += 1;
      continue;
    }

    if (isPassiveTheoryStep(step)) {
      const start = index;
      const groupedSteps = [step];
      index += 1;

      while (index < steps.length && isPassiveTheoryStep(steps[index])) {
        groupedSteps.push(steps[index]);
        index += 1;
      }

      groups.push({ start, end: index - 1, steps: groupedSteps });
      continue;
    }

    groups.push({ start: index, end: index, steps: [step] });
    index += 1;
  }

  return groups;
};

const getVisibleStepIndex = (groups: Array<{ start: number; end: number }>, stepIndex: number) =>
  Math.max(
    0,
    groups.findIndex((group) => stepIndex >= group.start && stepIndex <= group.end)
  );

const getAssessmentDefinition = (step: any, language: "python" | "javascript" | "cpp" | "java") => ({
  language,
  starterCode: step?.starterCode ?? "",
  referenceCode: step?.code ?? "",
  validationMode:
    step?.type === "practice"
      ? step?.validationMode ?? "exact"
      : step?.practiceMode === "includes_all"
        ? "includes_all"
        : "exact",
  requiredSnippets: step?.requiredSnippets ?? [],
});

const genericExampleTitlePattern = /^Example\s+\d+$/i;

const questionKindLabelMap: Record<string, string> = {
  "predict-output": "Predict output",
  "common-mistake": "Common mistake",
  "knowledge-check": "Knowledge check",
};

const getQuestionPrefix = (question?: string | null) => {
  const match = String(question || "").match(/^(Q\d+)(?:\s*\(([^)]+)\))?/i);
  return {
    id: match?.[1]?.toUpperCase() || null,
    label: match?.[2] || null,
  };
};

const stripQuestionPrefix = (question?: string | null) =>
  String(question || "")
    .replace(/^(Q\d+)(?:\s*\([^)]+\))?\s*\n*/i, "")
    .trim();

const getQuestionKindLabel = (step: any) =>
  questionKindLabelMap[step?.questionKind || ""] || getQuestionPrefix(step?.question).label || "Question";

const getTheoryStepHeading = (step: any) => {
  if (!step) return "";
  if (step?.stepKind === "context") return step?.title || step?.content || "";
  if (genericExampleTitlePattern.test(String(step?.title || "").trim())) {
    return step?.content || step?.title || "";
  }
  return step?.title || step?.content || "";
};

const shouldRenderTheoryBody = (step: any) => {
  if (!step?.content) return false;
  if (step?.stepKind === "context") return step.content.trim() !== (step?.title || "").trim();
  return !genericExampleTitlePattern.test(String(step?.title || "").trim());
};

const toExecutionAssessmentResult = (
  result: LessonExecutionEvaluationResult
): CodeAssessmentResult => ({
  passed: result.passed,
  message: result.message,
  missingSnippets: result.missingSnippets ?? [],
  scorePercent: result.scorePercent,
  rubricScores: result.rubricBreakdown,
  matchedSignals: [],
  flaggedPatterns: [],
  evaluationSource: "execution",
  runtimeMs: result.runtimeMs,
  stderr: result.stderr,
  testResults: result.testResults ?? [],
});

const renderOverlay = (node: React.ReactNode) =>
  typeof document !== "undefined" ? createPortal(node, document.body) : node;

const normalizeComparableText = (value?: string | null) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isFirstOutputHeroExample = (lessonId?: string, step?: any) =>
  lessonId === "python-first-output" &&
  step?.type === "theory" &&
  step?.stepKind === "example" &&
  normalizeComparableText(step?.content) === normalizeComparableText("Use print() to send text to the console.") &&
  normalizeComparableText(step?.code) === normalizeComparableText('print("Hello from Alex")') &&
  normalizeComparableText(step?.explanation) ===
    normalizeComparableText("Use print() when you want Python to show text in the console.");

const renderPremiumHeroCopy = (text?: string | null, tone: "heading" | "body" = "heading") => {
  if (text == null) return null;
  if (typeof text !== "string") return text;

  const token = "print()";
  const tokenClassName = tone === "heading" ? "inline-code-token inline-code-token--heading" : "inline-code-token inline-code-token--body";

  return text.split("\n").map((line, lineIndex, lines) => {
    const parts = line.split(token);
    return (
      <React.Fragment key={`${tone}-${lineIndex}`}>
        {parts.map((part, partIndex) => (
          <React.Fragment key={`${tone}-${lineIndex}-${partIndex}`}>
            {part}
            {partIndex < parts.length - 1 && <span className={tokenClassName}>{token}</span>}
          </React.Fragment>
        ))}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

const LessonModal: React.FC<LessonModalProps> = ({
  content: contentProp,
  lesson,
  onClose,
  onHeartLoss,
  onRedirectToLearn,
  completeLesson: completeLessonProp,
  calculateXPOverride,
  loseHeartOverride,
  resetHeartLossOverride,
  forceSkipQuiz = false,
}) => {
  const {
    user,
    completeLesson: ctxCompleteLesson,
    loseHeart,
    resetHeartLoss,
    isXPBoostActive,
    isUnlimitedHeartsActive,
    getActiveBoosts,
  } = useUser();

  const completeLessonFn = completeLessonProp ?? ctxCompleteLesson;
  const loseHeartFn = loseHeartOverride ?? loseHeart;
  const resetHeartLossFn = resetHeartLossOverride ?? resetHeartLoss;
  const calculateXPFn = calculateXPOverride ?? calculateXP;
  const activeBoosts = getActiveBoosts();
  const retakeTimerRef = useRef<number | null>(null);
  const [loadedLesson, setLoadedLesson] = useState<any | null>(null);
  const [lessonLoadError, setLessonLoadError] = useState<string | null>(null);
  const lessonCatalogEntry = useMemo(() => getLessonCatalogEntry(lesson?.id), [lesson?.id]);
  const lessonLanguage = (lessonCatalogEntry?.language || lesson?.language || "python") as "python" | "javascript" | "cpp" | "java";
  const languageLessonCount = useMemo(() => getLessonCountByLanguage(lessonLanguage), [lessonLanguage]);
  const lessonIndex = useMemo(() => Math.max(0, lessonCatalogEntry?.languageIndex ?? 0), [lessonCatalogEntry?.languageIndex]);

  useEffect(() => {
    let cancelled = false;

    if (!lesson?.id || contentProp || lesson?.content) {
      setLoadedLesson(null);
      setLessonLoadError(null);
      return () => {
        cancelled = true;
      };
    }

    setLessonLoadError(null);

    void loadLessonsModule()
      .then((module) => {
        if (cancelled) return;
        setLoadedLesson(module.getLessonById?.(lesson.id) || null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load lesson details:", error);
        setLoadedLesson(null);
        setLessonLoadError("Lesson content could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, [contentProp, lesson?.content, lesson?.id]);

  const content: { steps: any[]; quiz?: any[] } = useMemo(
    () => contentProp ?? loadedLesson?.content ?? lesson?.content ?? { steps: [], quiz: [] },
    [contentProp, loadedLesson?.content, lesson?.content]
  );
  const resolvedLesson = loadedLesson ?? lesson;

  const visibleStepGroups = useMemo(
    () => collectVisibleStepGroups(content.steps || []),
    [content.steps]
  );
  const visibleStepStarts = useMemo(
    () => visibleStepGroups.map((group) => group.start),
    [visibleStepGroups]
  );
  const rawTotalSteps = Math.max(0, content.steps?.length ?? 0);
  const safeTotalVisibleSteps = Math.max(0, visibleStepGroups.length);
  const safeTotalQuiz = Math.max(0, content.quiz?.length ?? 0);
  const effectiveQuizCount = forceSkipQuiz ? 0 : safeTotalQuiz;
  const safeTotalAll = Math.max(1, safeTotalVisibleSteps + effectiveQuizCount);
  const questionSteps = useMemo(() => (content.steps || []).filter((step) => step?.type === "question"), [content.steps]);
  const codePracticeSteps = useMemo(
    () => (content.steps || []).filter((step) => isCodePracticeStep(step)),
    [content.steps]
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<number, boolean>>({});
  const [midLessonResults, setMidLessonResults] = useState<Record<number, boolean>>({});
  const [codePracticeResults, setCodePracticeResults] = useState<Record<number, boolean>>({});
  const [typedTheoryCode, setTypedTheoryCode] = useState("");
  const [theoryCodeResult, setTheoryCodeResult] = useState<CodeAssessmentResult | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [startTime] = useState(Date.now());
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [shouldClose, setShouldClose] = useState(false);

  const currentStepData = (content.steps || [])[currentStep] ?? null;
  const currentVisibleStepIndex = useMemo(
    () => getVisibleStepIndex(visibleStepGroups, currentStep),
    [visibleStepGroups, currentStep]
  );
  const currentVisibleGroup = visibleStepGroups[currentVisibleStepIndex] ?? null;
  const currentVisibleSteps = currentVisibleGroup?.steps ?? (currentStepData ? [currentStepData] : []);
  const groupedTheorySteps = currentVisibleSteps.filter((step) => step?.type === "theory");
  const groupedTheoryContextStep =
    groupedTheorySteps.find((step) => step?.stepKind === "context") ?? groupedTheorySteps[0] ?? null;
  const groupedTheoryExampleSteps =
    groupedTheorySteps.length > 1 && groupedTheoryContextStep?.stepKind === "context"
      ? groupedTheorySteps.filter((step) => step !== groupedTheoryContextStep)
      : groupedTheorySteps;
  const currentQuizItem = (content.quiz || [])[currentQuizIndex] ?? null;
  const currentQuizPromptParts = splitPromptAndCode(currentQuizItem?.question);
  const isCurrentStepQuestion = !isQuizMode && currentStepData?.type === "question" && Boolean(currentStepData?.question);
  const isTheoryCodeStep =
    !isQuizMode &&
    currentStepData?.type === "theory" &&
    currentStepData?.practiceMode !== "none" &&
    Boolean(currentStepData?.code?.trim?.());
  const isPracticeStep = !isQuizMode && currentStepData?.type === "practice" && Boolean(currentStepData?.code?.trim?.());
  const showsCodePracticeEditor = isTheoryCodeStep || isPracticeStep;
  const currentProgress = isQuizMode ? safeTotalVisibleSteps + currentQuizIndex + 1 : currentVisibleStepIndex + 1;
  const percent = Math.round((Math.min(currentProgress, safeTotalAll) / safeTotalAll) * 100);
  const currentQuestionPrefix = getQuestionPrefix(currentStepData?.question);
  const currentQuestionPrompt = stripQuestionPrefix(currentStepData?.question);
  const currentQuestionPromptParts = splitPromptAndCode(currentQuestionPrompt);
  const currentTheoryHeading = getTheoryStepHeading(currentStepData);
  const currentPracticeBrief = currentStepData?.practiceBrief || null;
  const currentPracticeHeading = currentPracticeBrief?.task || currentStepData?.content || currentStepData?.title || "";
  const currentDisplayedHeading = isPracticeStep
    ? currentPracticeHeading
    : currentTheoryHeading || currentStepData?.title || currentStepData?.content || "";
  const currentPracticeCoachNote = currentPracticeBrief?.coachNote || currentStepData?.explanation || "";
  const isProjectLesson = resolvedLesson?.category === "Projects";
  const lessonLanguageLabel = lessonLanguageLabelMap[lessonLanguage];
  const shouldRenderCurrentExplanation =
    !isPracticeStep &&
    Boolean(currentStepData?.explanation) &&
    normalizeComparableText(currentStepData?.explanation) !== normalizeComparableText(currentDisplayedHeading) &&
    normalizeComparableText(currentStepData?.explanation) !== normalizeComparableText(currentStepData?.content);
  const shouldRenderPracticeCoachNote =
    isPracticeStep &&
    Boolean(currentPracticeCoachNote) &&
    normalizeComparableText(currentPracticeCoachNote) !== normalizeComparableText(currentDisplayedHeading) &&
    normalizeComparableText(currentPracticeCoachNote) !== normalizeComparableText(currentStepData?.content);
  const theoryGroupHeading = groupedTheoryContextStep?.stepKind === "context"
    ? getTheoryStepHeading(groupedTheoryContextStep)
    : resolvedLesson?.title || getTheoryStepHeading(groupedTheoryExampleSteps[0]) || "";
  const theoryGroupBody =
    groupedTheoryContextStep?.stepKind === "context" && shouldRenderTheoryBody(groupedTheoryContextStep)
      ? groupedTheoryContextStep.content
      : resolvedLesson?.description || "";
  const theoryGroupNote =
    groupedTheoryContextStep?.stepKind === "context" &&
    normalizeComparableText(groupedTheoryContextStep?.explanation) !== normalizeComparableText(groupedTheoryContextStep?.content)
      ? groupedTheoryContextStep?.explanation
      : "";
  const theoryIntroHeading = resolvedLesson?.title || theoryGroupHeading;
  const theoryIntroBody = theoryGroupBody || resolvedLesson?.description || "";
  const usePremiumHeroTextTreatment = isFirstOutputHeroExample(resolvedLesson?.id, currentStepData);
  const theoryHeadingClassName = usePremiumHeroTextTreatment
    ? "lesson-headline-premium"
    : "type-display-section max-w-3xl text-white";
  const practiceHeadingClassName = "lesson-practice-heading max-w-3xl text-white";
  const modalQuestionHeadingClassName = "type-headline max-w-2xl text-white";
  const theoryDisplaySteps = groupedTheoryExampleSteps.length ? groupedTheoryExampleSteps : groupedTheorySteps;
  const showsLowHeartNote = !isUnlimitedHeartsActive() && (user?.hearts ?? 0) <= 2;
  const primaryActionLabel = isCheckingCode
    ? "Checking code"
    : isQuizMode
      ? showQuizResult
        ? selectedAnswer === currentQuizItem?.correctAnswer
          ? currentQuizIndex === effectiveQuizCount - 1
            ? "Finish lesson"
            : "Next question"
          : "Retake required"
        : "Check answer"
      : showsCodePracticeEditor
        ? theoryCodeResult?.passed
          ? currentVisibleStepIndex >= safeTotalVisibleSteps - 1
            ? effectiveQuizCount > 0
              ? "Start final quiz"
              : isProjectLesson
                ? "Finish project"
                : "Finish lesson"
            : "Next step"
          : isProjectLesson
            ? "Run project check"
            : "Check code"
        : isCurrentStepQuestion && !showQuizResult
          ? "Check answer"
          : showQuizResult
            ? selectedAnswer === currentStepData?.correctAnswer
              ? "Next step"
              : "Retake required"
            : currentVisibleStepIndex >= safeTotalVisibleSteps - 1
              ? effectiveQuizCount > 0
                ? "Start final quiz"
                : isProjectLesson
                  ? "Finish project"
                  : "Finish lesson"
              : "Next step";

  const clearRetakeTimer = () => {
    if (retakeTimerRef.current) {
      window.clearTimeout(retakeTimerRef.current);
      retakeTimerRef.current = null;
    }
  };

  const triggerRetake = () => {
    clearRetakeTimer();
    retakeTimerRef.current = window.setTimeout(() => setShowRetakeModal(true), 1200);
  };

  const resetStepInteractionState = () => {
    setSelectedAnswer(null);
    setShowQuizResult(false);
    resetHeartLossFn?.();
  };

  const goToVisibleStep = (visibleIndex: number) => {
    const nextStepStart = visibleStepStarts[visibleIndex];
    if (nextStepStart == null) return;
    setCurrentStep(nextStepStart);
    resetStepInteractionState();
  };

  const finalizeLesson = async () => {
    const actualTimeMinutes = (Date.now() - startTime) / (1000 * 60);
    const earnedXP = calculateXPFn(
      lesson.baseXP,
      lesson.difficulty,
      lessonIndex,
      languageLessonCount,
      actualTimeMinutes,
      lesson.baselineTime
    );

    if (!user?.completedLessons?.includes?.(lesson.id)) {
      try {
        await completeLessonFn?.(lesson.id, earnedXP, 0, actualTimeMinutes);
      } catch (error) {
        console.error("Lesson completion failed:", error);
      }
    }

    setIsCompleted(true);
  };

  const moveForward = () => {
    const nextVisibleIndex = currentVisibleStepIndex + 1;
    if (nextVisibleIndex < safeTotalVisibleSteps) {
      goToVisibleStep(nextVisibleIndex);
      return;
    }
    if (effectiveQuizCount === 0) {
      finalizeLesson();
      return;
    }
    setIsQuizMode(true);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    resetHeartLossFn?.();
  };

  const restartLesson = () => {
    clearRetakeTimer();
    setCurrentStep(visibleStepStarts[0] ?? 0);
    setIsQuizMode(false);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    setQuizResults({});
    setMidLessonResults({});
    setCodePracticeResults({});
    setTypedTheoryCode("");
    setTheoryCodeResult(null);
    setIsCheckingCode(false);
    setShowRetakeModal(false);
    resetHeartLossFn?.();
  };

  const evaluateCurrentCodeStep = async (): Promise<CodeAssessmentResult> => {
    if (!currentStepData) {
      return {
        passed: false,
        message: "This lesson step could not be evaluated.",
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
        evaluationSource: "static",
      };
    }

    if (
      isPracticeStep &&
      currentStepData?.evaluationMode === "execution" &&
      currentStepData?.evaluationId &&
      lessonLanguage === "python"
    ) {
      const result = await evaluateLessonPractice({
        lessonId: currentStepData.evaluationId,
        submittedCode: typedTheoryCode,
      });
      return toExecutionAssessmentResult(result);
    }

    return {
      ...validateCodeAssessment(typedTheoryCode, getAssessmentDefinition(currentStepData, lessonLanguage)),
      evaluationSource: "static",
    };
  };

  useEffect(() => () => clearRetakeTimer(), []);

  useEffect(() => {
    if (user?.hearts <= 0 && !isUnlimitedHeartsActive()) {
      onHeartLoss?.();
      onRedirectToLearn?.();
      setShouldClose(true);
    }
  }, [user?.hearts, isUnlimitedHeartsActive, onHeartLoss, onRedirectToLearn]);

  useEffect(() => {
    clearRetakeTimer();
    setCurrentStep(visibleStepStarts[0] ?? 0);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    setIsQuizMode(false);
    setIsCompleted(false);
    setQuizResults({});
    setMidLessonResults({});
    setCodePracticeResults({});
    setTypedTheoryCode("");
    setTheoryCodeResult(null);
    setIsCheckingCode(false);
    setShowRetakeModal(false);
    setShouldClose(false);
  }, [lesson?.id, content, visibleStepStarts]);

  useEffect(() => {
    if (shouldClose) onClose();
  }, [shouldClose, onClose]);

  useEffect(() => {
    if (!showsCodePracticeEditor) {
      setTypedTheoryCode("");
      setTheoryCodeResult(null);
      setIsCheckingCode(false);
      return;
    }

    setTypedTheoryCode(currentStepData?.starterCode ?? "");
    setTheoryCodeResult(null);
    setIsCheckingCode(false);
  }, [currentStep, isQuizMode, showsCodePracticeEditor, currentStepData?.starterCode]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  if (user?.hearts <= 0 && !isUnlimitedHeartsActive()) return null;

  if (safeTotalVisibleSteps === 0 && effectiveQuizCount === 0) {
    return renderOverlay(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
        <div className={`${shell} w-full max-w-lg p-8 text-center`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold text-white">{lessonLoadError ? "Lesson unavailable" : "Preparing lesson workspace"}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {lessonLoadError || "We are loading the lesson content and quiz checks for this track."}
          </p>
          <button type="button" onClick={onClose} className={`${primaryButton} mt-6 w-full`}>Close</button>
        </div>
      </div>
    );
  }

  if (showRetakeModal) {
    return renderOverlay(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
        <div className={`${shell} w-full max-w-xl p-8 text-center`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 text-rose-200">
            <RotateCcw className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Retake required</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {user?.hearts <= 0 && !isUnlimitedHeartsActive()
              ? "You are out of hearts, so this lesson will close and return you to practice."
              : "That answer was incorrect. Restart this lesson to keep your progress measurable."}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                if (user?.hearts <= 0 && !isUnlimitedHeartsActive()) onRedirectToLearn?.();
                onClose();
              }}
              className={secondaryButton}
            >
              {user?.hearts <= 0 && !isUnlimitedHeartsActive() ? "Back to practice" : "Exit lesson"}
            </button>
            {(user?.hearts > 0 || isUnlimitedHeartsActive()) && (
              <button type="button" onClick={restartLesson} className={primaryButton}>
                <RotateCcw className="h-4 w-4" />
                <span>Retake lesson</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const correctAnswers = Object.values(quizResults).filter(Boolean).length;
    const correctMidAnswers = Object.values(midLessonResults).filter(Boolean).length;
    const correctCodeChecks = Object.values(codePracticeResults).filter(Boolean).length;
    const actualTimeSeconds = (Date.now() - startTime) / 1000;
    const baseXP = calculateXPFn(
      lesson.baseXP,
      lesson.difficulty,
      lessonIndex,
      languageLessonCount,
      actualTimeSeconds / 60,
      lesson.baselineTime
    );
    const boostMultiplier = isXPBoostActive() ? activeBoosts.xpBoost?.multiplier || 1 : 1;
    const earnedXP = Math.floor(baseXP * boostMultiplier);

    return renderOverlay(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
        <div className={`${shell} w-full max-w-2xl p-8`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-white">Lesson complete</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">The next practice unit is ready. This lesson now counts toward your progress path.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Earned XP</div><div className="mt-2 text-lg font-semibold text-white">{earnedXP} XP</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Code Checks</div><div className="mt-2 text-lg font-semibold text-white">{correctCodeChecks}/{codePracticeSteps.length || 0}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Final Quiz</div><div className="mt-2 text-lg font-semibold text-white">{effectiveQuizCount > 0 ? `${correctAnswers}/${effectiveQuizCount}` : "Skipped"}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Theory Checks</div><div className="mt-2 text-lg font-semibold text-white">{correctMidAnswers}/{questionSteps.length || 0}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Duration</div><div className="mt-2 text-lg font-semibold text-white">{formatTime(actualTimeSeconds)}</div></div>
          </div>
          {boostMultiplier > 1 && (
            <div className="mt-5 rounded-[1.5rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              XP boost applied: <span className="font-semibold">{boostMultiplier}x multiplier</span>.
            </div>
          )}
          <button type="button" onClick={onClose} className={`${primaryButton} mt-8 w-full`}>Continue practice</button>
        </div>
      </div>
    );
  }

  const handleStepSubmit = async () => {
    if (!currentStepData) return;
    if (currentStepData.type !== "question") {
      if (showsCodePracticeEditor) {
        let evaluation = theoryCodeResult;
        if (!evaluation) {
          setIsCheckingCode(true);
          try {
            evaluation = await evaluateCurrentCodeStep();
          } catch (error) {
            evaluation = {
              passed: false,
              message:
                error instanceof Error
                  ? error.message
                  : "The lesson runner could not check this answer right now.",
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
              evaluationSource: currentStepData?.evaluationMode === "execution" ? "execution" : "static",
            };
          } finally {
            setIsCheckingCode(false);
          }
        }

        setTheoryCodeResult(evaluation);

        if (!evaluation.passed) {
          return;
        }

        setCodePracticeResults((prev) => ({ ...prev, [currentStep]: true }));
      }
      moveForward();
      return;
    }
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === currentStepData.correctAnswer;
    if (!showQuizResult) {
      setMidLessonResults((prev) => ({ ...prev, [currentStep]: isCorrect }));
      setShowQuizResult(true);
      if (!isCorrect) {
        loseHeartFn?.();
        triggerRetake();
      }
      return;
    }
    if (isCorrect) {
      setSelectedAnswer(null);
      setShowQuizResult(false);
      moveForward();
    }
  };

  const handleQuizSubmit = () => {
    if (!currentQuizItem || selectedAnswer === null) return;
    const isCorrect = selectedAnswer === currentQuizItem.correctAnswer;
    if (!showQuizResult) {
      setQuizResults((prev) => ({ ...prev, [currentQuizIndex]: isCorrect }));
      setShowQuizResult(true);
      if (!isCorrect) {
        loseHeartFn?.();
        triggerRetake();
      }
      return;
    }
    if (!isCorrect) return;
    let nextIndex = currentQuizIndex + 1;
    while (nextIndex < (content.quiz?.length ?? 0) && !content.quiz?.[nextIndex]?.question) nextIndex += 1;
    if (nextIndex < (content.quiz?.length ?? 0)) {
      setCurrentQuizIndex(nextIndex);
      setSelectedAnswer(null);
      setShowQuizResult(false);
      resetHeartLossFn?.();
    } else {
      finalizeLesson();
    }
  };

  const header = (
    <div className="sticky top-0 z-20 border-b border-white/8 bg-slate-950/96 px-4 py-4 backdrop-blur-sm lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="lesson-section-label">
                {isQuizMode ? "Final review" : `${lessonLanguageLabel} lesson`}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {isQuizMode ? resolvedLesson?.title : resolvedLesson?.category || "Practice path"}
              </div>
            </div>
          </div>
          <div className="w-full max-w-[18rem] sm:w-auto sm:min-w-[17rem]">
            <div className="mb-2 flex items-center justify-between gap-4 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-slate-400">
              <span>
                {isQuizMode
                  ? `Review ${Math.min(currentQuizIndex + 1, effectiveQuizCount)} of ${effectiveQuizCount}`
                  : `Lesson ${Math.min(currentVisibleStepIndex + 1, safeTotalVisibleSteps)} of ${safeTotalVisibleSteps}`}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8">
              <div className="h-1.5 rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
            {showsLowHeartNote ? (
              <div className="mt-2 text-xs text-amber-200/90">
                {activeBoosts.unlimitedHearts ? "Unlimited hearts active" : `${user?.hearts ?? 0} hearts left`}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="sticky bottom-0 mt-8 border-t border-white/8 bg-slate-950/90 px-1 py-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            if (isQuizMode) {
              setIsQuizMode(false);
              setCurrentQuizIndex(0);
              resetStepInteractionState();
              return;
            }
            if (currentVisibleStepIndex > 0) {
              goToVisibleStep(currentVisibleStepIndex - 1);
            }
          }}
          disabled={!isQuizMode && currentVisibleStepIndex <= 0}
          className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          onClick={isQuizMode ? handleQuizSubmit : handleStepSubmit}
          disabled={
            isCheckingCode ||
            (isQuizMode && selectedAnswer === null) ||
            (!isQuizMode && isCurrentStepQuestion && selectedAnswer === null && !showQuizResult) ||
            (!isQuizMode && showQuizResult && selectedAnswer !== currentStepData?.correctAnswer)
          }
          className={primaryButton}
        >
          <span>{primaryActionLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return renderOverlay(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950"
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full">
        {header}
        <div className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="lesson-stage px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            {isQuizMode ? (
              <div className="space-y-6">
                <div className="max-w-3xl">
                  <div className="lesson-section-label">Final review</div>
                  <h3 className={`${modalQuestionHeadingClassName} mt-3`}>
                    {renderWithNewlines(currentQuizPromptParts.prompt || currentQuizItem?.question)}
                  </h3>
                </div>
                {currentQuizPromptParts.code ? (
                  <div className="lesson-code-surface overflow-x-auto p-5 sm:p-6">
                    <div className="mb-4">
                      <span className="lesson-meta-pill lesson-meta-pill--accent">Review code</span>
                    </div>
                    <pre className="font-mono text-sm leading-7 text-emerald-300">{currentQuizPromptParts.code}</pre>
                  </div>
                ) : null}
                <div className="grid gap-3">
                  {currentQuizItem?.options?.map((option: string, index: number) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentQuizItem.correctAnswer;
                    const tone = showQuizResult
                      ? isSelected
                        ? isCorrect
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border-rose-400/40 bg-rose-500/10 text-rose-100"
                        : isCorrect
                          ? "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-100"
                          : "border-white/8 bg-white/[0.02] text-slate-300"
                      : isSelected
                        ? "border-cyan-400/45 bg-cyan-400/[0.08] text-white"
                        : "border-white/8 bg-white/[0.02] text-slate-300 hover:border-white/16 hover:bg-white/[0.04] hover:text-white";
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedAnswer(index)}
                        disabled={showQuizResult}
                        className={`w-full rounded-[1.35rem] border p-4 text-left transition ${tone}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-slate-300">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="pt-0.5 text-sm font-medium leading-6">{renderWithNewlines(option)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {showQuizResult ? (
                  <div
                    className={`rounded-[1.5rem] border px-5 py-4 text-sm leading-6 ${
                      selectedAnswer === currentQuizItem?.correctAnswer
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-100"
                    }`}
                  >
                    <p className="mb-2 text-base font-semibold">
                      {selectedAnswer === currentQuizItem?.correctAnswer ? "Correct answer" : "Incorrect answer"}
                    </p>
                    <p className="text-slate-200">{renderWithNewlines(currentQuizItem?.explanation)}</p>
                  </div>
                ) : null}
              </div>
            ) : isCurrentStepQuestion ? (
              <div className="space-y-6">
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    {currentQuestionPrefix.id ? (
                      <span className="lesson-meta-pill border-violet-400/20 bg-violet-400/[0.08] text-violet-200">
                        {currentQuestionPrefix.id}
                      </span>
                    ) : null}
                    <span className="lesson-meta-pill">
                      {getQuestionKindLabel(currentStepData)}
                    </span>
                  </div>
                  <h3 className={modalQuestionHeadingClassName}>
                    {renderWithNewlines(currentQuestionPromptParts.prompt || currentQuestionPrompt)}
                  </h3>
                </div>
                {currentQuestionPromptParts.code ? (
                  <div className="lesson-code-surface overflow-x-auto p-5 sm:p-6">
                    <div className="mb-4">
                      <span className="lesson-meta-pill lesson-meta-pill--accent">Question code</span>
                    </div>
                    <pre className="font-mono text-sm leading-7 text-emerald-300">{currentQuestionPromptParts.code}</pre>
                  </div>
                ) : null}
                <div className="grid gap-3">
                  {(currentStepData?.options || currentStepData?.answers || []).map((option: string, index: number) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentStepData.correctAnswer;
                    const tone = showQuizResult
                      ? isSelected
                        ? isCorrect
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border-rose-400/40 bg-rose-500/10 text-rose-100"
                        : isCorrect
                          ? "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-100"
                          : "border-white/8 bg-white/[0.02] text-slate-300"
                      : isSelected
                        ? "border-cyan-400/45 bg-cyan-400/[0.08] text-white"
                        : "border-white/8 bg-white/[0.02] text-slate-300 hover:border-white/16 hover:bg-white/[0.04] hover:text-white";
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedAnswer(index)}
                        disabled={showQuizResult}
                        className={`w-full rounded-[1.35rem] border p-4 text-left transition ${tone}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-slate-300">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="pt-0.5 text-sm font-medium leading-6">{renderWithNewlines(option)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {showQuizResult ? (
                  <div
                    className={`rounded-[1.5rem] border px-5 py-4 text-sm leading-6 ${
                      selectedAnswer === currentStepData?.correctAnswer
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-100"
                    }`}
                  >
                    <p className="mb-2 text-base font-semibold">
                      {selectedAnswer === currentStepData?.correctAnswer ? "Correct answer" : "Incorrect answer"}
                    </p>
                    <p className="text-slate-200">{renderWithNewlines(currentStepData?.explanation)}</p>
                  </div>
                ) : null}
              </div>
            ) : showsCodePracticeEditor ? (
              <div className="space-y-6">
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <span className="lesson-meta-pill lesson-meta-pill--accent">
                      {isProjectLesson ? "Capstone" : isPracticeStep ? "Practice" : "Try it"}
                    </span>
                  </div>
                  <h3 className={isPracticeStep ? practiceHeadingClassName : theoryHeadingClassName}>
                    {isPracticeStep ? renderPracticeCopy(currentDisplayedHeading, "heading") : renderWithNewlines(currentDisplayedHeading)}
                  </h3>
                  {shouldRenderCurrentExplanation && !isPracticeStep ? (
                    <div className="mt-4 max-w-2xl type-body-md text-slate-300">
                      {renderWithNewlines(currentStepData?.explanation)}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.48fr)_minmax(300px,0.82fr)] xl:items-start">
                  <div className="space-y-4">
                    <div className="lesson-code-surface p-5 sm:p-6">
                      <div className="mb-4">
                        <span className="lesson-meta-pill lesson-meta-pill--accent">Your Solution</span>
                        <div className="type-body-sm mt-1 max-w-2xl text-slate-400">
                          Write the smallest clear answer that satisfies the brief and passes the checker.
                        </div>
                      </div>
                      <CodeTypingEditor
                        language={lessonLanguage}
                        value={typedTheoryCode}
                        onChange={(value) => {
                          setTypedTheoryCode(value);
                          setTheoryCodeResult(null);
                        }}
                        height="360px"
                      />
                    </div>

                    {theoryCodeResult ? (
                      <div
                        className={`rounded-[1.5rem] border px-4 py-4 text-sm leading-6 ${
                          theoryCodeResult.passed
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                            : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                        }`}
                      >
                        <div className="font-semibold">{theoryCodeResult.passed ? "Check passed" : "Check failed"}</div>
                        <div className="mt-1 text-slate-200">{theoryCodeResult.message}</div>
                        {theoryCodeResult.testResults?.length ? (
                          <div className="mt-3 space-y-2">
                            {theoryCodeResult.testResults
                              .filter((result) => !result.hidden)
                              .map((result, index) => (
                                <div
                                  key={`${result.label || "test"}-${index}`}
                                  className={`rounded-2xl border px-3 py-2 ${
                                    result.passed
                                      ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-100"
                                      : "border-white/10 bg-slate-950/40 text-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                                    <span>{result.label || "Test"}</span>
                                    <span>{result.passed ? "Passed" : result.reason}</span>
                                  </div>
                                  {!result.passed && result.actual ? (
                                    <div className="mt-2 text-xs leading-5 text-slate-300">Output: {result.actual}</div>
                                  ) : null}
                                </div>
                              ))}
                          </div>
                        ) : null}
                        {theoryCodeResult.runtimeMs ? (
                          <div className="mt-2 text-xs text-slate-300">Runtime: {theoryCodeResult.runtimeMs}ms</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {isPracticeStep && currentPracticeBrief?.inputs?.length ? (
                      <div className="lesson-panel-soft border-cyan-400/15 bg-cyan-400/[0.05] p-5">
                        <div className="lesson-section-label text-cyan-200">Input</div>
                        <ul className="mt-4 space-y-3">
                          {currentPracticeBrief.inputs.map((item: string, index: number) => (
                            <li key={`input-${index}`} className="flex items-start gap-3 text-slate-100">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                              <span className="type-body-md text-slate-100">{renderPracticeCopy(item)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {isPracticeStep && currentPracticeBrief?.requirements?.length ? (
                      <div className="lesson-panel-soft p-5">
                        <div className="lesson-section-label text-slate-300">Requirements</div>
                        <ul className="mt-4 space-y-3">
                          {currentPracticeBrief.requirements.map((item: string, index: number) => (
                            <li key={`requirement-${index}`} className="flex items-start gap-3 text-slate-100">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                              <span className="type-body-md text-slate-100">{renderPracticeCopy(item, "muted")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {isPracticeStep && (currentPracticeBrief?.expectedOutput?.length || currentPracticeBrief?.outputDescription) ? (
                      <div className="lesson-panel-soft border-emerald-400/15 bg-emerald-500/[0.05] p-5">
                        <div className="lesson-section-label text-emerald-300">Target Output</div>
                        {currentPracticeBrief.outputDescription ? (
                          <div className="type-body-md mt-3 text-slate-200">
                            {renderPracticeCopy(currentPracticeBrief.outputDescription, "muted")}
                          </div>
                        ) : null}
                        {currentPracticeBrief.expectedOutput?.length ? (
                          <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/90 p-4 font-mono text-sm leading-7 text-emerald-300">
                            {currentPracticeBrief.expectedOutput.map((item: string, index: number) => (
                              <div key={`output-${index}`}>{item}</div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {shouldRenderPracticeCoachNote ? (
                      <div className="lesson-panel-soft border-amber-300/15 bg-amber-300/[0.06] p-5">
                        <div className="lesson-section-label text-amber-200">Coach Note</div>
                        <div className="type-body-md mt-3 text-slate-100">
                          {renderPracticeCopy(currentPracticeCoachNote, "muted")}
                        </div>
                      </div>
                    ) : null}

                    {!isPracticeStep && currentStepData?.content ? (
                      <div className="lesson-panel-soft border-cyan-400/12 bg-cyan-400/[0.05] p-5">
                        <div className="lesson-section-label text-cyan-200">What to focus on</div>
                        <div className="type-body-md mt-3 text-slate-100">{renderWithNewlines(currentStepData.content)}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-3xl">
                  <div className="lesson-section-label">
                    {isProjectLesson ? "Capstone concept" : groupedTheoryContextStep?.stepKind === "context" ? "Concept" : "Worked examples"}
                  </div>
                  <h3 className="type-display-section mt-3 max-w-2xl text-white">
                    {renderWithNewlines(theoryIntroHeading)}
                  </h3>
                  {theoryIntroBody ? (
                    <div className="mt-4 max-w-2xl type-body-lg text-slate-300">
                      {renderWithNewlines(theoryIntroBody)}
                    </div>
                  ) : null}
                  {theoryGroupNote ? (
                    <div className="mt-3 max-w-2xl type-body-sm text-slate-400">{renderWithNewlines(theoryGroupNote)}</div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {theoryDisplaySteps.map((step, index) => {
                    const stepTitle = genericExampleTitlePattern.test(String(step?.title || "").trim())
                      ? `Example ${index + 1}`
                      : step?.title || `Example ${index + 1}`;
                    const showStepExplanation =
                      Boolean(step?.explanation) &&
                      normalizeComparableText(step?.explanation) !== normalizeComparableText(step?.content);

                    return (
                      <section key={`${stepTitle}-${index}`} className="lesson-panel p-5 sm:p-6">
                        <div className="grid gap-5 xl:grid-cols-[minmax(340px,1.18fr)_minmax(260px,0.82fr)] xl:items-start">
                          <div className="lesson-code-surface p-5">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                              <span className="lesson-meta-pill lesson-meta-pill--accent">{stepTitle}</span>
                              <span className="lesson-meta-pill">Example code</span>
                            </div>
                            <pre className="overflow-x-auto font-mono text-[0.95rem] leading-8 text-emerald-300">{step?.code}</pre>
                          </div>
                          <div className="pt-1">
                            <div className="lesson-section-label text-slate-400">What this teaches</div>
                            <h4 className="mt-3 text-[1.85rem] font-semibold leading-tight tracking-[-0.04em] text-white">
                              {renderWithNewlines(step?.content)}
                            </h4>
                            {showStepExplanation ? (
                              <div className="mt-4 max-w-xl type-body-md text-slate-300">{renderWithNewlines(step?.explanation)}</div>
                            ) : null}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
            {footer}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LessonModal;
