export const DEFAULT_DUEL_RATING = 500;

const DUEL_RATING_CACHE_PREFIX = "codhak:duel-rating:";

const getCacheKey = (userId: string) => `${DUEL_RATING_CACHE_PREFIX}${userId}`;

const normalizeRating = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getCachedDuelRating = (userId?: string | null): number | null => {
  if (!userId || typeof window === "undefined") {
    return null;
  }

  return normalizeRating(window.localStorage.getItem(getCacheKey(userId)));
};

export const cacheDuelRating = (userId: string | null | undefined, rating: unknown) => {
  if (!userId || typeof window === "undefined") {
    return;
  }

  const normalizedRating = normalizeRating(rating);
  if (normalizedRating === null) {
    return;
  }

  window.localStorage.setItem(getCacheKey(userId), String(normalizedRating));
};
