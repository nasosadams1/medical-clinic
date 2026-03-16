import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  countCompletedLessonsByLanguage,
  getAllLessonMeta,
  getLessonsByLanguage,
  LESSON_COUNTS_BY_LANGUAGE,
  TOTAL_LESSON_COUNT,
} from './lesson-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const achievementsSourcePath = path.resolve(__dirname, '../../src/data/achievements.ts');

const allLessons = getAllLessonMeta();

function loadAchievementsModule() {
  const source = fs.readFileSync(achievementsSourcePath, 'utf8');

  const transformed = source
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?\s*/g, '')
    .replace(/^import .*$/gm, '')
    .replace(/export interface Achievement[\s\S]*?}\n\n/, '')
    .replace(/export const achievements\s*:\s*Achievement\[\]\s*=/g, 'const achievements =')
    .replace(
      /export const checkAchievements = \(user:[\s\S]*?}, completedLessons: string\[\]\): Achievement\[\] => \{/m,
      'const checkAchievements = (user, completedLessons) => {'
    )
    .replace(/const newAchievements\s*:\s*Achievement\[\]\s*=/g, 'const newAchievements =')
    .replace(/: lesson is Lesson/g, '')
    .replace(/\s+as\s+keyof typeof [A-Za-z_][A-Za-z0-9_]*/g, '');

  const factory = new Function(
    'allLessons',
    'getLessonsByLanguage',
    'countCompletedLessonsByLanguage',
    'LESSON_COUNTS_BY_LANGUAGE',
    'TOTAL_LESSON_COUNT',
    `${transformed}\nreturn { achievements, checkAchievements };`
  );
  return factory(
    allLessons,
    getLessonsByLanguage,
    countCompletedLessonsByLanguage,
    LESSON_COUNTS_BY_LANGUAGE,
    TOTAL_LESSON_COUNT
  );
}

const runtime = loadAchievementsModule();

export const achievements = runtime.achievements;
export const checkAchievements = runtime.checkAchievements;
