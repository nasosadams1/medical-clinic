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
  edgeCaseSnippets: step?.edgeCaseSnippets ?? [],
  qualitySignals: step?.qualitySignals ?? [],
  efficiencySignals: step?.efficiencySignals ?? [],
  forbiddenPatterns: step?.forbiddenPatterns ?? [],
  weights: step?.weights,
});

const genericExampleTitlePattern = /^Example\s+\d+$/i;

const questionKindLabelMap: Record<string, string> = {
  "predict-output": "Predict output",
  "common-mistake": "Common mistake",
  "knowledge-check": "Knowledge check",
  "compiler-trace": "Compiler trace",
  "ownership-check": "Ownership check",
  "api-design": "API design",
  "refactor-choice": "Refactor choice",
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

const getQuestionWorkspaceGuide = (item: any, languageLabel = "the language") => {
  const kind = item?.questionKind || "";

  if (kind === "predict-output") {
    return {
      label: "Prediction checklist",
      title: "Trace the code before you answer",
      accent: "border-cyan-400/16 bg-cyan-400/[0.05] text-cyan-100",
      items: [
        "Read top to bottom and track the value of each variable.",
        "Use the exact console output, not the code or a description.",
        "Watch quotes, spacing, and line order before you submit.",
      ],
    };
  }

  if (kind === "common-mistake") {
    return {
      label: "What to watch",
      title: "Look for the failure point",
      accent: "border-amber-300/16 bg-amber-300/[0.05] text-amber-100",
      items: [
        "Check whether the code would run before judging the result.",
        "Look for missing quotes, type mismatches, and name errors.",
        `Pick the answer that matches ${languageLabel} behavior exactly.`,
      ],
    };
  }

  if (kind === "compiler-trace") {
    return {
      label: "Compiler trace",
      title: "Find the first real compiler complaint",
      accent: "border-rose-300/16 bg-rose-300/[0.05] text-rose-100",
      items: [
        "Start with the first error, not the last one in the list.",
        "Check declarations, overloads, and missing symbols before guessing.",
        `Answer based on what ${languageLabel} would reject first, not what looks suspicious.`,
      ],
    };
  }

  if (kind === "ownership-check") {
    return {
      label: "Ownership review",
      title: "Track who owns cleanup",
      accent: "border-emerald-300/16 bg-emerald-300/[0.05] text-emerald-100",
      items: [
        "Ask which object is responsible for lifetime and cleanup.",
        "Watch for copied owners, raw new/delete, and unclear transfer rules.",
        "Prefer the answer that preserves one clear ownership story.",
      ],
    };
  }

  if (kind === "api-design") {
    return {
      label: "API review",
      title: "Choose the interface with the least surprise",
      accent: "border-sky-300/16 bg-sky-300/[0.05] text-sky-100",
      items: [
        "Look for naming, return types, and ownership signals that match the behavior.",
        "Reject answers that are technically possible but confusing to callers.",
        "Prefer composition, explicitness, and small interfaces.",
      ],
    };
  }

  if (kind === "refactor-choice") {
    return {
      label: "Refactor review",
      title: "Pick the cleaner change",
      accent: "border-fuchsia-300/16 bg-fuchsia-300/[0.05] text-fuchsia-100",
      items: [
        "Choose the option that reduces duplication or ambiguity without adding magic.",
        "Prefer a change that keeps behavior obvious and testable.",
        "If two options work, pick the one that scales better for maintenance.",
      ],
    };
  }

  return {
    label: "Answer strategy",
    title: "Choose the strongest answer",
    accent: "border-violet-400/16 bg-violet-400/[0.05] text-violet-100",
    items: [
      "Read the prompt once for meaning and once for details.",
      "Eliminate answers that are partially true but incomplete.",
      "Select the answer that best matches the lesson rule.",
    ],
  };
};

type LessonLayoutDensity = "compact" | "standard" | "expanded";
type LessonLayoutTemplate = "worked-examples" | "practice" | "predict-output" | "common-mistake";
type LessonCodeScale = "large" | "medium" | "compact";

const countNonEmptyLines = (value?: string | null) =>
  String(value || "")
    .split("\n")
    .filter((line) => line.trim().length > 0).length;

const countWords = (value?: string | null) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const getLongestLineLength = (value?: string | null) =>
  String(value || "")
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 0);

const getLessonCodeScale = ({
  code,
  density,
  preferLarge = false,
}: {
  code?: string | null;
  density?: LessonLayoutDensity;
  preferLarge?: boolean;
}): LessonCodeScale => {
  const lines = countNonEmptyLines(code);
  const longestLine = getLongestLineLength(code);

  if (!lines) return "medium";
  if (lines <= 4 && longestLine <= 24) return "large";
  if (lines <= 6 && longestLine <= 34 && density !== "expanded") return "large";
  if (lines <= 8 && longestLine <= 50) return preferLarge ? "large" : "medium";
  if (lines <= 12 && longestLine <= 68) return "medium";
  return "compact";
};

const getLessonCodeClassName = (scale: LessonCodeScale) => {
  if (scale === "large") return "text-[1.1rem] leading-9";
  if (scale === "medium") return "text-[1rem] leading-8";
  return "text-[0.95rem] leading-7";
};

const getLessonEditorTypography = (code?: string | null) => {
  const scale = getLessonCodeScale({ code, preferLarge: true });
  if (scale === "large") return { fontSize: 17, lineHeight: 28 };
  if (scale === "medium") return { fontSize: 16, lineHeight: 26 };
  return { fontSize: 15, lineHeight: 24 };
};

