import { benchmarkExpandedSeedTemplatesByLanguage } from './benchmarkExpandedSeedBank.js';
import {
  benchmarkFormatLabels,
  benchmarkDimensionLabels,
  benchmarkSectionLabels,
  type BenchmarkCalibrationState,
  type BenchmarkCodeRubric,
  type BenchmarkEvaluationStrategy,
  type BenchmarkExecutionCase,
  type BenchmarkFormat,
  type BenchmarkItemMetadata,
  type BenchmarkPublicTestCase,
  type BenchmarkQuestionAssessmentType,
  type BenchmarkQuestionDifficulty,
  type BenchmarkQuestionSection,
  type BenchmarkDimensionKey,
} from './benchmarkModel';
import { LESSON_CATALOG } from './lessonCatalog';
import { interviewTracks, type LanguageSlug } from './siteContent';
import { duelProblemCatalog } from '../../data/duel-problem-catalog.js';

export type BenchmarkGoal = 'interview_prep' | 'class_improvement' | 'skill_growth';
export type BenchmarkRoleLevel = 'beginner' | 'intern' | 'junior' | 'general_practice';
export type { BenchmarkFormat } from './benchmarkModel';

export type BenchmarkSkillBucket =
  | 'syntax_fluency'
  | 'control_flow'
  | 'functions_methods'
  | 'data_structures_basics'
  | 'debugging'
  | 'code_reading'
  | 'problem_solving'
  | 'speed_under_pressure';

export type BenchmarkQuestionType =
  | 'code_tracing'
  | 'debugging'
  | 'code_completion'
  | 'choose_the_best_fix'
  | 'short_function_writing'
  | 'output_prediction'
  | 'code_reading_comprehension'
  | 'applied_mini_problem';

export type BenchmarkPackId =
  | 'python-beginner-fundamentals'
  | 'python-junior-interview-prep'
  | 'javascript-beginner-fundamentals'
  | 'javascript-junior-interview-prep'
  | 'java-beginner-oop-foundations'
  | 'java-junior-class-ds-prep'
  | 'cpp-beginner-structured-logic'
  | 'cpp-junior-problem-solving';

export interface BenchmarkSetup {
  goal: BenchmarkGoal;
  language: LanguageSlug;
  roleLevel: BenchmarkRoleLevel;
}

export interface BenchmarkBlueprintSlot {
  slotId: string;
  questionType: BenchmarkQuestionType;
  skillBucket: BenchmarkSkillBucket;
  difficulty: BenchmarkQuestionDifficulty;
  preferredKind?: 'multiple_choice' | 'code';
  assessmentType: BenchmarkQuestionAssessmentType;
  section: BenchmarkQuestionSection;
  weight: number;
  expectedDurationSeconds: number;
  promptLabel: string;
}

export interface BenchmarkRemediationMapping {
  lessonIds?: string[];
  lessonTitles?: string[];
  lessonSearchKeywords: string[];
  shortPracticeSet: string;
  optionalProjectKeywords?: string[];
  optionalProjectCheckpointId?: string | null;
  optionalProjectTitle?: string | null;
}

export interface BenchmarkUnlockRules {
  duelReadyScore: number;
  strongerBenchmarkAt: number;
  readinessBadgeLabel: string;
}

export interface BenchmarkPackDefinition {
  id: BenchmarkPackId;
  title: string;
  language: LanguageSlug;
  roleLevel: 'beginner' | 'junior';
  goal: 'skill_growth' | 'interview_prep';
  description: string;
  simulatorPromise: string;
  scoreMeaning: string;
  questionCount: Record<BenchmarkFormat, number>;
  durationMinutes: Record<BenchmarkFormat, number>;
  topicWeights: Record<BenchmarkSkillBucket, number>;
  difficultyWeights: Record<BenchmarkQuestionDifficulty, number>;
  questionBlueprint: Record<'quick' | 'full', BenchmarkBlueprintSlot[]>;
  retakeBlueprintBuckets: BenchmarkSkillBucket[];
  scoringRules: {
    accuracyWeight: 70;
    difficultyWeight: 20;
    speedWeight: 10;
  };
  remediationMapping: Partial<Record<BenchmarkSkillBucket, BenchmarkRemediationMapping>>;
  unlockRules: BenchmarkUnlockRules;
}

export interface BenchmarkSeedQuestionTemplate {
  templateId: string;
  language: LanguageSlug;
  packIds?: BenchmarkPackId[];
  sourceType?: 'curated' | 'seeded' | 'generated' | 'legacy';
  lessonId: string;
  lessonTitle: string;
  competency: string;
  questionType: BenchmarkQuestionType;
  skillBucket: BenchmarkSkillBucket;
  difficulty: BenchmarkQuestionDifficulty;
  kind: 'multiple_choice' | 'code';
  assessmentType: BenchmarkQuestionAssessmentType;
  prompt: string;
  options?: string[];
  correctAnswer?: number;
  starterCode?: string;
  referenceCode?: string;
  validationMode?: 'exact' | 'includes_all';
  requiredSnippets?: string[];
  edgeCaseSnippets?: string[];
  qualitySignals?: string[];
  efficiencySignals?: string[];
  forbiddenPatterns?: string[];
  weights?: BenchmarkCodeRubric['weights'];
  explanation: string;
  evaluationStrategy?: BenchmarkEvaluationStrategy;
  executionCases?: BenchmarkExecutionCase[];
  publicTestCases?: BenchmarkPublicTestCase[];
  expectedDurationSeconds?: BenchmarkItemMetadata['expectedDurationSeconds'];
  discrimination?: BenchmarkItemMetadata['discrimination'];
  version?: BenchmarkItemMetadata['version'];
  calibrationState?: BenchmarkCalibrationState;
  remediationLessonIds?: string[];
  remediationPracticeLabel?: string;
  remediationProjectCheckpointId?: string | null;
}

export interface BenchmarkQuestion {
  id: string;
  templateId: string;
  slotId: string;
  packId: BenchmarkPackId;
  packTitle: string;
  language: LanguageSlug;
  section: BenchmarkQuestionSection;
  sectionLabel: string;
  assessmentType: BenchmarkQuestionAssessmentType;
  dimensions: BenchmarkDimensionKey[];
  anchor: boolean;
  lessonId: string;
  lessonTitle: string;
  kind: 'multiple_choice' | 'code';
  prompt: string;
  options?: string[];
  correctAnswer?: number;
  starterCode?: string;
  referenceCode?: string;
  validationMode?: 'exact' | 'includes_all';
  requiredSnippets?: string[];
  edgeCaseSnippets?: string[];
  qualitySignals?: string[];
  efficiencySignals?: string[];
  forbiddenPatterns?: string[];
  weights?: BenchmarkCodeRubric['weights'];
  explanation: string;
  competency: string;
  skillBucket: BenchmarkSkillBucket;
  skillBucketLabel: string;
  questionType: BenchmarkQuestionType;
  difficulty: BenchmarkQuestionDifficulty;
  weight: number;
  evaluationStrategy: BenchmarkEvaluationStrategy;
  executionCases?: BenchmarkExecutionCase[];
  publicTestCases?: BenchmarkPublicTestCase[];
  expectedDurationSeconds: BenchmarkItemMetadata['expectedDurationSeconds'];
  discrimination: BenchmarkItemMetadata['discrimination'];
  version: BenchmarkItemMetadata['version'];
  calibrationState: BenchmarkCalibrationState;
  blueprintLabel: string;
  remediationLessonIds: string[];
  remediationPracticeLabel: string;
  remediationProjectCheckpointId?: string | null;
}

export interface BenchmarkAnswerRecord {
  questionId: string;
  selectedAnswer?: number;
  submittedCode?: string;
  evaluationMessage?: string;
  scorePercent?: number;
  evaluationStrategy?: BenchmarkEvaluationStrategy;
  blocked?: boolean;
  requiresExecution?: boolean;
  rubricBreakdown?: {
    correctness: number;
    edgeCaseHandling: number;
    codeQuality: number;
    efficiency: number;
  };
  testResults?: Array<{
    label?: string;
    passed: boolean;
    reason: string;
    hidden?: boolean;
    actual?: string;
    stderr?: string;
  }>;
  latencyMs?: number;
  runCount?: number;
  isCorrect: boolean;
}

export interface BenchmarkTelemetrySummary {
  blurCount: number;
  copyPasteCount: number;
  codeRunCount: number;
  activeTypingSeconds: number;
  suspiciousFlags: string[];
}

export interface BenchmarkReportDimensionScore {
  key: BenchmarkDimensionKey;
  label: string;
  score: number;
  description: string;
}

export interface BenchmarkReportSectionScore {
  section: BenchmarkQuestionSection;
  label: string;
  score: number;
  questionCount: number;
}

export interface BenchmarkTopicBreakdown {
  bucket: BenchmarkSkillBucket;
  label: string;
  score: number;
  questionCount: number;
}

export interface BenchmarkConfidenceBand {
  tier: 'provisional' | 'usable' | 'strong';
  label: string;
  percent: number;
  description: string;
}

export interface BenchmarkConfidenceInterval {
  low: number;
  high: number;
  standardError: number;
}

export interface BenchmarkTrustSignal {
  score: number;
  label: string;
  description: string;
  suspiciousFlags: string[];
}

export interface BenchmarkEstimation {
  label: string;
  description: string;
  targetRoleLabel: string;
  baselineScore: number;
  competencyCoveragePercent: number;
}

export interface BenchmarkReadinessVerdict {
  label: string;
  description: string;
  tier: 'not_ready' | 'developing' | 'provisional' | 'ready' | 'strong_ready';
}

export interface BenchmarkEvidenceProfile {
  percent: number;
  completionRatio: number;
  bucketCoverageRatio: number;
  anchorCoverageRatio: number;
  validatedRatio: number;
  executionCoverageRatio: number;
  averageDiscrimination: number;
}

export interface BenchmarkComparisonSignal {
  percent: number;
  label: string;
  description: string;
  deltaEligible: boolean;
}

export interface BenchmarkNextStepPlan {
  recommendedLessonIds: string[];
  shortPracticeSet: string[];
  optionalProjectCheckpoint?: string | null;
  retryWeakAreasLabel: string;
  fullRetakeLabel: string;
  duelReadinessLabel?: string | null;
}

export interface BenchmarkCalibrationSignal {
  templateId: string;
  exposureCount: number;
  passRate: number;
  discrimination: number;
  calibrationState: BenchmarkCalibrationState;
  abilityGap?: number;
  executionCoverageRatio?: number;
  latencySampleCount?: number;
  medianLatencySeconds?: number;
  latencyP75Seconds?: number;
  expectedDurationSeconds?: number;
}

export interface BenchmarkBlueprintSummary {
  packId: BenchmarkPackId;
  title: string;
  questionCount: number;
  durationMinutes: number;
  topics: string[];
  difficultyMix: Record<BenchmarkQuestionDifficulty, number>;
  questionMix: BenchmarkQuestionType[];
  questionMixLabels: string[];
  scoreMeaning: string;
  simulatorPromise: string;
  unlockLabel: string;
}

export interface BenchmarkReport {
  id: string;
  benchmarkVersion: string;
  attemptIndex: number;
  format: BenchmarkFormat;
  setup: BenchmarkSetup;
  packId: BenchmarkPackId;
  packTitle: string;
  isSample?: boolean;
  isPublic?: boolean;
  shareToken?: string | null;
  publicSharedAt?: string | null;
  overallScore: number;
  correctAnswers: number;
  totalQuestions: number;
  strengths: string[];
  weaknesses: string[];
  dimensionScores: BenchmarkReportDimensionScore[];
  sectionScores: BenchmarkReportSectionScore[];
  topicBreakdown: BenchmarkTopicBreakdown[];
  confidenceBand: BenchmarkConfidenceBand;
  confidenceInterval: BenchmarkConfidenceInterval;
  trustSignal: BenchmarkTrustSignal;
  evidenceProfile: BenchmarkEvidenceProfile;
  comparisonSignal: BenchmarkComparisonSignal;
  telemetrySummary: BenchmarkTelemetrySummary;
  recommendedTrackIds: string[];
  suggestedLessonIds: string[];
  suggestedDuelProblemTitles: string[];
  duelReadiness: {
    eligible: boolean;
    label: string;
    description: string;
    confidencePercent: number;
  };
  estimation: BenchmarkEstimation;
  summary: string;
  readinessVerdict: BenchmarkReadinessVerdict;
  deltaFromLastAttempt: number | null;
  scoreComponents: {
    accuracy: number;
    difficultyWeighted: number;
    speedUnderPressure: number;
  };
  nextStepPlan: BenchmarkNextStepPlan;
  createdAt: string;
  questions: BenchmarkQuestion[];
  answerRecords: BenchmarkAnswerRecord[];
}

const BENCHMARK_SETUP_PRESET_STORAGE_KEY = 'codhak-benchmark-setup-preset';
const BENCHMARK_HISTORY_STORAGE_KEY = 'codhak-benchmark-history-v4';
const LEGACY_BENCHMARK_HISTORY_STORAGE_KEY = 'codhak-benchmark-history';
const BENCHMARK_VERSION = 'v4-diagnostic-packs';

const skillBucketLabels: Record<BenchmarkSkillBucket, string> = {
  syntax_fluency: 'Syntax fluency',
  control_flow: 'Control flow',
  functions_methods: 'Functions / methods',
  data_structures_basics: 'Data structures basics',
  debugging: 'Debugging',
  code_reading: 'Code reading',
  problem_solving: 'Problem solving',
  speed_under_pressure: 'Speed under pressure',
};

const questionTypeLabels: Record<BenchmarkQuestionType, string> = {
  code_tracing: 'Code tracing',
  debugging: 'Debugging',
  code_completion: 'Code completion',
  choose_the_best_fix: 'Choose the best fix',
  short_function_writing: 'Short function writing',
  output_prediction: 'Output prediction',
  code_reading_comprehension: 'Code reading comprehension',
  applied_mini_problem: 'Applied mini-problem',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (value: string) =>
  Array.from(value).reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);

const difficultyWeightsBase: Record<BenchmarkQuestionDifficulty, number> = {
  beginner: 1,
  intermediate: 1.25,
  advanced: 1.55,
};

const buildSlot = (
  slotId: string,
  questionType: BenchmarkQuestionType,
  skillBucket: BenchmarkSkillBucket,
  difficulty: BenchmarkQuestionDifficulty,
  config: {
    preferredKind?: 'multiple_choice' | 'code';
    assessmentType: BenchmarkQuestionAssessmentType;
    section: BenchmarkQuestionSection;
    weight: number;
    expectedDurationSeconds: number;
    promptLabel: string;
  }
): BenchmarkBlueprintSlot => ({
  slotId,
  questionType,
  skillBucket,
  difficulty,
  preferredKind: config.preferredKind,
  assessmentType: config.assessmentType,
  section: config.section,
  weight: config.weight,
  expectedDurationSeconds: config.expectedDurationSeconds,
  promptLabel: config.promptLabel,
});

const createBucketWeights = (
  weights: Partial<Record<BenchmarkSkillBucket, number>>
): Record<BenchmarkSkillBucket, number> => ({
  syntax_fluency: weights.syntax_fluency ?? 0,
  control_flow: weights.control_flow ?? 0,
  functions_methods: weights.functions_methods ?? 0,
  data_structures_basics: weights.data_structures_basics ?? 0,
  debugging: weights.debugging ?? 0,
  code_reading: weights.code_reading ?? 0,
  problem_solving: weights.problem_solving ?? 0,
  speed_under_pressure: weights.speed_under_pressure ?? 0,
});

const defineSeedQuestion = (template: BenchmarkSeedQuestionTemplate): BenchmarkSeedQuestionTemplate => ({
  ...template,
  sourceType: template.sourceType ?? 'seeded',
  calibrationState: template.calibrationState ?? 'calibrating',
  version: Math.max(3, template.version ?? 3),
  expectedDurationSeconds: template.expectedDurationSeconds ?? 120,
  discrimination: template.discrimination ?? 0.68,
  remediationLessonIds:
    template.remediationLessonIds && template.remediationLessonIds.length > 0
      ? template.remediationLessonIds
      : [template.lessonId],
  remediationPracticeLabel:
    template.remediationPracticeLabel || `Rework ${template.lessonTitle} before the retake.`,
  remediationProjectCheckpointId:
    template.remediationProjectCheckpointId ??
    (template.lessonTitle.toLowerCase().includes('project') ? template.lessonId : null),
  evaluationStrategy:
    template.kind === 'multiple_choice'
      ? 'choice'
      : template.evaluationStrategy ?? (template.executionCases?.length ? 'execution' : 'typing'),
});

const defineChoiceSeedQuestion = (
  template: Omit<BenchmarkSeedQuestionTemplate, 'kind' | 'options' | 'correctAnswer'> & {
    options: string[];
    correctAnswer: number;
  }
) =>
  defineSeedQuestion({
    ...template,
    kind: 'multiple_choice',
  });

const defineCodeSeedQuestion = (
  template: Omit<BenchmarkSeedQuestionTemplate, 'kind' | 'starterCode' | 'referenceCode'> & {
    starterCode: string;
    referenceCode: string;
  }
) =>
  defineSeedQuestion({
    ...template,
    kind: 'code',
  });

type PackMeta = Pick<
  BenchmarkPackDefinition,
  'id' | 'title' | 'language' | 'roleLevel' | 'goal' | 'description' | 'simulatorPromise' | 'scoreMeaning'
>;

const beginnerQuickBlueprint = (): BenchmarkBlueprintSlot[] => [
  buildSlot('syntax-output', 'output_prediction', 'syntax_fluency', 'beginner', {
    preferredKind: 'multiple_choice',
    assessmentType: 'theory',
    section: 'baseline',
    weight: 1,
    expectedDurationSeconds: 70,
    promptLabel: 'Syntax warm-up',
  }),
  buildSlot('flow-trace', 'code_tracing', 'control_flow', 'beginner', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'baseline',
    weight: 1.05,
    expectedDurationSeconds: 80,
    promptLabel: 'Trace the branch',
  }),
  buildSlot('function-completion', 'code_completion', 'functions_methods', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.12,
    expectedDurationSeconds: 170,
    promptLabel: 'Complete the helper',
  }),
  buildSlot('debug-fix', 'choose_the_best_fix', 'debugging', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.1,
    expectedDurationSeconds: 90,
    promptLabel: 'Catch the bug',
  }),
  buildSlot('mini-problem', 'applied_mini_problem', 'problem_solving', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.24,
    expectedDurationSeconds: 220,
    promptLabel: 'Applied mini-problem',
  }),
];

const beginnerFullBlueprint = (): BenchmarkBlueprintSlot[] => [
  buildSlot('syntax-output', 'output_prediction', 'syntax_fluency', 'beginner', {
    preferredKind: 'multiple_choice',
    assessmentType: 'theory',
    section: 'baseline',
    weight: 1,
    expectedDurationSeconds: 70,
    promptLabel: 'Syntax warm-up',
  }),
  buildSlot('types-read', 'code_reading_comprehension', 'syntax_fluency', 'beginner', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'baseline',
    weight: 1,
    expectedDurationSeconds: 70,
    promptLabel: 'Read the values',
  }),
  buildSlot('flow-trace', 'code_tracing', 'control_flow', 'beginner', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'baseline',
    weight: 1.05,
    expectedDurationSeconds: 80,
    promptLabel: 'Trace the branch',
  }),
  buildSlot('ds-reading', 'code_reading_comprehension', 'data_structures_basics', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.08,
    expectedDurationSeconds: 80,
    promptLabel: 'Read the data structure',
  }),
  buildSlot('function-completion', 'code_completion', 'functions_methods', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.12,
    expectedDurationSeconds: 170,
    promptLabel: 'Complete the helper',
  }),
  buildSlot('function-write', 'short_function_writing', 'functions_methods', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.16,
    expectedDurationSeconds: 200,
    promptLabel: 'Write the helper',
  }),
  buildSlot('debug-fix', 'choose_the_best_fix', 'debugging', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.1,
    expectedDurationSeconds: 90,
    promptLabel: 'Catch the bug',
  }),
  buildSlot('debug-code', 'debugging', 'debugging', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.18,
    expectedDurationSeconds: 190,
    promptLabel: 'Repair the logic',
  }),
  buildSlot('mini-problem', 'applied_mini_problem', 'problem_solving', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.24,
    expectedDurationSeconds: 220,
    promptLabel: 'Applied mini-problem',
  }),
  buildSlot('pressure-read', 'output_prediction', 'speed_under_pressure', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.08,
    expectedDurationSeconds: 60,
    promptLabel: 'Pressure read',
  }),
];

const juniorQuickBlueprint = (): BenchmarkBlueprintSlot[] => [
  buildSlot('read-fast', 'code_reading_comprehension', 'code_reading', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.05,
    expectedDurationSeconds: 70,
    promptLabel: 'Read the code fast',
  }),
  buildSlot('best-fix', 'choose_the_best_fix', 'debugging', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.1,
    expectedDurationSeconds: 85,
    promptLabel: 'Pick the fix',
  }),
  buildSlot('write-helper', 'short_function_writing', 'functions_methods', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.2,
    expectedDurationSeconds: 190,
    promptLabel: 'Write the helper',
  }),
  buildSlot('mini-problem', 'applied_mini_problem', 'problem_solving', 'advanced', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.28,
    expectedDurationSeconds: 235,
    promptLabel: 'Applied mini-problem',
  }),
  buildSlot('pressure-read', 'output_prediction', 'speed_under_pressure', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.05,
    expectedDurationSeconds: 60,
    promptLabel: 'Pressure read',
  }),
];

const juniorFullBlueprint = (): BenchmarkBlueprintSlot[] => [
  buildSlot('read-fast', 'code_reading_comprehension', 'code_reading', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.05,
    expectedDurationSeconds: 70,
    promptLabel: 'Read the code fast',
  }),
  buildSlot('predict-output', 'output_prediction', 'code_reading', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.05,
    expectedDurationSeconds: 65,
    promptLabel: 'Predict output',
  }),
  buildSlot('best-fix', 'choose_the_best_fix', 'debugging', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.1,
    expectedDurationSeconds: 85,
    promptLabel: 'Pick the fix',
  }),
  buildSlot('debug-code', 'debugging', 'debugging', 'advanced', {
    preferredKind: 'code',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.18,
    expectedDurationSeconds: 200,
    promptLabel: 'Repair the logic',
  }),
  buildSlot('write-helper', 'short_function_writing', 'functions_methods', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.18,
    expectedDurationSeconds: 190,
    promptLabel: 'Write the helper',
  }),
  buildSlot('complete-data', 'code_completion', 'data_structures_basics', 'intermediate', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.18,
    expectedDurationSeconds: 180,
    promptLabel: 'Complete the data pass',
  }),
  buildSlot('ds-read', 'code_tracing', 'data_structures_basics', 'advanced', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.12,
    expectedDurationSeconds: 80,
    promptLabel: 'Trace the data structure',
  }),
  buildSlot('flow-read', 'code_tracing', 'control_flow', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'baseline',
    weight: 1.04,
    expectedDurationSeconds: 70,
    promptLabel: 'Trace the branch path',
  }),
  buildSlot('mini-problem', 'applied_mini_problem', 'problem_solving', 'advanced', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.28,
    expectedDurationSeconds: 235,
    promptLabel: 'Applied mini-problem',
  }),
  buildSlot('mini-problem-2', 'applied_mini_problem', 'problem_solving', 'advanced', {
    preferredKind: 'code',
    assessmentType: 'implementation',
    section: 'implementation',
    weight: 1.3,
    expectedDurationSeconds: 250,
    promptLabel: 'Second applied problem',
  }),
  buildSlot('pressure-read', 'output_prediction', 'speed_under_pressure', 'intermediate', {
    preferredKind: 'multiple_choice',
    assessmentType: 'comprehension',
    section: 'comprehension',
    weight: 1.05,
    expectedDurationSeconds: 60,
    promptLabel: 'Pressure read',
  }),
  buildSlot('pressure-fix', 'choose_the_best_fix', 'speed_under_pressure', 'advanced', {
    preferredKind: 'multiple_choice',
    assessmentType: 'debugging',
    section: 'debugging',
    weight: 1.1,
    expectedDurationSeconds: 55,
    promptLabel: 'Fast fix',
  }),
];

