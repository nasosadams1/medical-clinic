import type { LanguageSlug } from './siteContent';
import type {
  BenchmarkCalibrationState,
  BenchmarkPublicTestCase,
  BenchmarkQuestionAssessmentType,
  BenchmarkQuestionDifficulty,
} from './benchmarkModel';

export interface BenchmarkExecutionQuestionTemplate {
  templateId: string;
  lessonId: string;
  lessonTitle: string;
  competency: string;
  difficulty: BenchmarkQuestionDifficulty;
  kind: 'code';
  assessmentType: BenchmarkQuestionAssessmentType;
  prompt: string;
  starterCode: string;
  referenceCode: string;
  explanation: string;
  evaluationStrategy: 'execution';
  publicTestCases: BenchmarkPublicTestCase[];
  expectedDurationSeconds?: number;
  discrimination?: number;
  version?: number;
  calibrationState?: BenchmarkCalibrationState;
}

const defineExecutionQuestions = (
  language: LanguageSlug,
  lessonId: string,
  lessonTitle: string,
  competency: string,
  difficulty: BenchmarkQuestionDifficulty,
  assessmentType: BenchmarkQuestionAssessmentType,
  variants: Array<Omit<BenchmarkExecutionQuestionTemplate, 'templateId' | 'lessonId' | 'lessonTitle' | 'competency' | 'difficulty' | 'kind' | 'assessmentType'>>
): BenchmarkExecutionQuestionTemplate[] =>
  variants.map((variant, index) => ({
    templateId: `${lessonId}-${language}-${assessmentType}-${difficulty}-exec-${index + 1}`,
    lessonId,
    lessonTitle,
    competency,
    difficulty,
    kind: 'code',
    assessmentType,
    calibrationState: 'calibrating',
    version: 1,
    ...variant,
  }));

const pythonTemplates: BenchmarkExecutionQuestionTemplate[] = [
  ...defineExecutionQuestions('python', 'python-functions', 'Python Functions', 'Functions', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(name)` so it returns `"Hi " + name`. Return the string. Do not print it.',
      starterCode: 'def solution(name):\n    # Return the greeting string\n    pass\n',
      referenceCode: 'def solution(name):\n    return "Hi " + name\n',
      explanation: 'This checks whether you can implement a small, testable function with the expected return value.',
      expectedDurationSeconds: 150,
      discrimination: 0.62,
      publicTestCases: [
        { label: 'Simple string', inputPreview: '"Ada"', expectedPreview: '"Hi Ada"' },
        { label: 'Another name', inputPreview: '"Mina"', expectedPreview: '"Hi Mina"' },
      ],
    },
  ]),
  ...defineExecutionQuestions('python', 'python-lists', 'Python Lists', 'Collections', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(values)` so it returns the sum of all numbers in the list.',
      starterCode: 'def solution(values):\n    total = 0\n    # add each value into total\n    return total\n',
      referenceCode: 'def solution(values):\n    total = 0\n    for value in values:\n        total += value\n    return total\n',
      explanation: 'This checks list iteration and accumulation using real tests instead of pattern matching.',
      expectedDurationSeconds: 210,
      discrimination: 0.7,
      publicTestCases: [
        { label: 'Basic list', inputPreview: '[1, 2, 3]', expectedPreview: '6' },
        { label: 'Mixed positives', inputPreview: '[4, 1, 5]', expectedPreview: '10' },
      ],
    },
  ]),
  ...defineExecutionQuestions('python', 'python-functions', 'Python Functions', 'Problem solving', 'advanced', 'implementation', [
    {
      prompt: 'Implement `solution(words)` so it returns a new list containing only the words with length greater than 3.',
      starterCode: 'def solution(words):\n    result = []\n    # keep only words longer than 3\n    return result\n',
      referenceCode:
        'def solution(words):\n    result = []\n    for word in words:\n        if len(word) > 3:\n            result.append(word)\n    return result\n',
      explanation: 'This checks filtering logic and output structure under multiple test cases.',
      expectedDurationSeconds: 300,
      discrimination: 0.82,
      publicTestCases: [
        { label: 'Filter short words', inputPreview: '["api", "server", "db"]', expectedPreview: '["server"]' },
        { label: 'Keep multiple', inputPreview: '["react", "js", "hooks"]', expectedPreview: '["react", "hooks"]' },
      ],
    },
  ]),
  ...defineExecutionQuestions('python', 'python-functions', 'Python Functions', 'Problem solving', 'advanced', 'debugging', [
    {
      prompt: 'Fix `solution(values)` so it returns the count of even numbers in the list.',
      starterCode:
        'def solution(values):\n    count = 0\n    for value in values:\n        if value % 2 == 1:\n            count += 1\n    return count\n',
      referenceCode:
        'def solution(values):\n    count = 0\n    for value in values:\n        if value % 2 == 0:\n            count += 1\n    return count\n',
      explanation: 'This checks whether the learner can inspect and repair logic instead of writing from scratch.',
      expectedDurationSeconds: 240,
      discrimination: 0.78,
      publicTestCases: [
        { label: 'Mixed values', inputPreview: '[1, 2, 4, 7]', expectedPreview: '2' },
        { label: 'All odd', inputPreview: '[1, 3, 5]', expectedPreview: '0' },
      ],
    },
  ]),
];