const looksLikeCodeSnippet = (value?: string | null) => {
  const normalized = String(value || "").trim();
  if (!normalized) return false;

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) return false;

  const codeLikeLine = /[=(){}\[\]<>:+\-*/%]|^\s*(print|if|elif|else|for|while|return|input|len|class|def)\b/;
  const proseEnding = /[.!?]$/;

  return lines.every((line) => codeLikeLine.test(line) && !proseEnding.test(line.trim()));
};

const getQuestionFallbackHeading = (kind?: string | null) => {
  if (kind === "predict-output") return "What does this print?";
  if (kind === "common-mistake") return "What happens when this runs?";
  if (kind === "compiler-trace") return "What would the compiler complain about first?";
  if (kind === "ownership-check") return "Which ownership story is correct?";
  if (kind === "api-design") return "Which API design is the safer choice?";
  if (kind === "refactor-choice") return "Which refactor is the better production move?";
  return "Choose the best answer";
};

const getQuestionLayoutTemplate = (kind?: string | null): "predict-output" | "common-mistake" =>
  kind === "common-mistake" ? "common-mistake" : "predict-output";

const getDensityBucket = (score: number): LessonLayoutDensity => {
  if (score <= 1) return "compact";
  if (score >= 4) return "expanded";
  return "standard";
};

const getQuestionLayoutDensity = ({
  heading,
  code,
  optionCount,
  hasExplanation,
  inlineCodePrompt,
}: {
  heading?: string | null;
  code?: string | null;
  optionCount: number;
  hasExplanation: boolean;
  inlineCodePrompt: boolean;
}): LessonLayoutDensity => {
  let score = 0;
  const headingWords = countWords(heading);
  const codeLines = countNonEmptyLines(code);

  if (headingWords > 8) score += 1;
  if (codeLines >= 3) score += 1;
  if (codeLines >= 7) score += 1;
  if (optionCount > 4) score += 1;
  if (hasExplanation) score += 1;
  if (inlineCodePrompt) score -= 1;

  return getDensityBucket(Math.max(0, score));
};

const getPracticeLayoutDensity = ({
  heading,
  helperCount,
  outputLines,
  coachNote,
}: {
  heading?: string | null;
  helperCount: number;
  outputLines: number;
  coachNote?: string | null;
}): LessonLayoutDensity => {
  let score = 0;

  if (countWords(heading) > 10) score += 1;
  if (helperCount >= 3) score += 1;
  if (helperCount >= 5) score += 1;
  if (outputLines > 2) score += 1;
  if (countWords(coachNote) > 20) score += 1;

  return getDensityBucket(score);
};

const getTheoryLayoutDensity = ({
  exampleCount,
  maxCodeLines,
  introCopy,
}: {
  exampleCount: number;
  maxCodeLines: number;
  introCopy?: string | null;
}): LessonLayoutDensity => {
  let score = 0;

  if (exampleCount >= 3) score += 1;
  if (exampleCount >= 5) score += 1;
  if (maxCodeLines >= 6) score += 1;
  if (countWords(introCopy) > 28) score += 1;

  return getDensityBucket(score);
};

const getStageMinHeightClass = (template: LessonLayoutTemplate, density: LessonLayoutDensity) => {
  if (template === "practice") {
    return density === "expanded"
      ? "min-h-[calc(100vh-7.25rem)]"
      : density === "standard"
      ? "min-h-[max(42rem,calc(100vh-10rem))]"
      : "min-h-[max(38rem,calc(100vh-14rem))]";
  }

  if (template === "predict-output") {
    return density === "expanded" ? "min-h-[28rem]" : "min-h-0";
  }

  if (template === "common-mistake") {
    return density === "expanded" ? "min-h-[28rem]" : "min-h-0";
  }

  return density === "expanded" ? "min-h-[34rem]" : "min-h-0";
};

const getStagePaddingClass = (template: LessonLayoutTemplate, density: LessonLayoutDensity) => {
  if (template === "predict-output" || template === "common-mistake") {
    return density === "compact"
      ? "px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
      : density === "standard"
      ? "px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6"
      : "px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7";
  }

  if (template === "practice") {
    return density === "compact"
      ? "px-4 py-4 sm:px-6 sm:py-6 lg:px-7 lg:py-7 xl:px-8 xl:py-8"
      : "px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8 xl:px-10 xl:py-9 2xl:px-12";
  }

  return density === "compact"
    ? "px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7 xl:py-7"
    : "px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7 xl:px-8 xl:py-8";
};

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
  feedbackKind: result.feedbackKind,
  scorePercent: result.scorePercent,
  rubricScores: result.rubricBreakdown,
  matchedSignals: [],
  flaggedPatterns: result.flaggedPatterns ?? [],
  evaluationSource: "execution",
  runtimeMs: result.runtimeMs,
  stderr: result.stderr,
  testResults: result.testResults ?? [],
});

const shouldUseStaticExecutionFallback = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error || "");

  return /lesson runner|isolated lesson execution|lesson execution is not available|could not reach|does not support server-side practice evaluation/i.test(
    message
  );
};

const toStaticExecutionFallbackResult = (
  assessment: CodeAssessmentResult,
  error: unknown
): CodeAssessmentResult => {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "The lesson runner is unavailable.";

  return {
    ...assessment,
    evaluationSource: "static",
    message: assessment.passed
      ? `Runner unavailable. Static lesson checks passed locally. ${message}`
      : `${assessment.message} Runner unavailable: using local structure checks only.`,
  };
};

