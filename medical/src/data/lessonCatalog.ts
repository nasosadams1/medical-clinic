import { cppLessonCatalogEntries } from './cppLessons.generated';
import { javaLessonCatalogEntries } from './javaLessons.generated';
import { javascriptLessonCatalogEntries } from './javascriptLessons.generated';
import { pythonLessonCatalogEntries } from './pythonLessons.generated';

export type LessonLanguage = 'python' | 'javascript' | 'cpp' | 'java';

export interface LessonCatalogEntry {
  id: string;
  title: string;
  language: LessonLanguage;
  index: number;
  languageIndex: number;
}

export const LESSON_COUNTS_BY_LANGUAGE: Record<LessonLanguage, number> = {
  python: 50,
  javascript: 50,
  cpp: 50,
  java: 50,
};

export const TOTAL_LESSON_COUNT = 200;

export const LESSON_CATALOG: LessonCatalogEntry[] = [
  ...pythonLessonCatalogEntries,
  ...javascriptLessonCatalogEntries,
  ...cppLessonCatalogEntries,
  ...javaLessonCatalogEntries,
];

export const LESSON_CATALOG_BY_ID = new Map(LESSON_CATALOG.map((lesson) => [lesson.id, lesson]));

export const getLessonCatalogEntry = (lessonId: string) => LESSON_CATALOG_BY_ID.get(lessonId);

export const getLessonLanguageFromId = (lessonId: string): LessonLanguage | undefined => {
  const directMatch = LESSON_CATALOG_BY_ID.get(lessonId);
  if (directMatch) return directMatch.language;

  const normalized = String(lessonId || '').replace(/_/g, '-').toLowerCase();
  const firstSegment = normalized.split('-').filter(Boolean)[0];
  if (firstSegment === 'python' || firstSegment === 'javascript' || firstSegment === 'cpp' || firstSegment === 'java') {
    return firstSegment;
  }

  return undefined;
};

export const getLessonCountByLanguage = (language: LessonLanguage) => LESSON_COUNTS_BY_LANGUAGE[language] || 0;

export const countCompletedLessonsByLanguage = (language: LessonLanguage, completedLessons: string[]) =>
  completedLessons.filter((lessonId) => getLessonLanguageFromId(lessonId) === language).length;

export const formatLessonIdAsDisplayName = (lessonId: string): string => {
  const lesson = LESSON_CATALOG_BY_ID.get(lessonId);
  if (lesson?.title && !/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(lesson.title)) {
    return lesson.title;
  }

  const normalized = String(lessonId || '').replace(/_/g, '-').toLowerCase();
  const parts = normalized.split('-').filter(Boolean);
  if (parts.length === 0) return String(lessonId || 'Lesson');

  return parts
    .map((part) => {
      if (part === 'cpp') return 'C++';
      if (part === 'javascript') return 'JavaScript';
      if (part === 'java') return 'Java';
      if (part === 'python') return 'Python';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};
