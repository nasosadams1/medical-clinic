import { supabase, UserProfile } from './supabase';

const apiBaseUrl =
  (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() ||
  'http://localhost:4000';

const buildProgressionApiUrl = (path = '') => `${apiBaseUrl.replace(/\/$/, '')}/api/progression${path}`;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to sync progression.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

async function authorizedProgressionFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildProgressionApiUrl(path), {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as any)?.error || 'Progression request failed.');
  }

  return payload as T;
}

export interface ProgressionResponse {
  profile: UserProfile;
  alreadyCompleted?: boolean;
  awardedLessonXp?: number;
  awardedAchievementXp?: number;
  newlyUnlockedAchievements?: Array<Record<string, any>>;
  heartsPurchased?: number;
  heartsConsumed?: number;
  coinCost?: number;
  alreadyOwned?: boolean;
  preventedByUnlimited?: boolean;
}

export const refreshProgressionState = () => authorizedProgressionFetch<ProgressionResponse>('/state/refresh', {
  method: 'POST',
});

export const recomputeAchievements = () => authorizedProgressionFetch<ProgressionResponse>('/achievements/recompute', {
  method: 'POST',
});

export const completeLessonProgression = (payload: { lessonId: string; actualTimeMinutes?: number }) =>
  authorizedProgressionFetch<ProgressionResponse>('/lessons/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const buyHeartsProgression = (amount: number) => authorizedProgressionFetch<ProgressionResponse>('/hearts/buy', {
  method: 'POST',
  body: JSON.stringify({ amount }),
});

export const consumeHeartProgression = (amount = 1) => authorizedProgressionFetch<ProgressionResponse>('/hearts/consume', {
  method: 'POST',
  body: JSON.stringify({ amount }),
});

export const purchaseAvatarProgression = (avatarId: string) => authorizedProgressionFetch<ProgressionResponse>('/avatar/purchase', {
  method: 'POST',
  body: JSON.stringify({ avatarId }),
});

export const equipAvatarProgression = (avatarId: string) => authorizedProgressionFetch<ProgressionResponse>('/avatar/equip', {
  method: 'POST',
  body: JSON.stringify({ avatarId }),
});