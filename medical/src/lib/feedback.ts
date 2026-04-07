import {
  FEEDBACK_ALLOWED_ATTACHMENT_TYPES,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MAX_MESSAGE_LENGTH,
  FEEDBACK_MAX_SUBJECT_LENGTH,
  FEEDBACK_MIN_MESSAGE_LENGTH,
  FEEDBACK_MIN_SUBJECT_LENGTH,
  FEEDBACK_TYPES,
  FeedbackSubmissionSchema,
} from '../../shared/feedback-contract.js';
import { buildApiUrl, isApiNetworkError } from './apiBase';

export type FeedbackType = 'bug_report' | 'feature_request' | 'general_feedback';
export type FeedbackStatus = 'new' | 'in_review' | 'resolved';

export interface FeedbackAttachmentUpload {
  name: string;
  contentType: string;
  size: number;
  contentBase64: string;
}

export interface FeedbackMetadataPayload {
  appVersion?: string;
  environment?: string;
  page?: string;
  userAgent?: string;
  platform?: string;
  language?: string;
  timezone?: string;
  locale?: string;
  viewport?: { width: number; height: number };
  screen?: { width: number; height: number; pixelRatio?: number };
}

export interface FeedbackSubmissionPayload {
  type: FeedbackType;
  subject: string;
  message: string;
  includeMetadata?: boolean;
  metadata?: FeedbackMetadataPayload;
  attachments?: FeedbackAttachmentUpload[];
}

export interface FeedbackHistoryAttachment {
  id: string;
  original_name: string;
  content_type: string;
  byte_size: number;
  signed_url: string | null;
}

export interface FeedbackHistoryEntry {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  subject: string;
  message: string;
  metadata: Record<string, unknown>;
  attachments_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  attachments: FeedbackHistoryAttachment[];
}

export interface FeedbackAdminEntry extends FeedbackHistoryEntry {
  user_id: string;
  user_profile?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export const feedbackConfig = {
  types: FEEDBACK_TYPES as FeedbackType[],
  allowedAttachmentTypes: FEEDBACK_ALLOWED_ATTACHMENT_TYPES,
  maxAttachments: FEEDBACK_MAX_ATTACHMENTS,
  maxAttachmentBytes: FEEDBACK_MAX_ATTACHMENT_BYTES,
  minSubjectLength: FEEDBACK_MIN_SUBJECT_LENGTH,
  maxSubjectLength: FEEDBACK_MAX_SUBJECT_LENGTH,
  minMessageLength: FEEDBACK_MIN_MESSAGE_LENGTH,
  maxMessageLength: FEEDBACK_MAX_MESSAGE_LENGTH,
};

const buildFeedbackApiUrl = (path = '') => buildApiUrl(`/api/feedback${path}`);
const FEEDBACK_HISTORY_CACHE_MS = 15_000;
const FEEDBACK_ADMIN_CAPABILITIES_CACHE_MS = 30_000;
const FEEDBACK_ADMIN_QUEUE_CACHE_MS = 10_000;
const feedbackReadCache = new Map<string, { fetchedAt: number; payload: unknown }>();
const inFlightFeedbackRequests = new Map<string, Promise<unknown>>();

type FeedbackReadRequestOptions = {
  force?: boolean;
  maxAgeMs?: number;
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.replace(/^data:[^;]+;base64,/, ''));
    };
    reader.onerror = () => reject(new Error(`Could not read file ${file.name}.`));
    reader.readAsDataURL(file);
  });

export const validateFeedbackDraft = (payload: FeedbackSubmissionPayload) => FeedbackSubmissionSchema.safeParse(payload);

export const validateFeedbackFile = (file: File) => {
  if (!feedbackConfig.allowedAttachmentTypes.includes(file.type)) {
    return `Unsupported file type for ${file.name}.`;
  }

  if (file.size > feedbackConfig.maxAttachmentBytes) {
    return `${file.name} exceeds the ${Math.floor(feedbackConfig.maxAttachmentBytes / (1024 * 1024))} MB limit.`;
  }

  return '';
};

export const serializeFeedbackFiles = async (files: File[]): Promise<FeedbackAttachmentUpload[]> => {
  const serialized: FeedbackAttachmentUpload[] = [];

  for (const file of files) {
    serialized.push({
      name: file.name,
      contentType: file.type,
      size: file.size,
      contentBase64: await toBase64(file),
    });
  }

  return serialized;
};

const authorizedFetch = async (path: string, sessionToken: string, init: RequestInit = {}) => {
  let response: Response;

  try {
    response = await fetch(buildFeedbackApiUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the feedback service. Please try again in a moment.');
    }

    throw error;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const error = new Error(payload?.error || 'Feedback request failed.');
    (error as Error & { payload?: any }).payload = payload;
    throw error;
  }

  return payload;
};

const buildFeedbackReadRequestKey = (path: string, sessionToken: string, init: RequestInit = {}) =>
  `${(init.method || 'GET').toUpperCase()} ${path}::${sessionToken}`;

