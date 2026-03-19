export type BenchmarkQuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type BenchmarkQuestionSection =
  | 'baseline'
  | 'implementation'
  | 'debugging'
  | 'comprehension'
  | 'theory';

export type BenchmarkQuestionAssessmentType =
  | 'theory'
  | 'implementation'
  | 'debugging'
  | 'comprehension';

export type BenchmarkDimensionKey =
  | 'language_fluency'
  | 'code_writing'
  | 'code_reading'
  | 'debugging'
  | 'problem_solving'
  | 'code_quality'
  | 'efficiency'
  | 'consistency';

export interface BenchmarkCodeRubric {
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

export const benchmarkSectionLabels: Record<BenchmarkQuestionSection, string> = {
  baseline: 'Baseline',
  implementation: 'Code implementation',
  debugging: 'Debugging',
  comprehension: 'Code reading',
  theory: 'Theory',
};

export const benchmarkDimensionLabels: Record<BenchmarkDimensionKey, string> = {
  language_fluency: 'Language fluency',
  code_writing: 'Code writing',
  code_reading: 'Code reading',
  debugging: 'Debugging',
  problem_solving: 'Problem solving',
  code_quality: 'Code quality',
  efficiency: 'Efficiency',
  consistency: 'Consistency',
};