const beginnerTopicWeights = createBucketWeights({
  syntax_fluency: 20,
  control_flow: 16,
  functions_methods: 16,
  data_structures_basics: 15,
  debugging: 12,
  code_reading: 10,
  problem_solving: 9,
  speed_under_pressure: 2,
});

const juniorTopicWeights = createBucketWeights({
  syntax_fluency: 6,
  control_flow: 10,
  functions_methods: 16,
  data_structures_basics: 18,
  debugging: 16,
  code_reading: 14,
  problem_solving: 16,
  speed_under_pressure: 4,
});

const beginnerDifficultyWeights = { beginner: 0.62, intermediate: 0.3, advanced: 0.08 } as const;
const juniorDifficultyWeights = { beginner: 0.08, intermediate: 0.56, advanced: 0.36 } as const;

const beginnerUnlockRules: BenchmarkUnlockRules = {
  duelReadyScore: 75,
  strongerBenchmarkAt: 82,
  readinessBadgeLabel: 'Foundations cleared',
};

const juniorUnlockRules: BenchmarkUnlockRules = {
  duelReadyScore: 80,
  strongerBenchmarkAt: 88,
  readinessBadgeLabel: 'Junior readiness verified',
};

const packTopicWeightOverrides: Partial<Record<BenchmarkPackId, Record<BenchmarkSkillBucket, number>>> = {
  'python-beginner-fundamentals': createBucketWeights({
    syntax_fluency: 18,
    control_flow: 18,
    functions_methods: 17,
    data_structures_basics: 14,
    debugging: 14,
    code_reading: 8,
    problem_solving: 9,
    speed_under_pressure: 2,
  }),
  'python-junior-interview-prep': createBucketWeights({
    syntax_fluency: 4,
    control_flow: 10,
    functions_methods: 16,
    data_structures_basics: 17,
    debugging: 18,
    code_reading: 16,
    problem_solving: 15,
    speed_under_pressure: 4,
  }),
  'javascript-beginner-fundamentals': createBucketWeights({
    syntax_fluency: 19,
    control_flow: 17,
    functions_methods: 16,
    data_structures_basics: 16,
    debugging: 12,
    code_reading: 9,
    problem_solving: 9,
    speed_under_pressure: 2,
  }),
  'javascript-junior-interview-prep': createBucketWeights({
    syntax_fluency: 4,
    control_flow: 9,
    functions_methods: 15,
    data_structures_basics: 18,
    debugging: 17,
    code_reading: 16,
    problem_solving: 17,
    speed_under_pressure: 4,
  }),
  'java-beginner-oop-foundations': createBucketWeights({
    syntax_fluency: 18,
    control_flow: 14,
    functions_methods: 19,
    data_structures_basics: 16,
    debugging: 12,
    code_reading: 10,
    problem_solving: 9,
    speed_under_pressure: 2,
  }),
  'java-junior-class-ds-prep': createBucketWeights({
    syntax_fluency: 4,
    control_flow: 9,
    functions_methods: 15,
    data_structures_basics: 20,
    debugging: 17,
    code_reading: 14,
    problem_solving: 17,
    speed_under_pressure: 4,
  }),
  'cpp-beginner-structured-logic': createBucketWeights({
    syntax_fluency: 16,
    control_flow: 18,
    functions_methods: 17,
    data_structures_basics: 16,
    debugging: 12,
    code_reading: 9,
    problem_solving: 10,
    speed_under_pressure: 2,
  }),
  'cpp-junior-problem-solving': createBucketWeights({
    syntax_fluency: 4,
    control_flow: 9,
    functions_methods: 14,
    data_structures_basics: 18,
    debugging: 17,
    code_reading: 15,
    problem_solving: 19,
    speed_under_pressure: 4,
  }),
};

const packRetakeBlueprintOverrides: Partial<Record<BenchmarkPackId, BenchmarkSkillBucket[]>> = {
  'python-beginner-fundamentals': ['debugging', 'control_flow', 'functions_methods', 'data_structures_basics'],
  'python-junior-interview-prep': ['debugging', 'code_reading', 'problem_solving', 'functions_methods'],
  'javascript-beginner-fundamentals': ['debugging', 'control_flow', 'functions_methods', 'data_structures_basics'],
  'javascript-junior-interview-prep': ['debugging', 'problem_solving', 'data_structures_basics', 'code_reading'],
  'java-beginner-oop-foundations': ['functions_methods', 'debugging', 'data_structures_basics', 'control_flow'],
  'java-junior-class-ds-prep': ['data_structures_basics', 'debugging', 'problem_solving', 'functions_methods'],
  'cpp-beginner-structured-logic': ['control_flow', 'functions_methods', 'debugging', 'problem_solving'],
  'cpp-junior-problem-solving': ['problem_solving', 'debugging', 'data_structures_basics', 'code_reading'],
};

const packRemediationOverrides: Partial<
  Record<BenchmarkPackId, Partial<Record<BenchmarkSkillBucket, BenchmarkRemediationMapping>>>
> = {
  'python-beginner-fundamentals': {
    syntax_fluency: {
      lessonTitles: ['First Output', 'Variables', 'Input'],
      lessonSearchKeywords: ['first output', 'variables', 'input'],
      shortPracticeSet: 'Reset output, variables, and input with 3 fast prompts.',
    },
    control_flow: {
      lessonTitles: ['If', 'For Loops', 'While Loops'],
      lessonSearchKeywords: ['if', 'loops'],
      shortPracticeSet: 'Trace 3 Python branches and loop counters before the retake.',
    },
    functions_methods: {
      lessonTitles: ['Wrap Repeated Work in a Function', 'Pass Values into Functions', 'Compose Small Functions'],
      lessonSearchKeywords: ['functions'],
      shortPracticeSet: 'Write 2 tiny helpers and one return-value fix from scratch.',
    },
    data_structures_basics: {
      lessonTitles: ['Lists', 'Use Safe Dictionary Lookups', 'Dictionary of lists'],
      lessonSearchKeywords: ['lists', 'dictionary'],
      shortPracticeSet: 'Review list indexing, append, and simple reads under time pressure.',
    },
  },
  'python-junior-interview-prep': {
    code_reading: {
      lessonTitles: ['Use Safe Dictionary Lookups', 'Dictionary of lists', 'Search a List'],
      lessonSearchKeywords: ['predict output', 'dictionaries', 'lists'],
      shortPracticeSet: 'Do a 4-minute Python code-reading sprint with no execution.',
    },
    debugging: {
      lessonTitles: ['Debugging Basics'],
      lessonSearchKeywords: ['debugging basics'],
      shortPracticeSet: 'Fix 3 short Python bugs before the retake.',
    },
    problem_solving: {
      lessonTitles: ['Search a List', 'Project: Text Analyzer'],
      lessonSearchKeywords: ['algorithms', 'project'],
      shortPracticeSet: 'Solve one mini-problem and compare to the reference solution.',
      optionalProjectTitle: 'Project: Text Analyzer',
      optionalProjectKeywords: ['project'],
    },
  },
  'javascript-beginner-fundamentals': {
    syntax_fluency: {
      lessonTitles: ['Variables and Values', 'Primitive Data Types', 'Operators and Expressions'],
      lessonSearchKeywords: ['variables', 'primitive', 'template'],
      shortPracticeSet: 'Reset variables, types, and string interpolation in one short round.',
    },
    data_structures_basics: {
      lessonTitles: ['Arrays: Creating, Reading, and Updating', 'Objects: Keys, Values, and Dot Notation'],
      lessonSearchKeywords: ['arrays', 'objects'],
      shortPracticeSet: 'Review array indexing, object reads, and simple updates under time pressure.',
    },
    debugging: {
      lessonTitles: ['Debugging with the Browser Console'],
      lessonSearchKeywords: ['debugging'],
      shortPracticeSet: 'Fix 3 JavaScript bugs without using the console first.',
    },
  },
  'javascript-junior-interview-prep': {
    code_reading: {
      lessonTitles: [
        'Higher-Order Functions and Callbacks',
        'map, filter, reduce, and Functional Thinking',
        'Objects: Keys, Values, and Dot Notation',
      ],
      lessonSearchKeywords: ['higher-order', 'callback', 'objects'],
      shortPracticeSet: 'Complete a fast JS code-reading round with arrays and objects.',
    },
    debugging: {
      lessonTitles: ['Debugging with the Browser Console', 'Error Handling with try, catch, and throw'],
      lessonSearchKeywords: ['debugging'],
      shortPracticeSet: 'Fix 3 interview-style JS bugs before the retake.',
    },
    problem_solving: {
      lessonTitles: ['map, filter, reduce, and Functional Thinking', 'Project 3: Build an Interactive To-Do List'],
      lessonSearchKeywords: ['functional', 'project'],
      shortPracticeSet: 'Solve one array/object mini-problem and then retake weak areas.',
      optionalProjectTitle: 'Project 3: Build an Interactive To-Do List',
      optionalProjectKeywords: ['project'],
    },
  },
  'java-beginner-oop-foundations': {
    syntax_fluency: {
      lessonTitles: [
        'What Java Is, the JDK, and Your First Program',
        'Variables and Primitive Data Types',
        'Input and Output with Scanner and println',
      ],
      lessonSearchKeywords: ['first program', 'primitive', 'scanner'],
      shortPracticeSet: 'Reset Java syntax, types, and Scanner I/O before retaking.',
    },
    functions_methods: {
      lessonTitles: ['Methods: Parameters, Return Values, and Reuse', 'Fields, Methods, and Constructors'],
      lessonSearchKeywords: ['methods', 'constructors'],
      shortPracticeSet: 'Write 2 short methods and one constructor/method distinction fix.',
    },
    data_structures_basics: {
      lessonTitles: ['Arrays and Basic Problem Solving', 'Two-Dimensional Arrays'],
      lessonSearchKeywords: ['arrays', 'two-dimensional'],
      shortPracticeSet: 'Review array indexing, loops, and simple accumulation under pressure.',
    },
  },
  'java-junior-class-ds-prep': {
    data_structures_basics: {
      lessonTitles: ['Lists and ArrayList', 'Sets, Maps, Queues, and Choosing the Right Collection'],
      lessonSearchKeywords: ['arraylist', 'list', 'map'],
      shortPracticeSet: 'Drill one list pass, one map read, and one collection update before the retake.',
    },
    debugging: {
      lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Exception Handling with try, catch, and finally'],
      lessonSearchKeywords: ['debugging', 'exception'],
      shortPracticeSet: 'Fix 3 Java bugs: one compile, one logic, one collection bug.',
    },
    problem_solving: {
      lessonTitles: ['Comparable, Comparator, and Sorting Objects', 'Project 3: Build a Banking System Simulator'],
      lessonSearchKeywords: ['sorting', 'project'],
      shortPracticeSet: 'Solve one class/collection mini-problem before retaking.',
      optionalProjectTitle: 'Project 3: Build a Banking System Simulator',
      optionalProjectKeywords: ['project'],
    },
  },
  'cpp-beginner-structured-logic': {
    syntax_fluency: {
      lessonTitles: ['Your First C++ Program', 'Variables and Basic Types', 'Input, Operators, and Expressions'],
      lessonSearchKeywords: ['first c++', 'variables', 'input'],
      shortPracticeSet: 'Reset syntax, types, and standard I/O with 3 quick prompts.',
    },
    control_flow: {
      lessonTitles: ['Booleans and Conditionals', 'Loops'],
      lessonSearchKeywords: ['conditional', 'loops'],
      shortPracticeSet: 'Trace 3 branch-and-loop paths without compiling first.',
    },
    functions_methods: {
      lessonTitles: ['Functions'],
      lessonSearchKeywords: ['functions'],
      shortPracticeSet: 'Write 2 short C++ helpers and one return-value fix.',
    },
  },
  'cpp-junior-problem-solving': {
    data_structures_basics: {
      lessonTitles: ['First Containers', 'Collection Problem-Solving Patterns'],
      lessonSearchKeywords: ['vector', 'containers', 'map'],
      shortPracticeSet: 'Review vectors, maps, and one iteration-heavy trace before the retake.',
    },
    debugging: {
      lessonTitles: ['Debugging Basics', 'Exceptions and Error Handling'],
      lessonSearchKeywords: ['debugging', 'errors'],
      shortPracticeSet: 'Fix 3 C++ bugs: one off-by-one, one bad comparison, one compile issue.',
    },
    problem_solving: {
      lessonTitles: ['Algorithms Library', 'Project 3: Text RPG or Shape System'],
      lessonSearchKeywords: ['algorithm', 'project'],
      shortPracticeSet: 'Solve one timed C++ mini-problem and then retake.',
      optionalProjectTitle: 'Project 3: Text RPG or Shape System',
      optionalProjectKeywords: ['project'],
    },
  },
};

const languageRemediationDefaultsExact: Record<
  LanguageSlug,
  Partial<Record<BenchmarkSkillBucket, Omit<BenchmarkRemediationMapping, 'lessonSearchKeywords'>>>
> = {
  python: {
    syntax_fluency: {
      lessonTitles: ['First Output', 'Variables', 'Input'],
      shortPracticeSet: 'Reset output, variables, and input with 3 fast prompts.',
    },
    control_flow: {
      lessonTitles: ['If', 'For Loops', 'While Loops'],
      shortPracticeSet: 'Trace 3 Python branches and loop counters before the retake.',
    },
    functions_methods: {
      lessonTitles: ['Wrap Repeated Work in a Function', 'Pass Values into Functions', 'Compose Small Functions'],
      shortPracticeSet: 'Write 2 tiny helpers and one return-value fix from scratch.',
    },
    data_structures_basics: {
      lessonTitles: ['Lists', 'Use Safe Dictionary Lookups', 'Dictionary of lists'],
      shortPracticeSet: 'Review list indexing, append, and simple reads under time pressure.',
    },
    debugging: {
      lessonTitles: ['Debugging Basics'],
      shortPracticeSet: 'Fix 3 short Python bugs before the retake.',
    },
    code_reading: {
      lessonTitles: ['Use Safe Dictionary Lookups', 'Dictionary of lists', 'Search a List'],
      shortPracticeSet: 'Do a 4-minute Python code-reading sprint with no execution.',
    },
    problem_solving: {
      lessonTitles: ['Search a List', 'Project: Text Analyzer'],
      shortPracticeSet: 'Solve one mini-problem and compare to the reference solution.',
      optionalProjectTitle: 'Project: Text Analyzer',
    },
    speed_under_pressure: {
      lessonTitles: ['Debugging Basics', 'If', 'Search a List'],
      shortPracticeSet: 'Run one short timed Python reset before the retake.',
    },
  },
  javascript: {
    syntax_fluency: {
      lessonTitles: ['Variables and Values', 'Primitive Data Types', 'Operators and Expressions'],
      shortPracticeSet: 'Reset variables, types, and operators before retaking.',
    },
    control_flow: {
      lessonTitles: ['Conditional Logic with if, else, and switch', 'Loops: for, while, and do...while'],
      shortPracticeSet: 'Trace 3 short branches and loops before the retake.',
    },
    functions_methods: {
      lessonTitles: ['Functions: Inputs, Outputs, and Reuse', 'Function Expressions and Arrow Functions'],
      shortPracticeSet: 'Write 2 small functions and one correction pass.',
    },
    data_structures_basics: {
      lessonTitles: ['Arrays: Creating, Reading, and Updating', 'Objects: Keys, Values, and Dot Notation', 'Destructuring Arrays and Objects'],
      shortPracticeSet: 'Review array and object reads under time pressure.',
    },
    debugging: {
      lessonTitles: ['Debugging with the Browser Console', 'Error Handling with try, catch, and throw'],
      shortPracticeSet: 'Fix 3 short JS bugs without touching the docs.',
    },
    code_reading: {
      lessonTitles: ['Higher-Order Functions and Callbacks', 'map, filter, reduce, and Functional Thinking', 'Objects: Keys, Values, and Dot Notation'],
      shortPracticeSet: 'Complete one fast code-reading round with no console.',
    },
    problem_solving: {
      lessonTitles: ['map, filter, reduce, and Functional Thinking', 'Project 3: Build an Interactive To-Do List'],
      shortPracticeSet: 'Solve one small applied problem before retaking.',
      optionalProjectTitle: 'Project 3: Build an Interactive To-Do List',
    },
    speed_under_pressure: {
      lessonTitles: ['Timing Code with setTimeout and setInterval', 'Asynchronous JavaScript: The Big Picture'],
      shortPracticeSet: 'Run one short timed JS drill after corrective work.',
    },
  },
  java: {
    syntax_fluency: {
      lessonTitles: ['What Java Is, the JDK, and Your First Program', 'Variables and Primitive Data Types', 'Input and Output with Scanner and println'],
      shortPracticeSet: 'Reset Java syntax, types, and Scanner usage first.',
    },
    control_flow: {
      lessonTitles: ['Conditional Logic with if, else, and switch', 'Loops: for, while, and do-while'],
      shortPracticeSet: 'Trace 3 loop and branch examples before retaking.',
    },
    functions_methods: {
      lessonTitles: ['Methods: Parameters, Return Values, and Reuse', 'Fields, Methods, and Constructors', 'this, Overloading, and Method Design'],
      shortPracticeSet: 'Write 2 small methods and fix one signature issue.',
    },
    data_structures_basics: {
      lessonTitles: ['Arrays and Basic Problem Solving', 'Two-Dimensional Arrays', 'Lists and ArrayList'],
      shortPracticeSet: 'Review array and list reads, updates, and iteration.',
    },
    debugging: {
      lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Exception Handling with try, catch, and finally'],
      shortPracticeSet: 'Fix 3 Java logic bugs and one compile issue.',
    },
    code_reading: {
      lessonTitles: ['Introduction to Objects and Classes', 'Inheritance and Code Reuse', 'Polymorphism and Method Overriding'],
      shortPracticeSet: 'Read one class flow and one collection flow without running code.',
    },
    problem_solving: {
      lessonTitles: ['Comparable, Comparator, and Sorting Objects', 'Project 3: Build a Banking System Simulator'],
      shortPracticeSet: 'Solve one collection-heavy mini-problem before retaking.',
      optionalProjectTitle: 'Project 3: Build a Banking System Simulator',
    },
    speed_under_pressure: {
      lessonTitles: ['Comparable, Comparator, and Sorting Objects', 'Lambda Expressions and Functional Interfaces'],
      shortPracticeSet: 'Repeat one short timed Java drill after the lessons.',
    },
  },
  cpp: {
    syntax_fluency: {
      lessonTitles: ['Your First C++ Program', 'Variables and Basic Types', 'Input, Operators, and Expressions'],
      shortPracticeSet: 'Reset syntax, I/O, and compiler basics before retaking.',
    },
    control_flow: {
      lessonTitles: ['Booleans and Conditionals', 'Loops'],
      shortPracticeSet: 'Trace 3 loop and branch examples before the retake.',
    },
    functions_methods: {
      lessonTitles: ['Functions', 'Functions deeper'],
      shortPracticeSet: 'Write 2 short functions and one correction pass.',
    },
    data_structures_basics: {
      lessonTitles: ['First Containers', 'Collection Problem-Solving Patterns'],
      shortPracticeSet: 'Review vector indexing, accumulation, and iteration.',
    },
    debugging: {
      lessonTitles: ['Debugging Basics', 'Exceptions and Error Handling'],
      shortPracticeSet: 'Fix 3 compile/runtime issues and one logic bug.',
    },
    code_reading: {
      lessonTitles: ['Strings', 'Collection Problem-Solving Patterns', 'Algorithms Library'],
      shortPracticeSet: 'Do a short code-reading sprint before the retake.',
    },
    problem_solving: {
      lessonTitles: ['Algorithms Library', 'Project 3: Text RPG or Shape System'],
      shortPracticeSet: 'Solve one small C++ problem before retaking.',
      optionalProjectTitle: 'Project 3: Text RPG or Shape System',
    },
    speed_under_pressure: {
      lessonTitles: ['Debugging Basics', 'Collection Problem-Solving Patterns'],
      shortPracticeSet: 'Repeat one short timed drill after corrective work.',
    },
  },
};

interface BenchmarkQuestionRemediationOverride {
  lessonTitles: string[];
  practiceLabel: string;
  projectTitle?: string | null;
}

const benchmarkQuestionRemediationOverrides: Partial<
  Record<string, BenchmarkQuestionRemediationOverride>
