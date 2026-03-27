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
  feedbackKind?:
    | 'passed'
    | 'empty'
    | 'starter'
    | 'wrong_output'
    | 'structure_missing'
    | 'syntax_error'
    | 'runtime_error'
    | 'timeout'
    | 'cleanup';
  scorePercent: number;
  rubricScores: CodeAssessmentRubric;
  matchedSignals: string[];
  flaggedPatterns: string[];
  evaluationSource?: 'static' | 'execution';
  runtimeMs?: number;
  stderr?: string;
  testResults?: Array<{
    label?: string;
    passed: boolean;
    reason: string;
    hidden?: boolean;
    actual?: string;
    stderr?: string;
  }>;
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
const cppMultiCharTokens = [
  '::',
  '->',
  '<<=',
  '>>=',
  '<=',
  '>=',
  '==',
  '!=',
  '++',
  '--',
  '&&',
  '||',
  '<<',
  '>>',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '->*',
  '.*',
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundPercent = (value: number) => Math.round(clamp(value, 0, 1) * 100);

const tokenizeCppForMatching = (value: string) => {
  const source = String(value || '');
  const tokens: string[] = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1] || '';

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (current === '/' && next === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }

    if (current === '"' || current === "'") {
      const quote = current;
      let token = current;
      index += 1;
      while (index < source.length) {
        const ch = source[index];
        token += ch;
        if (ch === '\\' && index + 1 < source.length) {
          token += source[index + 1];
          index += 2;
          continue;
        }
        index += 1;
        if (ch === quote) break;
      }
      tokens.push(token);
      continue;
    }

    if (/[A-Za-z_]/.test(current)) {
      let token = current;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        token += source[index];
        index += 1;
      }
      tokens.push(token);
      continue;
    }

    if (/\d/.test(current)) {
      let token = current;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_.]/.test(source[index])) {
        token += source[index];
        index += 1;
      }
      tokens.push(token);
      continue;
    }

    const threeChar = source.slice(index, index + 3);
    const twoChar = source.slice(index, index + 2);
    const multiChar = cppMultiCharTokens.find((token) => token === threeChar || token === twoChar);
    if (multiChar) {
      tokens.push(multiChar);
      index += multiChar.length;
      continue;
    }

    if (/[{}()[\];,<>#=*+\-/%&|^!~?:.]/.test(current)) {
      tokens.push(current);
    }
    index += 1;
  }

  return tokens;
};

const includesTokenSequence = (tokens: string[], patternTokens: string[]) => {
  if (patternTokens.length === 0) return false;
  if (patternTokens.length > tokens.length) return false;

  for (let start = 0; start <= tokens.length - patternTokens.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < patternTokens.length; offset += 1) {
      if (tokens[start + offset] !== patternTokens[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
};

const buildSnippetMatcher = (language: LanguageSlug, submission: string) => {
  if (language !== 'cpp') {
    const collapsedSubmission = toCollapsedCode(submission);
    return {
      includesSnippet: (snippet: string) => collapsedSubmission.includes(toCollapsedCode(snippet)),
    };
  }

  const submissionTokens = tokenizeCppForMatching(submission);
  return {
    includesSnippet: (snippet: string) =>
      includesTokenSequence(submissionTokens, tokenizeCppForMatching(String(snippet || ''))),
  };
};

const getSignalMatchRatio = (matcher: { includesSnippet: (snippet: string) => boolean }, signals: string[]) => {
  if (signals.length === 0) {
    return {
      matched: [] as string[],
      ratio: 1,
    };
  }
  const matched = signals.filter((signal) => matcher.includesSnippet(signal));
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
      feedbackKind: 'empty',
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
      feedbackKind: 'starter',
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
  const snippetMatcher = buildSnippetMatcher(definition.language, normalizedSubmission);
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
      feedbackKind: passed ? 'passed' : 'wrong_output',
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
  const missingSnippets = requiredSnippets.filter((snippet) => !snippetMatcher.includesSnippet(snippet));
  const correctnessRatio =
    requiredSnippets.length > 0
      ? (requiredSnippets.length - missingSnippets.length) / requiredSnippets.length
      : normalizedReference
      ? Number(collapsedSubmission === toCollapsedCode(normalizedReference))
      : 1;
  const edgeCaseMatch = getSignalMatchRatio(snippetMatcher, edgeCaseSnippets);
  const qualityMatch = getSignalMatchRatio(snippetMatcher, qualitySignals);
  const efficiencyMatch = getSignalMatchRatio(snippetMatcher, efficiencySignals);
  const flaggedPatterns = forbiddenPatterns.filter((pattern) => snippetMatcher.includesSnippet(pattern));

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
    feedbackKind: passed ? 'passed' : missingSnippets.length > 0 ? 'structure_missing' : 'cleanup',
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
