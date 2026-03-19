import type { LanguageSlug } from '../data/siteContent';

export type CodeAssessmentValidationMode = 'exact' | 'includes_all';

export interface CodeAssessmentRubric {
  correctness: number;
  edgeCaseHandling: number;
  codeQuality: number;
  efficiency: number;
}

export interface CodeAssessmentDefinition {
  language: LanguageSlug;
  starterCode: string;
  referenceCode: string;
  validationMode: CodeAssessmentValidationMode;
  requiredSnippets?: string[];
  edgeCaseSnippets?: string[];
  qualitySignals?: string[];
  efficiencySignals?: string[];
  forbiddenPatterns?: string[];
  weights?: {
    correctness?: number;
    edgeCaseHandling?: number;
    codeQuality?: number;
    efficiency?: number;
  };
}

export interface CodeAssessmentResult {
  passed: boolean;
  message: string;
  missingSnippets: string[];
  scorePercent: number;
  rubricScores: CodeAssessmentRubric;
  matchedSignals: string[];
  flaggedPatterns: string[];
}

const normalizeLineEndings = (value: string) => value.replace(/\r\n?/g, '\n');

const trimTrailingWhitespace = (value: string) =>
  normalizeLineEndings(value)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

export const normalizeCodeForComparison = (value: string) =>
  trimTrailingWhitespace(value).replace(/\n{3,}/g, '\n\n');

const toCollapsedCode = (value: string) => normalizeCodeForComparison(value).replace(/\s+/g, '');

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundPercent = (value: number) => Math.round(clamp(value, 0, 1) * 100);

const getSignalMatchRatio = (submission: string, signals: string[]) => {
  if (signals.length === 0) return 1;
  const matched = signals.filter((signal) => submission.includes(toCollapsedCode(signal)));
  return {
    matched,
    ratio: matched.length / signals.length,
  };
};

export const validateCodeAssessment = (
  submittedCode: string,
  definition: CodeAssessmentDefinition
): CodeAssessmentResult => {
  const normalizedSubmission = normalizeCodeForComparison(submittedCode);
  const normalizedStarter = normalizeCodeForComparison(definition.starterCode || '');
  const normalizedReference = normalizeCodeForComparison(definition.referenceCode);
  if (!normalizedSubmission) {
    return {
      passed: false,
      message: 'Write code before checking your answer.',
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
    };
  }

  if (
    normalizedStarter &&
    normalizedReference &&
    toCollapsedCode(normalizedSubmission) === toCollapsedCode(normalizedStarter) &&
    toCollapsedCode(normalizedStarter) !== toCollapsedCode(normalizedReference)
  ) {
    return {
      passed: false,
      message: 'The starter scaffold is still unchanged. Finish the task before checking your answer.',
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
    };
  }

  const collapsedSubmission = toCollapsedCode(normalizedSubmission);
  const edgeCaseSnippets = definition.edgeCaseSnippets ?? [];
  const qualitySignals = definition.qualitySignals ?? [];
  const efficiencySignals = definition.efficiencySignals ?? [];
  const forbiddenPatterns = definition.forbiddenPatterns ?? [];
  const weights = {
    correctness: definition.weights?.correctness ?? 0.55,
    edgeCaseHandling: definition.weights?.edgeCaseHandling ?? 0.15,
    codeQuality: definition.weights?.codeQuality ?? 0.15,
    efficiency: definition.weights?.efficiency ?? 0.15,
  };

  if (definition.validationMode === 'exact') {
    const passed = toCollapsedCode(normalizedSubmission) === toCollapsedCode(normalizedReference);
    const totalScore = passed ? 1 : 0;
    return {
      passed,
      message: passed
        ? 'Code matches the lesson target.'
        : 'This checkpoint expects the lesson example or benchmark reference to be typed correctly.',
      missingSnippets: [],
      scorePercent: roundPercent(totalScore),
      rubricScores: {
        correctness: roundPercent(totalScore),
        edgeCaseHandling: roundPercent(totalScore),
        codeQuality: roundPercent(totalScore),
        efficiency: roundPercent(totalScore),
      },
      matchedSignals: [],
      flaggedPatterns: [],
    };
  }

  const requiredSnippets = definition.requiredSnippets ?? [];
  const missingSnippets = requiredSnippets.filter(
    (snippet) => !collapsedSubmission.includes(toCollapsedCode(snippet))
  );
  const correctnessRatio =
    requiredSnippets.length > 0
      ? (requiredSnippets.length - missingSnippets.length) / requiredSnippets.length
      : normalizedReference
      ? Number(collapsedSubmission === toCollapsedCode(normalizedReference))
      : 1;
  const edgeCaseMatch = getSignalMatchRatio(collapsedSubmission, edgeCaseSnippets);
  const qualityMatch = getSignalMatchRatio(collapsedSubmission, qualitySignals);
  const efficiencyMatch = getSignalMatchRatio(collapsedSubmission, efficiencySignals);
  const flaggedPatterns = forbiddenPatterns.filter((pattern) =>
    collapsedSubmission.includes(toCollapsedCode(pattern))
  );

  const edgeCaseRatio =
    edgeCaseSnippets.length > 0 ? edgeCaseMatch.ratio : correctnessRatio >= 1 ? 1 : correctnessRatio * 0.7;
  const codeQualityRatio = clamp(
    (qualitySignals.length > 0 ? qualityMatch.ratio : correctnessRatio >= 1 ? 0.85 : correctnessRatio * 0.65) -
      flaggedPatterns.length * 0.18,
    0,
    1
  );
  const efficiencyRatio = clamp(
    (efficiencySignals.length > 0 ? efficiencyMatch.ratio : correctnessRatio >= 1 ? 0.8 : correctnessRatio * 0.6) -
      flaggedPatterns.length * 0.12,
    0,
    1
  );
  const totalScore =
    correctnessRatio * weights.correctness +
    edgeCaseRatio * weights.edgeCaseHandling +
    codeQualityRatio * weights.codeQuality +
    efficiencyRatio * weights.efficiency;
  const passed = missingSnippets.length === 0 && totalScore >= 0.62;

  const notes: string[] = [];
  if (missingSnippets.length > 0) {
    notes.push(`Missing required logic: ${missingSnippets.join(', ')}`);
  }
  if (missingSnippets.length === 0 && edgeCaseSnippets.length > 0 && edgeCaseMatch.ratio < 1) {
    notes.push('Edge-case handling is still incomplete.');
  }
  if (missingSnippets.length === 0 && codeQualityRatio < 0.65) {
    notes.push('The answer works partway, but the structure still needs cleanup.');
  }
  if (missingSnippets.length === 0 && efficiencyRatio < 0.65) {
    notes.push('The solution can be tightened before it is benchmark-ready.');
  }

  return {
    passed,
    message:
      notes.length === 0
        ? 'Code covers the required logic with a benchmark-ready structure.'
        : notes.join(' '),
    missingSnippets,
    scorePercent: roundPercent(totalScore),
    rubricScores: {
      correctness: roundPercent(correctnessRatio),
      edgeCaseHandling: roundPercent(edgeCaseRatio),
      codeQuality: roundPercent(codeQualityRatio),
      efficiency: roundPercent(efficiencyRatio),
    },
    matchedSignals: [...edgeCaseMatch.matched, ...qualityMatch.matched, ...efficiencyMatch.matched],
    flaggedPatterns,
  };
};
