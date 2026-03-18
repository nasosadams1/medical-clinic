import { allLessons, getLessonById } from './lessons';
import { interviewTracks, type LanguageSlug } from './siteContent';
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
  lessonId: string;
  lessonTitle: string;
  prompt: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  competency: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface BenchmarkAnswerRecord {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface BenchmarkReport {
  id: string;
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
  summary: string;
  createdAt: string;
  answerRecords: BenchmarkAnswerRecord[];
}

const BENCHMARK_SETUP_PRESET_STORAGE_KEY = 'codhak-benchmark-setup-preset';

type QuestionBlueprint = {
  lessonId: string;
  questionIndex: number;
  competency: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
};

const languageBlueprints: Record<LanguageSlug, QuestionBlueprint[]> = {
  python: [
    { lessonId: 'python-variables-1', questionIndex: 0, competency: 'Syntax and variables', difficulty: 'beginner' },
    { lessonId: 'python-variables-2', questionIndex: 0, competency: 'Data types and operators', difficulty: 'beginner' },
    { lessonId: 'python-if-statements', questionIndex: 0, competency: 'Control flow', difficulty: 'beginner' },
    { lessonId: 'python-lists', questionIndex: 0, competency: 'Collections', difficulty: 'intermediate' },
    { lessonId: 'python-functions', questionIndex: 0, competency: 'Functions', difficulty: 'intermediate' },
    { lessonId: 'python-oop', questionIndex: 0, competency: 'Objects and classes', difficulty: 'advanced' },
  ],
  javascript: [
    { lessonId: 'javascript-variables-1', questionIndex: 0, competency: 'Variables and syntax', difficulty: 'beginner' },
    { lessonId: 'javascript-datatypes-1', questionIndex: 0, competency: 'Data types and coercion', difficulty: 'beginner' },
    { lessonId: 'javascript-if-else-1', questionIndex: 0, competency: 'Control flow', difficulty: 'beginner' },
    { lessonId: 'javascript-functions-1', questionIndex: 0, competency: 'Functions', difficulty: 'intermediate' },
    { lessonId: 'javascript-arrays-1', questionIndex: 0, competency: 'Arrays', difficulty: 'intermediate' },
    { lessonId: 'js-classes-1', questionIndex: 0, competency: 'Objects and classes', difficulty: 'advanced' },
  ],
  cpp: [
    { lessonId: 'cpp-variables', questionIndex: 0, competency: 'Syntax and variables', difficulty: 'beginner' },
    { lessonId: 'cpp-data-types', questionIndex: 0, competency: 'Data types', difficulty: 'beginner' },
    { lessonId: 'cpp-if-else', questionIndex: 0, competency: 'Control flow', difficulty: 'beginner' },
    { lessonId: 'cpp-functions', questionIndex: 0, competency: 'Functions', difficulty: 'intermediate' },
    { lessonId: 'cpp-arrays', questionIndex: 0, competency: 'Arrays', difficulty: 'intermediate' },
    { lessonId: 'cpp-classes-objects', questionIndex: 0, competency: 'Classes and objects', difficulty: 'advanced' },
  ],
  java: [
    { lessonId: 'java-variables', questionIndex: 0, competency: 'Syntax and variables', difficulty: 'beginner' },
    { lessonId: 'java-data-types', questionIndex: 0, competency: 'Data types', difficulty: 'beginner' },
    { lessonId: 'java-if-else', questionIndex: 0, competency: 'Control flow', difficulty: 'beginner' },
    { lessonId: 'java-methods', questionIndex: 0, competency: 'Methods', difficulty: 'intermediate' },
    { lessonId: 'java-arrays', questionIndex: 0, competency: 'Arrays', difficulty: 'intermediate' },
    { lessonId: 'java-oop', questionIndex: 0, competency: 'OOP foundations', difficulty: 'advanced' },
  ],
};

const getQuestionFromBlueprint = (language: LanguageSlug, blueprint: QuestionBlueprint): BenchmarkQuestion | null => {
  const lesson = getLessonById(blueprint.lessonId);
  const questionSteps = lesson?.content?.steps?.filter((step) => step.type === 'question') ?? [];
  const question = questionSteps[blueprint.questionIndex] ?? questionSteps[0];

  if (!lesson || !question || !question.options) {
    const fallbackLesson = allLessons.find(
      (entry) => entry.language === language && entry.content.steps.some((step) => step.type === 'question')
    );
    const fallbackQuestion = fallbackLesson?.content.steps.find((step) => step.type === 'question');

    if (!fallbackLesson || !fallbackQuestion || fallbackQuestion.type !== 'question') {
      return null;
    }

    return {
      id: `${fallbackLesson.id}-benchmark-fallback`,
      lessonId: fallbackLesson.id,
      lessonTitle: fallbackLesson.title,
      prompt: fallbackQuestion.question,
      options: fallbackQuestion.options,
      correctAnswer: fallbackQuestion.correctAnswer,
      explanation: fallbackQuestion.explanation,
      competency: blueprint.competency,
      difficulty: blueprint.difficulty,
    };
  }

  return {
    id: `${lesson.id}-benchmark-${blueprint.questionIndex}`,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    prompt: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    competency: blueprint.competency,
    difficulty: blueprint.difficulty,
  };
};

export const buildBenchmarkQuestions = (setup: BenchmarkSetup): BenchmarkQuestion[] =>
  languageBlueprints[setup.language]
    .map((blueprint) => getQuestionFromBlueprint(setup.language, blueprint))
    .filter((question): question is BenchmarkQuestion => Boolean(question));

const getTrackRecommendations = (setup: BenchmarkSetup, weaknesses: string[]): string[] => {
  const directTrack = interviewTracks.find(
    (track) => track.benchmarkLanguage === setup.language && track.benchmarkRole === setup.roleLevel && track.benchmarkGoal === setup.goal
  );
  const fallbackLanguageTrack = interviewTracks.find((track) => track.language === setup.language);
  const weaknessTrack = weaknesses.some((weakness) => weakness.toLowerCase().includes('arrays'))
    ? interviewTracks.find((track) => track.id === 'data-structures-algorithms')
    : undefined;

  return [directTrack?.id, weaknessTrack?.id, fallbackLanguageTrack?.id].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index
  );
};

