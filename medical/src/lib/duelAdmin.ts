const apiBaseUrl =
  (import.meta.env.VITE_API_SERVER_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() ||
  'http://localhost:4000';

export type DuelCaseStatus = 'new' | 'in_review' | 'resolved' | 'dismissed';
export type DuelSanctionScope = 'duels' | 'progression' | 'all';
export type DuelSanctionAction = 'suspend' | 'review_hold' | 'watch';
export type DuelSanctionTarget = 'player_a' | 'player_b' | 'both';

export interface DuelAdminProfileRef {
  id: string;
  name?: string | null;
  email?: string | null;
  current_avatar?: string | null;
}

export interface DuelAdminProblem {
  id: string;
  title?: string | null;
  difficulty?: string | null;
}

export interface DuelAdminMatch {
  id: string;
  status?: string | null;
  match_type?: string | null;
  integrity_status?: string | null;
  invalidation_reason?: string | null;
  invalidated_at?: string | null;
  rating_reverted_at?: string | null;
  moderation_note?: string | null;
  problem_difficulty?: string | null;
  duel_result_strength?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  winner_id?: string | null;
  player_a?: DuelAdminProfileRef | null;
  player_b?: DuelAdminProfileRef | null;
}

export interface DuelAdminClusterCase {
  id: string;
  match_id: string;
  status: DuelCaseStatus;
  risk_score: number;
  summary: string;
  created_at: string;
}

export interface DuelAdminCluster {
  id: string;
  fingerprint?: string | null;
  summary?: string | null;
  metadata?: Record<string, any> | null;
  case_count?: number;
  related_cases?: DuelAdminClusterCase[];
}

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
  match?: DuelAdminMatch | null;
  problem?: DuelAdminProblem | null;
  cluster?: DuelAdminCluster | null;
  reviewed_by_profile?: DuelAdminProfileRef | null;
}

export interface DuelReplayPayload {
  replay: any;
  submissions: any[];
  events: any[];
  cases: DuelAdminCase[];
  match: any;
}

export interface DuelAdminMutationResponse {
  entry: DuelAdminCase;
  result?: any;
}

export interface DuelSanctionPayload {
  scope?: DuelSanctionScope;
  action?: DuelSanctionAction;
  target: DuelSanctionTarget;
  reason: string;
  note?: string;
  durationHours?: number;
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
): Promise<DuelAdminMutationResponse> => authorizedFetch(`/cases/${caseId}/status`, sessionToken, {
  method: 'PATCH',
  body: JSON.stringify(payload),
});

export const invalidateDuelMatch = async (
  sessionToken: string,
  caseId: string,
  payload: { reason?: string; note?: string; rollbackRatings?: boolean } = {}
): Promise<DuelAdminMutationResponse> => authorizedFetch(`/cases/${caseId}/invalidate-match`, sessionToken, {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const rollbackDuelRatings = async (
  sessionToken: string,
  caseId: string,
  payload: { note?: string } = {}
): Promise<DuelAdminMutationResponse> => authorizedFetch(`/cases/${caseId}/rollback-ratings`, sessionToken, {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const issueDuelSanction = async (
  sessionToken: string,
  caseId: string,
  payload: DuelSanctionPayload
): Promise<DuelAdminMutationResponse> => authorizedFetch(`/cases/${caseId}/sanctions`, sessionToken, {
  method: 'POST',
  body: JSON.stringify(payload),
});