import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CPP_LESSON_META } from '../../shared/cpp-lesson-meta.js';
import { PYTHON_LESSON_META } from '../../shared/python-lesson-meta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lessonsSourcePath = path.resolve(__dirname, '../../src/data/lessons.ts');

const LESSON_REGEX = /\{\s*id:\s*["']([^"']+)["'][\s\S]*?difficulty:\s*["']([^"']+)["'][\s\S]*?baseXP:\s*(\d+)[\s\S]*?baselineTime:\s*(\d+(?:\.\d+)?)[\s\S]*?language:\s*["']([^"']+)["']/g;

const legacyLessonSource = fs.readFileSync(lessonsSourcePath, 'utf8');
const javascriptStart = legacyLessonSource.indexOf('export const javascriptLessons');
const lessonSource = javascriptStart >= 0 ? legacyLessonSource.slice(javascriptStart) : legacyLessonSource;
const allLessons = [];
const lessonsByLanguage = new Map();

const addLessonMeta = (lesson) => {
  const normalizedLanguage = String(lesson.language).trim();
  const normalizedLesson = {
    id: lesson.id,
    difficulty: String(lesson.difficulty).trim(),
    baseXP: Number(lesson.baseXP),
    baselineTime: Number(lesson.baselineTime),
    language: normalizedLanguage,
  };

  if (!lessonsByLanguage.has(normalizedLanguage)) {
    lessonsByLanguage.set(normalizedLanguage, []);
  }

  lessonsByLanguage.get(normalizedLanguage).push(normalizedLesson);
  allLessons.push(normalizedLesson);
};

PYTHON_LESSON_META.forEach(addLessonMeta);
CPP_LESSON_META.forEach(addLessonMeta);

let match;
while ((match = LESSON_REGEX.exec(lessonSource)) !== null) {
  const [, id, difficulty, baseXP, baselineTime, language] = match;
  if (language === 'python' || language === 'cpp') {
    continue;
  }
  addLessonMeta({
    id,
    difficulty,
    baseXP,
    baselineTime,
    language,
  });
}

for (const [language, lessons] of lessonsByLanguage.entries()) {
  lessons.forEach((lesson, index) => {
    lesson.indexInLanguage = index;
    lesson.totalInLanguage = lessons.length;
    lesson.globalIndex = allLessons.findIndex((candidate) => candidate.id === lesson.id);
    lesson.totalLessons = allLessons.length;
    lesson.language = language;
  });
}

const lessonById = new Map(allLessons.map((lesson) => [lesson.id, Object.freeze({ ...lesson })]));
export const LESSON_COUNTS_BY_LANGUAGE = Object.freeze(
  Object.fromEntries(
    [...lessonsByLanguage.entries()].map(([language, lessons]) => [language, lessons.length])
  )
);
export const TOTAL_LESSON_COUNT = allLessons.length;

export function getLessonMeta(lessonId) {
  return lessonById.get(lessonId) || null;
}

export function getLessonsByLanguage(language) {
  return [...(lessonsByLanguage.get(language) || [])].map((lesson) => ({ ...lesson }));
}

export function getAllLessonMeta() {
  return allLessons.map((lesson) => ({ ...lesson }));
}

export function countCompletedLessonsByLanguage(language, completedLessons = []) {
  return completedLessons.filter((lessonId) => getLessonMeta(lessonId)?.language === language).length;
}

export function calculateLessonXp({ lessonId, actualTimeMinutes = null }) {
  const lesson = getLessonMeta(lessonId);
  if (!lesson) {
    throw new Error('LESSON_NOT_FOUND');
  }

  const difficultyMultiplier = {
    Beginner: 1,
    Intermediate: 1.5,
    Advanced: 2,
  }[lesson.difficulty] || 1;

  const totalLessons = Math.max(1, lesson.totalInLanguage || 1);
  const progressMultiplier = 1 + ((lesson.indexInLanguage || 0) / totalLessons) * 0.5;
  const baselineTime = Math.max(0.25, Number(lesson.baselineTime) || 1);
  const normalizedActualTime = Number.isFinite(Number(actualTimeMinutes))
    ? Math.min(baselineTime * 4, Math.max(baselineTime * 0.25, Number(actualTimeMinutes)))
    : baselineTime;
  const timeBonus = Math.max(0, ((baselineTime - normalizedActualTime) / baselineTime) * 0.2);

  return Math.round(Number(lesson.baseXP || 0) * difficultyMultiplier * progressMultiplier * (1 + timeBonus));
}