const getSuggestedLessons = (questions: BenchmarkQuestion[], weaknesses: string[]) => {
  const weaknessKeys = weaknesses.map((weakness) => weakness.toLowerCase());
  const lessonIds = questions
    .filter((question) => weaknessKeys.some((weakness) => question.competency.toLowerCase().includes(weakness.toLowerCase())))
    .map((question) => question.lessonId);

  return Array.from(new Set(lessonIds)).slice(0, 4);
};

const getSuggestedDuelProblems = (overallScore: number) => {
  const targetDifficulty =
    overallScore >= 80 ? 'medium' : overallScore >= 55 ? 'easy' : 'easy';

  return duelProblemCatalog
    .filter((problem) => problem.difficulty === targetDifficulty)
    .slice(0, 3)
    .map((problem) => problem.title);
};

const getSummary = (setup: BenchmarkSetup, overallScore: number) => {
  if (overallScore >= 80) {
    return `You already show strong ${setup.language} readiness. Use duels and interview tracks to prove consistency under pressure.`;
  }

  if (overallScore >= 55) {
    return `You have a workable ${setup.language} base, but you need a tighter practice loop before relying on live duels or interview screens.`;
  }

  return `Your benchmark shows foundational gaps in ${setup.language}. Focus on the roadmap first, then move into timed challenge practice.`;
};

const isValidBenchmarkSetup = (value: any): value is BenchmarkSetup =>
  value &&
  (value.goal === 'interview_prep' || value.goal === 'class_improvement' || value.goal === 'skill_growth') &&
  (value.language === 'python' || value.language === 'javascript' || value.language === 'java' || value.language === 'cpp') &&
  (value.roleLevel === 'beginner' || value.roleLevel === 'intern' || value.roleLevel === 'junior' || value.roleLevel === 'general_practice');

