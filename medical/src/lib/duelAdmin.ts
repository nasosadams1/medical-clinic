const apiBaseUrl =
  (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() ||
  'http://localhost:4000';

export type DuelCaseStatus = 'new' | 'in_review' | 'resolved' | 'dismissed';

export interface DuelAdminCase {
  id: string;
  match_id: string;
  status: DuelCaseStatus;
  risk_score: number;
  summary: string;
  evidence: Record<string, any>;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  resolution_note?: string | null;
  match?: any;
  problem?: any;
  reviewed_by_profile?: any;
}

export interface DuelReplayPayload {
  replay: any;
  submissions: any[];
  events: any[];
  cases: any[];
  match: any;
}

const buildDuelAdminApiUrl = (path = '') => `${apiBaseUrl.replace(/\/$/, '')}/api/duel/admin${path}`;

const authorizedFetch = async (path: string, sessionToken: string, init: RequestInit = {}) => {
  const response = await fetch(buildDuelAdminApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      ...(init.headers || {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const error = new Error((payload as any)?.error || 'Duel moderation request failed.');
    (error as Error & { payload?: any }).payload = payload;
    throw error;
  }

  return payload as any;
};

export const fetchDuelAdminCapabilities = async (sessionToken: string): Promise<{ canReview: boolean }> => {
  const payload = await authorizedFetch('/capabilities', sessionToken, { method: 'GET' });
  return { canReview: !!payload.canReview };
};

export const fetchDuelAntiCheatCases = async (
  sessionToken: string,
  options: { status?: DuelCaseStatus | 'all'; limit?: number } = {}
): Promise<DuelAdminCase[]> => {
  const searchParams = new URLSearchParams();
  if (options.status && options.status !== 'all') {
    searchParams.set('status', options.status);
  }
  if (options.limit) {
    searchParams.set('limit', String(options.limit));
  }

  const query = searchParams.toString();
  const payload = await authorizedFetch(`/cases${query ? `?${query}` : ''}`, sessionToken, { method: 'GET' });
  return payload.entries || [];
};

export const fetchDuelReplay = async (sessionToken: string, matchId: string): Promise<DuelReplayPayload> => {
  return authorizedFetch(`/matches/${matchId}/replay`, sessionToken, { method: 'GET' });
};

export const updateDuelAntiCheatCaseStatus = async (
  sessionToken: string,
  caseId: string,
  payload: { status: DuelCaseStatus; note?: string }
) => authorizedFetch(`/cases/${caseId}/status`, sessionToken, {
  method: 'PATCH',
  body: JSON.stringify(payload),
});
