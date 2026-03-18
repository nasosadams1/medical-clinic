import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, CheckCircle, ArrowRight, Heart, Clock, BookOpen, RotateCcw, Zap, ArrowLeft } from "lucide-react";
import { useUser } from "../context/UserContext";
import { getLessonById, calculateXP, allLessons as lessonsData } from "../data/lessons";

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

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${Math.round(seconds % 60)}s`;
};

const shell =
  "rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] shadow-[0_30px_90px_rgba(2,6,23,0.72)]";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const LessonModal: React.FC<LessonModalProps> = ({
  content: contentProp,
  lesson,
  allLessons: allLessonsProp,
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
  const allLessons = allLessonsProp ?? lessonsData;
  const activeBoosts = getActiveBoosts();
  const retakeTimerRef = useRef<number | null>(null);

  const fullLesson = useMemo(() => (getLessonById ? getLessonById(lesson?.id) : null), [lesson?.id]);
  const content: { steps: any[]; quiz?: any[] } = useMemo(
    () => contentProp ?? fullLesson?.content ?? lesson?.content ?? { steps: [], quiz: [] },
    [contentProp, fullLesson?.content, lesson?.content]
  );

  const safeTotalSteps = Math.max(0, content.steps?.length ?? 0);
  const safeTotalQuiz = Math.max(0, content.quiz?.length ?? 0);
  const effectiveQuizCount = forceSkipQuiz ? 0 : safeTotalQuiz;
  const safeTotalAll = Math.max(1, safeTotalSteps + effectiveQuizCount);
  const questionSteps = useMemo(() => (content.steps || []).filter((step) => step?.type === "question"), [content.steps]);
  const languageLessons = useMemo(() => allLessons.filter((item) => item.language === lesson.language), [allLessons, lesson.language]);
  const lessonIndex = useMemo(() => languageLessons.findIndex((item) => item.id === lesson.id), [languageLessons, lesson.id]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizResults, setQuizResults] = useState<boolean[]>([]);
  const [midLessonResults, setMidLessonResults] = useState<boolean[]>([]);
  const [startTime] = useState(Date.now());
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [shouldClose, setShouldClose] = useState(false);

  const currentStepData = (content.steps || [])[currentStep] ?? null;
  const currentQuizItem = (content.quiz || [])[currentQuizIndex] ?? null;
  const isCurrentStepQuestion = !isQuizMode && currentStepData?.type === "question" && Boolean(currentStepData?.question);
  const currentProgress = isQuizMode ? midLessonResults.filter(Boolean).length + currentQuizIndex + 1 : currentStep + 1;
  const percent = Math.round((Math.min(currentProgress, safeTotalAll) / safeTotalAll) * 100);

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

  const nextValidStep = (startIndex: number) => {
    let index = startIndex;
    while (index < safeTotalSteps && content.steps[index]?.type === "question" && !content.steps[index]?.question) {
      index += 1;
    }
    return index;
  };

  const previousValidStep = (startIndex: number) => {
    let index = startIndex;
    while (index >= 0 && content.steps[index]?.type === "question" && !content.steps[index]?.question) {
      index -= 1;
    }
    return index;
  };

  const finalizeLesson = async () => {
    const actualTimeMinutes = (Date.now() - startTime) / (1000 * 60);
    const earnedXP = calculateXPFn(
      lesson.baseXP,
      lesson.difficulty,
      lessonIndex,
      languageLessons.length,
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
    const nextStep = nextValidStep(currentStep + 1);
    if (nextStep < safeTotalSteps) {
      setCurrentStep(nextStep);
      setSelectedAnswer(null);
      setShowQuizResult(false);
      resetHeartLossFn?.();
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
    setCurrentStep(0);
    setIsQuizMode(false);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    setQuizResults([]);
    setMidLessonResults([]);
    setShowRetakeModal(false);
    resetHeartLossFn?.();
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
    setCurrentStep(0);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    setIsQuizMode(false);
    setIsCompleted(false);
    setQuizResults([]);
    setMidLessonResults([]);
    setShowRetakeModal(false);
    setShouldClose(false);
  }, [lesson?.id, content]);

  useEffect(() => {
    if (shouldClose) onClose();
  }, [shouldClose, onClose]);

  if (user?.hearts <= 0 && !isUnlimitedHeartsActive()) return null;

  if (safeTotalSteps === 0 && effectiveQuizCount === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur">
        <div className={`${shell} w-full max-w-lg p-8 text-center`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Preparing lesson workspace</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">We are loading the lesson content and quiz checks for this track.</p>
          <button type="button" onClick={onClose} className={`${primaryButton} mt-6 w-full`}>Close</button>
        </div>
      </div>
    );
  }

  if (showRetakeModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur">
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
    const correctAnswers = quizResults.filter(Boolean).length;
    const correctMidAnswers = midLessonResults.filter(Boolean).length;
    const actualTimeSeconds = (Date.now() - startTime) / 1000;
    const baseXP = calculateXPFn(
      lesson.baseXP,
      lesson.difficulty,
      lessonIndex,
      languageLessons.length,
      actualTimeSeconds / 60,
      lesson.baselineTime
    );
    const boostMultiplier = isXPBoostActive() ? activeBoosts.xpBoost?.multiplier || 1 : 1;
    const earnedXP = Math.floor(baseXP * boostMultiplier);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur">
        <div className={`${shell} w-full max-w-2xl p-8`}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-white">Lesson complete</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">The next practice unit is ready. This lesson now counts toward your progress path.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Earned XP</div><div className="mt-2 text-lg font-semibold text-white">{earnedXP} XP</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Quick Checks</div><div className="mt-2 text-lg font-semibold text-white">{correctMidAnswers}/{questionSteps.length || 0}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Final Quiz</div><div className="mt-2 text-lg font-semibold text-white">{effectiveQuizCount > 0 ? `${correctAnswers}/${effectiveQuizCount}` : "Skipped"}</div></div>
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

  const handleStepSubmit = () => {
    if (!currentStepData) return;
    if (currentStepData.type !== "question") {
      moveForward();
      return;
    }
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === currentStepData.correctAnswer;
    if (!showQuizResult) {
      setMidLessonResults((prev) => [...prev, isCorrect]);
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
      setQuizResults((prev) => [...prev, isCorrect]);
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
    <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur lg:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{isQuizMode ? "Final quiz" : "Practice lesson"}</div>
            <h2 className="mt-1 text-base font-semibold text-white sm:text-lg">{lesson.title}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            {isQuizMode ? `Question ${Math.min(currentQuizIndex + 1, effectiveQuizCount)} of ${effectiveQuizCount}` : `Step ${Math.min(currentStep + 1, safeTotalSteps)} of ${safeTotalSteps}`}
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Heart
                key={i}
                className={
                  activeBoosts.unlimitedHearts
                    ? "h-4 w-4 fill-pink-400 text-pink-400 animate-pulse"
                    : i < (user?.hearts ?? 0)
                      ? "h-4 w-4 fill-rose-400 text-rose-400"
                      : "h-4 w-4 text-slate-700"
                }
              />
            ))}
            <span className="ml-2 text-sm text-slate-200">{activeBoosts.unlimitedHearts ? "Unlimited" : `${user?.hearts ?? 0}/5`}</span>
          </div>
          {activeBoosts.xpBoost && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              <Zap className="h-4 w-4" />
              <span>{activeBoosts.xpBoost.multiplier}x XP active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="sticky bottom-0 mt-4 rounded-[1.5rem] border border-white/10 bg-slate-950/90 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            if (isQuizMode) {
              setIsQuizMode(false);
              setCurrentQuizIndex(0);
              setSelectedAnswer(null);
              setShowQuizResult(false);
              return;
            }
            const previous = previousValidStep(currentStep - 1);
            if (previous >= 0) {
              setCurrentStep(previous);
              setSelectedAnswer(null);
              setShowQuizResult(false);
            }
          }}
          disabled={!isQuizMode && currentStep <= 0}
          className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          onClick={isQuizMode ? handleQuizSubmit : handleStepSubmit}
          disabled={
            (isQuizMode && selectedAnswer === null) ||
            (!isQuizMode && isCurrentStepQuestion && selectedAnswer === null && !showQuizResult) ||
            (!isQuizMode && showQuizResult && selectedAnswer !== currentStepData?.correctAnswer)
          }
          className={primaryButton}
        >
          <span>
            {isQuizMode
              ? showQuizResult
                ? selectedAnswer === currentQuizItem?.correctAnswer
                  ? currentQuizIndex === effectiveQuizCount - 1
                    ? "Finish lesson"
                    : "Next question"
                  : "Retake required"
                : "Check answer"
              : isCurrentStepQuestion && !showQuizResult
                ? "Check answer"
                : showQuizResult
                  ? selectedAnswer === currentStepData?.correctAnswer
                    ? "Next step"
                    : "Retake required"
                  : currentStep >= safeTotalSteps - 1
                    ? effectiveQuizCount > 0
                      ? "Start final quiz"
                      : "Finish lesson"
                    : "Next step"}
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,_rgba(2,6,23,0.98)_0%,_rgba(4,10,28,1)_100%)]">
      <div className="flex min-h-full flex-col">
        {header}
        <div className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-400">
                Progress: <span className="font-medium text-slate-200">{percent}% complete</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Est. {lesson.baselineTime} min</span>
              </div>
            </div>
            <div className="mb-6 h-2.5 rounded-full bg-white/10">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>

            <div className={`${shell} overflow-hidden p-6 sm:p-8`}>
              {isQuizMode ? (
                <>
                  <div className="mb-8">
                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Interview-style checkpoint</div>
                    <h3 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{renderWithNewlines(currentQuizItem?.question)}</h3>
                  </div>
                  <div className="space-y-3">
                    {currentQuizItem?.options?.map((option: string, index: number) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect = index === currentQuizItem.correctAnswer;
                      const tone = showQuizResult
                        ? isSelected
                          ? isCorrect
                            ? "border-emerald-400/45 bg-emerald-500/10 text-emerald-100"
                            : "border-rose-400/45 bg-rose-500/10 text-rose-100"
                          : isCorrect
                            ? "border-emerald-400/35 bg-emerald-500/5 text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-slate-300"
                        : isSelected
                          ? "border-cyan-400/55 bg-cyan-400/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white";
                      return (
                        <button key={index} type="button" onClick={() => setSelectedAnswer(index)} disabled={showQuizResult} className={`w-full rounded-[1.4rem] border p-4 text-left transition ${tone}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-300">{String.fromCharCode(65 + index)}</div>
                            <span className="pt-0.5 text-sm font-medium leading-6">{renderWithNewlines(option)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {showQuizResult && (
                    <div className={`mt-6 rounded-[1.5rem] border px-5 py-4 text-sm leading-6 ${selectedAnswer === currentQuizItem?.correctAnswer ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-rose-400/25 bg-rose-500/10 text-rose-100"}`}>
                      <p className="mb-2 text-base font-semibold">{selectedAnswer === currentQuizItem?.correctAnswer ? "Correct answer" : "Incorrect answer"}</p>
                      <p className="text-slate-200">{renderWithNewlines(currentQuizItem?.explanation)}</p>
                    </div>
                  )}
                </>
              ) : isCurrentStepQuestion ? (
                <>
                  <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">Quick check</div>
                      <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Measured practice</div>
                    </div>
                    <h3 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{renderWithNewlines(currentStepData?.question)}</h3>
                  </div>
                  <div className="space-y-3">
                    {(currentStepData?.options || currentStepData?.answers || []).map((option: string, index: number) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect = index === currentStepData.correctAnswer;
                      const tone = showQuizResult
                        ? isSelected
                          ? isCorrect
                            ? "border-emerald-400/45 bg-emerald-500/10 text-emerald-100"
                            : "border-rose-400/45 bg-rose-500/10 text-rose-100"
                          : isCorrect
                            ? "border-emerald-400/35 bg-emerald-500/5 text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-slate-300"
                        : isSelected
                          ? "border-cyan-400/55 bg-cyan-400/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white";
                      return (
                        <button key={index} type="button" onClick={() => setSelectedAnswer(index)} disabled={showQuizResult} className={`w-full rounded-[1.4rem] border p-4 text-left transition ${tone}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-300">{String.fromCharCode(65 + index)}</div>
                            <span className="pt-0.5 text-sm font-medium leading-6">{renderWithNewlines(option)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {showQuizResult && (
                    <div className={`mt-6 rounded-[1.5rem] border px-5 py-4 text-sm leading-6 ${selectedAnswer === currentStepData?.correctAnswer ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-rose-400/25 bg-rose-500/10 text-rose-100"}`}>
                      <p className="mb-2 text-base font-semibold">{selectedAnswer === currentStepData?.correctAnswer ? "Correct answer" : "Incorrect answer"}</p>
                      <p className="text-slate-200">{renderWithNewlines(currentStepData?.explanation)}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Core concept</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hands-on practice path</span>
                    </div>
                    <h3 className="text-2xl font-semibold leading-tight text-white sm:text-4xl">{renderWithNewlines(currentStepData?.title)}</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-5 text-base leading-8 text-slate-200">
                      {renderWithNewlines(currentStepData?.content)}
                    </div>
                    {currentStepData?.code && (
                      <div className="overflow-x-auto rounded-[1.5rem] border border-cyan-400/15 bg-slate-950/90 p-5">
                        <pre className="font-mono text-sm leading-7 text-emerald-300">{currentStepData.code}</pre>
                      </div>
                    )}
                    {currentStepData?.explanation && (
                      <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm leading-7 text-slate-200">
                        {renderWithNewlines(currentStepData.explanation)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {footer}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonModal;
