export type AnalyticsEventName =
  | 'homepage_visit'
  | 'benchmark_page_view'
  | 'benchmark_start'
  | 'benchmark_complete'
  | 'benchmark_report_viewed'
  | 'signup_after_report'
  | 'pricing_viewed'
  | 'team_page_viewed'
  | 'team_demo_cta_clicked'
  | 'duel_started'
  | 'subscription_cta_clicked';

export interface AnalyticsEventRecord {
  name: AnalyticsEventName | string;
  properties: Record<string, unknown>;
  path: string;
  timestamp: string;
}

const ANALYTICS_STORAGE_KEY = 'codhak-analytics-events';
const MAX_STORED_EVENTS = 200;

const isBrowser = typeof window !== 'undefined';

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
  };

  writeEvents([...readEvents(), event]);
  window.dispatchEvent(new CustomEvent('codhak:analytics', { detail: event }));

  if (import.meta.env.DEV) {
    console.info('[Codhak analytics]', event);
  }

  return event;
};

export const getTrackedEvents = () => readEvents();
