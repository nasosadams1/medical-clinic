import type { Lesson } from './lessons';
import { allLessons as legacyAllLessons } from './lessons';
import { cppLessons as rawCppLessons } from './cppLessons.generated';
import { javaLessons as rawJavaLessons } from './javaLessons.generated';
import { javascriptLessons as rawJavascriptLessons } from './javascriptLessons.generated';
import { pythonLessons as rawPythonLessons } from './pythonLessons.generated';

const LESSON_REWARD_BANDS: Record<
  Lesson['difficulty'],
  { baseXp: [number, number]; baselineTime: [number, number] }
> = {
  Beginner: {
    baseXp: [26, 42],
    baselineTime: [2, 3],
  },
  Intermediate: {
    baseXp: [42, 62],
    baselineTime: [3, 4],
  },
  Advanced: {
    baseXp: [62, 86],
    baselineTime: [4, 5],
  },
};

const interpolate = (start: number, end: number, progress: number) => start + (end - start) * progress;
const roundToHalfMinute = (value: number) => Math.round(value * 2) / 2;

const rebalanceLessonRewards = (lessons: Lesson[]): Lesson[] => {
  const tierProgressByLessonId = new Map<string, { position: number; count: number }>();

  (['Beginner', 'Intermediate', 'Advanced'] as const).forEach((tier) => {
    const tierLessons = lessons.filter((lesson) => lesson.difficulty === tier);
    tierLessons.forEach((lesson, index) => {
      tierProgressByLessonId.set(lesson.id, {
        position: index,
        count: tierLessons.length,
      });
    });
  });

  return lessons.map((lesson) => {
    const tierProgress = tierProgressByLessonId.get(lesson.id) ?? { position: 0, count: 1 };
    const normalizedTierProgress =
      tierProgress.count <= 1 ? 0 : tierProgress.position / (tierProgress.count - 1);
    const rewardBand = LESSON_REWARD_BANDS[lesson.difficulty];
    const targetBaseXp = Math.round(
      interpolate(rewardBand.baseXp[0], rewardBand.baseXp[1], normalizedTierProgress)
    );
    const targetBaselineTime = roundToHalfMinute(
      interpolate(
        rewardBand.baselineTime[0],
        rewardBand.baselineTime[1],
        normalizedTierProgress
      )
    );

    return {
      ...lesson,
      baseXP: targetBaseXp,
      baselineTime: Math.max(lesson.baselineTime, targetBaselineTime),
    };
  });
};

const pythonLessons = rebalanceLessonRewards(rawPythonLessons);
const javascriptLessons = rawJavascriptLessons;
const cppLessons = rawCppLessons;
const javaLessons = rawJavaLessons;
const nonPythonLegacyLessons = legacyAllLessons.filter(
  (lesson) =>
    lesson.language !== 'python' &&
    lesson.language !== 'javascript' &&
    lesson.language !== 'cpp' &&
    lesson.language !== 'java'
);

export const allLessons: Lesson[] = [
  ...pythonLessons,
  ...javascriptLessons,
  ...cppLessons,
  ...javaLessons,
  ...nonPythonLegacyLessons,
];

export const getLessonsByLanguage = (language: 'python' | 'javascript' | 'cpp' | 'java'): Lesson[] =>
  allLessons.filter((lesson) => lesson.language === language);

export const getLessonById = (id: string): Lesson | undefined =>
  allLessons.find((lesson) => lesson.id === id);

export const formatLessonDisplayName = (lessonId: string): string => {
  const lesson = getLessonById(lessonId);
  if (lesson?.title && !/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(lesson.title)) {
    return lesson.title;
  }

  const normalized = lessonId.replace(/_/g, '-').toLowerCase();
  const parts = normalized.split('-').filter(Boolean);
  if (parts.length === 0) return lessonId;

  const trailingNumber = /^\d+$/.test(parts[parts.length - 1]) ? parts.pop() : null;
  const candidateBaseId = parts.join('-');

  let shouldKeepNumber = false;
  if (trailingNumber && candidateBaseId) {
    const siblingCount = allLessons.filter((lessonItem) => {
      const siblingId = lessonItem.id.replace(/_/g, '-').toLowerCase();
      return siblingId === candidateBaseId || siblingId.startsWith(candidateBaseId + '-');
    }).length;
    shouldKeepNumber = siblingCount > 1;
  }

  const words = [...parts, ...(shouldKeepNumber && trailingNumber ? [trailingNumber] : [])].map((part) => {
    if (part === 'cpp') return 'C++';
    if (part === 'javascript') return 'JavaScript';
    if (part === 'java') return 'Java';
    if (part === 'python') return 'Python';
    return part.charAt(0).toUpperCase() + part.slice(1);
  });

  return words.join(' ');
};

export const getTotalLessonsByLanguage = (language: 'python' | 'javascript' | 'cpp' | 'java'): number =>
  getLessonsByLanguage(language).length;

export const getCompletedLessonsByLanguage = (language: string, completedLessons: string[]): number =>
  completedLessons.filter((lessonId) => {
    const lesson = getLessonById(lessonId);
    return lesson && lesson.language === language;
  }).length;