const invalidateFeedbackReadCache = (sessionToken: string, pathPrefixes: string[] = []) => {
  const prefixes = pathPrefixes.length > 0 ? pathPrefixes : ['', '/admin', '/admin/capabilities'];
  for (const requestKey of [...feedbackReadCache.keys()]) {
    if (!requestKey.endsWith(`::${sessionToken}`)) {
      continue;
    }

    const requestPath = requestKey.slice('GET '.length, requestKey.lastIndexOf('::'));
    const matchesPrefix = prefixes.some((prefix) => {
      if (!prefix) {
        return requestPath === '';
      }

      return requestPath === prefix || requestPath.startsWith(`${prefix}?`) || requestPath.startsWith(`${prefix}/`);
    });
    if (matchesPrefix) {
      feedbackReadCache.delete(requestKey);
    }
  }
};

const authorizedCachedReadFetch = async <T>(
  path: string,
  sessionToken: string,
  options: FeedbackReadRequestOptions = {}
): Promise<T> => {
  const requestKey = buildFeedbackReadRequestKey(path, sessionToken, { method: 'GET' });
  const maxAgeMs = options.maxAgeMs ?? 0;
  const cached = feedbackReadCache.get(requestKey);

  if (!options.force && cached && Date.now() - cached.fetchedAt <= maxAgeMs) {
    return cached.payload as T;
  }

  const existingRequest = inFlightFeedbackRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  let requestPromise: Promise<T>;
  requestPromise = (async () => {
    try {
      const payload = await authorizedFetch(path, sessionToken, { method: 'GET' });
      feedbackReadCache.set(requestKey, {
        fetchedAt: Date.now(),
        payload,
      });
      return payload as T;
    } finally {
      if (inFlightFeedbackRequests.get(requestKey) === requestPromise) {
        inFlightFeedbackRequests.delete(requestKey);
      }
    }
  })();

  inFlightFeedbackRequests.set(requestKey, requestPromise);
  return requestPromise;
};

export const fetchFeedbackEntries = async (
  sessionToken: string,
  options: FeedbackReadRequestOptions = {}
): Promise<FeedbackHistoryEntry[]> => {
  const payload = await authorizedCachedReadFetch<{ entries?: FeedbackHistoryEntry[] }>('', sessionToken, {
    maxAgeMs: FEEDBACK_HISTORY_CACHE_MS,
    ...options,
  });
  return payload.entries || [];
};

export const fetchFeedbackAdminCapabilities = async (
  sessionToken: string,
  options: FeedbackReadRequestOptions = {}
): Promise<{ canReview: boolean }> => {
  const payload = await authorizedCachedReadFetch<{ canReview?: boolean }>('/admin/capabilities', sessionToken, {
    maxAgeMs: FEEDBACK_ADMIN_CAPABILITIES_CACHE_MS,
    ...options,
  });
  return { canReview: !!payload.canReview };
};

export const fetchAdminFeedbackEntries = async (
  sessionToken: string,
  options: { status?: FeedbackStatus | 'all'; type?: FeedbackType | 'all'; limit?: number } = {},
  requestOptions: FeedbackReadRequestOptions = {}
): Promise<FeedbackAdminEntry[]> => {
  const searchParams = new URLSearchParams();
  if (options.status && options.status !== 'all') {
    searchParams.set('status', options.status);
  }
  if (options.type && options.type !== 'all') {
    searchParams.set('type', options.type);
  }
  if (options.limit) {
    searchParams.set('limit', String(options.limit));
  }

  const query = searchParams.toString();
  const payload = await authorizedCachedReadFetch<{ entries?: FeedbackAdminEntry[] }>(
    `/admin${query ? `?${query}` : ''}`,
    sessionToken,
    {
      maxAgeMs: FEEDBACK_ADMIN_QUEUE_CACHE_MS,
      ...requestOptions,
    }
  );
  return payload.entries || [];
};

export const submitFeedbackEntry = async (sessionToken: string, payload: FeedbackSubmissionPayload) => {
  const response = await authorizedFetch('', sessionToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  invalidateFeedbackReadCache(sessionToken, ['']);
  return response;
};

export const updateFeedbackEntryStatus = async (
  sessionToken: string,
  feedbackId: string,
  payload: { status: FeedbackStatus; note?: string }
) => {
  const response = await authorizedFetch(`/admin/${feedbackId}/status`, sessionToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  invalidateFeedbackReadCache(sessionToken, ['/admin']);
  return response;
};

export const buildFeedbackDraftKey = (userId?: string) => `codhak-feedback-draft:${userId || 'anonymous'}`;
export const buildFeedbackSubmissionFingerprint = (payload: Pick<FeedbackSubmissionPayload, 'type' | 'subject' | 'message'>) =>
  [payload.type, payload.subject.trim().toLowerCase(), payload.message.trim().toLowerCase()].join('::');

export const collectFeedbackMetadata = (): FeedbackMetadataPayload => ({
  appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || 'unknown',
  environment: import.meta.env.MODE,
  page: typeof window !== 'undefined' ? window.location.pathname : '/',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
  language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
  viewport:
    typeof window !== 'undefined'
      ? {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      : undefined,
  screen:
    typeof window !== 'undefined'
      ? {
          width: window.screen.width,
          height: window.screen.height,
          pixelRatio: window.devicePixelRatio,
        }
      : undefined,
});


