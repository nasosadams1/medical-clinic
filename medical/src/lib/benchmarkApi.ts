import { hydrateBenchmarkReport, type BenchmarkReport } from '../data/benchmarkCatalog';
import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export class BenchmarkApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BenchmarkApiUnavailableError';
  }
}

const buildBenchmarkApiUrl = (path = '') => buildApiUrl(`/api/benchmark${path}`);

export interface BenchmarkExecutionEvaluationResult {
  passed: boolean;
  message: string;
  scorePercent: number;
  rubricBreakdown: {
    correctness: number;
    edgeCaseHandling: number;
    codeQuality: number;
    efficiency: number;
  };
  testResults: Array<{
    label?: string;
    passed: boolean;
    reason: string;
    hidden?: boolean;
    actual?: string;
    stderr?: string;
  }>;
  runtimeMs?: number;
}

export interface BenchmarkQualitySummary {
  available: boolean;
  benchmarkCount: number;
  averageTrustScore: number;
  averageConfidencePercent: number;
  formatMix: Record<string, number>;
  calibrationMix: Record<string, number>;
  validation: {
    lessonFollowThroughRate: number | null;
    duelParticipationRate: number | null;
    highVsLowScoreLessonLift: number | null;
    highVsLowScoreDuelLift: number | null;
  };
  itemSignals: Array<{
    templateId: string;
    exposureCount: number;
    passRate: number;
    discrimination: number;
    calibrationState: string;
  }>;
}

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

const benchmarkPublicFetch = async <T>(path: string, init: RequestInit = {}) => {
  try {
    const response = await fetch(buildBenchmarkApiUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
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
  return (payload.reports || []).map((report) => hydrateBenchmarkReport(report));
};

export const persistBenchmarkReport = async (report: BenchmarkReport) => {
  const payload = await benchmarkFetch<{ report: BenchmarkReport }>('/reports', {
    method: 'POST',
    body: JSON.stringify(report),
  });
  return hydrateBenchmarkReport(payload.report);
};

export const shareBenchmarkReport = async (reportId: string) => {
  const payload = await benchmarkFetch<{ report: BenchmarkReport }>(`/reports/${encodeURIComponent(reportId)}/share`, {
    method: 'POST',
  });
  return hydrateBenchmarkReport(payload.report);
};

export const unshareBenchmarkReport = async (reportId: string) => {
  const payload = await benchmarkFetch<{ report: BenchmarkReport }>(`/reports/${encodeURIComponent(reportId)}/share`, {
    method: 'DELETE',
  });
  return hydrateBenchmarkReport(payload.report);
};

export const fetchSharedBenchmarkReport = async (publicToken: string) => {
  try {
    const response = await fetch(buildBenchmarkApiUrl(`/shared/${encodeURIComponent(publicToken)}`));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((payload as { error?: string }).error || 'Could not load the shared benchmark report.');
    }

    const report = (payload as { report?: BenchmarkReport }).report;
    return report ? hydrateBenchmarkReport(report) : null;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new BenchmarkApiUnavailableError('Could not reach the benchmark API.');
    }

    throw error;
  }
};

export const evaluateBenchmarkSubmission = async (payload: {
  templateId: string;
  language: 'python' | 'javascript' | 'java' | 'cpp';
  submittedCode: string;
}) => {
  const response = await benchmarkPublicFetch<BenchmarkExecutionEvaluationResult>('/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response;
};

export const fetchBenchmarkQualitySummary = async () => {
  const payload = await benchmarkPublicFetch<{ summary: BenchmarkQualitySummary }>('/quality/summary');
  return payload.summary;
};
