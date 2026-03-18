import type { LanguageSlug } from '../data/siteContent';

export type CodeAssessmentValidationMode = 'exact' | 'includes_all';

export interface CodeAssessmentDefinition {
  language: LanguageSlug;
  starterCode: string;
  referenceCode: string;
  validationMode: CodeAssessmentValidationMode;
  requiredSnippets?: string[];
}

export interface CodeAssessmentResult {
  passed: boolean;
  message: string;
  missingSnippets: string[];
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
    };
  }

  if (definition.validationMode === 'exact') {
    const passed = toCollapsedCode(normalizedSubmission) === toCollapsedCode(normalizedReference);
    return {
      passed,
      message: passed
        ? 'Code matches the lesson target.'
        : 'This checkpoint expects the lesson example or benchmark reference to be typed correctly.',
      missingSnippets: [],
    };
  }

  const requiredSnippets = definition.requiredSnippets ?? [];
  const collapsedSubmission = toCollapsedCode(normalizedSubmission);
  const missingSnippets = requiredSnippets.filter(
    (snippet) => !collapsedSubmission.includes(toCollapsedCode(snippet))
  );

  return {
    passed: missingSnippets.length === 0,
    message:
      missingSnippets.length === 0
        ? 'Code includes the required logic.'
        : `Your answer is missing part of the required logic: ${missingSnippets.join(', ')}.`,
    missingSnippets,
  };
};
