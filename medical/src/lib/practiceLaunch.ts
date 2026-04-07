import { getLessonCatalogEntry, type LessonLanguage } from '../data/lessonCatalog';

export interface PracticeLaunchPreset {
  source: 'benchmark_report';
  createdAt: string;
  language: LessonLanguage;
  lessonIds: string[];
  reportId?: string | null;
  trackId?: string | null;
}

const PRACTICE_LAUNCH_PRESET_STORAGE_KEY = 'codhak-practice-launch-preset';
const PRACTICE_LAUNCH_PRESET_TTL_MS = 1000 * 60 * 30;

const lessonLanguages: LessonLanguage[] = ['python', 'javascript', 'cpp', 'java'];

const isLessonLanguage = (value: unknown): value is LessonLanguage =>
  lessonLanguages.includes(value as LessonLanguage);

const normalizeLessonIds = (value: unknown, language: LessonLanguage) => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((lessonId): lessonId is string => typeof lessonId === 'string')
        .map((lessonId) => lessonId.trim())
        .filter(Boolean)
        .filter((lessonId) => getLessonCatalogEntry(lessonId)?.language === language)
    )
  );
};

export const savePracticeLaunchPreset = (preset: PracticeLaunchPreset) => {
  if (typeof window === 'undefined' || !isLessonLanguage(preset.language)) return;

  const normalizedLessonIds = normalizeLessonIds(preset.lessonIds, preset.language);
  if (normalizedLessonIds.length === 0) return;

  try {
    window.localStorage.setItem(
      PRACTICE_LAUNCH_PRESET_STORAGE_KEY,
      JSON.stringify({
        ...preset,
        createdAt: preset.createdAt || new Date().toISOString(),
        lessonIds: normalizedLessonIds,
      } satisfies PracticeLaunchPreset)
    );
  } catch {
    // Keep navigation usable even if storage is unavailable.
  }
};

export const readPracticeLaunchPreset = (): PracticeLaunchPreset | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.localStorage.getItem(PRACTICE_LAUNCH_PRESET_STORAGE_KEY);
    if (!storedValue) return null;

    const parsed = JSON.parse(storedValue) as Partial<PracticeLaunchPreset>;
    if (!isLessonLanguage(parsed.language)) {
      return null;
    }

    const createdAtMs = new Date(parsed.createdAt || '').getTime();
    if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > PRACTICE_LAUNCH_PRESET_TTL_MS) {
      window.localStorage.removeItem(PRACTICE_LAUNCH_PRESET_STORAGE_KEY);
      return null;
    }

    const lessonIds = normalizeLessonIds(parsed.lessonIds, parsed.language);
    if (lessonIds.length === 0) {
      window.localStorage.removeItem(PRACTICE_LAUNCH_PRESET_STORAGE_KEY);
      return null;
    }

    return {
      source: 'benchmark_report',
      createdAt: parsed.createdAt || new Date(createdAtMs).toISOString(),
      language: parsed.language,
      lessonIds,
      reportId: typeof parsed.reportId === 'string' ? parsed.reportId : null,
      trackId: typeof parsed.trackId === 'string' ? parsed.trackId : null,
    };
  } catch {
    return null;
  }
};

export const clearPracticeLaunchPreset = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(PRACTICE_LAUNCH_PRESET_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};
