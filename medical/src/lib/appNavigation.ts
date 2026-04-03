export type AppSectionId =
  | 'benchmark'
  | 'practice'
  | 'duels'
  | 'teams'
  | 'store'
  | 'leaderboard'
  | 'profile'
  | 'account';

export const DEFAULT_APP_SECTION: AppSectionId = 'practice';
export const APP_SECTION_STORAGE_KEY = 'codhak-last-app-section';

export const isValidAppSection = (value: string | null): value is AppSectionId =>
  value === 'benchmark' ||
  value === 'practice' ||
  value === 'duels' ||
  value === 'teams' ||
  value === 'store' ||
  value === 'leaderboard' ||
  value === 'profile' ||
  value === 'account';

export const getAppSectionHref = (section: AppSectionId = DEFAULT_APP_SECTION) => `/app?section=${section}`;

export const getStoredAppSection = () => {
  if (typeof window === 'undefined') return null;
  const storedSection = window.localStorage.getItem(APP_SECTION_STORAGE_KEY);
  return isValidAppSection(storedSection) ? storedSection : null;
};

export const getLastWorkspaceHref = (fallbackSection: AppSectionId = DEFAULT_APP_SECTION) =>
  getAppSectionHref(getStoredAppSection() ?? fallbackSection);
