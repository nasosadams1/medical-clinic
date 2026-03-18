import {
  getBenchmarkQuestionCandidates,
  type BenchmarkQuestionDifficulty,
  type BenchmarkQuestionTemplate,
} from './benchmarkQuestionBank';
import { interviewTracks, type LanguageSlug } from './siteContent';
import { normalizeCodeForComparison } from '../lib/codeAssessment';
import { duelProblemCatalog } from '../../data/duel-problem-catalog.js';

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
  isCorrect: boolean;
}

export interface BenchmarkEstimation {
  label: string;
  description: string;
  targetRoleLabel: string;
  baselineScore: number;
  competencyCoveragePercent: number;
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
const BENCHMARK_VERSION = 'v2-calibrated';

type BenchmarkPlanSlot = {
  slotId: string;
  competency: string;
  difficulty: BenchmarkQuestionDifficulty;
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
}

const slot = (
  slotId: string,
  competency: string,
  difficulty: BenchmarkQuestionDifficulty,
  preferredKind?: 'multiple_choice' | 'code'
): BenchmarkPlanSlot => ({ slotId, competency, difficulty, preferredKind });

const difficultyWeights: Record<BenchmarkQuestionDifficulty, number> = {
  beginner: 1,
  intermediate: 1.35,
  advanced: 1.7,
};

const benchmarkPlans: Record<BenchmarkGoal, Record<BenchmarkRoleLevel, BenchmarkPlanSlot[]>> = {
  interview_prep: {
    beginner: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
    ],
    intern: [
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('problem-solving-2', 'Problem solving', 'intermediate', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
    ],
    junior: [
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('problem-solving-2', 'Problem solving', 'intermediate', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
      slot('oop-2', 'Objects and classes', 'advanced'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
    ],
    general_practice: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
    ],
  },
  class_improvement: {
    beginner: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('flow-2', 'Control flow', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
    ],
    intern: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
    ],
    junior: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
      slot('flow-2', 'Control flow', 'beginner', 'code'),
    ],
    general_practice: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
    ],
  },
  skill_growth: {
    beginner: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
    ],
    intern: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('collections-2', 'Collections', 'intermediate', 'code'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
    ],
    junior: [
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
      slot('problem-solving-1', 'Problem solving', 'intermediate', 'code'),
      slot('problem-solving-2', 'Problem solving', 'intermediate', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
      slot('collections-2', 'Collections', 'intermediate', 'code'),
      slot('oop-2', 'Objects and classes', 'advanced'),
    ],
    general_practice: [
      slot('vars-1', 'Syntax and variables', 'beginner', 'code'),
      slot('types-1', 'Data types and operators', 'beginner'),
      slot('flow-1', 'Control flow', 'beginner', 'code'),
      slot('collections-1', 'Collections', 'intermediate', 'code'),
      slot('functions-1', 'Functions', 'intermediate', 'code'),
      slot('functions-2', 'Functions', 'intermediate', 'code'),
      slot('oop-1', 'Objects and classes', 'advanced'),
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
  };
};

const getQuestionWeight = (setup: BenchmarkSetup, template: BenchmarkQuestionTemplate) => {
  let weight = difficultyWeights[template.difficulty];

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

const getCandidatePool = (
  language: LanguageSlug,
  slotDefinition: BenchmarkPlanSlot
): BenchmarkQuestionTemplate[] => {
  const candidates = getBenchmarkQuestionCandidates(language);
  const exactMatches = candidates.filter(
    (candidate) =>
      candidate.competency === slotDefinition.competency &&
      candidate.difficulty === slotDefinition.difficulty &&
      (!slotDefinition.preferredKind || candidate.kind === slotDefinition.preferredKind)
  );

  if (exactMatches.length > 0) return exactMatches;

  const competencyMatches = candidates.filter(
    (candidate) =>
      candidate.competency === slotDefinition.competency &&
      (!slotDefinition.preferredKind || candidate.kind === slotDefinition.preferredKind)
  );
  if (competencyMatches.length > 0) return competencyMatches;

  const difficultyMatches = candidates.filter(
    (candidate) =>
      candidate.difficulty === slotDefinition.difficulty &&
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
  recentlyUsedTemplateIds: Set<string>
) => {
  const candidates = getCandidatePool(language, slotDefinition);
  if (candidates.length === 0) return null;

  const orderedCandidates = [...candidates].sort((left, right) => left.templateId.localeCompare(right.templateId));
  const seed = Math.abs(hashString(`${setup.language}:${setup.goal}:${setup.roleLevel}:${attemptIndex}:${slotDefinition.slotId}`));
  const freshCandidates = orderedCandidates.filter(
    (candidate) => !usedTemplateIds.has(candidate.templateId) && !recentlyUsedTemplateIds.has(candidate.templateId)
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
        recentlyUsedTemplateIds
      );

      if (!template) return null;

      usedTemplateIds.add(template.templateId);

      return {
        id: `${template.templateId}-a${attemptIndex + 1}-s${slotIndex + 1}`,
        templateId: template.templateId,
        slotId: slotDefinition.slotId,
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
        explanation: template.explanation,
        competency: template.competency,
        difficulty: template.difficulty,
        weight: getQuestionWeight(setup, template),
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

export const buildBenchmarkReport = (
  setup: BenchmarkSetup,
  questions: BenchmarkQuestion[],
  answerRecords: BenchmarkAnswerRecord[],
  options: BuildBenchmarkQuestionOptions = {}
): BenchmarkReport => {
  const attemptIndex = options.attemptIndex ?? 0;
  const correctAnswers = answerRecords.filter((record) => record.isCorrect).length;
  const totalQuestions = Math.max(1, questions.length);
  const answerRecordMap = new Map(answerRecords.map((record) => [record.questionId, record]));
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  let weightedCorrect = 0;
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
  const competencyMap = new Map<string, { correctWeight: number; totalWeight: number; correct: number; total: number }>();

  questions.forEach((question) => {
    const current = competencyMap.get(question.competency) ?? {
      correctWeight: 0,
      totalWeight: 0,
      correct: 0,
      total: 0,
    };
    const answer = answerRecordMap.get(question.id);
    const weight = question.weight || difficultyWeights[question.difficulty];

    weightedTotal += weight;
    if (answer?.isCorrect) {
      weightedCorrect += weight;
    }

    competencyMap.set(question.competency, {
      totalWeight: current.totalWeight + weight,
      correctWeight: current.correctWeight + (answer?.isCorrect ? weight : 0),
      total: current.total + 1,
      correct: current.correct + (answer?.isCorrect ? 1 : 0),
    });
  });

  const overallScore = clamp(Math.round((weightedCorrect / Math.max(1, weightedTotal)) * 100), 0, 100);
  const competencyScores = Array.from(competencyMap.entries()).map(([competency, score]) => ({
    competency,
    ratio: score.totalWeight > 0 ? score.correctWeight / score.totalWeight : 0,
  }));
  const estimation = getRoleEstimate(setup, overallScore, competencyScores);

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