> = {
  'bench-python-beginner-function-completion-1': {
    lessonTitles: ['Wrap Repeated Work in a Function', 'Pass Values into Functions', 'Compose Small Functions'],
    practiceLabel: 'Finish one helper, one parameter pass, and one return-value correction before the retake.',
  },
  'bench-python-beginner-function-write-1': {
    lessonTitles: ['Wrap Repeated Work in a Function', 'Pass Values into Functions', 'Compose Small Functions'],
    practiceLabel: 'Write 2 small Python helpers from scratch, then rerun the function-writing task.',
  },
  'bench-python-beginner-debug-choice-1': {
    lessonTitles: ['Debugging Basics', 'If'],
    practiceLabel: 'Fix one branch bug and one comparison bug before you retake this benchmark.',
  },
  'bench-python-beginner-debug-code-1': {
    lessonTitles: ['Debugging Basics', 'For Loops', 'Lists'],
    practiceLabel: 'Repair one indexing bug, one loop bug, and one list update before the retake.',
  },
  'bench-python-beginner-mini-problem-1': {
    lessonTitles: ['Search a List', 'Project: Text Analyzer'],
    practiceLabel: 'Solve one counting mini-problem, then compare to the reference before retaking.',
    projectTitle: 'Project: Text Analyzer',
  },
  'bench-python-junior-best-fix-1': {
    lessonTitles: ['Debugging Basics', 'Use Safe Dictionary Lookups'],
    practiceLabel: 'Fix one dictionary bug and one state-update bug before the retake.',
  },
  'bench-python-junior-write-1': {
    lessonTitles: ['Compose Small Functions', 'Search a List', 'Project: Text Analyzer'],
    practiceLabel: 'Write one data-transform helper and one counting helper before the retake.',
    projectTitle: 'Project: Text Analyzer',
  },
  'bench-python-junior-completion-1': {
    lessonTitles: ['Compose Small Functions', 'Search a List', 'Use Safe Dictionary Lookups'],
    practiceLabel: 'Finish one dictionary/list helper and one return-value correction before the retake.',
  },
  'bench-python-junior-debug-code-1': {
    lessonTitles: ['Debugging Basics', 'Search a List', 'Use Safe Dictionary Lookups'],
    practiceLabel: 'Repair one dictionary traversal bug and one logic bug before the retake.',
  },
  'bench-python-junior-problem-1': {
    lessonTitles: ['Search a List', 'Project: Text Analyzer'],
    practiceLabel: 'Solve one membership/counting problem under time pressure before the retake.',
    projectTitle: 'Project: Text Analyzer',
  },
  'bench-python-junior-problem-2': {
    lessonTitles: ['Search a List', 'Project: Text Analyzer'],
    practiceLabel: 'Do one second pass on applied Python problem solving before the full retake.',
    projectTitle: 'Project: Text Analyzer',
  },
  'bench-python-junior-pressure-fix-1': {
    lessonTitles: ['Debugging Basics', 'Search a List'],
    practiceLabel: 'Run one fast debug/read sprint before repeating the pressure set.',
  },
  'bench-js-beginner-function-completion-1': {
    lessonTitles: ['Functions: Inputs, Outputs, and Reuse', 'Function Expressions and Arrow Functions'],
    practiceLabel: 'Complete one function body and one parameter-return fix before the retake.',
  },
  'bench-js-beginner-function-write-1': {
    lessonTitles: ['Functions: Inputs, Outputs, and Reuse', 'Function Expressions and Arrow Functions'],
    practiceLabel: 'Write two short JavaScript helpers from scratch before the retake.',
  },
  'bench-js-beginner-debug-fix-1': {
    lessonTitles: ['Debugging with the Browser Console', 'Conditional Logic with if, else, and switch'],
    practiceLabel: 'Fix one branch bug and one expression bug before you retake.',
  },
  'bench-js-beginner-debug-code-1': {
    lessonTitles: ['Debugging with the Browser Console', 'Arrays: Creating, Reading, and Updating'],
    practiceLabel: 'Repair one array loop bug and one logic bug before the retake.',
  },
  'bench-js-beginner-mini-problem-1': {
    lessonTitles: ['Arrays: Creating, Reading, and Updating', 'Project 2: Build a Student Grade Tracker'],
    practiceLabel: 'Solve one array mini-problem and one tally pass before the retake.',
    projectTitle: 'Project 2: Build a Student Grade Tracker',
  },
  'bench-js-junior-best-fix-1': {
    lessonTitles: ['Debugging with the Browser Console', 'Error Handling with try, catch, and throw'],
    practiceLabel: 'Fix one callback/data bug and one logic bug before the retake.',
  },
  'bench-js-junior-debug-code-1': {
    lessonTitles: ['Debugging with the Browser Console', 'map, filter, reduce, and Functional Thinking'],
    practiceLabel: 'Repair one array-transform bug and one accumulator bug before the retake.',
  },
  'bench-js-junior-write-helper-1': {
    lessonTitles: ['Higher-Order Functions and Callbacks', 'map, filter, reduce, and Functional Thinking'],
    practiceLabel: 'Write one array helper and one callback helper before the retake.',
  },
  'bench-js-junior-complete-data-1': {
    lessonTitles: ['Objects: Keys, Values, and Dot Notation', 'Nested Data: Arrays of Objects and Objects of Arrays'],
    practiceLabel: 'Finish one object/array data transform and one safe lookup before the retake.',
  },
  'bench-js-junior-mini-problem-1': {
    lessonTitles: ['map, filter, reduce, and Functional Thinking', 'Project 3: Build an Interactive To-Do List'],
    practiceLabel: 'Solve one object/array mini-problem under time pressure before the retake.',
    projectTitle: 'Project 3: Build an Interactive To-Do List',
  },
  'bench-js-junior-mini-problem-2': {
    lessonTitles: ['map, filter, reduce, and Functional Thinking', 'Project 3: Build an Interactive To-Do List'],
    practiceLabel: 'Run a second applied JS problem pass before the full retake.',
    projectTitle: 'Project 3: Build an Interactive To-Do List',
  },
  'bench-js-junior-pressure-fix-1': {
    lessonTitles: ['Debugging with the Browser Console', 'Higher-Order Functions and Callbacks'],
    practiceLabel: 'Do one fast read-debug sprint before repeating the pressure set.',
  },
  'bench-java-beginner-function-completion-1': {
    lessonTitles: ['Methods: Parameters, Return Values, and Reuse', 'Fields, Methods, and Constructors'],
    practiceLabel: 'Complete one Java method and one return-value fix before the retake.',
  },
  'bench-java-beginner-function-write-1': {
    lessonTitles: ['Methods: Parameters, Return Values, and Reuse', 'this, Overloading, and Method Design'],
    practiceLabel: 'Write two short Java methods from scratch before the retake.',
  },
  'bench-java-beginner-debug-fix-1': {
    lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Conditional Logic with if, else, and switch'],
    practiceLabel: 'Fix one compile issue and one branch bug before the retake.',
  },
  'bench-java-beginner-debug-code-1': {
    lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Arrays and Basic Problem Solving'],
    practiceLabel: 'Repair one array loop bug and one logic bug before the retake.',
  },
  'bench-java-beginner-mini-problem-1': {
    lessonTitles: ['Arrays and Basic Problem Solving', 'Project 1: Build a Console Calculator and Number Toolkit'],
    practiceLabel: 'Solve one counting/loop mini-problem before the retake.',
    projectTitle: 'Project 1: Build a Console Calculator and Number Toolkit',
  },
  'bench-java-junior-best-fix-1': {
    lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Sets, Maps, Queues, and Choosing the Right Collection'],
    practiceLabel: 'Fix one collection bug and one logic bug before the retake.',
  },
  'bench-java-junior-debug-code-1': {
    lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Lists and ArrayList'],
    practiceLabel: 'Repair one list traversal bug and one off-by-one before the retake.',
  },
  'bench-java-junior-write-helper-1': {
    lessonTitles: ['Methods: Parameters, Return Values, and Reuse', 'Lists and ArrayList'],
    practiceLabel: 'Write one collection helper and one method extraction before the retake.',
  },
  'bench-java-junior-complete-data-1': {
    lessonTitles: ['Sets, Maps, Queues, and Choosing the Right Collection', 'Comparable, Comparator, and Sorting Objects'],
    practiceLabel: 'Finish one map/list data task and one comparison step before the retake.',
  },
  'bench-java-junior-mini-problem-1': {
    lessonTitles: ['Comparable, Comparator, and Sorting Objects', 'Project 3: Build a Banking System Simulator'],
    practiceLabel: 'Solve one class-and-collection mini-problem before the retake.',
    projectTitle: 'Project 3: Build a Banking System Simulator',
  },
  'bench-java-junior-mini-problem-2': {
    lessonTitles: ['Comparable, Comparator, and Sorting Objects', 'Project 3: Build a Banking System Simulator'],
    practiceLabel: 'Do a second applied Java collection problem before the full retake.',
    projectTitle: 'Project 3: Build a Banking System Simulator',
  },
  'bench-java-junior-pressure-fix-1': {
    lessonTitles: ['Compilation Errors, Runtime Errors, and Debugging', 'Comparable, Comparator, and Sorting Objects'],
    practiceLabel: 'Run one fast read-debug-set before repeating the pressure segment.',
  },
  'bench-cpp-beginner-function-completion-1': {
    lessonTitles: ['Functions', 'Functions deeper'],
    practiceLabel: 'Complete one C++ helper and one return-value fix before the retake.',
  },
  'bench-cpp-beginner-function-write-1': {
    lessonTitles: ['Functions', 'Functions deeper'],
    practiceLabel: 'Write two short C++ helpers from scratch before the retake.',
  },
  'bench-cpp-beginner-debug-fix-1': {
    lessonTitles: ['Debugging Basics', 'Booleans and Conditionals'],
    practiceLabel: 'Fix one branch bug and one comparison bug before the retake.',
  },
  'bench-cpp-beginner-debug-code-1': {
    lessonTitles: ['Debugging Basics', 'First Containers'],
    practiceLabel: 'Repair one vector loop bug and one logic bug before the retake.',
  },
  'bench-cpp-beginner-mini-problem-1': {
    lessonTitles: ['Collection Problem-Solving Patterns', 'Project 1: Console Toolkit'],
    practiceLabel: 'Solve one counting/iteration mini-problem before the retake.',
    projectTitle: 'Project 1: Console Toolkit',
  },
  'bench-cpp-junior-best-fix-1': {
    lessonTitles: ['Debugging Basics', 'Associative Containers'],
    practiceLabel: 'Fix one map/state bug and one logic bug before the retake.',
  },
  'bench-cpp-junior-debug-code-1': {
    lessonTitles: ['Debugging Basics', 'Collection Problem-Solving Patterns'],
    practiceLabel: 'Repair one iteration bug and one off-by-one before the retake.',
  },
  'bench-cpp-junior-write-helper-1': {
    lessonTitles: ['Functions deeper', 'Collection Problem-Solving Patterns'],
    practiceLabel: 'Write one vector helper and one method extraction before the retake.',
  },
  'bench-cpp-junior-complete-data-1': {
    lessonTitles: ['Associative Containers', 'Collection Problem-Solving Patterns'],
    practiceLabel: 'Finish one map/vector data task before the retake.',
  },
  'bench-cpp-junior-mini-problem-1': {
    lessonTitles: ['Algorithms Library', 'Project 3: Text RPG or Shape System'],
    practiceLabel: 'Solve one applied C++ mini-problem before the retake.',
    projectTitle: 'Project 3: Text RPG or Shape System',
  },
  'bench-cpp-junior-mini-problem-2': {
    lessonTitles: ['Algorithms Library', 'Project 3: Text RPG or Shape System'],
    practiceLabel: 'Do a second applied C++ problem before the full retake.',
    projectTitle: 'Project 3: Text RPG or Shape System',
  },
  'bench-cpp-junior-pressure-fix-1': {
    lessonTitles: ['Debugging Basics', 'Algorithms Library'],
    practiceLabel: 'Run one fast read-debug problem sprint before repeating the pressure set.',
  },
};

const lessonCatalogTitleLookup = new Map(
  LESSON_CATALOG.map((lesson) => [`${lesson.language}:${lesson.title.trim().toLowerCase()}`, lesson.id])
);

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => (value || '').trim()).filter(Boolean)));

const resolveExactLessonIds = (
  language: LanguageSlug,
  lessonIds: string[] = [],
  lessonTitles: string[] = [],
  limit = 4
) => {
  const explicitIds = lessonIds.filter((lessonId) =>
    LESSON_CATALOG.some((lesson) => lesson.language === language && lesson.id === lessonId)
  );
  const titleIds = lessonTitles
    .map((title) => lessonCatalogTitleLookup.get(`${language}:${title.trim().toLowerCase()}`) || null)
    .filter((lessonId): lessonId is string => Boolean(lessonId));
  return uniqueStrings([...explicitIds, ...titleIds]).slice(0, limit);
};

const resolveExactProjectCheckpointId = (
  language: LanguageSlug,
  projectCheckpointId?: string | null,
  projectTitle?: string | null
) => {
  if (
    projectCheckpointId &&
    LESSON_CATALOG.some((lesson) => lesson.language === language && lesson.id === projectCheckpointId)
  ) {
    return projectCheckpointId;
  }
  if (!projectTitle) return null;
  return lessonCatalogTitleLookup.get(`${language}:${projectTitle.trim().toLowerCase()}`) || null;
};

const questionSpecificLessonTitles = (
  template: BenchmarkSeedQuestionTemplate,
  baseLessonTitles: string[]
) => {
  const titles = [...baseLessonTitles];
  if (template.questionType === 'debugging' || template.questionType === 'choose_the_best_fix') {
    titles.unshift(template.lessonTitle);
  }
  if (template.questionType === 'short_function_writing' || template.questionType === 'code_completion') {
    titles.push(template.lessonTitle);
  }
  if (template.questionType === 'applied_mini_problem') {
    titles.push(template.lessonTitle);
  }
  return uniqueStrings(titles);
};

const resolveQuestionRemediation = (
  template: BenchmarkSeedQuestionTemplate
): {
  remediationLessonIds: string[];
  remediationPracticeLabel: string;
  remediationProjectCheckpointId: string | null;
} => {
  const primaryPackId = template.packIds?.[0];
  const packMapping = primaryPackId ? packRemediationOverrides[primaryPackId]?.[template.skillBucket] : undefined;
  const defaultMapping = languageRemediationDefaultsExact[template.language]?.[template.skillBucket];
  const questionOverride = benchmarkQuestionRemediationOverrides[template.templateId];
  const mapping = packMapping || defaultMapping;
  const hasAuthoredLessonIds =
    Array.isArray(template.remediationLessonIds) &&
    template.remediationLessonIds.length > 0 &&
    !(template.remediationLessonIds.length === 1 && template.remediationLessonIds[0] === template.lessonId);
  const hasAuthoredPracticeLabel =
    Boolean(template.remediationPracticeLabel) &&
    template.remediationPracticeLabel !== `Rework ${template.lessonTitle} before the retake.`;
  const lessonTitles = questionSpecificLessonTitles(template, mapping?.lessonTitles || []);
  const remediationLessonIds = resolveExactLessonIds(
    template.language,
    hasAuthoredLessonIds ? template.remediationLessonIds || [] : [],
    questionOverride?.lessonTitles?.length
      ? questionOverride.lessonTitles
      : lessonTitles.length > 0
      ? lessonTitles
      : [template.lessonTitle],
    4
  );

  return {
    remediationLessonIds:
      remediationLessonIds.length > 0
        ? remediationLessonIds
        : resolveExactLessonIds(template.language, [template.lessonId], [template.lessonTitle], 1),
    remediationPracticeLabel:
      (hasAuthoredPracticeLabel ? template.remediationPracticeLabel : null) ||
      questionOverride?.practiceLabel ||
      mapping?.shortPracticeSet ||
      `Rework ${template.lessonTitle} before the retake.`,
    remediationProjectCheckpointId:
      template.remediationProjectCheckpointId ??
      resolveExactProjectCheckpointId(
        template.language,
        mapping?.optionalProjectCheckpointId,
        questionOverride?.projectTitle || mapping?.optionalProjectTitle || null
      ),
  };
};

const enrichSeedTemplateRemediation = (template: BenchmarkSeedQuestionTemplate): BenchmarkSeedQuestionTemplate => {
  const resolved = resolveQuestionRemediation(template);
  return {
    ...template,
    remediationLessonIds: resolved.remediationLessonIds,
    remediationPracticeLabel: resolved.remediationPracticeLabel,
    remediationProjectCheckpointId: resolved.remediationProjectCheckpointId,
  };
};

const launchPackMeta: PackMeta[] = [
  {
    id: 'python-beginner-fundamentals',
    title: 'Python Beginner Fundamentals',
    language: 'python',
    roleLevel: 'beginner',
    goal: 'skill_growth',
    description: 'Baseline Python syntax, control flow, functions, and small logic under light pressure.',
    simulatorPromise: 'Built to feel like a real beginner diagnostic instead of a random quiz list.',
    scoreMeaning: 'Use this score to route the next Python lessons and decide when to move up.',
  },
  {
    id: 'python-junior-interview-prep',
    title: 'Python Junior Interview Prep',
    language: 'python',
    roleLevel: 'junior',
    goal: 'interview_prep',
    description: 'Interview-style Python across reading, debugging, data handling, and small coding pressure.',
    simulatorPromise: 'Built to feel like a junior screen: tighter time, harder reasoning, less filler.',
    scoreMeaning: 'Use this score to judge junior readiness, target weak areas, and decide when to duel or retake.',
  },
  {
    id: 'javascript-beginner-fundamentals',
    title: 'JavaScript Beginner Fundamentals',
    language: 'javascript',
    roleLevel: 'beginner',
    goal: 'skill_growth',
    description: 'Baseline JavaScript variables, control flow, arrays, and readable logic.',
    simulatorPromise: 'A browser-free fundamentals benchmark focused on real coding logic.',
    scoreMeaning: 'Use this score to route the right JavaScript lessons and projects.',
  },
  {
    id: 'javascript-junior-interview-prep',
    title: 'JavaScript Junior Interview Prep',
    language: 'javascript',
    roleLevel: 'junior',
    goal: 'interview_prep',
    description: 'Interview-style JavaScript across arrays, objects, debugging, and applied logic.',
    simulatorPromise: 'Shaped for real screen pressure instead of generic quiz trivia.',
    scoreMeaning: 'Use this score to judge interview readiness and pick the next corrective plan.',
  },
  {
    id: 'java-beginner-oop-foundations',
    title: 'Java Beginner OOP Foundations',
    language: 'java',
    roleLevel: 'beginner',
    goal: 'skill_growth',
    description: 'Baseline Java syntax, methods, arrays, and early object-model reasoning.',
    simulatorPromise: 'Focuses on the Java habits that matter early: structure, methods, and readable code.',
    scoreMeaning: 'Use this score to route Java fundamentals and early OOP lessons.',
  },
  {
    id: 'java-junior-class-ds-prep',
    title: 'Java Junior Class & DS Prep',
    language: 'java',
    roleLevel: 'junior',
    goal: 'interview_prep',
    description: 'Junior Java across classes, collections, debugging, and data-structure reasoning.',
    simulatorPromise: 'Designed to feel like a timed junior Java screen, not a lecture recap.',
    scoreMeaning: 'Use this score to judge junior Java readiness before harder interview drills.',
  },
  {
    id: 'cpp-beginner-structured-logic',
    title: 'C++ Beginner Structured Logic',
    language: 'cpp',
    roleLevel: 'beginner',
    goal: 'skill_growth',
    description: 'Baseline C++ structure, loops, functions, and readable logic.',
    simulatorPromise: 'Benchmarks the parts of C++ that matter early: structure, loops, and simple data.',
    scoreMeaning: 'Use this score to decide whether to stay in fundamentals or move toward harder problems.',
  },
  {
    id: 'cpp-junior-problem-solving',
    title: 'C++ Junior Problem Solving',
    language: 'cpp',
    roleLevel: 'junior',
    goal: 'interview_prep',
    description: 'Junior C++ reasoning across vectors, debugging, and applied mini-problems.',
    simulatorPromise: 'Built for real interview-style pressure: fast reads, debugging, and coding under a timer.',
    scoreMeaning: 'Use this score to judge whether you are ready for stronger C++ pressure.',
  },
];

const buildPackDefinition = (meta: PackMeta): BenchmarkPackDefinition => ({
  ...meta,
  questionCount: {
    quick: 5,
    full: meta.roleLevel === 'junior' ? 12 : 10,
    retake: 4,
  },
  durationMinutes: {
    quick: 12,
    full: 35,
    retake: 10,
  },
  topicWeights:
    packTopicWeightOverrides[meta.id] ||
    (meta.roleLevel === 'junior' ? juniorTopicWeights : beginnerTopicWeights),
  difficultyWeights: meta.roleLevel === 'junior' ? juniorDifficultyWeights : beginnerDifficultyWeights,
  questionBlueprint: {
    quick: meta.roleLevel === 'junior' ? juniorQuickBlueprint() : beginnerQuickBlueprint(),
    full: meta.roleLevel === 'junior' ? juniorFullBlueprint() : beginnerFullBlueprint(),
  },
  retakeBlueprintBuckets:
    packRetakeBlueprintOverrides[meta.id] ||
    (meta.roleLevel === 'junior'
      ? ['debugging', 'problem_solving', 'code_reading', 'functions_methods']
      : ['debugging', 'functions_methods', 'problem_solving', 'control_flow']),
  scoringRules: { accuracyWeight: 70, difficultyWeight: 20, speedWeight: 10 },
  remediationMapping: packRemediationOverrides[meta.id] || {},
  unlockRules: meta.roleLevel === 'junior' ? juniorUnlockRules : beginnerUnlockRules,
});

const benchmarkPackDefinitions: BenchmarkPackDefinition[] = launchPackMeta.map(buildPackDefinition);
const packLookup = new Map(benchmarkPackDefinitions.map((pack) => [pack.id, pack]));

export const benchmarkLaunchPacks = benchmarkPackDefinitions;

const mapSetupToPackId = (setup: BenchmarkSetup): BenchmarkPackId => {
  const key = `${setup.language}:${setup.goal}:${setup.roleLevel}`;
  const lookup =
    {
      'python:skill_growth:beginner': 'python-beginner-fundamentals',
      'python:interview_prep:junior': 'python-junior-interview-prep',
      'javascript:skill_growth:beginner': 'javascript-beginner-fundamentals',
      'javascript:interview_prep:junior': 'javascript-junior-interview-prep',
      'java:skill_growth:beginner': 'java-beginner-oop-foundations',
      'java:interview_prep:junior': 'java-junior-class-ds-prep',
      'cpp:skill_growth:beginner': 'cpp-beginner-structured-logic',
      'cpp:interview_prep:junior': 'cpp-junior-problem-solving',
    }[key] as BenchmarkPackId | undefined;

  if (lookup) return lookup;
  if (setup.roleLevel === 'junior' && setup.goal === 'interview_prep') {
    if (setup.language === 'python') return 'python-junior-interview-prep';
    if (setup.language === 'javascript') return 'javascript-junior-interview-prep';
    if (setup.language === 'java') return 'java-junior-class-ds-prep';
    return 'cpp-junior-problem-solving';
  }
  if (setup.language === 'java') return 'java-beginner-oop-foundations';
  if (setup.language === 'cpp') return 'cpp-beginner-structured-logic';
  if (setup.language === 'javascript') return 'javascript-beginner-fundamentals';
  return 'python-beginner-fundamentals';
};

export const getBenchmarkPackDefinition = (setup: BenchmarkSetup): BenchmarkPackDefinition =>
  packLookup.get(mapSetupToPackId(setup)) || benchmarkPackDefinitions[0];

const mapQuestionToDimensions = (question: BenchmarkQuestion): BenchmarkDimensionKey[] => {
  const dimensions = new Set<BenchmarkDimensionKey>();

  if (question.skillBucket === 'syntax_fluency') dimensions.add('language_fluency');
  if (question.skillBucket === 'control_flow') {
    dimensions.add('problem_solving');
    dimensions.add('code_reading');
  }
  if (question.skillBucket === 'functions_methods') {
    dimensions.add('code_writing');
    dimensions.add('code_quality');
  }
  if (question.skillBucket === 'data_structures_basics') {
    dimensions.add('problem_solving');
    dimensions.add('code_reading');
  }
  if (question.skillBucket === 'debugging') {
    dimensions.add('debugging');
    dimensions.add('code_reading');
  }
  if (question.skillBucket === 'code_reading') dimensions.add('code_reading');
  if (question.skillBucket === 'problem_solving') {
    dimensions.add('problem_solving');
    dimensions.add('code_writing');
  }
  if (question.skillBucket === 'speed_under_pressure') dimensions.add('efficiency');
  if (question.kind === 'code') dimensions.add('code_writing');

  return Array.from(dimensions);
};

