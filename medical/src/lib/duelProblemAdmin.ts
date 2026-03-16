import { buildApiUrl, isApiNetworkError } from './apiBase';

export interface DuelProblemTestCase {
  input: string;
  expected_output: string;
  weight: number;
  hidden: boolean;
  input_json?: any;
  expected_json?: any;
  compare_mode?: string | null;
  validator?: string | null;
  time_limit_ms?: number | null;
}

export interface DuelProblemRecord {
  id?: string;
  title: string;
  statement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_seconds: number;
  memory_limit_mb: number;
  supported_languages: string[];
  test_cases: DuelProblemTestCase[];
  tags: string[];
  is_active: boolean;
  starter_code?: Record<string, string>;
  created_at?: string;
}

const buildDuelProblemApiUrl = (path = '') => buildApiUrl(`/api/duel/problems${path}`);

const authorizedFetch = async (path: string, sessionToken: string, init: RequestInit = {}) => {
  let response: Response;

  try {
    response = await fetch(buildDuelProblemApiUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the duel problem service. Please try again in a moment.');
    }

    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const error = new Error((payload as any)?.error || 'Duel problem request failed.');
    (error as Error & { payload?: any }).payload = payload;
    throw error;
  }

  return payload as any;
};

export const fetchDuelProblemCapabilities = async (sessionToken: string): Promise<{ canManageProblems: boolean }> => {
  const payload = await authorizedFetch('/capabilities', sessionToken, { method: 'GET' });
  return { canManageProblems: !!payload.canManageProblems };
};

export const fetchDuelProblems = async (
  sessionToken: string,
  options: { limit?: number } = {}
): Promise<DuelProblemRecord[]> => {
  const searchParams = new URLSearchParams();
  if (options.limit) {
    searchParams.set('limit', String(options.limit));
  }

  const query = searchParams.toString();
  const payload = await authorizedFetch(`${query ? `?${query}` : ''}`, sessionToken, { method: 'GET' });
  return payload.entries || [];
};

export const createDuelProblem = async (sessionToken: string, payload: DuelProblemRecord) =>
  authorizedFetch('', sessionToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateDuelProblem = async (sessionToken: string, problemId: string, payload: DuelProblemRecord) =>
  authorizedFetch(`/${problemId}`, sessionToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteDuelProblem = async (sessionToken: string, problemId: string) =>
  authorizedFetch(`/${problemId}`, sessionToken, {
    method: 'DELETE',
  });