const buildCodeFeedback = (result: CodeAssessmentResult | null, languageLabel = "code") => {
  if (!result) return null;

  const missingSnippets = result.missingSnippets ?? [];
  const flaggedPatterns = result.flaggedPatterns ?? [];
  const visibleTests = (result.testResults ?? []).filter((test) => !test.hidden);
  const failingVisibleTest = visibleTests.find((test) => !test.passed) || null;
  const publicOutputPassed = visibleTests.length > 0 && !failingVisibleTest;
  const hasStructureIssue = missingSnippets.length > 0 || flaggedPatterns.length > 0;
  const hasHiddenOrRuleIssue = !result.passed && publicOutputPassed && !hasStructureIssue;
  const hasUnstructuredExecutionFailure =
    result.evaluationSource === "execution" &&
    !result.passed &&
    !visibleTests.length &&
    !hasStructureIssue &&
    !result.stderr;
  const feedbackKind =
    result.feedbackKind ||
    (result.passed
      ? 'passed'
      : failingVisibleTest
      ? 'wrong_output'
      : missingSnippets.length > 0
      ? 'structure_missing'
      : flaggedPatterns.length > 0
      ? 'cleanup'
      : hasHiddenOrRuleIssue
      ? 'structure_missing'
      : 'wrong_output');

  let tone: "success" | "warning" | "error" = "warning";
  let title = "Keep refining";
  let summary = result.message;
  let nextAction = "Update the solution and check again.";

  if (feedbackKind === 'passed') {
    tone = "success";
    title = "Ready to continue";
    summary = "Output and structure checks both passed.";
    nextAction = "Move to the next step.";
  } else if (feedbackKind === 'empty') {
    tone = "warning";
    title = "Start with code";
    summary = "There is nothing to check yet.";
    nextAction = "Write the solution, then run the check.";
  } else if (feedbackKind === 'starter') {
    tone = "warning";
    title = "Starter code unchanged";
    summary = "The editor still contains the untouched scaffold.";
    nextAction = "Finish the task, then run the check again.";
  } else if (feedbackKind === 'syntax_error') {
    tone = "error";
    title = "Fix the syntax";
    summary =
      result.stderr ||
      failingVisibleTest?.stderr ||
      `The ${languageLabel} could not run because of a syntax or compile problem.`;
    nextAction = "Fix the syntax error, then run the check again.";
  } else if (feedbackKind === 'runtime_error') {
    tone = "error";
    title = "Program crashed";
    summary = result.stderr || failingVisibleTest?.stderr || "The code ran, but crashed during the lesson checks.";
    nextAction = "Fix the runtime error, then run the check again.";
  } else if (feedbackKind === 'timeout') {
    tone = "error";
    title = "Program timed out";
    summary = "The solution did not finish within the lesson time limit.";
    nextAction = "Simplify the logic and run the check again.";
  } else if (feedbackKind === 'wrong_output' || failingVisibleTest) {
    tone = "error";
    title = hasUnstructuredExecutionFailure ? "Check unavailable" : "Output needs work";
    summary =
      failingVisibleTest?.reason ||
      result.message ||
      (hasUnstructuredExecutionFailure
        ? "The lesson runner could not complete this check right now."
        : "The public output check still fails.");
    nextAction = hasUnstructuredExecutionFailure
      ? "Try the check again in a moment."
      : "Match the target output, then run the check again.";
  } else if (feedbackKind === 'structure_missing' || missingSnippets.length > 0) {
    tone = "warning";
    title = publicOutputPassed ? "Output is correct, structure is not" : "Structure requirement not met";
    summary = publicOutputPassed
      ? "The result is correct, but the lesson still requires one specific piece of code structure."
      : "Your solution is close, but one required piece of logic is still missing.";
    nextAction = "Keep the output, add the missing requirement, then check again.";
  } else if (feedbackKind === 'cleanup' || flaggedPatterns.length > 0) {
    tone = "warning";
    title = "Clean up the solution";
    summary = "The checker found a pattern that does not meet the lesson requirement.";
    nextAction = "Simplify the code and run the check again.";
  } else if (hasHiddenOrRuleIssue) {
    tone = "warning";
    title = "Almost there";
    summary = "The public check passes, but one additional case or rule still fails.";
    nextAction = "Handle the missing case and check again.";
  }

  const items: Array<{ label: string; state: "success" | "warning" | "error" | "neutral"; detail: string }> = [];

  const isTechnicalFailure =
    feedbackKind === 'syntax_error' || feedbackKind === 'runtime_error' || feedbackKind === 'timeout';

  if (visibleTests.length > 0 && !isTechnicalFailure) {
    const outputDetail = publicOutputPassed
      ? `${visibleTests.length} public check${visibleTests.length > 1 ? "s" : ""} passed.`
      : failingVisibleTest?.actual
      ? `${failingVisibleTest.reason} Received: ${failingVisibleTest.actual}`
      : failingVisibleTest?.reason || result.message || "A public output check failed.";
    items.push({
      label: "Output",
      state: publicOutputPassed ? "success" : "error",
      detail: outputDetail,
    });
  }

  if (missingSnippets.length > 0) {
    items.push({
      label: "Structure",
      state: "warning",
      detail: `Still missing: ${missingSnippets.join(", ")}`,
    });
  } else if (hasHiddenOrRuleIssue) {
    items.push({
      label: "Structure",
      state: "warning",
      detail: "The solution still misses one hidden case or lesson rule.",
    });
  }

  if (flaggedPatterns.length > 0) {
    items.push({
      label: "Cleanup",
      state: "warning",
      detail: `Avoid: ${flaggedPatterns.join(", ")}`,
    });
  }

  if (hasUnstructuredExecutionFailure && !items.length) {
    items.push({
      label: "Runner",
      state: "error",
      detail: result.message || "The lesson runner rejected this check.",
    });
  }

  if (isTechnicalFailure) {
    items.unshift({
      label: feedbackKind === 'syntax_error' ? "Syntax" : feedbackKind === 'runtime_error' ? "Runtime" : "Time limit",
      state: "error",
      detail:
        feedbackKind === 'timeout'
          ? "The program did not finish before the lesson time limit."
          : (result.stderr || failingVisibleTest?.stderr || result.message),
    });
  }

  if (result.runtimeMs && feedbackKind !== 'runtime_error' && feedbackKind !== 'timeout') {
    items.push({
      label: "Runtime",
      state: "neutral",
      detail: `${result.runtimeMs}ms`,
    });
  }

  if (result.stderr) {
    items.push({
      label: "Runner",
      state: "error",
      detail: result.stderr,
    });
  }

  return { tone, title, summary, nextAction, items };
};

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
  const currentQuizInlineCodePrompt =
    !currentQuizPromptParts.code && looksLikeCodeSnippet(currentQuizPromptParts.prompt || currentQuizItem?.question);
  const currentQuizDisplayCode =
    currentQuizPromptParts.code || (currentQuizInlineCodePrompt ? currentQuizPromptParts.prompt : "");
  const languageLabel = lessonLanguageLabelMap[lessonLanguage];
  const currentQuizGuide = getQuestionWorkspaceGuide(currentQuizItem, languageLabel);
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
  const currentQuestionInlineCodePrompt =
    !currentQuestionPromptParts.code && looksLikeCodeSnippet(currentQuestionPromptParts.prompt || currentQuestionPrompt);
  const currentQuestionDisplayCode =
    currentQuestionPromptParts.code || (currentQuestionInlineCodePrompt ? currentQuestionPromptParts.prompt : "");
  const currentQuestionGuide = getQuestionWorkspaceGuide(currentStepData, languageLabel);
  const currentTheoryHeading = getTheoryStepHeading(currentStepData);
  const currentPracticeBrief = currentStepData?.practiceBrief || null;
  const currentPracticeHeading = currentPracticeBrief?.task || currentStepData?.content || currentStepData?.title || "";
  const currentDisplayedHeading = isPracticeStep
    ? currentPracticeHeading
    : currentTheoryHeading || currentStepData?.title || currentStepData?.content || "";
  const currentPracticeCoachNote = currentPracticeBrief?.coachNote || currentStepData?.explanation || "";
  const isProjectLesson = resolvedLesson?.category === "Projects";
  const lessonLanguageLabel = lessonLanguageLabelMap[lessonLanguage];
  const lessonTitle =
    resolvedLesson?.title || lessonCatalogEntry?.title || lesson?.title || `${lessonLanguageLabel} lesson`;
  const headerEyebrow = isQuizMode ? `${lessonLanguageLabel} review` : `${lessonLanguageLabel} workspace`;
  const headerContextLabel = isQuizMode
    ? `${lessonTitle} · final review`
    : showsCodePracticeEditor
      ? `${lessonTitle} · ${isPracticeStep ? "practice" : "guided code"}`
      : isCurrentStepQuestion
        ? `${lessonTitle} · ${getQuestionKindLabel(currentStepData).toLowerCase()}`
        : `${lessonTitle} · lesson flow`;
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
    : "type-display-section max-w-4xl text-white";
  const practiceHeadingClassName = "lesson-practice-heading max-w-4xl text-white";
  const modalQuestionHeadingClassName = "type-headline max-w-3xl text-white";
  const theoryDisplaySteps = groupedTheoryExampleSteps.length ? groupedTheoryExampleSteps : groupedTheorySteps;
  const showsLowHeartNote = !isUnlimitedHeartsActive() && (user?.hearts ?? 0) <= 2;
  const codeFeedback = buildCodeFeedback(theoryCodeResult, languageLabel);
  const hasPracticeRequirements = Boolean(isPracticeStep && currentPracticeBrief?.requirements?.length);
  const hasPracticeOutput = Boolean(
    isPracticeStep && (currentPracticeBrief?.expectedOutput?.length || currentPracticeBrief?.outputDescription)
  );
  const hasPracticeInputs = Boolean(isPracticeStep && currentPracticeBrief?.inputs?.length);
  const hasPracticeCoachRail = Boolean(shouldRenderPracticeCoachNote);
  const hasTheoryFocusRail = Boolean(!isPracticeStep && currentStepData?.content);
  const showsSupportRail =
    hasPracticeRequirements || hasPracticeOutput || hasPracticeInputs || hasPracticeCoachRail || hasTheoryFocusRail;
  const quizDensity = getQuestionLayoutDensity({
    heading: currentQuizInlineCodePrompt
      ? getQuestionFallbackHeading(currentQuizItem?.questionKind)
      : currentQuizPromptParts.prompt || currentQuizItem?.question,
    code: currentQuizDisplayCode,
    optionCount: currentQuizItem?.options?.length ?? 0,
    hasExplanation: Boolean(showQuizResult && currentQuizItem?.explanation),
    inlineCodePrompt: currentQuizInlineCodePrompt,
  });
  const questionDensity = getQuestionLayoutDensity({
    heading: currentQuestionInlineCodePrompt
      ? getQuestionFallbackHeading(currentStepData?.questionKind)
      : currentQuestionPromptParts.prompt || currentQuestionPrompt,
    code: currentQuestionDisplayCode,
    optionCount: (currentStepData?.options || currentStepData?.answers || []).length,
    hasExplanation: Boolean(showQuizResult && currentStepData?.explanation),
    inlineCodePrompt: currentQuestionInlineCodePrompt,
  });
  const practiceDensity = getPracticeLayoutDensity({
    heading: currentPracticeHeading,
    helperCount:
      (hasPracticeRequirements ? currentPracticeBrief?.requirements?.length ?? 0 : 0) +
      (hasPracticeOutput ? 1 : 0) +
      (hasPracticeInputs ? currentPracticeBrief?.inputs?.length ?? 0 : 0) +
      (hasPracticeCoachRail ? 1 : 0),
    outputLines: currentPracticeBrief?.expectedOutput?.length ?? 0,
    coachNote: currentPracticeCoachNote,
  });
  const theoryStepsForDensity = groupedTheoryExampleSteps.length ? groupedTheoryExampleSteps : groupedTheorySteps;
  const theoryDensity = getTheoryLayoutDensity({
    exampleCount: theoryStepsForDensity.length,
    maxCodeLines: theoryStepsForDensity.reduce((max: number, step: any) => Math.max(max, countNonEmptyLines(step?.code)), 0),
    introCopy: `${theoryIntroBody} ${theoryGroupNote}`,
  });
  const currentQuestionTemplate = getQuestionLayoutTemplate(
    isQuizMode ? currentQuizItem?.questionKind : currentStepData?.questionKind
  );
  const activeTemplate: LessonLayoutTemplate = isQuizMode
    ? currentQuestionTemplate
    : isCurrentStepQuestion
      ? currentQuestionTemplate
      : showsCodePracticeEditor
        ? "practice"
        : "worked-examples";
  const activeDensity: LessonLayoutDensity = isQuizMode
    ? quizDensity
    : isCurrentStepQuestion
      ? questionDensity
      : showsCodePracticeEditor
        ? practiceDensity
        : theoryDensity;
  const stageMinHeightClass = getStageMinHeightClass(activeTemplate, activeDensity);
  const stagePaddingClass = getStagePaddingClass(activeTemplate, activeDensity);
  const isAssessmentTemplate =
    activeTemplate === "predict-output" || activeTemplate === "common-mistake";
  const questionTemplateUsesViewportHeight = false;
  const workspaceMaxWidthClass =
    isAssessmentTemplate
      ? "max-w-[1240px]"
      : activeTemplate === "practice"
        ? "max-w-[1600px]"
        : "max-w-[1660px]";
  const workspaceFrameClass =
    isAssessmentTemplate
      ? "px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 lg:px-5 lg:pb-6"
      : "px-3 pb-5 pt-3 sm:px-4 sm:pb-6 sm:pt-4 lg:px-5 lg:pb-8";
  const editorHeight =
    practiceDensity === "expanded" ? "58vh" : practiceDensity === "compact" ? "48vh" : "54vh";
  const footerContainerClass =
    activeTemplate === "practice"
      ? "sticky bottom-4 z-10 mt-8 pt-4"
      : isAssessmentTemplate
        ? "mt-4 pt-0"
        : "mt-6 pt-3";
  const footerPanelClass =
    activeDensity === "compact"
      ? "lesson-panel border-white/10 bg-[linear-gradient(180deg,rgba(8,13,24,0.88),rgba(6,10,18,0.96))] px-4 py-3 shadow-[0_20px_38px_rgba(2,6,23,0.22)] sm:px-5"
      : "lesson-panel border-white/12 bg-[linear-gradient(180deg,rgba(8,13,24,0.88),rgba(6,10,18,0.96))] px-4 py-4 shadow-[0_26px_48px_rgba(2,6,23,0.28)] sm:px-5";
  const compactQuestionUsesLeftGuide = false;
  const questionGridClass =
    activeDensity === "expanded"
      ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.05fr)] xl:gap-6"
      : activeDensity === "standard"
        ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1.52fr)_minmax(0,1.08fr)] xl:gap-6"
        : "grid items-start gap-3 xl:grid-cols-[minmax(0,1.48fr)_minmax(0,1.12fr)] xl:gap-5";
  const quizHeading = currentQuizInlineCodePrompt
    ? getQuestionFallbackHeading(currentQuizItem?.questionKind)
    : currentQuizPromptParts.prompt || currentQuizItem?.question || "";
  const midLessonQuestionHeading = currentQuestionInlineCodePrompt
    ? getQuestionFallbackHeading(currentStepData?.questionKind)
    : currentQuestionPromptParts.prompt || currentQuestionPrompt || "";
  const questionPanelClass = isAssessmentTemplate
    ? "lesson-panel flex self-start flex-col gap-4 p-4 sm:gap-[1.125rem] sm:p-5"
    : "lesson-panel flex self-start flex-col p-4 sm:p-5";
  const questionSupportPanelClass = isAssessmentTemplate
    ? "lesson-support-panel flex self-start flex-col p-4 sm:p-5"
    : "lesson-support-panel flex self-start flex-col p-4 sm:p-5";
  const questionCodeSurfaceClass = isAssessmentTemplate
    ? "lesson-code-surface min-h-[9.5rem] overflow-x-auto px-4 py-4 sm:min-h-[10.5rem] sm:px-5 sm:py-4"
    : "lesson-code-surface mt-3 overflow-x-auto p-4 sm:p-5";
  const questionOptionsClass = "grid gap-3";
  const questionCodePreClass = "min-h-0";
  const quizCodeTextClassName = getLessonCodeClassName(
    getLessonCodeScale({ code: currentQuizDisplayCode, density: quizDensity, preferLarge: true })
  );
  const midLessonQuestionCodeTextClassName = getLessonCodeClassName(
    getLessonCodeScale({ code: currentQuestionDisplayCode, density: questionDensity, preferLarge: true })
  );
  const practiceOutputCodeTextClassName = getLessonCodeClassName(
    getLessonCodeScale({
      code: currentPracticeBrief?.expectedOutput?.join("\n"),
      density: practiceDensity,
      preferLarge: true,
    })
  );
  const practiceEditorTypography = getLessonEditorTypography(currentStepData?.starterCode || currentStepData?.code);
  const compactLeftGuideClass =
    "rounded-[1.35rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-slate-100";
  const supportGuideClass = "mt-4 rounded-[1.35rem] border px-4 py-4";
  const footerHint = isQuizMode
    ? showQuizResult
      ? selectedAnswer === currentQuizItem?.correctAnswer
        ? "Answer locked in. Continue when you are ready."
        : "This answer failed. Review the feedback and restart the lesson to continue."
      : "Choose the strongest answer, then check it."
    : showsCodePracticeEditor
      ? theoryCodeResult?.passed
        ? "Your solution passed. Continue when you are ready."
        : "Use the checker when the solution matches the brief."
      : isCurrentStepQuestion
        ? showQuizResult
          ? selectedAnswer === currentStepData?.correctAnswer
            ? "Correct answer locked in. Continue when you are ready."
            : "This answer failed. Review the explanation and restart the lesson to continue."
          : "Read the prompt, choose one answer, then check it."
        : "Review the example, then continue when the rule is clear.";
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

    const preflightAssessment = validateCodeAssessment(
      typedTheoryCode,
      getAssessmentDefinition(currentStepData, lessonLanguage)
    );

    if (
      isPracticeStep &&
      currentStepData?.evaluationMode === "execution" &&
      currentStepData?.evaluationId
    ) {
      if (preflightAssessment.feedbackKind === "empty" || preflightAssessment.feedbackKind === "starter") {
        return {
          ...preflightAssessment,
          evaluationSource: "static",
        };
      }

      try {
        const result = await evaluateLessonPractice({
          lessonId: currentStepData.evaluationId,
          submittedCode: typedTheoryCode,
        });
        return toExecutionAssessmentResult(result);
      } catch (error) {
        if (shouldUseStaticExecutionFallback(error)) {
          return toStaticExecutionFallbackResult(preflightAssessment, error);
        }
        throw error;
      }
    }

    return {
      ...preflightAssessment,
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
    <div className="sticky top-0 z-20 border-b border-white/8 bg-slate-950/92 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-5">
      <div className={`mx-auto ${workspaceMaxWidthClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 xl:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="lesson-section-label">{headerEyebrow}</div>
              <div className="mt-1 text-sm leading-6 text-slate-300 sm:text-[0.95rem]">
                {headerContextLabel}
              </div>
            </div>
          </div>
          <div className="w-full max-w-[24rem] sm:w-auto sm:min-w-[20rem]">
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
    <div className={footerContainerClass}>
      <div className={footerPanelClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="lesson-section-label text-slate-300">
              {isQuizMode ? "Review action" : showsCodePracticeEditor ? "Workspace action" : "Lesson action"}
            </div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{footerHint}</div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
      </div>
    </div>
  );

  return renderOverlay(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.18),transparent_32%),linear-gradient(180deg,#020617_0%,#04101d_100%)]"
      role="dialog"
      aria-modal="true"
    >
      <div className={questionTemplateUsesViewportHeight ? "min-h-full flex flex-col" : "min-h-full"}>
        {header}
        <div className={workspaceFrameClass}>
          <div className={`mx-auto w-full ${workspaceMaxWidthClass} ${questionTemplateUsesViewportHeight ? "flex flex-1 flex-col" : ""}`}>
            <div className={`lesson-stage ${stageMinHeightClass} ${stagePaddingClass} flex flex-col ${questionTemplateUsesViewportHeight ? "flex-1" : ""}`}>
            {isQuizMode ? (
              <div className={questionGridClass}>
                <div className={questionPanelClass}>
                  <div className="flex flex-col gap-4 sm:gap-[1.125rem]">
                    <div className="max-w-4xl">
                      <div className="lesson-section-label">Final review</div>
                      <h3 className={`${modalQuestionHeadingClassName} mt-3`}>
                        {renderWithNewlines(quizHeading)}
                      </h3>
                    </div>
                    {currentQuizDisplayCode ? (
                      <div className={questionCodeSurfaceClass}>
                        <div className="mb-4">
                          <span className="lesson-meta-pill lesson-meta-pill--accent">Review code</span>
                        </div>
                        <pre className={`lesson-code-text font-mono text-emerald-300 ${quizCodeTextClassName} ${questionCodePreClass}`}>
                          {currentQuizDisplayCode}
                        </pre>
                      </div>
                    ) : (
                      <div className="lesson-panel-soft border-white/8 bg-white/[0.02] p-4">
                        <div className="lesson-section-label text-slate-300">Review focus</div>
                        <div className="mt-3 type-body-md text-slate-200">{currentQuizGuide.items[0]}</div>
                      </div>
                    )}
                  </div>
                  {compactQuestionUsesLeftGuide ? (
                    <div className={`${compactLeftGuideClass} ${currentQuizGuide.accent}`}>
                      <div className="lesson-section-label text-current/80">{currentQuizGuide.label}</div>
                      <div className="mt-3 text-base font-semibold text-white">{currentQuizGuide.title}</div>
                      <ul className="mt-3 space-y-2.5">
                        {currentQuizGuide.items.map((item, index) => (
                          <li key={`quiz-left-guide-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-100">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className={questionSupportPanelClass}>
                  <div className="flex flex-col">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="lesson-meta-pill">Pick one answer</span>
                      <span className="type-body-sm text-slate-400">{currentQuizItem?.options?.length || 0} options</span>
                    </div>
                    <div className={questionOptionsClass}>
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
                            className={`min-h-[3.4rem] w-full rounded-[1.2rem] border px-3 py-2.5 text-left transition sm:min-h-[3.6rem] sm:px-3.5 sm:py-3 ${tone}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[0.68rem] font-semibold text-slate-300">
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span className="pt-0.5 text-[0.95rem] font-medium leading-6">{renderWithNewlines(option)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {showQuizResult ? (
                      <div
                        className={`mt-4 rounded-[1.5rem] border px-5 py-4 text-sm leading-6 ${
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
                  {!compactQuestionUsesLeftGuide ? (
                    <div className={`${supportGuideClass} ${currentQuizGuide.accent}`}>
                      <div className="lesson-section-label text-current/80">{currentQuizGuide.label}</div>
                      <div className="mt-3 text-base font-semibold text-white">{currentQuizGuide.title}</div>
                      <ul className="mt-3 space-y-2.5">
                        {currentQuizGuide.items.map((item, index) => (
                          <li key={`quiz-guide-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-100">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : isCurrentStepQuestion ? (
              <div className={questionGridClass}>
                <div className={questionPanelClass}>
                  <div className="flex flex-col gap-4 sm:gap-[1.125rem]">
                    <div className="max-w-4xl">
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
                        {renderWithNewlines(midLessonQuestionHeading)}
                      </h3>
                    </div>
                    {currentQuestionDisplayCode ? (
                      <div className={questionCodeSurfaceClass}>
                        <div className="mb-4">
                          <span className="lesson-meta-pill lesson-meta-pill--accent">Question code</span>
                        </div>
                        <pre className={`lesson-code-text font-mono text-emerald-300 ${midLessonQuestionCodeTextClassName} ${questionCodePreClass}`}>
                          {currentQuestionDisplayCode}
                        </pre>
                      </div>
                    ) : (
                      <div className="lesson-panel-soft border-white/8 bg-white/[0.02] p-4">
                        <div className="lesson-section-label text-slate-300">Question focus</div>
                        <div className="mt-3 type-body-md text-slate-200">{currentQuestionGuide.items[0]}</div>
                      </div>
                    )}
                  </div>
                  {compactQuestionUsesLeftGuide ? (
                    <div className={`${compactLeftGuideClass} ${currentQuestionGuide.accent}`}>
                      <div className="lesson-section-label text-current/80">{currentQuestionGuide.label}</div>
                      <div className="mt-3 text-base font-semibold text-white">{currentQuestionGuide.title}</div>
                      <ul className="mt-3 space-y-2.5">
                        {currentQuestionGuide.items.map((item, index) => (
                          <li key={`question-left-guide-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-100">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className={questionSupportPanelClass}>
                  <div className="flex flex-col">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="lesson-meta-pill">Pick one answer</span>
                      <span className="type-body-sm text-slate-400">{(currentStepData?.options || currentStepData?.answers || []).length} options</span>
                    </div>
                    <div className={questionOptionsClass}>
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
                            className={`min-h-[3.4rem] w-full rounded-[1.2rem] border px-3 py-2.5 text-left transition sm:min-h-[3.6rem] sm:px-3.5 sm:py-3 ${tone}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[0.68rem] font-semibold text-slate-300">
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span className="pt-0.5 text-[0.95rem] font-medium leading-6">{renderWithNewlines(option)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {showQuizResult ? (
                      <div
                        className={`mt-4 rounded-[1.5rem] border px-5 py-4 text-sm leading-6 ${
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
                  {!compactQuestionUsesLeftGuide ? (
                    <div className={`${supportGuideClass} ${currentQuestionGuide.accent}`}>
                      <div className="lesson-section-label text-current/80">{currentQuestionGuide.label}</div>
                      <div className="mt-3 text-base font-semibold text-white">{currentQuestionGuide.title}</div>
                      <ul className="mt-3 space-y-2.5">
                        {currentQuestionGuide.items.map((item, index) => (
                          <li key={`question-guide-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-100">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : showsCodePracticeEditor ? (
              <div className="space-y-7">
                <div className="max-w-4xl">
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

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.78fr)] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1.84fr)_360px]">
                  <div className="space-y-5">
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
                        height={editorHeight}
                        fontSize={practiceEditorTypography.fontSize}
                        lineHeight={practiceEditorTypography.lineHeight}
                      />
                    </div>

                    {codeFeedback ? (
                      <div
                        className={`lesson-panel-soft p-5 ${
                          codeFeedback.tone === "success"
                            ? "border-emerald-400/18 bg-emerald-500/[0.08]"
                            : codeFeedback.tone === "error"
                            ? "border-rose-400/18 bg-rose-500/[0.08]"
                            : "border-amber-300/18 bg-amber-300/[0.08]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="type-title-sm text-white">{codeFeedback.title}</div>
                            <div className="mt-1 type-body-sm max-w-2xl text-slate-200">{codeFeedback.summary}</div>
                          </div>
                          <span
                            className={`lesson-meta-pill ${
                              codeFeedback.tone === "success"
                                ? "border-emerald-400/20 bg-emerald-500/[0.12] text-emerald-100"
                                : codeFeedback.tone === "error"
                                ? "border-rose-400/20 bg-rose-500/[0.12] text-rose-100"
                                : "border-amber-300/20 bg-amber-300/[0.12] text-amber-100"
                            }`}
                          >
                            {codeFeedback.tone === "success"
                              ? "Passed"
                              : codeFeedback.tone === "error"
                              ? "Fix output"
                              : "Revise"}
                          </span>
                        </div>

                        {codeFeedback.items.length ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {codeFeedback.items.map((item, index) => (
                              <div
                                key={`${item.label}-${index}`}
                                className={`rounded-[1.2rem] border px-3 py-3 ${
                                  item.state === "success"
                                    ? "border-emerald-400/18 bg-emerald-500/[0.07]"
                                    : item.state === "error"
                                    ? "border-rose-400/18 bg-rose-500/[0.07]"
                                    : item.state === "warning"
                                    ? "border-amber-300/18 bg-amber-300/[0.07]"
                                    : "border-white/10 bg-slate-950/35"
                                }`}
                              >
                                <div className="lesson-section-label text-slate-300">{item.label}</div>
                                <div className="mt-2 text-sm leading-6 text-slate-100">{item.detail}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 type-body-sm text-slate-300">{codeFeedback.nextAction}</div>
                      </div>
                    ) : null}
                  </div>

                  {showsSupportRail ? (
                    <aside className="lesson-support-panel overflow-hidden xl:sticky xl:top-24">
                      {hasPracticeRequirements ? (
                        <div className="px-5 py-5 sm:px-6">
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

                      {hasPracticeOutput ? (
                        <div className={`${hasPracticeRequirements ? "border-t border-white/8 " : ""}bg-emerald-500/[0.04] px-5 py-5 sm:px-6`}>
                          <div className="lesson-section-label text-emerald-300">Target Output</div>
                          {currentPracticeBrief.outputDescription ? (
                            <div className="type-body-md mt-3 text-slate-200">
                              {renderPracticeCopy(currentPracticeBrief.outputDescription, "muted")}
                            </div>
                          ) : null}
                          {currentPracticeBrief.expectedOutput?.length ? (
                            <div className={`lesson-code-text mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/90 p-4 font-mono text-emerald-300 ${practiceOutputCodeTextClassName}`}>
                              {currentPracticeBrief.expectedOutput.map((item: string, index: number) => (
                                <div key={`output-${index}`}>{item}</div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {hasPracticeInputs ? (
                        <div
                          className={`${
                            hasPracticeRequirements || hasPracticeOutput ? "border-t border-white/8 " : ""
                          }bg-cyan-400/[0.04] px-5 py-5 sm:px-6`}
                        >
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

                      {hasPracticeCoachRail ? (
                        <div
                          className={`${
                            hasPracticeRequirements || hasPracticeOutput || hasPracticeInputs ? "border-t border-white/8 " : ""
                          }bg-amber-300/[0.05] px-5 py-5 sm:px-6`}
                        >
                          <div className="lesson-section-label text-amber-200">Coach Note</div>
                          <div className="type-body-md mt-3 text-slate-100">
                            {renderPracticeCopy(currentPracticeCoachNote, "muted")}
                          </div>
                        </div>
                      ) : null}

                      {hasTheoryFocusRail ? (
                        <div className="bg-cyan-400/[0.04] px-5 py-5 sm:px-6">
                          <div className="lesson-section-label text-cyan-200">What to focus on</div>
                          <div className="type-body-md mt-3 text-slate-100">{renderWithNewlines(currentStepData.content)}</div>
                        </div>
                      ) : null}
                    </aside>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-4xl">
                  <div className="lesson-section-label">
                    {isProjectLesson ? "Capstone concept" : groupedTheoryContextStep?.stepKind === "context" ? "Concept" : "Worked examples"}
                  </div>
                  <h3 className="type-display-section mt-3 max-w-3xl text-white">
                    {renderWithNewlines(theoryIntroHeading)}
                  </h3>
                  {theoryIntroBody ? (
                    <div className="mt-4 max-w-3xl type-body-lg text-slate-300">
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
                        <div className="grid gap-5 xl:grid-cols-[minmax(400px,1.26fr)_minmax(320px,0.84fr)] xl:items-start xl:gap-7">
                          <div className="lesson-code-surface p-5">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                              <span className="lesson-meta-pill lesson-meta-pill--accent">{stepTitle}</span>
                              <span className="lesson-meta-pill">Example code</span>
                            </div>
                            <pre
                              className={`lesson-code-text overflow-x-auto font-mono text-emerald-300 ${getLessonCodeClassName(
                                getLessonCodeScale({ code: step?.code, density: theoryDensity, preferLarge: true })
                              )}`}
                            >
                              {step?.code}
                            </pre>
                          </div>
                          <div className="pt-1">
                            <div className="lesson-section-label text-slate-400">What this teaches</div>
                            <h4 className="mt-3 text-[1.85rem] font-semibold leading-tight tracking-[-0.04em] text-white">
                              {renderWithNewlines(step?.content)}
                            </h4>
                            {showStepExplanation ? (
                              <div className="lesson-panel-soft mt-4 max-w-xl border-white/8 bg-white/[0.02] p-4">
                                <div className="lesson-section-label text-slate-300">Why it matters</div>
                                <div className="mt-3 type-body-md text-slate-300">{renderWithNewlines(step?.explanation)}</div>
                              </div>
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
