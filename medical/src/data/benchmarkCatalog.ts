import {
  getBenchmarkQuestionCandidates,
  type BenchmarkQuestionTemplate,
} from './benchmarkQuestionBank';
import { interviewTracks, type LanguageSlug } from './siteContent';
import { normalizeCodeForComparison } from '../lib/codeAssessment';
import { duelProblemCatalog } from '../../data/duel-problem-catalog.js';
import {
  benchmarkDimensionLabels,
  benchmarkSectionLabels,
  type BenchmarkCodeRubric,
  type BenchmarkDimensionKey,
  type BenchmarkQuestionAssessmentType,
  type BenchmarkQuestionDifficulty,
  type BenchmarkQuestionSection,
} from './benchmarkModel';

export type BenchmarkGoal = 'interview_prep' | 'class_improvement' | 'skill_growth';
export type BenchmarkRoleLevel = 'beginner' | 'intern' | 'junior' | 'general_practice';

export interface BenchmarkSetup {
  goal: BenchmarkGoal;
  language: LanguageSlug;
  roleLevel: BenchmarkRoleLevel;
}

export interface BenchmarkQuestion {
  id: string;
  templateId: string;
  slotId: string;
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
  difficulty: BenchmarkQuestionDifficulty;
  weight: number;
}

export interface BenchmarkAnswerRecord {
  questionId: string;
  selectedAnswer?: number;
  submittedCode?: string;
  evaluationMessage?: string;
  scorePercent?: number;
  rubricBreakdown?: {
    correctness: number;
    edgeCaseHandling: number;
    codeQuality: number;
    efficiency: number;
  };
  isCorrect: boolean;
}

