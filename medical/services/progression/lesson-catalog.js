import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lessonsSourcePath = path.resolve(__dirname, '../../src/data/lessons.ts');

const LESSON_REGEX = /\{\s*id:\s*'([^']+)'[\s\S]*?difficulty:\s*'([^']+)'[\s\S]*?baseXP:\s*(\d+)[\s\S]*?baselineTime:\s*(\d+)[\s\S]*?language:\s*'([^']+)'/g;

const lessonSource = fs.readFileSync(lessonsSourcePath, 'utf8');
const allLessons = [];
const lessonsByLanguage = new Map();

let match;
while ((match = LESSON_REGEX.exec(lessonSource)) !== null) {
  const [, id, difficulty, baseXP, baselineTime, language] = match;
  const normalizedLanguage = String(language).trim();
  const lesson = {
    id,
    difficulty: String(difficulty).trim(),
    baseXP: Number(baseXP),
    baselineTime: Number(baselineTime),
    language: normalizedLanguage,
  };

  if (!lessonsByLanguage.has(normalizedLanguage)) {
    lessonsByLanguage.set(normalizedLanguage, []);
  }
  lessonsByLanguage.get(normalizedLanguage).push(lesson);
  allLessons.push(lesson);
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

export function getLessonMeta(lessonId) {
  return lessonById.get(lessonId) || null;
}

export function getLessonsByLanguage(language) {
  return [...(lessonsByLanguage.get(language) || [])].map((lesson) => ({ ...lesson }));
}

export function getAllLessonMeta() {
  return allLessons.map((lesson) => ({ ...lesson }));
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