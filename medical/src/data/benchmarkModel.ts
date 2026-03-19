export type BenchmarkQuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type BenchmarkFormat = 'quick' | 'full' | 'retake';
export type BenchmarkEvaluationStrategy = 'choice' | 'typing' | 'execution';
export type BenchmarkCalibrationState = 'draft' | 'calibrating' | 'validated';

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

export interface BenchmarkExecutionCase {
  label?: string;
  input?: unknown;
  expected?: unknown;
  expectedOutput?: string;
  validator?: string | null;
  compareMode?: string | null;
  hidden?: boolean;
  timeLimitMs?: number | null;
}

export interface BenchmarkPublicTestCase {
  label: string;
  inputPreview: string;
  expectedPreview: string;
}

export interface BenchmarkItemMetadata {
  expectedDurationSeconds: number;
  discrimination: number;
  version: number;
  calibrationState: BenchmarkCalibrationState;
}

export const benchmarkSectionLabels: Record<BenchmarkQuestionSection, string> = {
  baseline: 'Baseline',
  implementation: 'Code implementation',
  debugging: 'Debugging',
  comprehension: 'Code reading',
  theory: 'Theory',
};

export const benchmarkFormatLabels: Record<BenchmarkFormat, string> = {
  quick: 'Quick benchmark',
  full: 'Full benchmark',
  retake: 'Retake benchmark',
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
