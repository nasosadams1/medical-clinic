const configuredApiBaseUrl =
  (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() ||
  '';

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

export const resolveApiBaseUrl = () => {
  if (configuredApiBaseUrl) {
    return normalizeBaseUrl(configuredApiBaseUrl);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:4000';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return '';
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBaseUrl = resolveApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};

export const isApiNetworkError = (error: unknown): error is TypeError => error instanceof TypeError;
