import type { SelfServePlanId } from './billing';
import type { LanguageSlug } from '../data/siteContent';

export const STARTER_PATH_LANGUAGE: LanguageSlug = 'python';
export const STARTER_PATH_LESSON_LIMIT = 12;
export const FREE_DUEL_DAILY_LIMIT = 3;
export const FREE_SKILL_CHECK_LIMIT = 1;

export const TEAM_PLAN_NAMES = ['Teams', 'Teams Growth', 'Custom'] as const;
export const PREMIUM_LEARNER_PLAN_NAMES = ['Pro', 'Interview Sprint'] as const;
export const PREMIUM_LEARNER_PLAN_IDS: readonly SelfServePlanId[] = ['pro_monthly', 'interview_sprint'] as const;

const FREE_DUEL_USAGE_PREFIX = 'codhak-free-duels';

export const normalizePlanName = (value: string) => value.trim().toLowerCase();

export const isTeamPlanName = (planName: string) =>
  TEAM_PLAN_NAMES.some((candidate) => normalizePlanName(candidate) === normalizePlanName(planName));

export const isPremiumLearnerPlanName = (planName: string) =>
  PREMIUM_LEARNER_PLAN_NAMES.some((candidate) => normalizePlanName(candidate) === normalizePlanName(planName));

export const canAccessStarterLesson = (language: string, languageIndex: number | null | undefined) =>
  language === STARTER_PATH_LANGUAGE && Number(languageIndex ?? -1) >= 0 && Number(languageIndex) < STARTER_PATH_LESSON_LIMIT;

const getTodayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFreeDuelUsageStorageKey = (userId?: string | null) =>
  `${FREE_DUEL_USAGE_PREFIX}:${userId || 'anonymous'}:${getTodayKey()}`;

export const readFreeDuelUsage = (userId?: string | null) => {
  if (typeof window === 'undefined') return 0;

  try {
    const storedValue = window.localStorage.getItem(getFreeDuelUsageStorageKey(userId));
    return storedValue ? Math.max(0, Number.parseInt(storedValue, 10) || 0) : 0;
  } catch {
    return 0;
  }
};

export const incrementFreeDuelUsage = (userId?: string | null) => {
  if (typeof window === 'undefined') return 0;

  try {
    const nextValue = readFreeDuelUsage(userId) + 1;
    window.localStorage.setItem(getFreeDuelUsageStorageKey(userId), String(nextValue));
    return nextValue;
  } catch {
    return readFreeDuelUsage(userId);
  }
};