const getDuelReadiness = (overallScore: number) => {
  if (overallScore >= 80) {
    return {
      label: 'Ready for ranked duels',
      description: 'You can start using duels as proof of skill while keeping a practice path active.',
      confidencePercent: 86,
    };
  }

  if (overallScore >= 55) {
    return {
      label: 'Practice before ranked duels',
      description: 'You are close. Focus on the suggested path, then step into duels with better confidence.',
      confidencePercent: 64,
    };
  }

  return {
    label: 'Build fundamentals first',
    description: 'Use the roadmap to strengthen fundamentals before relying on duel performance as a signal.',
    confidencePercent: 32,
  };
};

export const buildBenchmarkReport = (
  setup: BenchmarkSetup,
  questions: BenchmarkQuestion[],
  answerRecords: BenchmarkAnswerRecord[]
): BenchmarkReport => {
  const correctAnswers = answerRecords.filter((record) => record.isCorrect).length;
  const totalQuestions = Math.max(1, questions.length);
  const overallScore = Math.round((correctAnswers / totalQuestions) * 100);

  const competencyMap = new Map<string, { correct: number; total: number }>();
  questions.forEach((question) => {
    const current = competencyMap.get(question.competency) ?? { correct: 0, total: 0 };
    const answer = answerRecords.find((record) => record.questionId === question.id);
    competencyMap.set(question.competency, {
      total: current.total + 1,
      correct: current.correct + (answer?.isCorrect ? 1 : 0),
    });
  });

  const competencyScores = Array.from(competencyMap.entries()).map(([competency, score]) => ({
    competency,
    ratio: score.total > 0 ? score.correct / score.total : 0,
  }));

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

  return {
    id: `benchmark-${Date.now()}`,
    setup,
    overallScore,
    correctAnswers,
    totalQuestions,
    strengths: strengths.length > 0 ? strengths : ['Early benchmark momentum'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Advanced challenge depth'],
    recommendedTrackIds,
    suggestedLessonIds: getSuggestedLessons(questions, weaknesses),
    suggestedDuelProblemTitles: getSuggestedDuelProblems(overallScore),
    duelReadiness: getDuelReadiness(overallScore),
    summary: getSummary(setup, overallScore),
    createdAt: new Date().toISOString(),
    answerRecords,
  };
};

export const getBenchmarkStorageKey = (userId?: string | null) => `codhak-benchmark-report:${userId || 'anonymous'}`;

export const saveBenchmarkReport = (report: BenchmarkReport, userId?: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getBenchmarkStorageKey(userId), JSON.stringify(report));
  } catch {
    // Ignore storage failures for MVP.
  }
};

export const readSavedBenchmarkReport = (userId?: string | null): BenchmarkReport | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(getBenchmarkStorageKey(userId));
    if (!stored) return null;
    return JSON.parse(stored) as BenchmarkReport;
  } catch {
    return null;
  }
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
  const questions = buildBenchmarkQuestions(setup);
  const answerRecords = questions.map((question, index) => ({
    questionId: question.id,
    selectedAnswer: index % 3 === 0 ? question.correctAnswer : 0,
    isCorrect: index % 3 === 0 || index % 2 === 0,
  }));
  const report = buildBenchmarkReport(setup, questions, answerRecords);

  return {
    ...report,
    id: 'sample-report',
    isSample: true,
    overallScore: 72,
    correctAnswers: 4,
    totalQuestions: 6,
    strengths: ['Syntax and variables', 'Control flow'],
    weaknesses: ['Collections', 'Objects and classes'],
    recommendedTrackIds: ['python-fundamentals', 'backend-problem-solving'],
    suggestedLessonIds: ['python-lists', 'python-functions', 'python-oop', 'python-dictionaries'],
    suggestedDuelProblemTitles: ['Curie\'s Cold Notes', 'Franklin\'s Signal Majority', 'Galileo\'s Rising Streak'],
    duelReadiness: {
      label: 'Practice before ranked duels',
      description: 'You are close. One focused practice block would make your duel performance much more reliable.',
      confidencePercent: 68,
    },
    summary:
      'This sample report shows how Codhak turns a short benchmark into a score, a roadmap, and clear next steps for interview-style practice.',
  };
};
