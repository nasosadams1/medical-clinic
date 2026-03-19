import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export type AnalyticsEventName =
  | 'homepage_visit'
  | 'benchmark_page_view'
  | 'benchmark_start'
  | 'benchmark_complete'
  | 'benchmark_report_viewed'
  | 'benchmark_session_restored'
  | 'signup_after_report'
  | 'pricing_viewed'
  | 'team_page_viewed'
  | 'team_demo_cta_clicked'
  | 'demo_request_started'
  | 'demo_request_submitted'
  | 'duel_started'
  | 'subscription_cta_clicked'
  | 'pricing_plan_recommended';

export interface AnalyticsEventRecord {
  name: AnalyticsEventName | string;
  properties: Record<string, unknown>;
  path: string;
  timestamp: string;
  anonymousId: string;
  sessionId: string;
  referrer: string | null;
}

export interface ProductAnalyticsSummary {
  challengesCompleted: number;
  duelMatchesPlayed: number;
  averageScoreImprovement: number | null;
  teamCount: number;
}

const ANALYTICS_STORAGE_KEY = 'codhak-analytics-events';
const ANALYTICS_ANONYMOUS_ID_KEY = 'codhak-anonymous-id';
const ANALYTICS_SESSION_ID_KEY = 'codhak-analytics-session-id';
const MAX_STORED_EVENTS = 200;
const FLUSH_BATCH_SIZE = 25;
const ANALYTICS_FAILURE_BACKOFF_MS = 30_000;

const isBrowser = typeof window !== 'undefined';
let flushTimeoutId: number | null = null;
let flushInFlight: Promise<void> | null = null;
let analyticsBackoffUntil = 0;
let hasWarnedAnalyticsUnavailable = false;

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `codhak-${Math.random().toString(36).slice(2, 10)}`;
};

const getPersistentId = (storageKey: string) => {
  if (!isBrowser) return createId();

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const nextValue = createId();
    window.localStorage.setItem(storageKey, nextValue);
    return nextValue;
  } catch {
    return createId();
  }
};

const readEvents = (): AnalyticsEventRecord[] => {
  if (!isBrowser) return [];

  try {
    const stored = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeEvents = (events: AnalyticsEventRecord[]) => {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events.slice(-MAX_STORED_EVENTS)));
  } catch {
    // Ignore storage failures and keep the product usable.
  }
};

const removeFlushedEvents = (count: number) => {
  const current = readEvents();
  writeEvents(current.slice(count));
};

const getAccessToken = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
};

export const flushAnalyticsEvents = async () => {
  if (!isBrowser) return;

  if (flushInFlight) {
    return flushInFlight;
  }

  if (Date.now() < analyticsBackoffUntil) {
    return;
  }

  const events = readEvents();
  if (events.length === 0) return;

  flushInFlight = (async () => {
    try {
      const batch = events.slice(0, FLUSH_BATCH_SIZE);
      const accessToken = await getAccessToken();
      const response = await fetch(buildApiUrl('/api/analytics/events/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ events: batch }),
      });

      if (!response.ok) {
        analyticsBackoffUntil = Date.now() + ANALYTICS_FAILURE_BACKOFF_MS;
        return;
      }

      analyticsBackoffUntil = 0;
      hasWarnedAnalyticsUnavailable = false;
      removeFlushedEvents(batch.length);
    } catch {
      analyticsBackoffUntil = Date.now() + ANALYTICS_FAILURE_BACKOFF_MS;
      if (!hasWarnedAnalyticsUnavailable) {
        hasWarnedAnalyticsUnavailable = true;
        console.warn(
          `[Codhak analytics] Analytics API unreachable at ${buildApiUrl(
            '/api/analytics/events/batch'
          )}. Retrying in ${Math.round(ANALYTICS_FAILURE_BACKOFF_MS / 1000)}s.`
        );
      }
      // Keep the buffered events locally and retry on the next interaction.
    } finally {
      flushInFlight = null;
      if (readEvents().length > 0 && Date.now() >= analyticsBackoffUntil) {
        scheduleAnalyticsFlush();
      }
    }
  })();

  return flushInFlight;
};

const scheduleAnalyticsFlush = () => {
  if (!isBrowser) return;
  if (Date.now() < analyticsBackoffUntil) return;
  if (flushTimeoutId) {
    window.clearTimeout(flushTimeoutId);
  }

  flushTimeoutId = window.setTimeout(() => {
    flushTimeoutId = null;
    void flushAnalyticsEvents();
  }, 600);
};

export const trackEvent = (
  name: AnalyticsEventName | string,
  properties: Record<string, unknown> = {}
): AnalyticsEventRecord | null => {
  if (!isBrowser) return null;

  const event: AnalyticsEventRecord = {
    name,
    properties,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    anonymousId: getPersistentId(ANALYTICS_ANONYMOUS_ID_KEY),
    sessionId: getPersistentId(ANALYTICS_SESSION_ID_KEY),
    referrer: document.referrer || null,
  };

  writeEvents([...readEvents(), event]);
  window.dispatchEvent(new CustomEvent('codhak:analytics', { detail: event }));
  scheduleAnalyticsFlush();

  if (import.meta.env.DEV) {
    console.info('[Codhak analytics]', event);
  }

  return event;
};

export const getTrackedEvents = () => readEvents();

export const fetchProductAnalyticsSummary = async (): Promise<ProductAnalyticsSummary | null> => {
  try {
    const response = await fetch(buildApiUrl('/api/analytics/summary'));
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ProductAnalyticsSummary;
  } catch {
    return null;
  }
};

if (isBrowser) {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushAnalyticsEvents();
    }
  });
  window.addEventListener('beforeunload', () => {
    void flushAnalyticsEvents();
  });
}