export interface BenchmarkEstimation {
  label: string;
  description: string;
  targetRoleLabel: string;
  baselineScore: number;
  competencyCoveragePercent: number;
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

export interface BenchmarkConfidenceBand {
  label: string;
  percent: number;
  description: string;
}

export interface BenchmarkReport {
  id: string;
  benchmarkVersion: string;
  attemptIndex: number;
  isSample?: boolean;
  isPublic?: boolean;
  shareToken?: string | null;
  publicSharedAt?: string | null;
  setup: BenchmarkSetup;
  overallScore: number;
  correctAnswers: number;
  totalQuestions: number;
  strengths: string[];
  weaknesses: string[];
  dimensionScores: BenchmarkReportDimensionScore[];
  sectionScores: BenchmarkReportSectionScore[];
  confidenceBand: BenchmarkConfidenceBand;
  recommendedTrackIds: string[];
  suggestedLessonIds: string[];
  suggestedDuelProblemTitles: string[];
  duelReadiness: {
    label: string;
    description: string;
    confidencePercent: number;
  };
  estimation: BenchmarkEstimation;
  summary: string;
  createdAt: string;
  questions: BenchmarkQuestion[];
  answerRecords: BenchmarkAnswerRecord[];
}

const BENCHMARK_SETUP_PRESET_STORAGE_KEY = 'codhak-benchmark-setup-preset';
const BENCHMARK_HISTORY_STORAGE_KEY = 'codhak-benchmark-history';
const BENCHMARK_VERSION = 'v3-layered';

type BenchmarkPlanSlot = {
  slotId: string;
  section: BenchmarkQuestionSection;
  assessmentType: BenchmarkQuestionAssessmentType;
  competency: string;
  difficulty: BenchmarkQuestionDifficulty;
  anchor?: boolean;
  preferredKind?: 'multiple_choice' | 'code';
};

type BuildBenchmarkQuestionOptions = {
  attemptIndex?: number;
  recentReports?: BenchmarkReport[];
};

export interface BenchmarkBlueprintSummary {
  questionCount: number;
  difficultyMix: Record<BenchmarkQuestionDifficulty, number>;
  competencies: string[];
  sectionMix: Record<BenchmarkQuestionSection, number>;
}

const slot = (
  slotId: string,
  section: BenchmarkQuestionSection,
  competency: string,
  difficulty: BenchmarkQuestionDifficulty,
  options: {
    assessmentType: BenchmarkQuestionAssessmentType;
    preferredKind?: 'multiple_choice' | 'code';
    anchor?: boolean;
  }
): BenchmarkPlanSlot => ({
  slotId,
  section,
  competency,
  difficulty,
  preferredKind: options.preferredKind,
  assessmentType: options.assessmentType,
  anchor: Boolean(options.anchor),
});

const difficultyWeights: Record<BenchmarkQuestionDifficulty, number> = {
  beginner: 1,
  intermediate: 1.35,
  advanced: 1.7,
};

const benchmarkPlans: Record<BenchmarkGoal, Record<BenchmarkRoleLevel, BenchmarkPlanSlot[]>> = {
  interview_prep: {
    beginner: [
      slot('baseline-language', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('baseline-flow', 'baseline', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-functions', 'comprehension', 'Functions', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    intern: [
      slot('baseline-language', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('baseline-flow', 'baseline', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-problem-solving', 'implementation', 'Problem solving', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-problem-solving', 'comprehension', 'Problem solving', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    junior: [
      slot('baseline-language', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('baseline-flow', 'baseline', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-problem-solving', 'implementation', 'Problem solving', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-functions', 'comprehension', 'Functions', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('comprehension-problem-solving', 'comprehension', 'Problem solving', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    general_practice: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-functions', 'comprehension', 'Functions', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
  },
  class_improvement: {
    beginner: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-flow', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-collections', 'comprehension', 'Collections', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-control-flow', 'theory', 'Control flow', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    intern: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-problem-solving', 'implementation', 'Problem solving', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-collections', 'comprehension', 'Collections', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    junior: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-problem-solving', 'implementation', 'Problem solving', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-functions', 'comprehension', 'Functions', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    general_practice: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-collections', 'comprehension', 'Collections', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-control-flow', 'theory', 'Control flow', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
  },
  skill_growth: {
    beginner: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('comprehension-functions', 'comprehension', 'Functions', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-control-flow', 'theory', 'Control flow', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    intern: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-problem-solving', 'implementation', 'Problem solving', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-problem-solving', 'comprehension', 'Problem solving', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    junior: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-collections', 'implementation', 'Collections', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-problem-solving', 'implementation', 'Problem solving', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-functions', 'comprehension', 'Functions', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('comprehension-problem-solving', 'comprehension', 'Problem solving', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
    general_practice: [
      slot('baseline-language', 'baseline', 'Syntax and variables', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
        anchor: true,
      }),
      slot('baseline-theory', 'baseline', 'Data types and operators', 'beginner', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
        anchor: true,
      }),
      slot('implementation-flow', 'implementation', 'Control flow', 'beginner', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('implementation-functions', 'implementation', 'Functions', 'intermediate', {
        assessmentType: 'implementation',
        preferredKind: 'code',
      }),
      slot('debugging-problem-solving', 'debugging', 'Problem solving', 'advanced', {
        assessmentType: 'debugging',
        preferredKind: 'code',
      }),
      slot('comprehension-collections', 'comprehension', 'Collections', 'intermediate', {
        assessmentType: 'comprehension',
        preferredKind: 'multiple_choice',
      }),
      slot('theory-oop', 'theory', 'Objects and classes', 'advanced', {
        assessmentType: 'theory',
        preferredKind: 'multiple_choice',
      }),
    ],
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (value: string) =>
  Array.from(value).reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);

const matchesSetup = (left: BenchmarkSetup, right: BenchmarkSetup) =>
  left.goal === right.goal && left.language === right.language && left.roleLevel === right.roleLevel;

const getBenchmarkPlan = (setup: BenchmarkSetup) => benchmarkPlans[setup.goal][setup.roleLevel];

export const getBenchmarkAttemptIndex = (setup: BenchmarkSetup, reports: BenchmarkReport[]) =>
  reports.filter((report) => matchesSetup(report.setup, setup)).length;

export const getBenchmarkBlueprintSummary = (setup: BenchmarkSetup): BenchmarkBlueprintSummary => {
  const plan = getBenchmarkPlan(setup);

  return {
    questionCount: plan.length,
    difficultyMix: plan.reduce(
      (mix, entry) => {
        mix[entry.difficulty] += 1;
        return mix;
      },
      {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      } as Record<BenchmarkQuestionDifficulty, number>
    ),
    competencies: Array.from(new Set(plan.map((entry) => entry.competency))),
    sectionMix: plan.reduce(
      (mix, entry) => {
        mix[entry.section] += 1;
        return mix;
      },
      {
        baseline: 0,
        implementation: 0,
        debugging: 0,
        comprehension: 0,
        theory: 0,
      } as Record<BenchmarkQuestionSection, number>
    ),
  };
};

const getSlotDimensions = (
  slotDefinition: BenchmarkPlanSlot,
  template: BenchmarkQuestionTemplate
): BenchmarkDimensionKey[] => {
  const set = new Set<BenchmarkDimensionKey>();

  if (slotDefinition.section === 'baseline' || slotDefinition.section === 'theory') {
    set.add('language_fluency');
  }

  if (slotDefinition.section === 'implementation') {
    set.add('code_writing');
    set.add('code_quality');
  }

  if (slotDefinition.section === 'debugging') {
    set.add('debugging');
    set.add('code_reading');
    set.add('code_quality');
  }

  if (slotDefinition.section === 'comprehension') {
    set.add('code_reading');
  }

  if (
    template.competency === 'Collections' ||
    template.competency === 'Functions' ||
    template.competency === 'Problem solving'
  ) {
    set.add('problem_solving');
  }

  if (
    template.competency === 'Syntax and variables' ||
    template.competency === 'Data types and operators' ||
    template.competency === 'Objects and classes'
  ) {
    set.add('language_fluency');
  }

  if (template.kind === 'code' && slotDefinition.section !== 'theory') {
    set.add('code_writing');
  }

  if (
    template.kind === 'code' &&
    (template.competency === 'Collections' || template.competency === 'Problem solving')
  ) {
    set.add('efficiency');
  }

  return Array.from(set);
};

const sectionWeightMultiplier: Record<BenchmarkQuestionSection, number> = {
  baseline: 0.95,
  implementation: 1.15,
  debugging: 1.2,
  comprehension: 1.05,
  theory: 0.9,
};

const getQuestionWeight = (
  setup: BenchmarkSetup,
  template: BenchmarkQuestionTemplate,
  slotDefinition: BenchmarkPlanSlot
) => {
  let weight = difficultyWeights[template.difficulty];

  weight *= sectionWeightMultiplier[slotDefinition.section];

  if (setup.goal === 'interview_prep' && (template.competency === 'Problem solving' || template.competency === 'Objects and classes')) {
    weight *= 1.12;
  }

  if (
    setup.goal === 'class_improvement' &&
    (template.competency === 'Syntax and variables' ||
      template.competency === 'Data types and operators' ||
      template.competency === 'Control flow')
  ) {
    weight *= 1.1;
  }

  if (
    setup.goal === 'skill_growth' &&
    (template.competency === 'Functions' || template.competency === 'Problem solving')
  ) {
    weight *= 1.08;
  }

  return Math.round(weight * 100) / 100;
};

const getLatestComparableReport = (setup: BenchmarkSetup, reports: BenchmarkReport[] = []) =>
  reports
    .filter((report) => matchesSetup(report.setup, setup))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

const getAdaptiveDifficulty = (
  setup: BenchmarkSetup,
  slotDefinition: BenchmarkPlanSlot,
  recentReports: BenchmarkReport[] = []
) => {
  const latestComparableReport = getLatestComparableReport(setup, recentReports);
  if (!latestComparableReport || slotDefinition.anchor || slotDefinition.section === 'baseline') {
    return slotDefinition.difficulty;
  }

  if (latestComparableReport.overallScore >= 82 && slotDefinition.difficulty === 'intermediate') {
    return 'advanced' as const;
  }

  if (latestComparableReport.overallScore <= 42 && slotDefinition.difficulty === 'advanced') {
    return 'intermediate' as const;
  }

  if (
    latestComparableReport.overallScore <= 36 &&
    slotDefinition.difficulty === 'intermediate' &&
    slotDefinition.section !== 'implementation'
  ) {
    return 'beginner' as const;
  }

  return slotDefinition.difficulty;
};

const getCandidatePool = (
  language: LanguageSlug,
  slotDefinition: BenchmarkPlanSlot,
  setup: BenchmarkSetup,
  recentReports: BenchmarkReport[]
): BenchmarkQuestionTemplate[] => {
  const candidates = getBenchmarkQuestionCandidates(language);
  const targetDifficulty = getAdaptiveDifficulty(setup, slotDefinition, recentReports);
  const exactMatches = candidates.filter(
    (candidate) =>
      candidate.competency === slotDefinition.competency &&
      candidate.difficulty === targetDifficulty &&
      candidate.assessmentType === slotDefinition.assessmentType &&
      (!slotDefinition.preferredKind || candidate.kind === slotDefinition.preferredKind)
  );

  if (exactMatches.length > 0) return exactMatches;

  const assessmentMatches = candidates.filter(
    (candidate) =>
      candidate.competency === slotDefinition.competency &&
      candidate.assessmentType === slotDefinition.assessmentType &&
      (!slotDefinition.preferredKind || candidate.kind === slotDefinition.preferredKind)
  );
  if (assessmentMatches.length > 0) return assessmentMatches;

  const competencyMatches = candidates.filter(
    (candidate) =>
      candidate.competency === slotDefinition.competency &&
      candidate.assessmentType === slotDefinition.assessmentType &&
      (!slotDefinition.preferredKind || candidate.kind === slotDefinition.preferredKind)
  );
  if (competencyMatches.length > 0) return competencyMatches;

  const difficultyMatches = candidates.filter(
    (candidate) =>
      candidate.difficulty === targetDifficulty &&
      (!slotDefinition.preferredKind || candidate.kind === slotDefinition.preferredKind)
  );
  if (difficultyMatches.length > 0) return difficultyMatches;

  return candidates;
};

const selectQuestionTemplate = (
  language: LanguageSlug,
  slotDefinition: BenchmarkPlanSlot,
  setup: BenchmarkSetup,
  attemptIndex: number,
  slotIndex: number,
  usedTemplateIds: Set<string>,
  recentlyUsedTemplateIds: Set<string>,
  recentReports: BenchmarkReport[]
) => {
  const candidates = getCandidatePool(language, slotDefinition, setup, recentReports);
  if (candidates.length === 0) return null;

  const orderedCandidates = [...candidates].sort((left, right) => left.templateId.localeCompare(right.templateId));
  const seedKey = slotDefinition.anchor
    ? `${setup.language}:${setup.goal}:${setup.roleLevel}:${slotDefinition.slotId}`
    : `${setup.language}:${setup.goal}:${setup.roleLevel}:${attemptIndex}:${slotDefinition.slotId}`;
  const seed = Math.abs(hashString(seedKey));
  const freshCandidates = orderedCandidates.filter((candidate) =>
    slotDefinition.anchor
      ? !usedTemplateIds.has(candidate.templateId)
      : !usedTemplateIds.has(candidate.templateId) && !recentlyUsedTemplateIds.has(candidate.templateId)
  );
  const unusedCandidates = orderedCandidates.filter((candidate) => !usedTemplateIds.has(candidate.templateId));
  const activePool =
    freshCandidates.length > 0 ? freshCandidates : unusedCandidates.length > 0 ? unusedCandidates : orderedCandidates;

  return activePool[(seed + slotIndex) % activePool.length];
};

export const buildBenchmarkQuestions = (
  setup: BenchmarkSetup,
  options: BuildBenchmarkQuestionOptions = {}
): BenchmarkQuestion[] => {
  const attemptIndex = options.attemptIndex ?? 0;
  const usedTemplateIds = new Set<string>();
  const recentRelevantReports = (options.recentReports || [])
    .filter((report) => matchesSetup(report.setup, setup) && report.questions?.length)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 2);
  const recentlyUsedTemplateIds = new Set(
    recentRelevantReports.flatMap((report) => report.questions.map((question) => question.templateId))
  );

  return getBenchmarkPlan(setup)
    .map((slotDefinition, slotIndex) => {
      const template = selectQuestionTemplate(
        setup.language,
        slotDefinition,
        setup,
        attemptIndex,
        slotIndex,
        usedTemplateIds,
        recentlyUsedTemplateIds,
        options.recentReports || []
      );

      if (!template) return null;

      usedTemplateIds.add(template.templateId);

      return {
        id: `${template.templateId}-a${attemptIndex + 1}-s${slotIndex + 1}`,
        templateId: template.templateId,
        slotId: slotDefinition.slotId,
        section: slotDefinition.section,
        sectionLabel: benchmarkSectionLabels[slotDefinition.section],
        assessmentType: template.assessmentType || slotDefinition.assessmentType,
        dimensions: getSlotDimensions(slotDefinition, template),
        anchor: Boolean(slotDefinition.anchor),
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
        difficulty: template.difficulty,
        weight: getQuestionWeight(setup, template, slotDefinition),
      };
    })
    .filter((question): question is BenchmarkQuestion => Boolean(question));
};

const getTrackRecommendations = (setup: BenchmarkSetup, weaknesses: string[]): string[] => {
  const directTrack = interviewTracks.find(
    (track) => track.benchmarkLanguage === setup.language && track.benchmarkRole === setup.roleLevel && track.benchmarkGoal === setup.goal
  );
  const fallbackLanguageTrack = interviewTracks.find((track) => track.language === setup.language);
  const weaknessTrack = weaknesses.some(
    (weakness) =>
      weakness.toLowerCase().includes('collections') ||
      weakness.toLowerCase().includes('problem solving') ||
      weakness.toLowerCase().includes('objects and classes')
  )
    ? interviewTracks.find((track) => track.id === 'data-structures-algorithms')
    : undefined;
  const goalTrack =
    setup.goal === 'interview_prep'
      ? interviewTracks.find((track) => track.id === 'junior-developer-screening')
      : setup.goal === 'skill_growth'
      ? interviewTracks.find((track) => track.id === 'backend-problem-solving')
      : undefined;

  return [directTrack?.id, weaknessTrack?.id, goalTrack?.id, fallbackLanguageTrack?.id].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index
  );
};

const getSuggestedLessons = (questions: BenchmarkQuestion[], weaknesses: string[], recommendedTrackIds: string[]) => {
  const weaknessKeys = weaknesses.map((weakness) => weakness.toLowerCase());
  const lessonIds = questions
    .filter((question) => weaknessKeys.some((weakness) => question.competency.toLowerCase().includes(weakness.toLowerCase())))
    .map((question) => question.lessonId);
  const trackLessonIds = recommendedTrackIds.flatMap(
    (trackId) => interviewTracks.find((track) => track.id === trackId)?.recommendedLessonIds || []
  );

  return Array.from(new Set([...lessonIds, ...trackLessonIds])).slice(0, 4);
};

const getSuggestedDuelProblems = (overallScore: number) => {
  const targetDifficulty = overallScore >= 80 ? 'medium' : 'easy';

  return duelProblemCatalog
    .filter((problem) => problem.difficulty === targetDifficulty)
    .slice(0, 3)
    .map((problem) => problem.title);
};

const benchmarkRoleBaselineScores: Record<BenchmarkRoleLevel, number> = {
  beginner: 44,
  intern: 58,
  junior: 72,
  general_practice: 60,
};

const benchmarkRoleCompetencies: Record<BenchmarkRoleLevel, string[]> = {
  beginner: ['Syntax and variables', 'Data types and operators', 'Control flow'],
  intern: ['Control flow', 'Collections', 'Functions'],
  junior: ['Functions', 'Collections', 'Problem solving', 'Objects and classes'],
  general_practice: ['Collections', 'Functions', 'Problem solving'],
};

const benchmarkGoalCompetencies: Record<BenchmarkGoal, string[]> = {
  interview_prep: ['Problem solving', 'Objects and classes'],
  class_improvement: ['Syntax and variables', 'Data types and operators', 'Control flow'],
  skill_growth: ['Collections', 'Functions', 'Problem solving'],
};

const getRoleEstimate = (
  setup: BenchmarkSetup,
  overallScore: number,
  competencyScores: Array<{ competency: string; ratio: number }>
): BenchmarkEstimation => {
  const targetRoleLabel = {
    beginner: 'beginner baseline',
    intern: 'intern-ready baseline',
    junior: 'junior screening baseline',
    general_practice: 'general practice baseline',
  }[setup.roleLevel];
  const baselineScore =
    benchmarkRoleBaselineScores[setup.roleLevel] +
    (setup.goal === 'interview_prep' && setup.roleLevel !== 'beginner' ? 3 : 0) -
    (setup.goal === 'class_improvement' && setup.roleLevel === 'beginner' ? 2 : 0);
  const scoreMap = new Map(competencyScores.map((entry) => [entry.competency, entry.ratio]));
  const requiredCompetencies = Array.from(
    new Set([...benchmarkRoleCompetencies[setup.roleLevel], ...benchmarkGoalCompetencies[setup.goal]])
  );
  const competencyCoveragePercent = clamp(
    Math.round(
      (requiredCompetencies.reduce((total, competency) => total + (scoreMap.get(competency) ?? 0), 0) /
        Math.max(1, requiredCompetencies.length)) *
        100
    ),
    0,
    100
  );
  const calibratedScore = Math.round(overallScore * 0.78 + competencyCoveragePercent * 0.22);

  if (calibratedScore >= baselineScore + 10) {
    return {
      label: `At or above the selected ${targetRoleLabel}`,
      description: `Your score and competency coverage both land above the expected range for the selected ${targetRoleLabel} in ${setup.language}.`,
      targetRoleLabel,
      baselineScore,
      competencyCoveragePercent,
    };
  }

  if (calibratedScore >= baselineScore - 2) {
    return {
      label: `Close to the selected ${targetRoleLabel}`,
      description: `You are within reach of the selected ${targetRoleLabel}, but the benchmark still shows inconsistent performance in the required competencies.`,
      targetRoleLabel,
      baselineScore,
      competencyCoveragePercent,
    };
  }

  if (calibratedScore >= baselineScore - 14) {
    return {
      label: `Developing toward the selected ${targetRoleLabel}`,
      description: `You have partial readiness for the selected ${targetRoleLabel}, but the benchmark still shows material gaps that should be closed before relying on performance under pressure.`,
      targetRoleLabel,
      baselineScore,
      competencyCoveragePercent,
    };
  }

  return {
    label: `Below the selected ${targetRoleLabel}`,
    description: `Your benchmark shows foundational gaps relative to the selected ${targetRoleLabel}. Focus on the roadmap first, then retake to measure the next delta.`,
    targetRoleLabel,
    baselineScore,
    competencyCoveragePercent,
  };
};

const isValidBenchmarkSetup = (value: any): value is BenchmarkSetup =>
  value &&
  (value.goal === 'interview_prep' || value.goal === 'class_improvement' || value.goal === 'skill_growth') &&
  (value.language === 'python' || value.language === 'javascript' || value.language === 'java' || value.language === 'cpp') &&
  (value.roleLevel === 'beginner' || value.roleLevel === 'intern' || value.roleLevel === 'junior' || value.roleLevel === 'general_practice');

const getSummary = (setup: BenchmarkSetup, estimate: BenchmarkEstimation) => {
  const coverageLabel = `${estimate.competencyCoveragePercent}% of the required competency blueprint`;

  if (setup.goal === 'class_improvement') {
    return `${estimate.label}. This attempt covered ${coverageLabel}, so use it to identify who needs guided remediation before the next cohort checkpoint.`;
  }

  if (setup.goal === 'interview_prep') {
    return `${estimate.label}. This attempt covered ${coverageLabel}, so use interview-style practice and another benchmark pass to prove that the score holds under repeat pressure.`;
  }

  return `${estimate.label}. This attempt covered ${coverageLabel}, so use the roadmap to strengthen the weakest competencies, then retake to turn practice into visible score movement.`;
};

const getDuelReadiness = (overallScore: number, answeredRatio: number) => {
  const coverageBonus = Math.round(answeredRatio * 10);

  if (overallScore >= 80) {
    return {
      label: 'Ready for ranked duels',
      description: 'You can start using duels as proof of skill while keeping a practice path active.',
      confidencePercent: clamp(78 + coverageBonus, 0, 94),
    };
  }

  if (overallScore >= 60) {
    return {
      label: 'Practice before ranked duels',
      description: 'You are close. Focus on the suggested path, then step into duels with better confidence.',
      confidencePercent: clamp(56 + coverageBonus, 0, 88),
    };
  }

  return {
    label: 'Build fundamentals first',
    description: 'Use the roadmap to strengthen fundamentals before relying on duel performance as a signal.',
    confidencePercent: clamp(28 + coverageBonus, 0, 72),
  };
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

const getDimensionContribution = (
  dimension: BenchmarkDimensionKey,
  question: BenchmarkQuestion,
  answer?: BenchmarkAnswerRecord
) => {
  const fallbackScore = getAnswerScorePercent(question, answer);
  const rubric = answer?.rubricBreakdown;

  if (!rubric) return fallbackScore;

  switch (dimension) {
    case 'code_quality':
      return rubric.codeQuality;
    case 'efficiency':
      return rubric.efficiency;
    case 'code_writing':
      return Math.round((rubric.correctness + rubric.codeQuality) / 2);
    case 'debugging':
      return question.section === 'debugging'
        ? Math.round((rubric.correctness + rubric.edgeCaseHandling + rubric.codeQuality) / 3)
        : fallbackScore;
    case 'code_reading':
      return question.section === 'debugging'
        ? Math.round((rubric.correctness + rubric.edgeCaseHandling) / 2)
        : fallbackScore;
    case 'problem_solving':
      return Math.round((rubric.correctness + rubric.edgeCaseHandling + rubric.efficiency) / 3);
    case 'language_fluency':
      return question.kind === 'code' ? Math.round((rubric.correctness + rubric.codeQuality) / 2) : fallbackScore;
    default:
      return fallbackScore;
  }
};

const getDimensionDescription = (dimension: BenchmarkDimensionKey, score: number) => {
  if (dimension === 'consistency') {
    if (score >= 78) return 'Your signal is stable across benchmark attempts.';
    if (score >= 58) return 'The benchmark signal is usable, but another retake would improve confidence.';
    return 'Retake once the roadmap work is done so the score is more reliable.';
  }

  if (score >= 80) return 'This is a clear strength right now.';
  if (score >= 62) return 'This skill is developing in the right direction.';
  return 'This area still needs focused practice before it becomes reliable.';
};

const getConfidenceBand = (
  overallScore: number,
  answeredRatio: number,
  sectionScores: BenchmarkReportSectionScore[],
  consistencyScore: number
): BenchmarkConfidenceBand => {
  const scoredSections = sectionScores.map((entry) => entry.score);
  const sectionSpread =
    scoredSections.length > 0 ? Math.max(...scoredSections) - Math.min(...scoredSections) : 0;
  const percent = clamp(
    Math.round(44 + answeredRatio * 22 + consistencyScore * 0.24 + overallScore * 0.16 - sectionSpread * 0.12),
    32,
    96
  );

  if (percent >= 78) {
    return {
      label: 'High confidence signal',
      percent,
      description: 'Coverage, section balance, and score consistency make this benchmark dependable enough to share.',
    };
  }

  if (percent >= 60) {
    return {
      label: 'Moderate confidence signal',
      percent,
      description: 'This is useful for coaching and routing, but one more benchmark pass would strengthen the signal.',
    };
  }

  return {
    label: 'Early confidence signal',
    percent,
    description: 'Use this as an initial baseline, then retake after guided practice to make the score more trustworthy.',
  };
};

export const buildBenchmarkReport = (
  setup: BenchmarkSetup,
  questions: BenchmarkQuestion[],
  answerRecords: BenchmarkAnswerRecord[],
  options: BuildBenchmarkQuestionOptions = {}
): BenchmarkReport => {
  const attemptIndex = options.attemptIndex ?? 0;
  const totalQuestions = Math.max(1, questions.length);
  const answerRecordMap = new Map(answerRecords.map((record) => [record.questionId, record]));
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const latestComparableReport = getLatestComparableReport(setup, options.recentReports || []);
  const correctAnswers = answerRecords.filter((record) => record.isCorrect).length;
  let weightedScore = 0;
  let weightedTotal = 0;
  const answeredCount = answerRecords.filter(
    (record) => {
      if (typeof record.selectedAnswer === 'number' && record.selectedAnswer >= 0) {
        return true;
      }

      if (!record.submittedCode?.trim()) {
        return false;
      }

      const question = questionMap.get(record.questionId);
      if (!question || question.kind !== 'code') {
        return true;
      }

      if (record.evaluationMessage?.trim()) {
        return true;
      }

      return (
        normalizeCodeForComparison(record.submittedCode) !==
        normalizeCodeForComparison(question.starterCode || '')
      );
    }
  ).length;
  const competencyMap = new Map<string, { scoreWeight: number; totalWeight: number; correct: number; total: number }>();
  const sectionMap = new Map<BenchmarkQuestionSection, { weightedScore: number; totalWeight: number; questionCount: number }>();
  const dimensionMap = new Map<BenchmarkDimensionKey, { weightedScore: number; totalWeight: number }>();

  questions.forEach((question) => {
    const current = competencyMap.get(question.competency) ?? {
      scoreWeight: 0,
      totalWeight: 0,
      correct: 0,
      total: 0,
    };
    const answer = answerRecordMap.get(question.id);
    const weight = question.weight || difficultyWeights[question.difficulty];
    const questionScore = getAnswerScorePercent(question, answer);
    const normalizedQuestionScore = questionScore / 100;

    weightedTotal += weight;
    weightedScore += weight * normalizedQuestionScore;

    competencyMap.set(question.competency, {
      totalWeight: current.totalWeight + weight,
      scoreWeight: current.scoreWeight + weight * normalizedQuestionScore,
      total: current.total + 1,
      correct: current.correct + (answer?.isCorrect ? 1 : 0),
    });

    const currentSection = sectionMap.get(question.section) ?? {
      weightedScore: 0,
      totalWeight: 0,
      questionCount: 0,
    };
    sectionMap.set(question.section, {
      weightedScore: currentSection.weightedScore + weight * normalizedQuestionScore,
      totalWeight: currentSection.totalWeight + weight,
      questionCount: currentSection.questionCount + 1,
    });

    question.dimensions.forEach((dimension) => {
      const currentDimension = dimensionMap.get(dimension) ?? {
        weightedScore: 0,
        totalWeight: 0,
      };
      const dimensionScore = getDimensionContribution(dimension, question, answer) / 100;
      dimensionMap.set(dimension, {
        weightedScore: currentDimension.weightedScore + weight * dimensionScore,
        totalWeight: currentDimension.totalWeight + weight,
      });
    });
  });

  const overallScore = clamp(Math.round((weightedScore / Math.max(1, weightedTotal)) * 100), 0, 100);
  const competencyScores = Array.from(competencyMap.entries()).map(([competency, score]) => ({
    competency,
    ratio: score.totalWeight > 0 ? score.scoreWeight / score.totalWeight : 0,
  }));
  const sectionScores = Array.from(sectionMap.entries()).map(([section, score]) => ({
    section,
    label: benchmarkSectionLabels[section],
    score: clamp(Math.round((score.weightedScore / Math.max(1, score.totalWeight)) * 100), 0, 100),
    questionCount: score.questionCount,
  }));
  const rawDimensionScores = Array.from(dimensionMap.entries()).map(([key, score]) => ({
    key,
    label: benchmarkDimensionLabels[key],
    score: clamp(Math.round((score.weightedScore / Math.max(1, score.totalWeight)) * 100), 0, 100),
  }));
  const estimation = getRoleEstimate(setup, overallScore, competencyScores);
  const consistencyScore = latestComparableReport
    ? clamp(84 - Math.abs(overallScore - latestComparableReport.overallScore) * 2 + (overallScore >= latestComparableReport.overallScore ? 4 : 0), 36, 96)
    : clamp(54 + (answeredCount / totalQuestions) * 18 + Math.min(attemptIndex, 1) * 8, 42, 76);
  const dimensionScores: BenchmarkReportDimensionScore[] = [
    ...rawDimensionScores.map((dimension) => ({
      ...dimension,
      description: getDimensionDescription(dimension.key, dimension.score),
    })),
    {
      key: 'consistency',
      label: benchmarkDimensionLabels.consistency,
      score: Math.round(consistencyScore),
      description: getDimensionDescription('consistency', Math.round(consistencyScore)),
    },
  ].sort((left, right) => right.score - left.score);

  const strengths = competencyScores
    .filter((entry) => entry.ratio >= 0.7)
    .sort((left, right) => right.ratio - left.ratio)
    .slice(0, 3)
    .map((entry) => entry.competency);

  const weaknesses = competencyScores
    .filter((entry) => entry.ratio < 0.7)
    .sort((left, right) => left.ratio - right.ratio)
    .slice(0, 3)
    .map((entry) => entry.competency);

  const recommendedTrackIds = getTrackRecommendations(setup, weaknesses);
  const confidenceBand = getConfidenceBand(overallScore, answeredCount / totalQuestions, sectionScores, consistencyScore);
  const reportId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `benchmark-${crypto.randomUUID()}`
      : `benchmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: reportId,
    benchmarkVersion: BENCHMARK_VERSION,
    attemptIndex,
    setup,
    overallScore,
    correctAnswers,
    totalQuestions,
    strengths: strengths.length > 0 ? strengths : ['Early benchmark momentum'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Advanced challenge depth'],
    dimensionScores,
    sectionScores,
    confidenceBand,
    recommendedTrackIds,
    suggestedLessonIds: getSuggestedLessons(questions, weaknesses, recommendedTrackIds),
    suggestedDuelProblemTitles: getSuggestedDuelProblems(overallScore),
    duelReadiness: getDuelReadiness(overallScore, answeredCount / totalQuestions),
    estimation,
    summary: getSummary(setup, estimation),
    createdAt: new Date().toISOString(),
    questions,
    answerRecords,
  };
};

export const hydrateBenchmarkReport = (report: BenchmarkReport): BenchmarkReport => {
  if (!report?.setup || !isValidBenchmarkSetup(report.setup)) {
    return report;
  }

  const attemptIndex = typeof report.attemptIndex === 'number' ? report.attemptIndex : 0;
  const questions =
    Array.isArray(report.questions) && report.questions.length > 0
      ? report.questions.map((question) => ({
          ...question,
          section:
            question.section ||
            (question.kind === 'code'
              ? 'implementation'
              : Array.isArray(question.options) && typeof question.correctAnswer === 'number'
              ? 'theory'
              : 'comprehension'),
          sectionLabel:
            question.sectionLabel ||
            benchmarkSectionLabels[
              question.section ||
                (question.kind === 'code'
                  ? 'implementation'
                  : Array.isArray(question.options) && typeof question.correctAnswer === 'number'
                  ? 'theory'
                  : 'comprehension')
            ],
          assessmentType:
            question.assessmentType ||
            (question.kind === 'code'
              ? 'implementation'
              : Array.isArray(question.options) && typeof question.correctAnswer === 'number'
              ? 'theory'
              : 'comprehension'),
          dimensions:
            Array.isArray(question.dimensions) && question.dimensions.length > 0
              ? question.dimensions
              : ['language_fluency'],
          anchor: Boolean(question.anchor),
          kind:
            question.kind ||
            (Array.isArray(question.options) && typeof question.correctAnswer === 'number'
              ? 'multiple_choice'
              : 'code'),
        }))
      : buildBenchmarkQuestions(report.setup, { attemptIndex });
  const answerRecords = Array.isArray(report.answerRecords) ? report.answerRecords : [];
  const fallback = buildBenchmarkReport(report.setup, questions, answerRecords, { attemptIndex });

  return {
    ...report,
    benchmarkVersion: report.benchmarkVersion || BENCHMARK_VERSION,
    attemptIndex,
    correctAnswers: Number.isFinite(report.correctAnswers) ? report.correctAnswers : fallback.correctAnswers,
    totalQuestions: Number.isFinite(report.totalQuestions) ? report.totalQuestions : questions.length,
    strengths: Array.isArray(report.strengths) && report.strengths.length > 0 ? report.strengths : fallback.strengths,
    weaknesses: Array.isArray(report.weaknesses) && report.weaknesses.length > 0 ? report.weaknesses : fallback.weaknesses,
    dimensionScores:
      Array.isArray(report.dimensionScores) && report.dimensionScores.length > 0
        ? report.dimensionScores
        : fallback.dimensionScores,
    sectionScores:
      Array.isArray(report.sectionScores) && report.sectionScores.length > 0
        ? report.sectionScores
        : fallback.sectionScores,
    confidenceBand: report.confidenceBand || fallback.confidenceBand,
    recommendedTrackIds:
      Array.isArray(report.recommendedTrackIds) && report.recommendedTrackIds.length > 0
        ? report.recommendedTrackIds
        : fallback.recommendedTrackIds,
    suggestedLessonIds:
      Array.isArray(report.suggestedLessonIds) && report.suggestedLessonIds.length > 0
        ? report.suggestedLessonIds
        : fallback.suggestedLessonIds,
    suggestedDuelProblemTitles:
      Array.isArray(report.suggestedDuelProblemTitles) && report.suggestedDuelProblemTitles.length > 0
        ? report.suggestedDuelProblemTitles
        : fallback.suggestedDuelProblemTitles,
    duelReadiness: report.duelReadiness || fallback.duelReadiness,
    estimation: report.estimation || fallback.estimation,
    summary: report.summary || fallback.summary,
    questions,
    answerRecords,
  };
};

export const getBenchmarkStorageKey = (userId?: string | null) => `codhak-benchmark-report:${userId || 'anonymous'}`;
export const getBenchmarkHistoryStorageKey = (userId?: string | null) =>
  `${BENCHMARK_HISTORY_STORAGE_KEY}:${userId || 'anonymous'}`;

const normalizeBenchmarkHistory = (reports: Array<BenchmarkReport | null | undefined>) =>
  Array.from(
    reports
      .filter((report): report is BenchmarkReport => Boolean(report?.id && report?.createdAt))
      .reduce((map, report) => {
        map.set(report.id, hydrateBenchmarkReport(report));
        return map;
      }, new Map<string, BenchmarkReport>())
      .values()
  ).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

export const saveBenchmarkReportHistory = (reports: BenchmarkReport[], userId?: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    const normalizedHistory = normalizeBenchmarkHistory(reports);
    window.localStorage.setItem(getBenchmarkHistoryStorageKey(userId), JSON.stringify(normalizedHistory));
    if (normalizedHistory[0]) {
      window.localStorage.setItem(getBenchmarkStorageKey(userId), JSON.stringify(normalizedHistory[0]));
    }
  } catch {
    // Ignore storage failures for MVP.
  }
};

export const readSavedBenchmarkHistory = (userId?: string | null): BenchmarkReport[] => {
  if (typeof window === 'undefined') return [];

  try {
    const historyValue = window.localStorage.getItem(getBenchmarkHistoryStorageKey(userId));
    if (historyValue) {
      return normalizeBenchmarkHistory(JSON.parse(historyValue) as BenchmarkReport[]);
    }

    const legacyValue = window.localStorage.getItem(getBenchmarkStorageKey(userId));
    if (!legacyValue) return [];

    const legacyReport = JSON.parse(legacyValue) as BenchmarkReport;
    const nextHistory = normalizeBenchmarkHistory([legacyReport]);
    if (nextHistory.length > 0) {
      window.localStorage.setItem(getBenchmarkHistoryStorageKey(userId), JSON.stringify(nextHistory));
    }
    return nextHistory;
  } catch {
    return [];
  }
};

export const saveBenchmarkReport = (report: BenchmarkReport, userId?: string | null) => {
  const existingHistory = readSavedBenchmarkHistory(userId);
  saveBenchmarkReportHistory([report, ...existingHistory], userId);
};

export const readSavedBenchmarkReport = (userId?: string | null): BenchmarkReport | null => {
  return readSavedBenchmarkHistory(userId)[0] || null;
};

export const saveBenchmarkSetupPreset = (setup: BenchmarkSetup) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(BENCHMARK_SETUP_PRESET_STORAGE_KEY, JSON.stringify(setup));
  } catch {
    // Ignore storage failures for MVP.
  }
};

export const readBenchmarkSetupPreset = (): BenchmarkSetup | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(BENCHMARK_SETUP_PRESET_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return isValidBenchmarkSetup(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const clearBenchmarkSetupPreset = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(BENCHMARK_SETUP_PRESET_STORAGE_KEY);
  } catch {
    // Ignore storage failures for MVP.
  }
};

export const buildSampleBenchmarkReport = (): BenchmarkReport => {
  const setup: BenchmarkSetup = {
    goal: 'interview_prep',
    language: 'python',
    roleLevel: 'junior',
  };
  const questions = buildBenchmarkQuestions(setup, { attemptIndex: 1 });
  const answerRecords = questions.map((question, index) => {
    const shouldBeCorrect = index % 3 === 0 || index % 2 === 0;
    const incorrectOption =
      Array.isArray(question.options) && typeof question.correctAnswer === 'number'
        ? question.options.findIndex((_, optionIndex) => optionIndex !== question.correctAnswer)
        : -1;

    return {
      questionId: question.id,
      selectedAnswer:
        question.kind === 'multiple_choice'
          ? shouldBeCorrect
            ? question.correctAnswer
            : Math.max(0, incorrectOption)
          : undefined,
      submittedCode:
        question.kind === 'code'
          ? shouldBeCorrect
            ? question.referenceCode || question.starterCode || ''
            : `${question.starterCode || ''}\n// incomplete`
          : undefined,
      isCorrect: shouldBeCorrect,
      evaluationMessage:
        question.kind === 'code'
          ? shouldBeCorrect
            ? 'Code includes the required logic.'
            : 'The submission did not include the required logic.'
          : undefined,
    };
  });
  const report = buildBenchmarkReport(setup, questions, answerRecords, { attemptIndex: 1 });

  return {
    ...report,
    id: 'sample-report',
    isSample: true,
    overallScore: 72,
    correctAnswers: 4,
    totalQuestions: questions.length,
    strengths: ['Syntax and variables', 'Control flow'],
    weaknesses: ['Problem solving', 'Objects and classes'],
    recommendedTrackIds: ['python-fundamentals', 'backend-problem-solving'],
    suggestedLessonIds: ['python-lists', 'python-functions', 'python-oop', 'python-dictionaries'],
    suggestedDuelProblemTitles: ['Curie\'s Cold Notes', 'Franklin\'s Signal Majority', 'Galileo\'s Rising Streak'],
    duelReadiness: {
      label: 'Practice before ranked duels',
      description: 'You are close. One focused practice block would make your duel performance much more reliable.',
      confidencePercent: 68,
    },
    estimation: {
      label: 'Close to the selected junior screening baseline',
      description:
        'This sample report shows a learner who is near junior-level screening readiness, but still needs more consistent performance in problem solving and object-oriented questions.',
      targetRoleLabel: 'junior screening baseline',
      baselineScore: 75,
      competencyCoveragePercent: 69,
    },
    summary:
      'This sample report shows how Codhak turns a short benchmark into a score, a roadmap, and clear next steps for interview-style practice.',
  };
};