const javascriptTemplates: BenchmarkExecutionQuestionTemplate[] = [
  ...defineExecutionQuestions('javascript', 'javascript-functions-1', 'JavaScript Functions', 'Functions', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(name)` so it returns `"Hi " + name`. Return the string. Do not log it.',
      starterCode: 'function solution(name) {\n  // Return the greeting string\n}\n',
      referenceCode: 'function solution(name) {\n  return "Hi " + name;\n}\n',
      explanation: 'This checks small function implementation with real test execution.',
      expectedDurationSeconds: 150,
      discrimination: 0.62,
      publicTestCases: [
        { label: 'Simple string', inputPreview: '"Ada"', expectedPreview: '"Hi Ada"' },
        { label: 'Another name', inputPreview: '"Mina"', expectedPreview: '"Hi Mina"' },
      ],
    },
  ]),
  ...defineExecutionQuestions('javascript', 'javascript-arrays-1', 'JavaScript Arrays', 'Collections', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(values)` so it returns the sum of all numbers in the array.',
      starterCode: 'function solution(values) {\n  let total = 0;\n  return total;\n}\n',
      referenceCode:
        'function solution(values) {\n  let total = 0;\n  for (const value of values) {\n    total += value;\n  }\n  return total;\n}\n',
      explanation: 'This checks iteration and accumulation under multiple test cases.',
      expectedDurationSeconds: 210,
      discrimination: 0.7,
      publicTestCases: [
        { label: 'Basic array', inputPreview: '[1, 2, 3]', expectedPreview: '6' },
        { label: 'Mixed positives', inputPreview: '[4, 1, 5]', expectedPreview: '10' },
      ],
    },
  ]),
  ...defineExecutionQuestions('javascript', 'javascript-functions-1', 'JavaScript Functions', 'Problem solving', 'advanced', 'implementation', [
    {
      prompt:
        'Implement `solution(words)` so it returns a new array containing only the strings with length greater than 3.',
      starterCode: 'function solution(words) {\n  const result = [];\n  return result;\n}\n',
      referenceCode:
        'function solution(words) {\n  const result = [];\n  for (const word of words) {\n    if (word.length > 3) {\n      result.push(word);\n    }\n  }\n  return result;\n}\n',
      explanation: 'This checks filtering logic, array handling, and result order under hidden tests.',
      expectedDurationSeconds: 300,
      discrimination: 0.82,
      publicTestCases: [
        { label: 'Filter short words', inputPreview: '["api", "server", "db"]', expectedPreview: '["server"]' },
        { label: 'Keep multiple', inputPreview: '["react", "js", "hooks"]', expectedPreview: '["react", "hooks"]' },
      ],
    },
  ]),
  ...defineExecutionQuestions('javascript', 'javascript-functions-1', 'JavaScript Functions', 'Problem solving', 'advanced', 'debugging', [
    {
      prompt: 'Fix `solution(values)` so it returns the count of even numbers in the array.',
      starterCode:
        'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value % 2 === 1) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
      referenceCode:
        'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value % 2 === 0) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
      explanation: 'This checks debugging of a realistic logic defect with public and hidden tests.',
      expectedDurationSeconds: 240,
      discrimination: 0.78,
      publicTestCases: [
        { label: 'Mixed values', inputPreview: '[1, 2, 4, 7]', expectedPreview: '2' },
        { label: 'All odd', inputPreview: '[1, 3, 5]', expectedPreview: '0' },
      ],
    },
  ]),
];

export const benchmarkExecutionBankByLanguage: Record<LanguageSlug, BenchmarkExecutionQuestionTemplate[]> = {
  python: pythonTemplates,
  javascript: javascriptTemplates,
  java: [],
  cpp: [],
  multi: [],
};