const benchmarkSeedExecutionCases: Record<string, BenchmarkExecutionCase[]> = {
  'bench-python-beginner-function-write-1': [
    { label: 'Basic word', input: 'Ada', expected: 3 },
    { label: 'Longer word', input: 'hooks', expected: 5 },
    { label: 'Hidden empty string', input: '', expected: 0, hidden: true },
  ],
  'bench-python-beginner-debug-code-1': [
    { label: 'Mixed values', input: [1, -2, 3, 0], expected: 2 },
    { label: 'No positives', input: [-3, -1], expected: 0 },
    { label: 'Hidden all positives', input: [5, 7, 9], expected: 3, hidden: true },
  ],
  'bench-python-beginner-mini-problem-1': [
    { label: 'Two values over 10', input: [5, 12, 18], expected: 2 },
    { label: 'No values over 10', input: [1, 9, 10], expected: 0 },
    { label: 'Hidden mixed list', input: [11, 12, 13, 1], expected: 3, hidden: true },
  ],
  'bench-python-junior-write-1': [
    { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
    { label: 'No vowels', input: 'rhythm', expected: 0 },
    { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
  ],
  'bench-python-junior-completion-1': [
    { label: 'Keep positives', input: [3, -1, 4, 0], expected: [3, 4] },
    { label: 'No positives', input: [-2, 0], expected: [] },
    { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
  ],
  'bench-python-junior-problem-1': [
    { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
    { label: 'Target missing', input: [[4, 5], 1], expected: false },
    { label: 'Hidden empty list', input: [[], 0], expected: false, hidden: true },
  ],
  'bench-python-junior-problem-2': [
    { label: 'Palindrome', input: 'level', expected: true },
    { label: 'Not a palindrome', input: 'code', expected: false },
    { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
  ],
  'bench-js-beginner-function-write-1': [
    { label: 'Basic word', input: 'Ada', expected: 3 },
    { label: 'Longer word', input: 'hooks', expected: 5 },
    { label: 'Hidden empty string', input: '', expected: 0, hidden: true },
  ],
  'bench-js-beginner-debug-code-1': [
    { label: 'Mixed values', input: [1, -2, 3, 0], expected: 2 },
    { label: 'No positives', input: [-3, -1], expected: 0 },
    { label: 'Hidden all positives', input: [5, 7, 9], expected: 3, hidden: true },
  ],
  'bench-js-beginner-mini-problem-1': [
    { label: 'Two values over 10', input: [5, 12, 18], expected: 2 },
    { label: 'No values over 10', input: [1, 9, 10], expected: 0 },
    { label: 'Hidden mixed list', input: [11, 12, 13, 1], expected: 3, hidden: true },
  ],
  'bench-js-junior-write-helper-1': [
    { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
    { label: 'No vowels', input: 'rhythm', expected: 0 },
    { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
  ],
  'bench-js-junior-complete-data-1': [
    { label: 'Keep positives', input: [3, -1, 4, 0], expected: [3, 4] },
    { label: 'No positives', input: [-2, 0], expected: [] },
    { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
  ],
  'bench-js-junior-mini-problem-1': [
    { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
    { label: 'Target missing', input: [[4, 5], 1], expected: false },
    { label: 'Hidden empty list', input: [[], 0], expected: false, hidden: true },
  ],
  'bench-js-junior-mini-problem-2': [
    { label: 'Palindrome', input: 'level', expected: true },
    { label: 'Not a palindrome', input: 'code', expected: false },
    { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
  ],
  'bench-java-beginner-function-completion-1': [
    { label: 'Basic name', input: 'Ada', expected: 'Hi Ada' },
    { label: 'Another name', input: 'Mina', expected: 'Hi Mina' },
    { label: 'Hidden trailing spaces safe', input: 'Noah', expected: 'Hi Noah', hidden: true },
  ],
  'bench-java-beginner-function-write-1': [
    { label: 'Basic word', input: 'Ada', expected: 3 },
    { label: 'Longer word', input: 'hooks', expected: 5 },
    { label: 'Hidden empty string', input: '', expected: 0, hidden: true },
  ],
  'bench-java-beginner-debug-code-1': [
    { label: 'Mixed values', input: [1, -2, 3, 0], expected: 2 },
    { label: 'No positives', input: [-3, -1], expected: 0 },
    { label: 'Hidden all positives', input: [5, 7, 9], expected: 3, hidden: true },
  ],
  'bench-java-beginner-mini-problem-1': [
    { label: 'Two values over 10', input: [5, 12, 18], expected: 2 },
    { label: 'No values over 10', input: [1, 9, 10], expected: 0 },
    { label: 'Hidden mixed list', input: [11, 12, 13, 1], expected: 3, hidden: true },
  ],
  'bench-java-junior-debug-code-1': [
    { label: 'Mixed values', input: [5, 1, 9, 2], expected: 9 },
    { label: 'Already descending', input: [9, 8, 7], expected: 9 },
    { label: 'Hidden negatives', input: [-4, -1, -7], expected: -1, hidden: true },
  ],
  'bench-java-junior-write-helper-1': [
    { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
    { label: 'No vowels', input: 'rhythm', expected: 0 },
    { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
  ],
  'bench-java-junior-complete-data-1': [
    { label: 'Keep positives', input: [3, -1, 4, 0], expected: [3, 4] },
    { label: 'No positives', input: [-2, 0], expected: [] },
    { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
  ],
  'bench-java-junior-mini-problem-1': [
    { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
    { label: 'Target missing', input: [[4, 5], 1], expected: false },
    { label: 'Hidden empty list', input: [[], 0], expected: false, hidden: true },
  ],
  'bench-java-junior-mini-problem-2': [
    { label: 'Palindrome', input: 'level', expected: true },
    { label: 'Not a palindrome', input: 'code', expected: false },
    { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
  ],
  'bench-cpp-beginner-function-completion-1': [
    { label: 'Basic name', input: 'Ada', expected: 'Hi Ada' },
    { label: 'Another name', input: 'Mina', expected: 'Hi Mina' },
    { label: 'Hidden trailing spaces safe', input: 'Noah', expected: 'Hi Noah', hidden: true },
  ],
  'bench-cpp-beginner-function-write-1': [
    { label: 'Basic word', input: 'Ada', expected: 3 },
    { label: 'Longer word', input: 'hooks', expected: 5 },
    { label: 'Hidden empty string', input: '', expected: 0, hidden: true },
  ],
  'bench-cpp-beginner-debug-code-1': [
    { label: 'Mixed values', input: [1, -2, 3, 0], expected: 2 },
    { label: 'No positives', input: [-3, -1], expected: 0 },
    { label: 'Hidden all positives', input: [5, 7, 9], expected: 3, hidden: true },
  ],
  'bench-cpp-beginner-mini-problem-1': [
    { label: 'Two values over 10', input: [5, 12, 18], expected: 2 },
    { label: 'No values over 10', input: [1, 9, 10], expected: 0 },
    { label: 'Hidden mixed list', input: [11, 12, 13, 1], expected: 3, hidden: true },
  ],
  'bench-cpp-junior-debug-code-1': [
    { label: 'Mixed values', input: [5, 1, 9, 2], expected: 9 },
    { label: 'Already descending', input: [9, 8, 7], expected: 9 },
    { label: 'Hidden negatives', input: [-4, -1, -7], expected: -1, hidden: true },
  ],
  'bench-cpp-junior-write-helper-1': [
    { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
    { label: 'No vowels', input: 'rhythm', expected: 0 },
    { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
  ],
  'bench-cpp-junior-complete-data-1': [
    { label: 'Keep positives', input: [3, -1, 4, 0], expected: [3, 4] },
    { label: 'No positives', input: [-2, 0], expected: [] },
    { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
  ],
  'bench-cpp-junior-mini-problem-1': [
    { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
    { label: 'Target missing', input: [[4, 5], 1], expected: false },
    { label: 'Hidden empty list', input: [[], 0], expected: false, hidden: true },
  ],
  'bench-cpp-junior-mini-problem-2': [
    { label: 'Palindrome', input: 'level', expected: true },
    { label: 'Not a palindrome', input: 'code', expected: false },
    { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
  ],
};

const getSeedExecutionCases = (templateId: string) => benchmarkSeedExecutionCases[templateId];

const formatSeedPreviewValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getSeedPublicTestCases = (templateId: string) =>
  (benchmarkSeedExecutionCases[templateId] || [])
    .filter((testCase) => !testCase.hidden)
    .slice(0, 2)
    .map((testCase) => ({
      label: testCase.label || 'Example',
      inputPreview: formatSeedPreviewValue(testCase.input),
      expectedPreview: formatSeedPreviewValue(testCase.expected ?? testCase.expectedOutput ?? ''),
    }));

const pythonSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineSeedQuestion({
    templateId: 'bench-python-beginner-syntax-output-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-first-output',
    lessonTitle: 'First Output',
    competency: 'Syntax fluency',
    questionType: 'output_prediction',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    kind: 'multiple_choice',
    assessmentType: 'theory',
    prompt: 'What does this code print?\n\nmessage = "Codhak"\nprint(message + " ready")',
    options: ['Codhakready', 'Codhak ready', 'message ready', 'Error'],
    correctAnswer: 1,
    explanation: 'The second string already contains the leading space.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-flow-trace-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-if-statements',
    lessonTitle: 'Booleans and Conditionals',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'beginner',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What does this code print?\n\nscore = 6\nif score > 7:\n    print("A")\nelse:\n    print("B")',
    options: ['A', 'B', 'A then B', 'Nothing'],
    correctAnswer: 1,
    explanation: 'Because 6 is not greater than 7, the else branch runs.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-function-completion-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-functions',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'code_completion',
    skillBucket: 'functions_methods',
    difficulty: 'beginner',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(name)` so it returns `\"Hi \" + name`.',
    starterCode: 'def solution(name):\n    return \n',
    referenceCode: 'def solution(name):\n    return "Hi " + name\n',
    validationMode: 'includes_all',
    requiredSnippets: ['return', '"Hi "', 'name'],
    explanation: 'Return the greeting string instead of printing it.',
    expectedDurationSeconds: 150,
    discrimination: 0.72,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-debug-choice-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'debugging',
    prompt: 'Which change fixes the bug?\n\nname = input()\nprint("Hello " + name())',
    options: [
      'Change it to print("Hello " + name)',
      'Change input() to input',
      'Add another print()',
      'Put name in brackets',
    ],
    correctAnswer: 0,
    explanation: 'name is a string after input() runs, so calling name() causes a crash.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-list-reading-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-lists',
    lessonTitle: 'Lists',
    competency: 'Data structures basics',
    questionType: 'code_reading_comprehension',
    skillBucket: 'data_structures_basics',
    difficulty: 'beginner',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nvalues = [3, 5, 7]\nprint(values[1])',
    options: ['3', '5', '7', 'Error'],
    correctAnswer: 1,
    explanation: 'Lists are zero-indexed, so index 1 points to the second value.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-function-write-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-functions',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(word)` so it returns the length of `word`.',
    starterCode: 'def solution(word):\n    # return the number of characters\n    pass\n',
    referenceCode: 'def solution(word):\n    return len(word)\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-beginner-function-write-1'),
    publicTestCases: getSeedPublicTestCases('bench-python-beginner-function-write-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', 'len('],
    explanation: 'The simplest correct solution returns len(word).',
    expectedDurationSeconds: 170,
    discrimination: 0.74,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-debug-code-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    kind: 'code',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(values)` so it returns the count of positive numbers.',
    starterCode:
      'def solution(values):\n    count = 0\n    for value in values:\n        if value < 0:\n            count += 1\n    return count\n',
    referenceCode:
      'def solution(values):\n    count = 0\n    for value in values:\n        if value > 0:\n            count += 1\n    return count\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-beginner-debug-code-1'),
    publicTestCases: getSeedPublicTestCases('bench-python-beginner-debug-code-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for value in values', 'if value > 0', 'count += 1'],
    explanation: 'The current logic counts negatives instead of positives.',
    expectedDurationSeconds: 190,
    discrimination: 0.8,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-mini-problem-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-project-1',
    lessonTitle: 'Project 1: Console Toolkit',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'intermediate',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(values)` so it returns how many numbers in the list are greater than 10.',
    starterCode:
      'def solution(values):\n    count = 0\n    # count numbers greater than 10\n    return count\n',
    referenceCode:
      'def solution(values):\n    count = 0\n    for value in values:\n        if value > 10:\n            count += 1\n    return count\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-beginner-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-python-beginner-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for value in values', 'if value > 10', 'count += 1'],
    explanation: 'Read the list once and return the final count.',
    expectedDurationSeconds: 220,
    discrimination: 0.84,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-beginner-pressure-read-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Speed under pressure',
    questionType: 'code_reading_comprehension',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\ncount = 0\nfor value in [1, 2, 3]:\n    count += value\nprint(count)',
    options: ['3', '5', '6', '123'],
    correctAnswer: 2,
    explanation: 'The loop accumulates 1 + 2 + 3 and prints 6.',
    expectedDurationSeconds: 55,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-reading-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-loops',
    lessonTitle: 'Loops',
    competency: 'Code reading',
    questionType: 'code_reading_comprehension',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What does this code return?\n\ndef solve(values):\n    total = 0\n    for value in values:\n        if value % 2 == 0:\n            total += value\n    return total\n\nprint(solve([1, 2, 4, 5]))',
    options: ['6', '7', '12', 'Error'],
    correctAnswer: 0,
    explanation: 'Only 2 and 4 are even, so the total is 6.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-output-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-dictionaries',
    lessonTitle: 'Dictionaries',
    competency: 'Code reading',
    questionType: 'output_prediction',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nscores = {"ana": 4, "leo": 7}\nprint(scores.get("mila", 0))',
    options: ['None', '0', '7', 'Error'],
    correctAnswer: 1,
    explanation: 'get("mila", 0) returns the default value 0 when the key is missing.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-best-fix-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this function return the first even value?\n\ndef first_even(values):\n    for value in values:\n        if value % 2 == 1:\n            return value\n    return None',
    options: [
      'Change `value % 2 == 1` to `value % 2 == 0`',
      'Move `return None` inside the loop',
      'Replace the loop with print(values)',
      'Change `return value` to `print(value)`',
    ],
    correctAnswer: 0,
    explanation: 'The function currently returns the first odd value. It should check for even numbers.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-write-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-functions',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(text)` so it returns the number of vowels in `text`.',
    starterCode:
      'def solution(text):\n    count = 0\n    # count vowels in text\n    return count\n',
    referenceCode:
      'def solution(text):\n    count = 0\n    for char in text.lower():\n        if char in "aeiou":\n            count += 1\n    return count\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-junior-write-1'),
    publicTestCases: getSeedPublicTestCases('bench-python-junior-write-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for char in', 'if char in', 'count += 1'],
    explanation: 'Iterate once, check membership in the vowel string, and return the count.',
    expectedDurationSeconds: 180,
    discrimination: 0.78,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-completion-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-lists',
    lessonTitle: 'Lists',
    competency: 'Data structures basics',
    questionType: 'code_completion',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(values)` so it returns a list with only the positive values.',
    starterCode:
      'def solution(values):\n    result = []\n    for value in values:\n        if value > 0:\n            \n    return result\n',
    referenceCode:
      'def solution(values):\n    result = []\n    for value in values:\n        if value > 0:\n            result.append(value)\n    return result\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-junior-completion-1'),
    publicTestCases: getSeedPublicTestCases('bench-python-junior-completion-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['result.append', 'if value > 0', 'return result'],
    explanation: 'Append each positive number and return the result list.',
    expectedDurationSeconds: 175,
    discrimination: 0.76,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-flow-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-loops',
    lessonTitle: 'Loops',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\ncount = 0\nfor value in [2, 3, 4, 5]:\n    if value % 2 == 0:\n        count += 1\nprint(count)',
    options: ['1', '2', '3', '4'],
    correctAnswer: 1,
    explanation: 'Only 2 and 4 are even, so count ends at 2.',
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-debug-code-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'advanced',
    kind: 'code',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(values)` so it returns the largest number in the list.',
    starterCode:
      'def solution(values):\n    largest = 0\n    for value in values:\n        if value < largest:\n            largest = value\n    return largest\n',
    referenceCode:
      'def solution(values):\n    largest = values[0]\n    for value in values:\n        if value > largest:\n            largest = value\n    return largest\n',
    validationMode: 'includes_all',
    requiredSnippets: ['for value in values', 'if value > largest', 'return largest'],
    explanation: 'The current solution compares in the wrong direction and starts from a brittle initial value.',
    expectedDurationSeconds: 210,
    discrimination: 0.84,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-problem-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-algorithms',
    lessonTitle: 'Algorithms',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(values, target)` so it returns `True` if any value in `values` equals `target`, else `False`.',
    starterCode:
      'def solution(values, target):\n    # return True if target appears in values\n    return False\n',
    referenceCode:
      'def solution(values, target):\n    for value in values:\n        if value == target:\n            return True\n    return False\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-junior-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-python-junior-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for value in values', 'if value == target', 'return True', 'return False'],
    explanation: 'A single scan is enough. Return as soon as you find the target.',
    expectedDurationSeconds: 230,
    discrimination: 0.86,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-problem-2',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-algorithms',
    lessonTitle: 'Algorithms',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    kind: 'code',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(text)` so it returns `True` when `text` reads the same forward and backward.',
    starterCode:
      'def solution(text):\n    # return True when text is a palindrome\n    return False\n',
    referenceCode:
      'def solution(text):\n    return text == text[::-1]\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-python-junior-problem-2'),
    publicTestCases: getSeedPublicTestCases('bench-python-junior-problem-2'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', 'text[::-1]'],
    explanation: 'Compare the string with its reversed form.',
    expectedDurationSeconds: 200,
    discrimination: 0.8,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-pressure-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    kind: 'multiple_choice',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nvalues = [1, 2, 3]\nprint(values[-1] + values[0])',
    options: ['2', '3', '4', '5'],
    correctAnswer: 2,
    explanation: 'values[-1] is 3 and values[0] is 1, so the result is 4.',
    expectedDurationSeconds: 55,
  }),
  defineSeedQuestion({
    templateId: 'bench-python-junior-pressure-fix-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-debugging-basics',
    lessonTitle: 'Debugging Basics',
    competency: 'Speed under pressure',
    questionType: 'choose_the_best_fix',
    skillBucket: 'speed_under_pressure',
    difficulty: 'advanced',
    kind: 'multiple_choice',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this code safe when the key is missing?\n\nscores = {"ana": 4}\nprint(scores["mila"])',
    options: [
      'Use scores.get("mila", 0)',
      'Wrap the dictionary in a list',
      'Replace print with input',
      'Use scores["ana"] instead',
    ],
    correctAnswer: 0,
    explanation: 'get returns a default value instead of raising an error.',
    expectedDurationSeconds: 50,
  }),
];

const additionalPythonSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineChoiceSeedQuestion({
    templateId: 'bench-python-beginner-types-read-1',
    language: 'python',
    packIds: ['python-beginner-fundamentals'],
    lessonId: 'python-variables-2',
    lessonTitle: 'Variables and Basic Types',
    competency: 'Syntax fluency',
    questionType: 'code_reading_comprehension',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nvalue = int("4")\nprint(value + 1)',
    options: ['41', '5', '"5"', 'Error'],
    correctAnswer: 1,
    explanation: 'int("4") converts the string into the integer 4 before adding 1.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-python-junior-ds-read-1',
    language: 'python',
    packIds: ['python-junior-interview-prep'],
    lessonId: 'python-data-structures',
    lessonTitle: 'Data Structures',
    competency: 'Data structures basics',
    questionType: 'code_tracing',
    skillBucket: 'data_structures_basics',
    difficulty: 'advanced',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\npairs = {"a": [1, 2], "b": [3]}\ntotal = 0\nfor number in pairs["a"]:\n    total += number\nprint(total)',
    options: ['2', '3', '6', 'Error'],
    correctAnswer: 1,
    explanation: 'pairs["a"] contains [1, 2], so the total is 3.',
  }),
];

const javascriptSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineChoiceSeedQuestion({
    templateId: 'bench-js-beginner-syntax-output-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-strings-1',
    lessonTitle: 'Strings and Template Literals',
    competency: 'Syntax fluency',
    questionType: 'output_prediction',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'theory',
    prompt: 'What is logged?\n\nconst name = "Codhak";\nconsole.log(name + " ready");',
    options: ['Codhakready', 'Codhak ready', 'name ready', 'Error'],
    correctAnswer: 1,
    explanation: 'The second string includes the leading space, so the output is `Codhak ready`.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-beginner-types-read-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-numbers-1',
    lessonTitle: 'Numbers, Math, and Type Conversion',
    competency: 'Syntax fluency',
    questionType: 'code_reading_comprehension',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nconst count = Number("4");\nconsole.log(count + 2);',
    options: ['42', '6', '"6"', 'Error'],
    correctAnswer: 1,
    explanation: 'Number("4") converts the string into the number 4 before the addition.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-beginner-flow-trace-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-conditionals-1',
    lessonTitle: 'Conditional Logic',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nconst score = 6;\nif (score > 7) {\n  console.log("A");\n} else {\n  console.log("B");\n}',
    options: ['A', 'B', 'A then B', 'Nothing'],
    correctAnswer: 1,
    explanation: '6 is not greater than 7, so the `else` branch runs.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-beginner-ds-read-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-arrays-1',
    lessonTitle: 'Arrays',
    competency: 'Data structures basics',
    questionType: 'code_reading_comprehension',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nconst tags = ["api", "ui", "db"];\nconsole.log(tags[1]);',
    options: ['api', 'ui', 'db', 'undefined'],
    correctAnswer: 1,
    explanation: 'Arrays are zero-indexed, so index 1 is the second item.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-beginner-function-completion-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-functions-1',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'code_completion',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(name)` so it returns `"Hi " + name`.',
    starterCode: 'function solution(name) {\n  return ;\n}\n',
    referenceCode: 'function solution(name) {\n  return "Hi " + name;\n}\n',
    validationMode: 'includes_all',
    requiredSnippets: ['return', '"Hi "', 'name'],
    explanation: 'Return the greeting string instead of logging it.',
    expectedDurationSeconds: 150,
    discrimination: 0.72,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-beginner-function-write-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-functions-1',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(word)` so it returns the number of characters in `word`.',
    starterCode: 'function solution(word) {\n  // return the number of characters\n}\n',
    referenceCode: 'function solution(word) {\n  return word.length;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-beginner-function-write-1'),
    publicTestCases: getSeedPublicTestCases('bench-js-beginner-function-write-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', '.length'],
    explanation: 'The simplest correct answer returns `word.length`.',
    expectedDurationSeconds: 170,
    discrimination: 0.75,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-beginner-debug-fix-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-debugging-1',
    lessonTitle: 'Debugging with the Browser Console',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Which change fixes the bug?\n\nconst name = prompt("Name");\nconsole.log("Hello " + name());',
    options: [
      'Change it to `console.log("Hello " + name);`',
      'Change `prompt("Name")` to `prompt`',
      'Wrap `name` in square brackets',
      'Add a second `console.log`',
    ],
    correctAnswer: 0,
    explanation: 'The result of `prompt()` is already a string, so calling `name()` crashes.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-beginner-debug-code-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-debugging-1',
    lessonTitle: 'Debugging with the Browser Console',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(values)` so it returns the count of positive numbers.',
    starterCode: 'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value < 0) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
    referenceCode: 'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value > 0) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-beginner-debug-code-1'),
    publicTestCases: getSeedPublicTestCases('bench-js-beginner-debug-code-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (const value of values)', 'if (value > 0)', 'count += 1'],
    explanation: 'The current logic counts negatives instead of positives.',
    expectedDurationSeconds: 190,
    discrimination: 0.8,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-beginner-mini-problem-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-project-1',
    lessonTitle: 'Project 1: Build a Simple JavaScript Calculator',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(values)` so it returns how many numbers in `values` are greater than 10.',
    starterCode: 'function solution(values) {\n  let count = 0;\n  // count numbers greater than 10\n  return count;\n}\n',
    referenceCode: 'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value > 10) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-beginner-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-js-beginner-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (const value of values)', 'if (value > 10)', 'count += 1'],
    explanation: 'Scan once and return the final count.',
    expectedDurationSeconds: 220,
    discrimination: 0.84,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-beginner-pressure-read-1',
    language: 'javascript',
    packIds: ['javascript-beginner-fundamentals'],
    lessonId: 'javascript-loops-1',
    lessonTitle: 'Loops',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nlet total = 0;\nfor (const value of [1, 2, 3]) {\n  total += value;\n}\nconsole.log(total);',
    options: ['3', '5', '6', '123'],
    correctAnswer: 2,
    explanation: 'The loop accumulates 1 + 2 + 3 and logs 6.',
    expectedDurationSeconds: 55,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-read-fast-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-arrays-1',
    lessonTitle: 'Arrays',
    competency: 'Code reading',
    questionType: 'code_reading_comprehension',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nfunction solve(values) {\n  let total = 0;\n  for (const value of values) {\n    if (value % 2 === 0) {\n      total += value;\n    }\n  }\n  return total;\n}\nconsole.log(solve([1, 2, 4, 5]));',
    options: ['6', '7', '12', 'Error'],
    correctAnswer: 0,
    explanation: 'Only 2 and 4 are even, so the total is 6.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-predict-output-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-objects-1',
    lessonTitle: 'Objects',
    competency: 'Code reading',
    questionType: 'output_prediction',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nconst scores = { ana: 4, leo: 7 };\nconsole.log(scores.mila ?? 0);',
    options: ['undefined', '0', '7', 'Error'],
    correctAnswer: 1,
    explanation: 'The nullish coalescing operator falls back to 0 when the property is missing.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-best-fix-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-debugging-1',
    lessonTitle: 'Debugging with the Browser Console',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this function return the first even value?\n\nfunction firstEven(values) {\n  for (const value of values) {\n    if (value % 2 === 1) {\n      return value;\n    }\n  }\n  return null;\n}',
    options: [
      'Change `value % 2 === 1` to `value % 2 === 0`',
      'Move `return null` inside the loop',
      'Replace the loop with `console.log(values)`',
      'Change `return value` to `console.log(value)`',
    ],
    correctAnswer: 0,
    explanation: 'The function currently returns the first odd value. It should check for even numbers.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-junior-debug-code-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-debugging-1',
    lessonTitle: 'Debugging with the Browser Console',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'advanced',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(values)` so it returns the largest number in the array.',
    starterCode: 'function solution(values) {\n  let largest = 0;\n  for (const value of values) {\n    if (value < largest) {\n      largest = value;\n    }\n  }\n  return largest;\n}\n',
    referenceCode: 'function solution(values) {\n  let largest = values[0];\n  for (const value of values) {\n    if (value > largest) {\n      largest = value;\n    }\n  }\n  return largest;\n}\n',
    validationMode: 'includes_all',
    requiredSnippets: ['for (const value of values)', 'if (value > largest)', 'return largest'],
    explanation: 'The current solution compares in the wrong direction and starts from a brittle initial value.',
    expectedDurationSeconds: 205,
    discrimination: 0.84,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-junior-write-helper-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-functions-1',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(text)` so it returns the number of vowels in `text`.',
    starterCode: 'function solution(text) {\n  let count = 0;\n  // count vowels\n  return count;\n}\n',
    referenceCode: 'function solution(text) {\n  let count = 0;\n  for (const char of text.toLowerCase()) {\n    if ("aeiou".includes(char)) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-junior-write-helper-1'),
    publicTestCases: getSeedPublicTestCases('bench-js-junior-write-helper-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (const char of', 'includes(char)', 'count += 1'],
    explanation: 'Iterate once, check for vowels, and return the count.',
    expectedDurationSeconds: 180,
    discrimination: 0.78,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-junior-complete-data-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-arrays-1',
    lessonTitle: 'Arrays',
    competency: 'Data structures basics',
    questionType: 'code_completion',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(values)` so it returns a new array containing only the positive values.',
    starterCode: 'function solution(values) {\n  const result = [];\n  for (const value of values) {\n    if (value > 0) {\n      \n    }\n  }\n  return result;\n}\n',
    referenceCode: 'function solution(values) {\n  const result = [];\n  for (const value of values) {\n    if (value > 0) {\n      result.push(value);\n    }\n  }\n  return result;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-junior-complete-data-1'),
    publicTestCases: getSeedPublicTestCases('bench-js-junior-complete-data-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['result.push', 'if (value > 0)', 'return result'],
    explanation: 'Push each positive value into the result array.',
    expectedDurationSeconds: 175,
    discrimination: 0.77,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-ds-read-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-objects-1',
    lessonTitle: 'Objects',
    competency: 'Data structures basics',
    questionType: 'code_tracing',
    skillBucket: 'data_structures_basics',
    difficulty: 'advanced',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nconst groups = { a: [1, 2], b: [3] };\nlet total = 0;\nfor (const value of groups.a) {\n  total += value;\n}\nconsole.log(total);',
    options: ['2', '3', '6', 'Error'],
    correctAnswer: 1,
    explanation: 'The loop only iterates over `groups.a`, which contains 1 and 2.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-flow-read-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-loops-1',
    lessonTitle: 'Loops',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nlet count = 0;\nfor (const value of [2, 3, 4, 5]) {\n  if (value % 2 === 0) {\n    count += 1;\n  }\n}\nconsole.log(count);',
    options: ['1', '2', '3', '4'],
    correctAnswer: 1,
    explanation: 'Only 2 and 4 are even, so the final count is 2.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-junior-mini-problem-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-higher-order-1',
    lessonTitle: 'Higher-Order Functions and Callbacks',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(values, target)` so it returns `true` if `target` appears in `values`, else `false`.',
    starterCode: 'function solution(values, target) {\n  // return true when target is present\n  return false;\n}\n',
    referenceCode: 'function solution(values, target) {\n  for (const value of values) {\n    if (value === target) {\n      return true;\n    }\n  }\n  return false;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-junior-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-js-junior-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (const value of values)', 'if (value === target)', 'return true', 'return false'],
    explanation: 'A single scan is enough. Return as soon as you find the target.',
    expectedDurationSeconds: 225,
    discrimination: 0.85,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-js-junior-mini-problem-2',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-strings-1',
    lessonTitle: 'Strings and Template Literals',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(text)` so it returns `true` when `text` reads the same forward and backward.',
    starterCode: 'function solution(text) {\n  // return true when text is a palindrome\n  return false;\n}\n',
    referenceCode: 'function solution(text) {\n  return text === text.split("").reverse().join("");\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-js-junior-mini-problem-2'),
    publicTestCases: getSeedPublicTestCases('bench-js-junior-mini-problem-2'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', '.split("")', '.reverse()', '.join("")'],
    explanation: 'Compare the string with its reversed form.',
    expectedDurationSeconds: 205,
    discrimination: 0.8,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-pressure-read-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-arrays-1',
    lessonTitle: 'Arrays',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is logged?\n\nconst values = [1, 2, 3];\nconsole.log(values[values.length - 1] + values[0]);',
    options: ['2', '3', '4', '5'],
    correctAnswer: 2,
    explanation: 'The last value is 3 and the first is 1, so the result is 4.',
    expectedDurationSeconds: 55,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-js-junior-pressure-fix-1',
    language: 'javascript',
    packIds: ['javascript-junior-interview-prep'],
    lessonId: 'javascript-debugging-1',
    lessonTitle: 'Debugging with the Browser Console',
    competency: 'Speed under pressure',
    questionType: 'choose_the_best_fix',
    skillBucket: 'speed_under_pressure',
    difficulty: 'advanced',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this code safe when the property is missing?\n\nconst scores = { ana: 4 };\nconsole.log(scores.mila.toString());',
    options: [
      'Change it to `console.log(String(scores.mila ?? 0));`',
      'Replace `scores` with an array',
      'Delete `console.log`',
      'Use `scores.ana` instead',
    ],
    correctAnswer: 0,
    explanation: 'Provide a fallback before converting the value to a string.',
    expectedDurationSeconds: 50,
  }),
];

const javaBeginnerSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineChoiceSeedQuestion({
    templateId: 'bench-java-beginner-syntax-output-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-intro-1',
    lessonTitle: 'What Java Is, the JDK, and Your First Program',
    competency: 'Syntax fluency',
    questionType: 'output_prediction',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'theory',
    prompt: 'What is printed?\n\nString name = "Codhak";\nSystem.out.println(name + " ready");',
    options: ['Codhakready', 'Codhak ready', 'name ready', 'Error'],
    correctAnswer: 1,
    explanation: 'The second string already contains the leading space.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-beginner-types-read-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-variables-1',
    lessonTitle: 'Variables and Primitive Data Types',
    competency: 'Syntax fluency',
    questionType: 'code_reading_comprehension',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nint value = Integer.parseInt("4");\nSystem.out.println(value + 1);',
    options: ['41', '5', '"5"', 'Error'],
    correctAnswer: 1,
    explanation: 'The string is parsed into the integer 4 before the addition.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-beginner-flow-trace-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-conditionals-1',
    lessonTitle: 'Conditional Logic',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nint score = 6;\nif (score > 7) {\n  System.out.println("A");\n} else {\n  System.out.println("B");\n}',
    options: ['A', 'B', 'A then B', 'Nothing'],
    correctAnswer: 1,
    explanation: '6 is not greater than 7, so the else branch runs.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-beginner-ds-read-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-arrays-1',
    lessonTitle: 'Arrays and Basic Problem Solving',
    competency: 'Data structures basics',
    questionType: 'code_reading_comprehension',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nint[] values = {3, 5, 7};\nSystem.out.println(values[1]);',
    options: ['3', '5', '7', 'Error'],
    correctAnswer: 1,
    explanation: 'Arrays are zero-indexed, so index 1 points to the second element.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-beginner-function-completion-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-methods-1',
    lessonTitle: 'Methods',
    competency: 'Functions / methods',
    questionType: 'code_completion',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(String name)` so it returns `"Hi " + name`.',
    starterCode: 'static String solution(String name) {\n    return ;\n}\n',
    referenceCode: 'static String solution(String name) {\n    return "Hi " + name;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-beginner-function-completion-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-beginner-function-completion-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', '"Hi "', 'name'],
    explanation: 'Return the greeting string instead of printing it.',
    expectedDurationSeconds: 150,
    discrimination: 0.72,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-beginner-function-write-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-methods-1',
    lessonTitle: 'Methods',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(String word)` so it returns the number of characters in `word`.',
    starterCode: 'static int solution(String word) {\n    // return the number of characters\n    return 0;\n}\n',
    referenceCode: 'static int solution(String word) {\n    return word.length();\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-beginner-function-write-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-beginner-function-write-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', '.length()'],
    explanation: 'The simplest correct answer returns `word.length()`.',
    expectedDurationSeconds: 170,
    discrimination: 0.75,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-beginner-debug-fix-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Which change fixes the bug?\n\nString name = "Ada";\nSystem.out.println("Hello " + name());',
    options: [
      'Change it to `System.out.println("Hello " + name);`',
      'Change `String` to `int`',
      'Add another `println`',
      'Wrap `name` in brackets',
    ],
    correctAnswer: 0,
    explanation: '`name` is a string variable, not a method, so calling `name()` is invalid.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-beginner-debug-code-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(int[] values)` so it returns the count of positive numbers.',
    starterCode: 'static int solution(int[] values) {\n    int count = 0;\n    for (int value : values) {\n        if (value < 0) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    referenceCode: 'static int solution(int[] values) {\n    int count = 0;\n    for (int value : values) {\n        if (value > 0) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-beginner-debug-code-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-beginner-debug-code-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value > 0)', 'count += 1'],
    explanation: 'The current logic counts negatives instead of positives.',
    expectedDurationSeconds: 195,
    discrimination: 0.8,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-beginner-mini-problem-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-project-1',
    lessonTitle: 'Project 1: Build a Console Calculator and Number Toolkit',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(int[] values)` so it returns how many numbers in `values` are greater than 10.',
    starterCode: 'static int solution(int[] values) {\n    int count = 0;\n    // count numbers greater than 10\n    return count;\n}\n',
    referenceCode: 'static int solution(int[] values) {\n    int count = 0;\n    for (int value : values) {\n        if (value > 10) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-beginner-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-beginner-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value > 10)', 'count += 1'],
    explanation: 'Scan once and return the final count.',
    expectedDurationSeconds: 220,
    discrimination: 0.84,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-beginner-pressure-read-1',
    language: 'java',
    packIds: ['java-beginner-oop-foundations'],
    lessonId: 'java-loops-1',
    lessonTitle: 'Loops',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nint total = 0;\nfor (int value : new int[]{1, 2, 3}) {\n    total += value;\n}\nSystem.out.println(total);',
    options: ['3', '5', '6', '123'],
    correctAnswer: 2,
    explanation: 'The loop accumulates 1 + 2 + 3 and prints 6.',
    expectedDurationSeconds: 55,
  }),
];

const javaJuniorSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-read-fast-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-arraylist-1',
    lessonTitle: 'Lists and ArrayList',
    competency: 'Code reading',
    questionType: 'code_reading_comprehension',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nstatic int solve(java.util.List<Integer> values) {\n    int total = 0;\n    for (int value : values) {\n        if (value % 2 == 0) {\n            total += value;\n        }\n    }\n    return total;\n}\nSystem.out.println(solve(java.util.List.of(1, 2, 4, 5)));',
    options: ['6', '7', '12', 'Error'],
    correctAnswer: 0,
    explanation: 'Only 2 and 4 are even, so the total is 6.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-predict-output-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-maps-1',
    lessonTitle: 'Sets, Maps, Queues, and Choosing the Right Collection',
    competency: 'Code reading',
    questionType: 'output_prediction',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\njava.util.Map<String, Integer> scores = java.util.Map.of("ana", 4, "leo", 7);\nSystem.out.println(scores.getOrDefault("mila", 0));',
    options: ['null', '0', '7', 'Error'],
    correctAnswer: 1,
    explanation: 'getOrDefault returns 0 when the key is missing.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-best-fix-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this method return the first even value?\n\nstatic Integer firstEven(java.util.List<Integer> values) {\n    for (int value : values) {\n        if (value % 2 == 1) {\n            return value;\n        }\n    }\n    return null;\n}',
    options: [
      'Change `value % 2 == 1` to `value % 2 == 0`',
      'Move `return null` inside the loop',
      'Replace the loop with `System.out.println(values)`',
      'Change `return value` to `break`',
    ],
    correctAnswer: 0,
    explanation: 'The method currently returns the first odd value instead of the first even one.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-junior-debug-code-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'advanced',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(int[] values)` so it returns the largest number in the array.',
    starterCode: 'static int solution(int[] values) {\n    int largest = 0;\n    for (int value : values) {\n        if (value < largest) {\n            largest = value;\n        }\n    }\n    return largest;\n}\n',
    referenceCode: 'static int solution(int[] values) {\n    int largest = values[0];\n    for (int value : values) {\n        if (value > largest) {\n            largest = value;\n        }\n    }\n    return largest;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-junior-debug-code-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-junior-debug-code-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value > largest)', 'return largest'],
    explanation: 'The current solution compares in the wrong direction and starts from a brittle initial value.',
    expectedDurationSeconds: 205,
    discrimination: 0.84,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-junior-write-helper-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-methods-1',
    lessonTitle: 'Methods',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(String text)` so it returns the number of vowels in `text`.',
    starterCode: 'static int solution(String text) {\n    int count = 0;\n    // count vowels\n    return count;\n}\n',
    referenceCode: 'static int solution(String text) {\n    int count = 0;\n    for (char ch : text.toLowerCase().toCharArray()) {\n        if ("aeiou".indexOf(ch) >= 0) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-junior-write-helper-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-junior-write-helper-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (char ch :', 'indexOf(ch) >= 0', 'count += 1'],
    explanation: 'Iterate once, test each lowercased character, and return the count.',
    expectedDurationSeconds: 185,
    discrimination: 0.78,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-junior-complete-data-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-arraylist-1',
    lessonTitle: 'Lists and ArrayList',
    competency: 'Data structures basics',
    questionType: 'code_completion',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(int[] values)` so it returns a list containing only the positive values.',
    starterCode: 'static java.util.List<Integer> solution(int[] values) {\n    java.util.List<Integer> result = new java.util.ArrayList<>();\n    for (int value : values) {\n        if (value > 0) {\n            \n        }\n    }\n    return result;\n}\n',
    referenceCode: 'static java.util.List<Integer> solution(int[] values) {\n    java.util.List<Integer> result = new java.util.ArrayList<>();\n    for (int value : values) {\n        if (value > 0) {\n            result.add(value);\n        }\n    }\n    return result;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-junior-complete-data-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-junior-complete-data-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['result.add', 'if (value > 0)', 'return result'],
    explanation: 'Add each positive value to the result list.',
    expectedDurationSeconds: 185,
    discrimination: 0.77,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-ds-read-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-maps-1',
    lessonTitle: 'Sets, Maps, Queues, and Choosing the Right Collection',
    competency: 'Data structures basics',
    questionType: 'code_tracing',
    skillBucket: 'data_structures_basics',
    difficulty: 'advanced',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\njava.util.Map<String, java.util.List<Integer>> groups = java.util.Map.of("a", java.util.List.of(1, 2), "b", java.util.List.of(3));\nint total = 0;\nfor (int value : groups.get("a")) {\n    total += value;\n}\nSystem.out.println(total);',
    options: ['2', '3', '6', 'Error'],
    correctAnswer: 1,
    explanation: 'Only the list at key `"a"` is iterated, so the total is 3.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-flow-read-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-loops-1',
    lessonTitle: 'Loops',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nint count = 0;\nfor (int value : new int[]{2, 3, 4, 5}) {\n    if (value % 2 == 0) {\n        count += 1;\n    }\n}\nSystem.out.println(count);',
    options: ['1', '2', '3', '4'],
    correctAnswer: 1,
    explanation: 'Only 2 and 4 are even, so the final count is 2.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-junior-mini-problem-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-project-3',
    lessonTitle: 'Project 3: Build a Banking System Simulator',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(int[] values, int target)` so it returns `true` if `target` appears in `values`, else `false`.',
    starterCode: 'static boolean solution(int[] values, int target) {\n    // return true when target appears in values\n    return false;\n}\n',
    referenceCode: 'static boolean solution(int[] values, int target) {\n    for (int value : values) {\n        if (value == target) {\n            return true;\n        }\n    }\n    return false;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-junior-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-java-junior-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value == target)', 'return true', 'return false'],
    explanation: 'A single scan is enough. Return as soon as you find the target.',
    expectedDurationSeconds: 225,
    discrimination: 0.85,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-java-junior-mini-problem-2',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-strings-1',
    lessonTitle: 'Strings and Common String Methods',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(String text)` so it returns `true` when `text` reads the same forward and backward.',
    starterCode: 'static boolean solution(String text) {\n    // return true when text is a palindrome\n    return false;\n}\n',
    referenceCode: 'static boolean solution(String text) {\n    return text.equals(new StringBuilder(text).reverse().toString());\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-java-junior-mini-problem-2'),
    publicTestCases: getSeedPublicTestCases('bench-java-junior-mini-problem-2'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', 'new StringBuilder(text)', '.reverse()', '.toString()'],
    explanation: 'Compare the string with its reversed form.',
    expectedDurationSeconds: 210,
    discrimination: 0.8,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-pressure-read-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-arrays-1',
    lessonTitle: 'Arrays and Basic Problem Solving',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What is printed?\n\nint[] values = {1, 2, 3};\nSystem.out.println(values[values.length - 1] + values[0]);',
    options: ['2', '3', '4', '5'],
    correctAnswer: 2,
    explanation: 'The last value is 3 and the first is 1, so the result is 4.',
    expectedDurationSeconds: 55,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-java-junior-pressure-fix-1',
    language: 'java',
    packIds: ['java-junior-class-ds-prep'],
    lessonId: 'java-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Speed under pressure',
    questionType: 'choose_the_best_fix',
    skillBucket: 'speed_under_pressure',
    difficulty: 'advanced',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this code safe when the key is missing?\n\njava.util.Map<String, Integer> scores = java.util.Map.of("ana", 4);\nSystem.out.println(scores.get("mila").toString());',
    options: [
      'Change it to `System.out.println(String.valueOf(scores.getOrDefault("mila", 0)));`',
      'Replace the map with an array',
      'Delete the println line',
      'Use `scores.get("ana")` instead',
    ],
    correctAnswer: 0,
    explanation: 'Provide a fallback before converting the value to a string.',
    expectedDurationSeconds: 50,
  }),
];

const javaSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  ...javaBeginnerSeedQuestions,
  ...javaJuniorSeedQuestions,
];

const cppBeginnerSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-beginner-syntax-output-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-intro-1',
    lessonTitle: 'What C++ Is and Where It Runs',
    competency: 'Syntax fluency',
    questionType: 'output_prediction',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'theory',
    prompt: 'What does this print?\n\nstd::string name = "Codhak";\nstd::cout << name << " ready";',
    options: ['Codhakready', 'Codhak ready', 'name ready', 'Error'],
    correctAnswer: 1,
    explanation: 'The string literal already contains the leading space.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-beginner-types-read-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-variables-1',
    lessonTitle: 'Variables and Primitive Data Types',
    competency: 'Syntax fluency',
    questionType: 'code_reading_comprehension',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nint value = 4;\nstd::cout << value + 1;',
    options: ['41', '5', '"5"', 'Error'],
    correctAnswer: 1,
    explanation: 'This is integer addition, so the result is 5.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-beginner-flow-trace-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-conditionals-1',
    lessonTitle: 'Conditional Logic',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nint score = 6;\nif (score > 7) {\n    std::cout << "A";\n} else {\n    std::cout << "B";\n}',
    options: ['A', 'B', 'A then B', 'Nothing'],
    correctAnswer: 1,
    explanation: '6 is not greater than 7, so the else branch runs.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-beginner-ds-read-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-vectors-1',
    lessonTitle: 'First Containers',
    competency: 'Data structures basics',
    questionType: 'code_reading_comprehension',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nstd::vector<int> values = {3, 5, 7};\nstd::cout << values[1];',
    options: ['3', '5', '7', 'Error'],
    correctAnswer: 1,
    explanation: 'Vectors are zero-indexed, so index 1 points to the second value.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-beginner-function-completion-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-functions-1',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'code_completion',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(std::string name)` so it returns `"Hi " + name`.',
    starterCode: 'std::string solution(std::string name) {\n    return ;\n}\n',
    referenceCode: 'std::string solution(std::string name) {\n    return "Hi " + name;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-beginner-function-completion-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-beginner-function-completion-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', '"Hi "', 'name'],
    explanation: 'Return the greeting string instead of printing it.',
    expectedDurationSeconds: 150,
    discrimination: 0.72,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-beginner-function-write-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-functions-1',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(const std::string& word)` so it returns the number of characters in `word`.',
    starterCode: 'int solution(const std::string& word) {\n    // return the number of characters\n    return 0;\n}\n',
    referenceCode: 'int solution(const std::string& word) {\n    return static_cast<int>(word.size());\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-beginner-function-write-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-beginner-function-write-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', 'word.size()'],
    explanation: 'Return the string size as an integer.',
    expectedDurationSeconds: 175,
    discrimination: 0.75,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-beginner-debug-fix-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Which change fixes the bug?\n\nstd::string name = "Ada";\nstd::cout << "Hello " << name();',
    options: [
      'Change it to `std::cout << "Hello " << name;`',
      'Change `std::string` to `int`',
      'Add another `std::cout`',
      'Put `name` inside brackets',
    ],
    correctAnswer: 0,
    explanation: '`name` is a string variable, not a function, so calling `name()` is invalid.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-beginner-debug-code-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(const std::vector<int>& values)` so it returns the count of positive numbers.',
    starterCode: 'int solution(const std::vector<int>& values) {\n    int count = 0;\n    for (int value : values) {\n        if (value < 0) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    referenceCode: 'int solution(const std::vector<int>& values) {\n    int count = 0;\n    for (int value : values) {\n        if (value > 0) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-beginner-debug-code-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-beginner-debug-code-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value > 0)', 'count += 1'],
    explanation: 'The current logic counts negatives instead of positives.',
    expectedDurationSeconds: 195,
    discrimination: 0.8,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-beginner-mini-problem-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-project-1',
    lessonTitle: 'Project 1: Console Toolkit',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(const std::vector<int>& values)` so it returns how many numbers in `values` are greater than 10.',
    starterCode: 'int solution(const std::vector<int>& values) {\n    int count = 0;\n    // count numbers greater than 10\n    return count;\n}\n',
    referenceCode: 'int solution(const std::vector<int>& values) {\n    int count = 0;\n    for (int value : values) {\n        if (value > 10) {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-beginner-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-beginner-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value > 10)', 'count += 1'],
    explanation: 'Scan once and return the final count.',
    expectedDurationSeconds: 220,
    discrimination: 0.84,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-beginner-pressure-read-1',
    language: 'cpp',
    packIds: ['cpp-beginner-structured-logic'],
    lessonId: 'cpp-loops-1',
    lessonTitle: 'Loops',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nint total = 0;\nfor (int value : std::vector<int>{1, 2, 3}) {\n    total += value;\n}\nstd::cout << total;',
    options: ['3', '5', '6', '123'],
    correctAnswer: 2,
    explanation: 'The loop accumulates 1 + 2 + 3 and prints 6.',
    expectedDurationSeconds: 55,
  }),
];

const cppJuniorSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-read-fast-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-vectors-1',
    lessonTitle: 'First Containers',
    competency: 'Code reading',
    questionType: 'code_reading_comprehension',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nint solve(const std::vector<int>& values) {\n    int total = 0;\n    for (int value : values) {\n        if (value % 2 == 0) {\n            total += value;\n        }\n    }\n    return total;\n}\nstd::cout << solve({1, 2, 4, 5});',
    options: ['6', '7', '12', 'Error'],
    correctAnswer: 0,
    explanation: 'Only 2 and 4 are even, so the total is 6.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-predict-output-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-maps-1',
    lessonTitle: 'Associative Containers',
    competency: 'Code reading',
    questionType: 'output_prediction',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nstd::map<std::string, int> scores{{"ana", 4}, {"leo", 7}};\nstd::cout << (scores.count("mila") ? scores["mila"] : 0);',
    options: ['0', '4', '7', 'Error'],
    correctAnswer: 0,
    explanation: 'The key `"mila"` is missing, so the ternary expression prints 0.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-best-fix-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
    prompt: 'Which fix makes this function return the first even value?\n\nint firstEven(const std::vector<int>& values) {\n    for (int value : values) {\n        if (value % 2 == 1) {\n            return value;\n        }\n    }\n    return -1;\n}',
    options: [
      'Change `value % 2 == 1` to `value % 2 == 0`',
      'Move `return -1` inside the loop',
      'Replace the loop with `std::cout << values.size();`',
      'Change `return value` to `break`',
    ],
    correctAnswer: 0,
    explanation: 'The function currently returns the first odd value instead of the first even one.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-junior-debug-code-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'advanced',
    assessmentType: 'debugging',
    prompt: 'Fix `solution(const std::vector<int>& values)` so it returns the largest number in the vector.',
    starterCode: 'int solution(const std::vector<int>& values) {\n    int largest = 0;\n    for (int value : values) {\n        if (value < largest) {\n            largest = value;\n        }\n    }\n    return largest;\n}\n',
    referenceCode: 'int solution(const std::vector<int>& values) {\n    int largest = values[0];\n    for (int value : values) {\n        if (value > largest) {\n            largest = value;\n        }\n    }\n    return largest;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-junior-debug-code-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-junior-debug-code-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value > largest)', 'return largest'],
    explanation: 'The current solution compares in the wrong direction and starts from a brittle initial value.',
    expectedDurationSeconds: 205,
    discrimination: 0.84,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-junior-write-helper-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-functions-1',
    lessonTitle: 'Functions',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(const std::string& text)` so it returns the number of vowels in `text`.',
    starterCode: 'int solution(const std::string& text) {\n    int count = 0;\n    // count vowels\n    return count;\n}\n',
    referenceCode: 'int solution(const std::string& text) {\n    int count = 0;\n    for (char ch : text) {\n        char lower = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));\n        if (lower == \'a\' || lower == \'e\' || lower == \'i\' || lower == \'o\' || lower == \'u\') {\n            count += 1;\n        }\n    }\n    return count;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-junior-write-helper-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-junior-write-helper-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (char ch : text)', 'count += 1', 'return count'],
    explanation: 'Iterate once, check for vowels, and return the count.',
    expectedDurationSeconds: 185,
    discrimination: 0.78,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-junior-complete-data-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-vectors-1',
    lessonTitle: 'First Containers',
    competency: 'Data structures basics',
    questionType: 'code_completion',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
    prompt: 'Complete `solution(const std::vector<int>& values)` so it returns a vector containing only the positive values.',
    starterCode: 'std::vector<int> solution(const std::vector<int>& values) {\n    std::vector<int> result;\n    for (int value : values) {\n        if (value > 0) {\n            \n        }\n    }\n    return result;\n}\n',
    referenceCode: 'std::vector<int> solution(const std::vector<int>& values) {\n    std::vector<int> result;\n    for (int value : values) {\n        if (value > 0) {\n            result.push_back(value);\n        }\n    }\n    return result;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-junior-complete-data-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-junior-complete-data-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['result.push_back', 'if (value > 0)', 'return result'],
    explanation: 'Push each positive value into the result vector.',
    expectedDurationSeconds: 185,
    discrimination: 0.77,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-ds-read-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-maps-1',
    lessonTitle: 'Associative Containers',
    competency: 'Data structures basics',
    questionType: 'code_tracing',
    skillBucket: 'data_structures_basics',
    difficulty: 'advanced',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nstd::map<std::string, std::vector<int>> groups{{"a", {1, 2}}, {"b", {3}}};\nint total = 0;\nfor (int value : groups["a"]) {\n    total += value;\n}\nstd::cout << total;',
    options: ['2', '3', '6', 'Error'],
    correctAnswer: 1,
    explanation: 'Only the vector at key `"a"` is iterated, so the total is 3.',
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-flow-read-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-loops-1',
    lessonTitle: 'Loops',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nint count = 0;\nfor (int value : std::vector<int>{2, 3, 4, 5}) {\n    if (value % 2 == 0) {\n        count += 1;\n    }\n}\nstd::cout << count;',
    options: ['1', '2', '3', '4'],
    correctAnswer: 1,
    explanation: 'Only 2 and 4 are even, so the final count is 2.',
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-junior-mini-problem-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-project-3',
    lessonTitle: 'Project 3: Text RPG or Shape System',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(const std::vector<int>& values, int target)` so it returns `true` if `target` appears in `values`, else `false`.',
    starterCode: 'bool solution(const std::vector<int>& values, int target) {\n    // return true when target appears in values\n    return false;\n}\n',
    referenceCode: 'bool solution(const std::vector<int>& values, int target) {\n    for (int value : values) {\n        if (value == target) {\n            return true;\n        }\n    }\n    return false;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-junior-mini-problem-1'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-junior-mini-problem-1'),
    validationMode: 'includes_all',
    requiredSnippets: ['for (int value : values)', 'if (value == target)', 'return true', 'return false'],
    explanation: 'A single scan is enough. Return as soon as you find the target.',
    expectedDurationSeconds: 225,
    discrimination: 0.85,
  }),
  defineCodeSeedQuestion({
    templateId: 'bench-cpp-junior-mini-problem-2',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-strings-1',
    lessonTitle: 'Strings',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
    prompt: 'Implement `solution(const std::string& text)` so it returns `true` when `text` reads the same forward and backward.',
    starterCode: 'bool solution(const std::string& text) {\n    // return true when text is a palindrome\n    return false;\n}\n',
    referenceCode: 'bool solution(const std::string& text) {\n    return std::string(text.rbegin(), text.rend()) == text;\n}\n',
    evaluationStrategy: 'execution',
    executionCases: getSeedExecutionCases('bench-cpp-junior-mini-problem-2'),
    publicTestCases: getSeedPublicTestCases('bench-cpp-junior-mini-problem-2'),
    validationMode: 'includes_all',
    requiredSnippets: ['return', 'text.rbegin()', 'text.rend()'],
    explanation: 'Compare the string with its reversed form.',
    expectedDurationSeconds: 210,
    discrimination: 0.8,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-pressure-read-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-vectors-1',
    lessonTitle: 'First Containers',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
    prompt: 'What does this print?\n\nstd::vector<int> values{1, 2, 3};\nstd::cout << values.back() + values.front();',
    options: ['2', '3', '4', '5'],
    correctAnswer: 2,
    explanation: 'The last value is 3 and the first is 1, so the result is 4.',
    expectedDurationSeconds: 55,
  }),
  defineChoiceSeedQuestion({
    templateId: 'bench-cpp-junior-pressure-fix-1',
    language: 'cpp',
    packIds: ['cpp-junior-problem-solving'],
    lessonId: 'cpp-debugging-1',
    lessonTitle: 'Compilation Errors, Runtime Errors, and Debugging',
    competency: 'Speed under pressure',
    questionType: 'choose_the_best_fix',
    skillBucket: 'speed_under_pressure',
    difficulty: 'advanced',
    assessmentType: 'debugging',
    prompt: 'Which fix avoids an off-by-one crash here?\n\nfor (int i = 0; i <= values.size(); ++i) {\n    std::cout << values[i];\n}',
    options: [
      'Change it to `for (int i = 0; i < values.size(); ++i)`',
      'Change `++i` to `i--`',
      'Replace `values[i]` with `values.size()`',
      'Wrap the loop in another loop',
    ],
    correctAnswer: 0,
    explanation: 'Using `<=` iterates one step past the last valid index.',
    expectedDurationSeconds: 50,
  }),
];

const cppSeedQuestions: BenchmarkSeedQuestionTemplate[] = [
  ...cppBeginnerSeedQuestions,
  ...cppJuniorSeedQuestions,
];

const dedupeTemplatesById = (templates: BenchmarkSeedQuestionTemplate[] = []) =>
  Array.from(new Map(templates.map((template) => [template.templateId, template])).values());

const expandedTemplatesByLanguage =
  benchmarkExpandedSeedTemplatesByLanguage as Partial<Record<LanguageSlug, BenchmarkSeedQuestionTemplate[]>>;

const seededTemplatesByLanguage: Partial<Record<LanguageSlug, BenchmarkSeedQuestionTemplate[]>> = {
  python: [
    ...pythonSeedQuestions,
    ...additionalPythonSeedQuestions,
    ...(expandedTemplatesByLanguage.python || []),
  ].map(enrichSeedTemplateRemediation),
  javascript: [...javascriptSeedQuestions, ...(expandedTemplatesByLanguage.javascript || [])].map(
    enrichSeedTemplateRemediation
  ),
  java: [...javaSeedQuestions, ...(expandedTemplatesByLanguage.java || [])].map(enrichSeedTemplateRemediation),
  cpp: [...cppSeedQuestions, ...(expandedTemplatesByLanguage.cpp || [])].map(enrichSeedTemplateRemediation),
};

export const getQuestionTemplatesForPack = (pack: BenchmarkPackDefinition) => {
  const seeded = (seededTemplatesByLanguage[pack.language] || []).filter(
    (template) => !template.packIds || template.packIds.includes(pack.id)
  );
  return dedupeTemplatesById(seeded);
};

const buildRetakeBlueprint = (
  pack: BenchmarkPackDefinition,
  targetWeaknesses: BenchmarkSkillBucket[]
): BenchmarkBlueprintSlot[] => {
  const fullBlueprint = pack.questionBlueprint.full;
  const priority = targetWeaknesses.length > 0 ? targetWeaknesses : pack.retakeBlueprintBuckets;
  const selected: BenchmarkBlueprintSlot[] = [];

  priority.forEach((bucket) => {
    const slot = fullBlueprint.find(
      (candidate) =>
        candidate.skillBucket === bucket &&
        !selected.some((existing) => existing.slotId === candidate.slotId)
    );
    if (slot) {
      selected.push({ ...slot, slotId: `${slot.slotId}-retake` });
    }
  });

  const fallbackSlots = fullBlueprint.filter(
    (slot) => !selected.some((existing) => existing.slotId.replace(/-retake$/, '') === slot.slotId)
  );

  while (selected.length < 4 && fallbackSlots.length > 0) {
    const fallback = fallbackSlots.shift();
    if (!fallback) break;
    selected.push({ ...fallback, slotId: `${fallback.slotId}-retake-${selected.length + 1}` });
  }

  return selected.slice(0, 4);
};

const getBlueprintForFormat = (
  pack: BenchmarkPackDefinition,
  format: BenchmarkFormat,
  targetWeaknesses: BenchmarkSkillBucket[] = []
) => (format === 'retake' ? buildRetakeBlueprint(pack, targetWeaknesses) : pack.questionBlueprint[format === 'full' ? 'full' : 'quick']);

const benchmarkSetupMatches = (left: BenchmarkSetup, right: BenchmarkSetup) =>
  left.goal === right.goal && left.language === right.language && left.roleLevel === right.roleLevel;

export const getBenchmarkAttemptIndex = (setup: BenchmarkSetup, reports: BenchmarkReport[]) =>
  reports.filter((report) => benchmarkSetupMatches(report.setup, setup)).length;

const getPackIdForReport = (report: BenchmarkReport) => report.packId || mapSetupToPackId(report.setup);

const getEvidencePercentForReport = (report: BenchmarkReport) =>
  report.evidenceProfile?.percent ?? report.confidenceBand?.percent ?? 55;

const getTrustScoreForReport = (report: BenchmarkReport) => report.trustSignal?.score ?? 70;

const getPackReports = (setup: BenchmarkSetup, reports: BenchmarkReport[] = []) =>
  reports
    .filter((report) => getPackIdForReport(report) === mapSetupToPackId(setup))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const isTrustedReportBaseline = (
  report: BenchmarkReport,
  options: {
    allowRetake?: boolean;
    requireFormat?: BenchmarkFormat | null;
    minimumEvidence?: number;
    minimumTrust?: number;
  } = {}
) => {
  const {
    allowRetake = false,
    requireFormat = null,
    minimumEvidence = 68,
    minimumTrust = 60,
  } = options;

  if (!allowRetake && report.format === 'retake') return false;
  if (requireFormat && report.format !== requireFormat) return false;
  if ((report.confidenceBand?.tier || 'provisional') === 'provisional') return false;

  return (
    getEvidencePercentForReport(report) >= minimumEvidence &&
    getTrustScoreForReport(report) >= minimumTrust &&
    (report.questions?.length || 0) >= 4
  );
};

export const getRetakeTargetWeaknesses = (
  setup: BenchmarkSetup,
  reports: BenchmarkReport[] = []
): BenchmarkSkillBucket[] =>
  getPackReports(setup, reports)
    .find((report) =>
      isTrustedReportBaseline(report, {
        allowRetake: false,
        requireFormat: report.format === 'full' ? 'full' : 'quick',
        minimumEvidence: 70,
        minimumTrust: 62,
      })
    )
    ?.topicBreakdown
    ?.slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((entry) => entry.bucket) || [];

export const getBenchmarkDurationSeconds = (format: BenchmarkFormat, setup?: BenchmarkSetup) => {
  if (setup) {
    const pack = getBenchmarkPackDefinition(setup);
    return (pack.durationMinutes[format] || 12) * 60;
  }
  return format === 'full' ? 35 * 60 : format === 'retake' ? 10 * 60 : 12 * 60;
};

export const getBenchmarkBlueprintSummary = (
  setup: BenchmarkSetup,
  format: BenchmarkFormat = 'quick',
  targetWeaknesses: BenchmarkSkillBucket[] = []
): BenchmarkBlueprintSummary => {
  const pack = getBenchmarkPackDefinition(setup);
  const blueprint = getBlueprintForFormat(pack, format, targetWeaknesses);

  return {
    packId: pack.id,
    title: pack.title,
    questionCount: blueprint.length,
    durationMinutes: pack.durationMinutes[format],
    topics: Array.from(new Set(blueprint.map((slot) => skillBucketLabels[slot.skillBucket]))),
    difficultyMix: blueprint.reduce(
      (mix, slot) => {
        mix[slot.difficulty] += 1;
        return mix;
      },
      { beginner: 0, intermediate: 0, advanced: 0 }
    ),
    questionMix: blueprint.map((slot) => slot.questionType),
    questionMixLabels: Array.from(new Set(blueprint.map((slot) => questionTypeLabels[slot.questionType]))),
    scoreMeaning: pack.scoreMeaning,
    simulatorPromise: pack.simulatorPromise,
    unlockLabel: pack.unlockRules.readinessBadgeLabel,
  };
};

const recentlyUsedTemplateIdsForPack = (packId: BenchmarkPackId, reports: BenchmarkReport[]) =>
  new Set(
    reports
      .filter((report) => report.packId === packId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .flatMap((report) => report.questions.map((question) => question.templateId))
  );

interface BenchmarkObservedItemSignal {
  templateId: string;
  exposureCount: number;
  passRate: number;
  discrimination: number;
  calibrationState: BenchmarkCalibrationState;
  abilityGap?: number;
  executionCoverageRatio?: number;
  latencySampleCount?: number;
  medianLatencySeconds?: number;
  latencyP75Seconds?: number;
  expectedDurationSeconds?: number;
}

const roundToHundredths = (value: number) => Math.round(value * 100) / 100;

const buildCalibrationSignalMap = (signals: BenchmarkCalibrationSignal[] = []) =>
  new Map<string, BenchmarkObservedItemSignal>(
    signals
      .filter((signal) => Boolean(signal?.templateId))
      .map((signal) => [
        signal.templateId,
        {
          templateId: signal.templateId,
          exposureCount: Number(signal.exposureCount || 0),
          passRate: Number(signal.passRate || 0),
          discrimination: Number(signal.discrimination || 0.68),
          calibrationState: signal.calibrationState || 'calibrating',
          abilityGap: Number(signal.abilityGap || 0),
          executionCoverageRatio: Number(signal.executionCoverageRatio || 0),
          latencySampleCount: Number(signal.latencySampleCount || 0),
          medianLatencySeconds: Number(signal.medianLatencySeconds || 0),
          latencyP75Seconds: Number(signal.latencyP75Seconds || 0),
          expectedDurationSeconds: Number(signal.expectedDurationSeconds || 0),
        },
      ])
  );

const buildObservedItemSignalMap = (reports: BenchmarkReport[] = []) => {
  const signalMap = new Map<
    string,
    {
      exposureWeight: number;
      correctWeight: number;
      correctScoreTotal: number;
      incorrectScoreTotal: number;
      correctCount: number;
      incorrectCount: number;
    }
  >();

  reports
    .filter((report) => (report.questions?.length || 0) > 0 && (report.answerRecords?.length || 0) > 0)
    .filter((report) => getTrustScoreForReport(report) >= 45)
    .forEach((report) => {
      const answerMap = new Map(report.answerRecords.map((answer) => [answer.questionId, answer]));
      const reportWeight = report.format === 'full' ? 1.15 : report.format === 'retake' ? 0.45 : 1;

      report.questions.forEach((question) => {
        const answer = answerMap.get(question.id);
        if (!answer) return;

        const signal = signalMap.get(question.templateId) || {
          exposureWeight: 0,
          correctWeight: 0,
          correctScoreTotal: 0,
          incorrectScoreTotal: 0,
          correctCount: 0,
          incorrectCount: 0,
        };

        signal.exposureWeight += reportWeight;
        if (answer.isCorrect) {
          signal.correctWeight += reportWeight;
          signal.correctScoreTotal += Number(report.overallScore || 0) * reportWeight;
          signal.correctCount += 1;
        } else {
          signal.incorrectScoreTotal += Number(report.overallScore || 0) * reportWeight;
          signal.incorrectCount += 1;
        }

        signalMap.set(question.templateId, signal);
      });
    });

  return new Map<string, BenchmarkObservedItemSignal>(
    [...signalMap.entries()].map(([templateId, signal]) => {
      const exposureCount = Math.round(signal.exposureWeight * 10) / 10;
      const passRate = signal.correctWeight / Math.max(1, signal.exposureWeight);
      const avgCorrectScore =
        signal.correctCount > 0 ? signal.correctScoreTotal / Math.max(1, signal.correctWeight) : 0;
      const avgIncorrectScore =
        signal.incorrectCount > 0 ? signal.incorrectScoreTotal / Math.max(1, signal.exposureWeight - signal.correctWeight) : avgCorrectScore;
      const scoreGap = Math.max(0, avgCorrectScore - avgIncorrectScore);
      const balanceFactor = 1 - Math.min(1, Math.abs(passRate - 0.5) / 0.5);
      const evidenceFactor = Math.min(1, signal.exposureWeight / 28);
      const discrimination = clamp(
        roundToHundredths(0.5 + (scoreGap / 100) * 0.28 + balanceFactor * 0.12 + evidenceFactor * 0.1),
        0.45,
        0.95
      );
      const calibrationState: BenchmarkCalibrationState =
        signal.exposureWeight >= 24 && scoreGap >= 8
          ? 'validated'
          : signal.exposureWeight >= 8
          ? 'calibrating'
          : 'draft';

      return [
        templateId,
        {
          templateId,
          exposureCount,
          passRate: Math.round(passRate * 100) / 100,
          discrimination,
          calibrationState,
        },
      ];
    })
  );
};

const templateSelectionPreference = (template: BenchmarkSeedQuestionTemplate) => {
  const cheapDistractorCount =
    template.kind === 'multiple_choice'
      ? (template.options || []).filter((option, index) => {
          if (index === template.correctAnswer) return false;
          const normalized = option.trim().toLowerCase();
          return ['error', 'nothing', 'undefined', 'nan', 'null'].includes(normalized);
        }).length
      : 0;
  const sourceScore =
    template.sourceType === 'curated'
      ? 4.6
      : template.sourceType === 'seeded'
      ? 2.1
      : template.sourceType === 'generated'
      ? 0.6
      : -3;
  const calibrationScore =
    template.calibrationState === 'validated'
      ? 6
      : template.calibrationState === 'calibrating'
      ? 4
      : 1;
  const executionScore = template.executionCases?.length ? 4 : template.kind === 'code' ? 1 : 0;
  const discriminationScore = Math.max(0, Math.min(0.35, (template.discrimination ?? 0.68) - 0.55)) * 4;
  const promptDepthScore = Math.min(1.2, ((template.prompt.match(/\n/g) || []).length || 0) * 0.08);
  const distractorPenalty = cheapDistractorCount * 1.4;
  return (
    sourceScore +
    calibrationScore +
    executionScore +
    discriminationScore +
    promptDepthScore -
    distractorPenalty
  );
};

const pickTemplateForSlot = (
  pack: BenchmarkPackDefinition,
  slot: BenchmarkBlueprintSlot,
  slotIndex: number,
  format: BenchmarkFormat,
  selectionSeed: string,
  usedTemplateIds: Set<string>,
  recentlyUsedTemplateIds: Set<string>
) => {
  const allTemplates = getQuestionTemplatesForPack(pack);
  const packScopedTemplates = allTemplates.filter((template) => template.packIds?.includes(pack.id));
  const difficultyMatches = (template: BenchmarkSeedQuestionTemplate) =>
    template.difficulty === slot.difficulty ||
    (slot.difficulty === 'advanced' && template.difficulty === 'intermediate') ||
    (slot.difficulty === 'beginner' && template.difficulty === 'intermediate');
  const kindMatches = (template: BenchmarkSeedQuestionTemplate) =>
    !slot.preferredKind || template.kind === slot.preferredKind;

  const buildMatchLevels = (templates: BenchmarkSeedQuestionTemplate[]) => {
    const exactBlueprintMatches = templates.filter(
      (template) =>
        template.questionType === slot.questionType &&
        template.skillBucket === slot.skillBucket &&
        difficultyMatches(template) &&
        kindMatches(template)
    );
    const exactBucketMatches = templates.filter(
      (template) =>
        template.skillBucket === slot.skillBucket &&
        template.assessmentType === slot.assessmentType &&
        difficultyMatches(template) &&
        kindMatches(template)
    );
    const exactTypeMatches = templates.filter(
      (template) =>
        template.questionType === slot.questionType &&
        difficultyMatches(template) &&
        kindMatches(template)
    );
    const allKindMatches = templates.filter((template) => kindMatches(template));
    return [exactBlueprintMatches, exactBucketMatches, exactTypeMatches, allKindMatches];
  };

  const minimumPoolSize = format === 'full' ? 4 : 3;
  const poolLevels = [...buildMatchLevels(packScopedTemplates), ...buildMatchLevels(allTemplates)];
  const pool = poolLevels
    .reduce<BenchmarkSeedQuestionTemplate[]>((selected, level) => {
      if (selected.length >= minimumPoolSize) return selected;
      return dedupeTemplatesById([...selected, ...level]);
    }, [])
    .filter((template) => !usedTemplateIds.has(template.templateId))
    .sort((left, right) => left.templateId.localeCompare(right.templateId));
  const freshPool = pool.filter((template) => !recentlyUsedTemplateIds.has(template.templateId));
  const activePool = freshPool.length > 0 ? freshPool : pool;
  if (activePool.length === 0) return null;

  const nonDraftPool = activePool.filter((template) => (template.calibrationState ?? 'draft') !== 'draft');
  const qualityFloorPool = nonDraftPool.length > 0 ? nonDraftPool : activePool;
  const executionBackedPool =
    slot.preferredKind === 'code'
      ? qualityFloorPool.filter((template) => (template.executionCases?.length ?? 0) > 0)
      : [];
  const assessmentFloorPool =
    slot.preferredKind === 'code' && executionBackedPool.length > 0 ? executionBackedPool : qualityFloorPool;
  const curatedPool = assessmentFloorPool.filter((template) => template.sourceType === 'curated');
  const seededPool = assessmentFloorPool.filter((template) => template.sourceType === 'seeded');
  const authoredPool = curatedPool.length > 0 ? curatedPool : seededPool;
  const sourceFloorPool =
    authoredPool.length > 0
      ? authoredPool
      : assessmentFloorPool.filter((template) => template.sourceType !== 'legacy');

  const rankedPool = sourceFloorPool
    .map((template) => ({ template, score: templateSelectionPreference(template) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.template.templateId.localeCompare(right.template.templateId);
    });
  const bestScore = rankedPool[0]?.score ?? 0;
  const preferredPool = rankedPool
    .filter((entry) => entry.score >= bestScore - 1.35)
    .map((entry) => entry.template);
  const finalPool = preferredPool.length > 0 ? preferredPool : sourceFloorPool;

  const seed = Math.abs(hashString(`${pack.id}:${format}:${slot.slotId}:${slotIndex}:${selectionSeed}`));
  return finalPool[seed % finalPool.length];
};

export const buildBenchmarkQuestions = (
  setup: BenchmarkSetup,
  options: {
    attemptIndex?: number;
    recentReports?: BenchmarkReport[];
    globalItemSignals?: BenchmarkCalibrationSignal[];
    format?: BenchmarkFormat;
    stage?: 'baseline' | 'followup' | 'full';
    provisionalDifficulty?: BenchmarkQuestionDifficulty;
    targetWeaknesses?: BenchmarkSkillBucket[];
    telemetrySummary?: BenchmarkTelemetrySummary;
    selectionSeed?: string;
    excludedTemplateIds?: string[];
  } = {}
): BenchmarkQuestion[] => {
  const pack = getBenchmarkPackDefinition(setup);
  const format = options.format ?? 'quick';
  const attemptIndex = options.attemptIndex ?? 0;
  const blueprint = getBlueprintForFormat(pack, format, options.targetWeaknesses ?? []);
  const selectionSeed = String(
    options.selectionSeed ?? `${attemptIndex}:${options.stage ?? 'baseline'}:${format}:${pack.id}`
  );
  const usedTemplateIds = new Set<string>(options.excludedTemplateIds || []);
  const recentTemplateIds = recentlyUsedTemplateIdsForPack(pack.id, options.recentReports || []);
  const observedItemSignals = buildCalibrationSignalMap(options.globalItemSignals || []);

  return blueprint
    .map((slot, slotIndex) => {
      const template = pickTemplateForSlot(
        pack,
        slot,
        slotIndex,
        format,
        selectionSeed,
        usedTemplateIds,
        recentTemplateIds
      );
      if (!template) return null;
      usedTemplateIds.add(template.templateId);
      const observedSignal = observedItemSignals.get(template.templateId);
      const calibrationState =
        observedSignal?.calibrationState ?? template.calibrationState ?? 'calibrating';
      const discrimination = observedSignal
        ? roundToHundredths(
            observedSignal.exposureCount >= 16
              ? observedSignal.discrimination
              : (template.discrimination ?? 0.68) * 0.45 + observedSignal.discrimination * 0.55
          )
        : template.discrimination ?? 0.68;
      const baseExpectedDurationSeconds = Math.max(30, slot.expectedDurationSeconds);
      const timingEvidenceRatio = Math.min(0.78, (observedSignal?.latencySampleCount || 0) / 18 * 0.78);
      const learnedExpectedDurationSeconds =
        observedSignal?.expectedDurationSeconds && observedSignal.expectedDurationSeconds > 0
          ? Math.round(
              clamp(
                baseExpectedDurationSeconds * (1 - timingEvidenceRatio) +
                  observedSignal.expectedDurationSeconds * timingEvidenceRatio,
                Math.round(baseExpectedDurationSeconds * 0.7),
                Math.round(baseExpectedDurationSeconds * 1.45)
              )
            )
          : baseExpectedDurationSeconds;

      const question: BenchmarkQuestion = {
        id: `${template.templateId}-a${attemptIndex + 1}-s${slotIndex + 1}`,
        templateId: template.templateId,
        slotId: slot.slotId,
        packId: pack.id,
        packTitle: pack.title,
        language: setup.language,
        section: slot.section,
        sectionLabel: benchmarkSectionLabels[slot.section],
        assessmentType: template.assessmentType,
        dimensions: [],
        anchor: slot.section === 'baseline',
        lessonId: template.lessonId,
        lessonTitle: template.lessonTitle,
        kind: template.kind,
        prompt: template.prompt,
        options: template.options,
        correctAnswer: template.correctAnswer,
        starterCode: template.starterCode,
        referenceCode: template.referenceCode,
        validationMode: template.validationMode,
        requiredSnippets: template.requiredSnippets,
        edgeCaseSnippets: template.edgeCaseSnippets,
        qualitySignals: template.qualitySignals,
        efficiencySignals: template.efficiencySignals,
        forbiddenPatterns: template.forbiddenPatterns,
        weights: template.weights,
        explanation: template.explanation,
        competency: template.competency,
        skillBucket: template.skillBucket,
        skillBucketLabel: skillBucketLabels[template.skillBucket],
        questionType: template.questionType,
        difficulty: slot.difficulty,
        weight: slot.weight,
        evaluationStrategy:
          template.kind === 'multiple_choice'
            ? 'choice'
            : template.evaluationStrategy ?? (template.executionCases?.length ? 'execution' : 'typing'),
        executionCases: template.executionCases,
        publicTestCases: template.publicTestCases,
        expectedDurationSeconds: learnedExpectedDurationSeconds,
        discrimination,
        version: template.version ?? 1,
        calibrationState,
        blueprintLabel: slot.promptLabel,
        remediationLessonIds:
          template.remediationLessonIds && template.remediationLessonIds.length > 0
            ? template.remediationLessonIds
            : [template.lessonId],
        remediationPracticeLabel:
          template.remediationPracticeLabel || `Rework ${template.lessonTitle} before the retake.`,
        remediationProjectCheckpointId:
          template.remediationProjectCheckpointId ??
          (template.lessonTitle.toLowerCase().includes('project') ? template.lessonId : null),
      };
      question.dimensions = mapQuestionToDimensions(question);
      return question;
    })
    .filter((question): question is BenchmarkQuestion => Boolean(question));
};

export const getProvisionalDifficultyFromAnswers = (
  questions: BenchmarkQuestion[],
  answerRecords: BenchmarkAnswerRecord[]
): BenchmarkQuestionDifficulty => {
  if (questions.length === 0) return 'intermediate';
  const answerMap = new Map(answerRecords.map((record) => [record.questionId, record]));
  const source = questions.filter((question) => question.section === 'baseline').slice(0, 4);
  const activeSource = source.length > 0 ? source : questions.slice(0, 4);
  const average =
    activeSource.reduce((total, question) => total + getAnswerScorePercent(question, answerMap.get(question.id)), 0) /
    Math.max(1, activeSource.length);

  if (average >= 84) return 'advanced';
  if (average <= 46) return 'beginner';
  return 'intermediate';
};

const getAnswerScorePercent = (question: BenchmarkQuestion, answer?: BenchmarkAnswerRecord) => {
  if (!answer) return 0;
  if (typeof answer.scorePercent === 'number') {
    return clamp(Math.round(answer.scorePercent), 0, 100);
  }
  if (question.kind === 'multiple_choice') {
    return answer.isCorrect ? 100 : 0;
  }
  return answer.isCorrect ? 100 : 0;
};

const getQuestionSpeedScore = (question: BenchmarkQuestion, answer?: BenchmarkAnswerRecord) => {
  if (!answer) return 0;
  const scorePercent = getAnswerScorePercent(question, answer);
  const latencyMs = answer.latencyMs || question.expectedDurationSeconds * 1000;
  const expectedMs = Math.max(30000, question.expectedDurationSeconds * 1000);
  const normalizedLatency = latencyMs / Math.max(expectedMs, 1000);
  const paceScore =
    normalizedLatency <= 0.9
      ? 100
      : normalizedLatency <= 1.1
      ? 92
      : normalizedLatency <= 1.3
      ? 82
      : normalizedLatency <= 1.6
      ? 68
      : normalizedLatency <= 2
      ? 54
      : 40;
  return Math.round(scorePercent * 0.78 + paceScore * 0.22);
};

const getDimensionDescription = (dimension: BenchmarkDimensionKey, score: number) => {
  if (dimension === 'consistency') {
    if (score >= 80) return 'Stable enough to trust under repeat attempts.';
    if (score >= 60) return 'Usable signal, but another retake would strengthen it.';
    return 'Needs another timed pass after corrective practice.';
  }
  if (score >= 82) return 'Reliable strength under pressure.';
  if (score >= 65) return 'Developing well, but not fully reliable yet.';
  return 'Needs targeted corrective work.';
};

const getConfidenceBand = (
  evidencePercent: number
): BenchmarkConfidenceBand => {
  const percent = clamp(Math.round(evidencePercent), 30, 95);

  if (percent >= 82) {
    return {
      tier: 'strong',
      label: 'High evidence quality',
      percent,
      description: 'Coverage, calibrated items, and run integrity make this result stable enough for readiness calls.',
    };
  }
  if (percent >= 66) {
    return {
      tier: 'usable',
      label: 'Usable evidence quality',
      percent,
      description: 'Strong enough to route the next step, but one more clean retake would make the verdict more stable.',
    };
  }
  return {
    tier: 'provisional',
    label: 'Provisional evidence quality',
    percent,
    description: 'Good enough for corrective routing, but not strong enough for a hard readiness call yet.',
  };
};

const getConfidenceInterval = (
  overallScore: number,
  totalQuestions: number,
  confidencePercent: number
): BenchmarkConfidenceInterval => {
  const standardError = clamp(Math.round(24 - totalQuestions * 0.85 - confidencePercent * 0.11), 5, 18);
  return {
    low: clamp(overallScore - standardError, 0, 100),
    high: clamp(overallScore + standardError, 0, 100),
    standardError,
  };
};

const getTrustSignal = (telemetrySummary: BenchmarkTelemetrySummary): BenchmarkTrustSignal => {
  const suspiciousFlags = [...new Set(telemetrySummary.suspiciousFlags || [])];
  let score = 90;
  score -= telemetrySummary.blurCount * 7;
  score -= telemetrySummary.copyPasteCount * 14;
  score -= suspiciousFlags.length * 12;
  score += Math.min(telemetrySummary.activeTypingSeconds, 150) * 0.03;
  score = clamp(Math.round(score), 18, 96);

  if (score >= 82) {
    return {
      score,
      label: 'Clean benchmark run',
      description: 'Interaction signals stayed clean enough that the result is worth trusting.',
      suspiciousFlags,
    };
  }
  if (score >= 64) {
    return {
      score,
      label: 'Mostly clean run',
      description: 'The result is still useful, but a few run signals reduce how hard the verdict should be interpreted.',
      suspiciousFlags,
    };
  }
  return {
    score,
    label: 'Retake recommended for a cleaner read',
    description: 'Use the corrective plan, then retake in a cleaner run before trusting the verdict too much.',
    suspiciousFlags,
  };
};

const getEvidenceStrength = (
  questions: BenchmarkQuestion[],
  answerRecords: BenchmarkAnswerRecord[],
  telemetrySummary: BenchmarkTelemetrySummary,
  delta: number | null
) => {
  const totalQuestions = Math.max(1, questions.length);
  const answeredQuestionIds = new Set(
    answerRecords
      .filter((record) => (typeof record.selectedAnswer === 'number' && record.selectedAnswer >= 0) || Boolean(record.submittedCode?.trim()))
      .map((record) => record.questionId)
  );
  const completionRatio = answeredQuestionIds.size / totalQuestions;
  const uniqueBuckets = new Set(questions.map((question) => question.skillBucket));
  const answeredBuckets = new Set(
    questions.filter((question) => answeredQuestionIds.has(question.id)).map((question) => question.skillBucket)
  );
  const bucketCoverageRatio = answeredBuckets.size / Math.max(1, uniqueBuckets.size);
  const anchorQuestions = questions.filter((question) => question.anchor);
  const answeredAnchorCount = anchorQuestions.filter((question) => answeredQuestionIds.has(question.id)).length;
  const anchorCoverageRatio =
    anchorQuestions.length > 0 ? answeredAnchorCount / anchorQuestions.length : completionRatio;
  const answeredQuestions = questions.filter((question) => answeredQuestionIds.has(question.id));
  const answeredCount = Math.max(1, answeredQuestions.length);
  const validatedCount = answeredQuestions.filter((question) => question.calibrationState === 'validated').length;
  const validatedRatio = validatedCount / answeredCount;
  const executionBackedCount = answeredQuestions.filter((question) => question.evaluationStrategy === 'execution').length;
  const executionCoverageRatio = executionBackedCount / answeredCount;
  const averageDiscrimination =
    answeredQuestions.reduce((total, question) => total + (question.discrimination || 0.68), 0) /
    answeredCount;
  const normalizedDiscrimination = clamp(
    Math.round(((averageDiscrimination - 0.55) / 0.35) * 100),
    40,
    100
  );
  const trustSignal = getTrustSignal(telemetrySummary);
  const stabilityAdjustment =
    delta === null ? 0 : Math.abs(delta) <= 8 ? 2 : Math.abs(delta) >= 18 ? -3 : -1;
  const evidencePercent = clamp(
    Math.round(
      completionRatio * 32 +
        bucketCoverageRatio * 22 +
        anchorCoverageRatio * 15 +
        validatedRatio * 8 +
        executionCoverageRatio * 8 +
        (normalizedDiscrimination / 100) * 8 +
        (trustSignal.score / 100) * 15 +
        stabilityAdjustment
    ),
    28,
    95
  );

  return {
    completionRatio,
    bucketCoverageRatio,
    anchorCoverageRatio,
    validatedRatio,
    executionCoverageRatio,
    averageDiscrimination,
    trustSignal,
    evidencePercent,
  };
};

const getSetOverlapRatio = (left: string[], right: string[]) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return 1;
  let intersectionCount = 0;
  union.forEach((value) => {
    if (leftSet.has(value) && rightSet.has(value)) intersectionCount += 1;
  });
  return intersectionCount / union.size;
};

const getComparisonSignal = (
  pack: BenchmarkPackDefinition,
  format: BenchmarkFormat,
  questions: BenchmarkQuestion[],
  previousReport: BenchmarkReport | null
): BenchmarkComparisonSignal => {
  if (!previousReport || previousReport.packId !== pack.id) {
    return {
      percent: 0,
      label: 'No trusted comparison baseline yet',
      description: 'Take one more benchmark in the same pack to start a stable progress line.',
      deltaEligible: false,
    };
  }

  const currentBuckets = questions.map((question) => question.skillBucket);
  const previousBuckets = (previousReport.questions || []).map((question) => question.skillBucket);
  const currentAnchorBuckets = questions.filter((question) => question.anchor).map((question) => question.skillBucket);
  const previousAnchorBuckets = (previousReport.questions || []).filter((question) => question.anchor).map((question) => question.skillBucket);
  const currentQuestionTypes = questions.map((question) => question.questionType);
  const previousQuestionTypes = (previousReport.questions || []).map((question) => question.questionType);
  const currentExecutionRatio =
    questions.filter((question) => question.evaluationStrategy === 'execution').length / Math.max(1, questions.length);
  const previousExecutionRatio =
    (previousReport.questions || []).filter((question) => question.evaluationStrategy === 'execution').length /
    Math.max(1, previousReport.questions?.length || 1);

  const bucketOverlap = getSetOverlapRatio(currentBuckets, previousBuckets);
  const anchorOverlap = getSetOverlapRatio(currentAnchorBuckets, previousAnchorBuckets);
  const questionTypeOverlap = getSetOverlapRatio(currentQuestionTypes, previousQuestionTypes);
  const questionCountSimilarity = 1 - Math.min(1, Math.abs((previousReport.totalQuestions || 0) - questions.length) / Math.max(1, questions.length));
  const executionSimilarity = 1 - Math.min(1, Math.abs(currentExecutionRatio - previousExecutionRatio));
  const formatSimilarity = previousReport.format === format ? 1 : previousReport.format === 'retake' || format === 'retake' ? 0.45 : 0.7;

  const percent = clamp(
    Math.round(
      formatSimilarity * 30 +
        bucketOverlap * 25 +
        anchorOverlap * 20 +
        questionTypeOverlap * 15 +
        questionCountSimilarity * 5 +
        executionSimilarity * 5
    ),
    20,
    100
  );

  if (percent >= 82) {
    return {
      percent,
      label: 'Strong comparison baseline',
      description: 'This run is close enough to the previous one that progress claims are worth trusting.',
      deltaEligible: true,
    };
  }
  if (percent >= 68) {
    return {
      percent,
      label: 'Usable comparison baseline',
      description: 'Good enough to compare directionally, but still not a perfect apples-to-apples retest.',
      deltaEligible: true,
    };
  }
  return {
    percent,
    label: 'Weak comparison baseline',
    description: 'The format or blueprint shifted too much to make a hard progress claim from this delta.',
    deltaEligible: false,
  };
};

const getTrustedComparisonBaseline = (
  pack: BenchmarkPackDefinition,
  format: BenchmarkFormat,
  questions: BenchmarkQuestion[],
  reports: BenchmarkReport[] = []
) => {
  const candidates = reports
    .filter(
      (report) =>
        getPackIdForReport(report) === pack.id &&
        isTrustedReportBaseline(report, {
          allowRetake: format === 'retake',
          requireFormat: format,
          minimumEvidence: 68,
          minimumTrust: 60,
        })
    )
    .map((report) => ({
      report,
      comparisonSignal: getComparisonSignal(pack, format, questions, report),
      evidencePercent: getEvidencePercentForReport(report),
      trustScore: getTrustScoreForReport(report),
    }))
    .filter((candidate) => candidate.comparisonSignal.deltaEligible)
    .sort((left, right) => {
      const signalGap = right.comparisonSignal.percent - left.comparisonSignal.percent;
      if (signalGap !== 0) return signalGap;
      const evidenceGap = right.evidencePercent - left.evidencePercent;
      if (evidenceGap !== 0) return evidenceGap;
      const trustGap = right.trustScore - left.trustScore;
      if (trustGap !== 0) return trustGap;
      return new Date(right.report.createdAt).getTime() - new Date(left.report.createdAt).getTime();
    });

  return candidates[0]?.report || null;
};

const getReadinessVerdict = (
  pack: BenchmarkPackDefinition,
  score: number,
  evidencePercent: number,
  trustScore: number,
  weakestTopicScore: number,
  completionRatio: number
): BenchmarkReadinessVerdict => {
  const provisionalCeiling = score >= pack.unlockRules.duelReadyScore && (evidencePercent < 68 || trustScore < 68 || completionRatio < 0.8);
  if (score >= pack.unlockRules.strongerBenchmarkAt && evidencePercent >= 80 && trustScore >= 74 && weakestTopicScore >= 60) {
    return {
      label: pack.roleLevel === 'junior' ? 'Ready for harder screens' : 'Ready for the next tier',
      description:
        pack.roleLevel === 'junior'
          ? 'Your score is strong enough to move into harder timed practice and duel prep.'
          : 'You can move beyond baseline fundamentals and into stronger practice.',
      tier: 'strong_ready',
    };
  }
  if (score >= pack.unlockRules.duelReadyScore && evidencePercent >= 68 && trustScore >= 68 && weakestTopicScore >= 50 && completionRatio >= 0.8) {
    return {
      label: pack.roleLevel === 'junior' ? 'Junior readiness met' : 'Foundations are landing',
      description:
        pack.roleLevel === 'junior'
          ? 'You are within a credible range for junior-style benchmark pressure.'
          : 'The foundation is stable enough to move up after one focused review.',
      tier: 'ready',
    };
  }
  if (provisionalCeiling) {
    return {
      label: 'Promising result, retake to confirm',
      description: 'Performance looks promising, but the evidence is not stable enough for a hard readiness call yet.',
      tier: 'provisional',
    };
  }
  if (score >= 58) {
    return {
      label: 'Close, but still uneven',
      description: 'You are not far off, but the weak spots still break under timed pressure.',
      tier: 'developing',
    };
  }
  return {
    label: 'Not ready yet',
    description: 'Use the corrective lessons first, then retake instead of guessing what to study.',
    tier: 'not_ready',
  };
};

const getDuelReadiness = (
  pack: BenchmarkPackDefinition,
  score: number,
  confidencePercent: number,
  evidencePercent: number,
  trustScore: number,
  weakestTopicScore: number
) => {
  if (score >= pack.unlockRules.duelReadyScore && evidencePercent >= 68 && trustScore >= 68 && weakestTopicScore >= 50) {
    return {
      eligible: true,
      label: 'Eligible for duel prep',
      description: 'You are strong enough to use duels as a pressure drill.',
      confidencePercent: clamp(Math.round(confidencePercent * 0.92), 0, 100),
    };
  }
  return {
    eligible: false,
    label: 'Retake before duel prep',
    description: 'Use the corrective plan first so the duel signal is worth trusting.',
    confidencePercent: clamp(Math.round(confidencePercent * 0.68), 0, 100),
  };
};

const findLessonsForKeywords = (language: LanguageSlug, keywords: string[], limit = 3): string[] => {
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return LESSON_CATALOG.filter((lesson) => lesson.language === language)
    .filter((lesson) => lowerKeywords.some((keyword) => lesson.title.toLowerCase().includes(keyword)))
    .slice(0, limit)
    .map((lesson) => lesson.id);
};

const findLessonsForTitles = (language: LanguageSlug, titles: string[], limit = 3): string[] => {
  const normalizedTitles = titles.map((title) => title.trim().toLowerCase());
  return LESSON_CATALOG.filter((lesson) => lesson.language === language)
    .filter((lesson) => normalizedTitles.includes(lesson.title.trim().toLowerCase()))
    .slice(0, limit)
    .map((lesson) => lesson.id);
};

const findProjectCheckpoint = (language: LanguageSlug, keywords: string[] = []) => {
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return (
    LESSON_CATALOG.find(
      (lesson) =>
        lesson.language === language &&
        lesson.title.toLowerCase().includes('project') &&
        (lowerKeywords.length === 0 ||
          lowerKeywords.some((keyword) => lesson.title.toLowerCase().includes(keyword)))
      )?.id || null
  );
};

const findProjectCheckpointByTitle = (language: LanguageSlug, title: string | null | undefined) => {
  if (!title) return null;
  const normalizedTitle = title.trim().toLowerCase();
  return (
    LESSON_CATALOG.find(
      (lesson) => lesson.language === language && lesson.title.trim().toLowerCase() === normalizedTitle
    )?.id || null
  );
};

const resolveRemediationLessonIds = (
  language: LanguageSlug,
  mapping: BenchmarkRemediationMapping | undefined,
  limit = 2
): string[] => {
  if (!mapping) return [];
  return resolveExactLessonIds(language, mapping.lessonIds || [], mapping.lessonTitles || [], limit);
};

const resolveOptionalProjectCheckpoint = (
  language: LanguageSlug,
  mapping: BenchmarkRemediationMapping | undefined
) => {
  if (!mapping) return null;
  const explicitProjectId =
    mapping.optionalProjectCheckpointId &&
    LESSON_CATALOG.some((lesson) => lesson.language === language && lesson.id === mapping.optionalProjectCheckpointId)
      ? mapping.optionalProjectCheckpointId
      : null;
  return (
    explicitProjectId ||
    findProjectCheckpointByTitle(language, mapping.optionalProjectTitle)
  );
};

const getLanguageRemediationDefaults = (
  language: LanguageSlug
): Partial<Record<BenchmarkSkillBucket, BenchmarkRemediationMapping>> => {
  return Object.fromEntries(
    Object.entries(languageRemediationDefaultsExact[language] || {}).map(([bucket, mapping]) => [
      bucket,
      {
        lessonIds: mapping?.lessonIds,
        lessonTitles: mapping?.lessonTitles || [],
        lessonSearchKeywords: [],
        shortPracticeSet: mapping?.shortPracticeSet || '',
        optionalProjectCheckpointId: mapping?.optionalProjectCheckpointId,
        optionalProjectTitle: mapping?.optionalProjectTitle || null,
      },
    ])
  ) as Partial<Record<BenchmarkSkillBucket, BenchmarkRemediationMapping>>;
};

const buildFallbackRemediationPlan = (
  pack: BenchmarkPackDefinition,
  weakestBuckets: BenchmarkSkillBucket[]
): BenchmarkNextStepPlan => {
  const defaults = getLanguageRemediationDefaults(pack.language);
  const activeBuckets = weakestBuckets.length > 0 ? weakestBuckets : pack.retakeBlueprintBuckets;
  const activeMappings = activeBuckets
    .map((bucket) => ({ bucket, mapping: pack.remediationMapping[bucket] || defaults[bucket] }))
    .filter((entry) => Boolean(entry.mapping))
    .slice(0, 3);

  const recommendedLessonIds = Array.from(
    new Set(
      activeMappings.flatMap((entry) =>
        resolveRemediationLessonIds(pack.language, entry.mapping, 2)
      )
    )
  ).slice(0, 4);

  const optionalProjectCheckpoint =
    activeMappings
      .map((entry) => resolveOptionalProjectCheckpoint(pack.language, entry.mapping))
      .find(Boolean) || null;

  return {
    recommendedLessonIds,
    shortPracticeSet: activeMappings.map((entry) => entry.mapping?.shortPracticeSet || '').filter(Boolean),
    optionalProjectCheckpoint,
    retryWeakAreasLabel: 'Retry weak areas',
    fullRetakeLabel: 'Take full benchmark',
    duelReadinessLabel: null,
  };
};

const buildQuestionDrivenRemediationPlan = (
  pack: BenchmarkPackDefinition,
  questions: BenchmarkQuestion[] = [],
  answerRecords: BenchmarkAnswerRecord[] = [],
  weakestBuckets: BenchmarkSkillBucket[] = []
): BenchmarkNextStepPlan => {
  if (questions.length === 0) {
    return buildFallbackRemediationPlan(pack, weakestBuckets);
  }

  const answerMap = new Map(answerRecords.map((answer) => [answer.questionId, answer]));
  const activeBuckets = new Set(
    (weakestBuckets.length > 0 ? weakestBuckets : pack.retakeBlueprintBuckets).filter(Boolean)
  );
  const prioritizedQuestions = questions
    .filter((question) => activeBuckets.size === 0 || activeBuckets.has(question.skillBucket))
    .map((question) => ({
      question,
      score: getAnswerScorePercent(question, answerMap.get(question.id)),
      answered: answerMap.has(question.id),
    }))
    .sort((left, right) => {
      const scoreGap = left.score - right.score;
      if (scoreGap !== 0) return scoreGap;
      const weightGap = right.question.weight - left.question.weight;
      if (weightGap !== 0) return weightGap;
      return left.question.templateId.localeCompare(right.question.templateId);
    });

  const source = prioritizedQuestions.length > 0 ? prioritizedQuestions : questions.map((question) => ({
    question,
    score: 0,
    answered: false,
  }));
  const actionableSource =
    source.filter(({ score, answered }) => !answered || score < 100).length > 0
      ? source.filter(({ score, answered }) => !answered || score < 100)
      : source;

  const recommendedLessonIds = Array.from(
    new Set(
      actionableSource.flatMap(({ question }) =>
        question.remediationLessonIds && question.remediationLessonIds.length > 0
          ? question.remediationLessonIds
          : [question.lessonId]
      )
    )
  ).slice(0, 4);

  const shortPracticeSet = Array.from(
    new Set(
      actionableSource
        .slice(0, 3)
        .map(({ question, answered }) =>
          question.remediationPracticeLabel ||
          `${answered ? 'Rework' : 'Warm up with'} ${question.blueprintLabel.toLowerCase()} in ${question.lessonTitle}.`
        )
        .filter(Boolean)
    )
  ).slice(0, 3);

  const optionalProjectCheckpoint =
    actionableSource
      .map(({ question }) => question.remediationProjectCheckpointId || null)
      .find(Boolean) || null;

  return {
    recommendedLessonIds,
    shortPracticeSet,
    optionalProjectCheckpoint,
    retryWeakAreasLabel: 'Retry weak areas',
    fullRetakeLabel: 'Take full benchmark',
    duelReadinessLabel: null,
  };
};

const getTrackRecommendations = (pack: BenchmarkPackDefinition, weakestBuckets: BenchmarkSkillBucket[]) => {
  const directTrack = interviewTracks.find(
    (track) =>
      track.language === pack.language ||
      (track.benchmarkLanguage === pack.language &&
        track.benchmarkRole === pack.roleLevel &&
        track.benchmarkGoal === pack.goal)
  );
  const dsaTrack =
    weakestBuckets.includes('problem_solving') || weakestBuckets.includes('data_structures_basics')
      ? interviewTracks.find((track) => track.id === 'data-structures-algorithms')
      : null;
  return [directTrack?.id, dsaTrack?.id].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index
  );
};

export const buildBenchmarkReport = (
  setup: BenchmarkSetup,
  questions: BenchmarkQuestion[],
  answerRecords: BenchmarkAnswerRecord[],
  options: {
    attemptIndex?: number;
    recentReports?: BenchmarkReport[];
    format?: BenchmarkFormat;
    telemetrySummary?: BenchmarkTelemetrySummary;
  } = {}
): BenchmarkReport => {
  const pack = getBenchmarkPackDefinition(setup);
  const format = options.format ?? 'quick';
  const totalQuestions = Math.max(1, questions.length);
  const answerMap = new Map(answerRecords.map((record) => [record.questionId, record]));
  const accuracyScores = questions.map((question) => getAnswerScorePercent(question, answerMap.get(question.id)));
  const accuracyAverage = accuracyScores.reduce((total, value) => total + value, 0) / totalQuestions;
  let weightedCorrectScore = 0;
  let weightedCorrectTotal = 0;
  let weightedSpeedScore = 0;
  let weightedSpeedTotal = 0;
  const bucketMap = new Map<BenchmarkSkillBucket, { weightedScore: number; totalWeight: number; count: number }>();
  const sectionMap = new Map<BenchmarkQuestionSection, { weightedScore: number; totalWeight: number; count: number }>();
  const dimensionMap = new Map<BenchmarkDimensionKey, { weightedScore: number; totalWeight: number }>();

  questions.forEach((question) => {
    const answer = answerMap.get(question.id);
    const scorePercent = getAnswerScorePercent(question, answer);
    const speedPercent = getQuestionSpeedScore(question, answer);
    const difficultyWeight = difficultyWeightsBase[question.difficulty];

    weightedCorrectScore += scorePercent * difficultyWeight;
    weightedCorrectTotal += 100 * difficultyWeight;
    weightedSpeedScore += speedPercent * difficultyWeight;
    weightedSpeedTotal += 100 * difficultyWeight;

    const bucketEntry = bucketMap.get(question.skillBucket) || { weightedScore: 0, totalWeight: 0, count: 0 };
    bucketMap.set(question.skillBucket, {
      weightedScore: bucketEntry.weightedScore + scorePercent * question.weight,
      totalWeight: bucketEntry.totalWeight + 100 * question.weight,
      count: bucketEntry.count + 1,
    });

    const sectionEntry = sectionMap.get(question.section) || { weightedScore: 0, totalWeight: 0, count: 0 };
    sectionMap.set(question.section, {
      weightedScore: sectionEntry.weightedScore + scorePercent * question.weight,
      totalWeight: sectionEntry.totalWeight + 100 * question.weight,
      count: sectionEntry.count + 1,
    });

    question.dimensions.forEach((dimension) => {
      const current = dimensionMap.get(dimension) || { weightedScore: 0, totalWeight: 0 };
      const contribution = dimension === 'efficiency' ? speedPercent : scorePercent;
      dimensionMap.set(dimension, {
        weightedScore: current.weightedScore + contribution * question.weight,
        totalWeight: current.totalWeight + 100 * question.weight,
      });
    });
  });

  const accuracyComponent = clamp(Math.round(accuracyAverage), 0, 100);
  const difficultyComponent = clamp(Math.round((weightedCorrectScore / Math.max(1, weightedCorrectTotal)) * 100), 0, 100);
  const speedComponent = clamp(Math.round((weightedSpeedScore / Math.max(1, weightedSpeedTotal)) * 100), 0, 100);
  const overallScore = clamp(Math.round(accuracyComponent * 0.7 + difficultyComponent * 0.2 + speedComponent * 0.1), 0, 100);
  const telemetrySummary = options.telemetrySummary ?? {
    blurCount: 0,
    copyPasteCount: 0,
    codeRunCount: 0,
    activeTypingSeconds: 0,
    suspiciousFlags: [],
  };
  const topicBreakdown = Array.from(bucketMap.entries())
    .map(([bucket, value]) => ({
      bucket,
      label: skillBucketLabels[bucket],
      score: clamp(Math.round((value.weightedScore / Math.max(1, value.totalWeight)) * 100), 0, 100),
      questionCount: value.count,
    }))
    .sort((a, b) => a.score - b.score);
  const weakestBuckets = topicBreakdown.slice(0, 3).map((entry) => entry.bucket);
  const strongestBuckets = topicBreakdown.slice().sort((a, b) => b.score - a.score).slice(0, 3).map((entry) => entry.bucket);
  const weakestTopicScore = topicBreakdown[0]?.score ?? overallScore;
  const previousReport = getTrustedComparisonBaseline(pack, format, questions, options.recentReports || []);
  const comparisonSignal = getComparisonSignal(pack, format, questions, previousReport);
  const deltaFromLastAttempt =
    previousReport && comparisonSignal.deltaEligible ? overallScore - previousReport.overallScore : null;
  const evidence = getEvidenceStrength(questions, answerRecords, telemetrySummary, deltaFromLastAttempt);
  const trustSignal = evidence.trustSignal;
  const confidenceBand = getConfidenceBand(evidence.evidencePercent);
  const confidenceInterval = getConfidenceInterval(overallScore, totalQuestions, confidenceBand.percent);
  const readinessVerdict = getReadinessVerdict(
    pack,
    overallScore,
    confidenceBand.percent,
    trustSignal.score,
    weakestTopicScore,
    evidence.completionRatio
  );
  const duelReadiness = getDuelReadiness(
    pack,
    overallScore,
    confidenceBand.percent,
    confidenceBand.percent,
    trustSignal.score,
    weakestTopicScore
  );
  const nextStepPlan = buildQuestionDrivenRemediationPlan(pack, questions, answerRecords, weakestBuckets);
  nextStepPlan.duelReadinessLabel = duelReadiness.eligible ? duelReadiness.label : null;

  const dimensionScores: BenchmarkReportDimensionScore[] = [
    ...Array.from(dimensionMap.entries()).map(([key, value]) => {
      const score = clamp(Math.round((value.weightedScore / Math.max(1, value.totalWeight)) * 100), 0, 100);
      return {
        key,
        label: benchmarkDimensionLabels[key],
        score,
        description: getDimensionDescription(key, score),
      };
    }),
    {
      key: 'consistency',
      label: benchmarkDimensionLabels.consistency,
      score: confidenceBand.percent,
      description: getDimensionDescription('consistency', confidenceBand.percent),
    },
  ];

  const sectionScores: BenchmarkReportSectionScore[] = Array.from(sectionMap.entries()).map(([section, value]) => ({
    section,
    label: benchmarkSectionLabels[section],
    score: clamp(Math.round((value.weightedScore / Math.max(1, value.totalWeight)) * 100), 0, 100),
    questionCount: value.count,
  }));

  const targetRoleLabel = pack.roleLevel === 'junior' ? 'junior screen baseline' : 'beginner benchmark baseline';
  const competencyCoveragePercent = clamp(
    Math.round(topicBreakdown.reduce((total, entry) => total + entry.score, 0) / Math.max(1, topicBreakdown.length)),
    0,
    100
  );

  const estimation: BenchmarkEstimation = {
    label: readinessVerdict.label,
    description: readinessVerdict.description,
    targetRoleLabel,
    baselineScore: pack.unlockRules.duelReadyScore,
    competencyCoveragePercent,
  };

  const strengths = strongestBuckets.map((bucket) => {
    const label = skillBucketLabels[bucket];
    if (bucket === 'problem_solving') return 'You kept the applied problems moving.';
    if (bucket === 'debugging') return 'You repaired bugs with credible accuracy.';
    if (bucket === 'speed_under_pressure') return `${label} stayed stable under the timer.`;
    return `${label} held up well under this benchmark.`;
  });

  const weaknesses = weakestBuckets.map((bucket) => {
    const label = skillBucketLabels[bucket];
    if (bucket === 'problem_solving') return 'Applied problems still break under pressure.';
    if (bucket === 'debugging') return 'Debugging is still inconsistent.';
    if (bucket === 'speed_under_pressure') return 'Speed drops when the timer tightens.';
    return `${label} needs corrective practice.`;
  });

  const summary =
    readinessVerdict.tier === 'provisional'
      ? `${readinessVerdict.label}. Performance looks promising, but retake after the corrective plan before trusting this as a hard readiness call.`
      : previousReport && !comparisonSignal.deltaEligible
      ? `${readinessVerdict.label}. This run is useful for diagnosis, but the blueprint shifted too much to claim a clean score delta versus the previous attempt.`
      : deltaFromLastAttempt === null
      ? `${readinessVerdict.label}. Fix the weak areas, then retake to make the signal stronger.`
      : `${readinessVerdict.label}. ${deltaFromLastAttempt >= 0 ? `Up ${deltaFromLastAttempt} points` : `${Math.abs(deltaFromLastAttempt)} points down`} vs last attempt, so use the next-step plan before the retake.`;

  const suggestedDuelProblemTitles =
    duelReadiness.eligible
      ? duelProblemCatalog
          .filter((problem) => problem.difficulty === (overallScore >= pack.unlockRules.strongerBenchmarkAt ? 'medium' : 'easy'))
          .slice(0, 3)
          .map((problem) => problem.title)
      : [];

  return {
    id: `benchmark-${pack.id}-${Date.now()}`,
    benchmarkVersion: BENCHMARK_VERSION,
    attemptIndex: options.attemptIndex ?? 0,
    format,
    setup,
    packId: pack.id,
    packTitle: pack.title,
    overallScore,
    correctAnswers: answerRecords.filter((record) => record.isCorrect).length,
    totalQuestions,
    strengths,
    weaknesses,
    dimensionScores,
    sectionScores,
    topicBreakdown,
    confidenceBand,
    confidenceInterval,
    trustSignal,
    evidenceProfile: {
      percent: evidence.evidencePercent,
      completionRatio: evidence.completionRatio,
      bucketCoverageRatio: evidence.bucketCoverageRatio,
      anchorCoverageRatio: evidence.anchorCoverageRatio,
      validatedRatio: evidence.validatedRatio,
      executionCoverageRatio: evidence.executionCoverageRatio,
      averageDiscrimination: evidence.averageDiscrimination,
    },
    comparisonSignal,
    telemetrySummary,
    recommendedTrackIds: getTrackRecommendations(pack, weakestBuckets),
    suggestedLessonIds: nextStepPlan.recommendedLessonIds,
    suggestedDuelProblemTitles,
    duelReadiness,
    estimation,
    summary,
    readinessVerdict,
    deltaFromLastAttempt,
    scoreComponents: {
      accuracy: accuracyComponent,
      difficultyWeighted: difficultyComponent,
      speedUnderPressure: speedComponent,
    },
    nextStepPlan,
    createdAt: new Date().toISOString(),
    questions,
    answerRecords,
  };
};

export const hydrateBenchmarkReport = (report: BenchmarkReport): BenchmarkReport => {
  const pack = packLookup.get(report.packId || mapSetupToPackId(report.setup)) || getBenchmarkPackDefinition(report.setup);
  return {
    ...report,
    benchmarkVersion: report.benchmarkVersion || BENCHMARK_VERSION,
    packId: report.packId || pack.id,
    packTitle: report.packTitle || pack.title,
    topicBreakdown: report.topicBreakdown || [],
    readinessVerdict:
      report.readinessVerdict ||
      getReadinessVerdict(pack, report.overallScore, report.confidenceBand?.percent || 55, report.trustSignal?.score || 70, report.topicBreakdown?.[0]?.score || report.overallScore, 1),
    deltaFromLastAttempt: typeof report.deltaFromLastAttempt === 'number' ? report.deltaFromLastAttempt : null,
    evidenceProfile: report.evidenceProfile || {
      percent: report.confidenceBand?.percent || 55,
      completionRatio: 1,
      bucketCoverageRatio: 1,
      anchorCoverageRatio: 1,
      validatedRatio: 0.7,
      executionCoverageRatio: 0.4,
      averageDiscrimination: 0.68,
    },
    comparisonSignal: report.comparisonSignal || {
      percent: typeof report.deltaFromLastAttempt === 'number' ? 72 : 0,
      label: typeof report.deltaFromLastAttempt === 'number' ? 'Usable comparison baseline' : 'No trusted comparison baseline yet',
      description:
        typeof report.deltaFromLastAttempt === 'number'
          ? 'This historical result is comparable enough for a directional delta.'
          : 'Take one more benchmark in the same pack to start a stable progress line.',
      deltaEligible: typeof report.deltaFromLastAttempt === 'number',
    },
    scoreComponents: report.scoreComponents || {
      accuracy: report.overallScore,
      difficultyWeighted: report.overallScore,
      speedUnderPressure: report.overallScore,
    },
    nextStepPlan:
      report.nextStepPlan ||
      buildQuestionDrivenRemediationPlan(
        pack,
        report.questions || [],
        report.answerRecords || [],
        report.topicBreakdown?.slice(0, 3).map((entry) => entry.bucket) || []
      ),
    questions: (report.questions || []).map((question) => ({
      ...question,
      packId: question.packId || pack.id,
      packTitle: question.packTitle || pack.title,
      language: question.language || report.setup.language,
      skillBucket: question.skillBucket || 'code_reading',
      skillBucketLabel: question.skillBucketLabel || skillBucketLabels[question.skillBucket || 'code_reading'],
      questionType: question.questionType || 'code_reading_comprehension',
      blueprintLabel: question.blueprintLabel || question.sectionLabel || 'Benchmark question',
      dimensions:
        Array.isArray(question.dimensions) && question.dimensions.length > 0
          ? question.dimensions
          : mapQuestionToDimensions(question as BenchmarkQuestion),
      remediationLessonIds:
        Array.isArray(question.remediationLessonIds) && question.remediationLessonIds.length > 0
          ? question.remediationLessonIds
          : [question.lessonId],
      remediationPracticeLabel:
        question.remediationPracticeLabel || `Rework ${question.lessonTitle} before the retake.`,
      remediationProjectCheckpointId:
        question.remediationProjectCheckpointId ??
        (question.lessonTitle?.toLowerCase().includes('project') ? question.lessonId : null),
    })),
  };
};

const normalizeBenchmarkHistory = (reports: Array<BenchmarkReport | null | undefined>) =>
  reports
    .filter((report): report is BenchmarkReport => Boolean(report?.id && report?.createdAt))
    .reduce((map, report) => {
      map.set(report.id, hydrateBenchmarkReport(report));
      return map;
    }, new Map<string, BenchmarkReport>());

export const saveBenchmarkReportHistory = (reports: BenchmarkReport[], userId?: string | null) => {
  if (typeof window === 'undefined') return;
  const storageKey = `${BENCHMARK_HISTORY_STORAGE_KEY}:${userId || 'anonymous'}`;
  const normalized = Array.from(normalizeBenchmarkHistory(reports).values());
  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
};

export const readSavedBenchmarkHistory = (userId?: string | null): BenchmarkReport[] => {
  if (typeof window === 'undefined') return [];
  const storageKey = `${BENCHMARK_HISTORY_STORAGE_KEY}:${userId || 'anonymous'}`;
  const value = window.localStorage.getItem(storageKey);
  if (value) {
    try {
      return Array.from(normalizeBenchmarkHistory(JSON.parse(value) as BenchmarkReport[]).values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  }

  const legacyKey = `${LEGACY_BENCHMARK_HISTORY_STORAGE_KEY}:${userId || 'anonymous'}`;
  const legacyValue = window.localStorage.getItem(legacyKey);
  if (!legacyValue) return [];

  try {
    return Array.from(normalizeBenchmarkHistory(JSON.parse(legacyValue) as BenchmarkReport[]).values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
};

export const saveBenchmarkReport = (report: BenchmarkReport, userId?: string | null) => {
  const existingHistory = readSavedBenchmarkHistory(userId);
  saveBenchmarkReportHistory([report, ...existingHistory], userId);
};

export const readSavedBenchmarkReport = (userId?: string | null): BenchmarkReport | null =>
  readSavedBenchmarkHistory(userId)[0] || null;

export const saveBenchmarkSetupPreset = (setup: BenchmarkSetup) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BENCHMARK_SETUP_PRESET_STORAGE_KEY, JSON.stringify(setup));
};

export const readBenchmarkSetupPreset = (): BenchmarkSetup | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(BENCHMARK_SETUP_PRESET_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BenchmarkSetup;
    if (!parsed?.language || !parsed?.goal || !parsed?.roleLevel) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearBenchmarkSetupPreset = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BENCHMARK_SETUP_PRESET_STORAGE_KEY);
};

export const buildSampleBenchmarkReport = (): BenchmarkReport => {
  const setup: BenchmarkSetup = { language: 'python', goal: 'interview_prep', roleLevel: 'junior' };
  const questions = buildBenchmarkQuestions(setup, { format: 'quick', attemptIndex: 1 });
  const answerRecords = questions.map((question, index) => ({
    questionId: question.id,
    selectedAnswer: question.kind === 'multiple_choice' ? question.correctAnswer : undefined,
    submittedCode: question.kind === 'code' ? question.referenceCode : undefined,
    evaluationMessage: question.kind === 'code' ? 'Reference answer matched the benchmark blueprint.' : undefined,
    scorePercent: index % 4 === 0 ? 60 : 100,
    isCorrect: index % 4 !== 0,
    latencyMs: question.expectedDurationSeconds * 700,
  }));
  return buildBenchmarkReport(setup, questions, answerRecords, {
    attemptIndex: 1,
    format: 'quick',
    telemetrySummary: {
      blurCount: 0,
      copyPasteCount: 0,
      codeRunCount: 2,
      activeTypingSeconds: 140,
      suspiciousFlags: [],
    },
  });
};

export const getBenchmarkQuestionSeedPreview = () => ({
  pythonBeginnerQuick: pythonSeedQuestions
    .filter((question) => question.packIds?.includes('python-beginner-fundamentals'))
    .slice(0, 5)
    .map((question) => question.templateId),
  pythonJuniorQuick: pythonSeedQuestions
    .filter((question) => question.packIds?.includes('python-junior-interview-prep'))
    .slice(0, 5)
    .map((question) => question.templateId),
});
