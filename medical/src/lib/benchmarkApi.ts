import type { BenchmarkReport } from '../data/benchmarkCatalog';
import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export class BenchmarkApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BenchmarkApiUnavailableError';
  }
}

const buildBenchmarkApiUrl = (path = '') => buildApiUrl(`/api/benchmark${path}`);

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to sync benchmark history.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
};

const benchmarkFetch = async <T>(path: string, init: RequestInit = {}) => {
  try {
    const response = await fetch(buildBenchmarkApiUrl(path), {
      ...init,
      headers: {
        ...(await getAuthHeaders()),
        ...(init.headers || {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((payload as { error?: string }).error || 'Benchmark request failed.');
    }

    return payload as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new BenchmarkApiUnavailableError('Could not reach the benchmark API.');
    }

    throw error;
  }
};

export const listBenchmarkReports = async (limit = 8) => {
  const payload = await benchmarkFetch<{ reports: BenchmarkReport[] }>(`/reports?limit=${limit}`);
  return payload.reports || [];
};

export const persistBenchmarkReport = async (report: BenchmarkReport) => {
  const payload = await benchmarkFetch<{ report: BenchmarkReport }>('/reports', {
    method: 'POST',
    body: JSON.stringify(report),
  });
  return payload.report;
};

