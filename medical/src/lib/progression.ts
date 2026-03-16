import { supabase, UserProfile } from './supabase';
import { hasConfiguredApiBaseUrl, resolveApiBaseUrl } from './apiBase';

const apiBaseUrl = resolveApiBaseUrl();
const isUsingDevFallbackApiBaseUrl = !hasConfiguredApiBaseUrl && import.meta.env.DEV;
const PROGRESSION_API_RETRY_COOLDOWN_MS = 15_000;

type ProgressionApiUnavailableReason = 'unconfigured' | 'offline';

export class ProgressionApiUnavailableError extends Error {
  readonly reason: ProgressionApiUnavailableReason;

  constructor(message: string, reason: ProgressionApiUnavailableReason) {
    super(message);
    this.name = 'ProgressionApiUnavailableError';
    this.reason = reason;
  }
}

let hasWarnedAboutMissingProgressionApi = false;
let hasWarnedAboutUnavailableProgressionApi = false;
let progressionApiUnavailableUntil = 0;
let progressionApiDisabledForSession = false;
const inFlightProgressionRequests = new Map<string, Promise<unknown>>();

const buildProgressionApiUrl = (path = '') => `${apiBaseUrl.replace(/\/$/, '')}/api/progression${path}`;

const warnMissingProgressionApiConfiguration = () => {
  if (hasWarnedAboutMissingProgressionApi) {
    return;
  }

  hasWarnedAboutMissingProgressionApi = true;
  console.warn(
    'Progression API not configured. Set VITE_API_SERVER_URL for production or run the local API server during development.'
  );
};

const markProgressionApiUnavailable = (path: string) => {
  if (isUsingDevFallbackApiBaseUrl) {
    progressionApiDisabledForSession = true;
  } else {
    progressionApiUnavailableUntil = Date.now() + PROGRESSION_API_RETRY_COOLDOWN_MS;
  }

  if (hasWarnedAboutUnavailableProgressionApi) {
    return;
  }

  hasWarnedAboutUnavailableProgressionApi = true;
  if (isUsingDevFallbackApiBaseUrl) {
    console.warn(
      `Progression API is unreachable at ${buildProgressionApiUrl(
        path
      )}. Background progression sync is disabled until reload. Start the local API server, then refresh.`
    );
    return;
  }

  console.warn(
    `Progression API is unreachable at ${buildProgressionApiUrl(
      path
    )}. Retrying in ${Math.round(PROGRESSION_API_RETRY_COOLDOWN_MS / 1000)}s.`
  );
};

const clearProgressionApiUnavailableState = () => {
  progressionApiUnavailableUntil = 0;
  hasWarnedAboutUnavailableProgressionApi = false;
  progressionApiDisabledForSession = false;
};

const ensureProgressionApiReady = () => {
  if (!apiBaseUrl) {
    warnMissingProgressionApiConfiguration();
    throw new ProgressionApiUnavailableError(
      'Progression API is not configured for this environment.',
      'unconfigured'
    );
  }

  if (progressionApiDisabledForSession) {
    throw new ProgressionApiUnavailableError(
      'Progression API is disabled for this session because the local API server is unavailable.',
      'offline'
    );
  }

  if (Date.now() < progressionApiUnavailableUntil) {
    throw new ProgressionApiUnavailableError(
      'Progression API is temporarily unavailable. Waiting before retrying.',
      'offline'
    );
  }
};

export const isProgressionApiUnavailableError = (
  error: unknown
): error is ProgressionApiUnavailableError => error instanceof ProgressionApiUnavailableError;

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
  ensureProgressionApiReady();

  const requestKey = `${(init.method || 'GET').toUpperCase()} ${path}`;
  const existingRequest = inFlightProgressionRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  let requestPromise: Promise<T>;
  requestPromise = (async () => {
    try {
      const response = await fetch(buildProgressionApiUrl(path), {
        ...init,
        headers: {
          ...(await getAuthHeaders()),
          ...(init.headers || {}),
        },
      });

      if (response.status === 404 || response.status >= 500) {
        markProgressionApiUnavailable(path);
        throw new ProgressionApiUnavailableError(
          `Progression API is unavailable at ${buildProgressionApiUrl(path)}.`,
          'offline'
        );
      }

      clearProgressionApiUnavailableState();

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as any)?.error || 'Progression request failed.');
      }

      return payload as T;
    } catch (error) {
      if (isProgressionApiUnavailableError(error)) {
        throw error;
      }

      if (error instanceof TypeError) {
        markProgressionApiUnavailable(path);
        throw new ProgressionApiUnavailableError(
          `Could not reach the progression API at ${apiBaseUrl}.`,
          'offline'
        );
      }

      throw error;
    } finally {
      if (inFlightProgressionRequests.get(requestKey) === requestPromise) {
        inFlightProgressionRequests.delete(requestKey);
      }
    }
  })();

  inFlightProgressionRequests.set(requestKey, requestPromise);
  return requestPromise;
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
