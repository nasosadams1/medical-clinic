import {
  hydrateBenchmarkReport,
  type BenchmarkCalibrationSignal,
  type BenchmarkReport,
} from '../data/benchmarkEngine';
import type { BenchmarkExecutionCase } from '../data/benchmarkModel';
import { buildApiUrl } from './apiBase';
import { getValidAccessToken, recoverFromSupabaseSessionError } from './supabase';

export class BenchmarkApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BenchmarkApiUnavailableError';
  }
}

const buildBenchmarkApiUrl = (path = '') => buildApiUrl(`/api/benchmark${path}`);

const formatBenchmarkApiError = (errorValue: unknown) => {
  if (typeof errorValue !== 'string' || errorValue.trim().length === 0) {
    return 'Benchmark request failed.';
  }

  const trimmed = errorValue.trim();
  if (!trimmed.startsWith('[')) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as Array<{ path?: Array<string | number>; message?: string }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return trimmed;
    }

    const fieldLabels = Array.from(
      new Set(
        parsed
          .map((entry) => (Array.isArray(entry.path) && entry.path.length > 0 ? entry.path.join('.') : null))
          .filter((entry): entry is string => Boolean(entry))
      )
    );

    if (fieldLabels.length > 0) {
      return `Benchmark report is incomplete (${fieldLabels.join(', ')}). Refresh and rerun the benchmark to regenerate it.`;
    }

    return parsed[0]?.message || trimmed;
  } catch {
    return trimmed;
  }
};

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
  reason?: string | null;
  benchmarkCount: number;
  averageTrustScore: number;
  averageConfidencePercent: number;
  formatMix: Record<string, number>;
  formatFunnels: Record<
    string,
    {
      starts: number;
      completes: number;
      completionRate: number | null;
      reportViews: number;
      signupAfterReport: number;
      subscriptionClicks: number;
      upgradeIntentRate: number | null;
      paidConversions: number;
      reportSignupRate: number | null;
      reportPaidRate: number | null;
    }
  >;
  calibrationMix: Record<string, number>;
  validation: {
    lessonFollowThroughRate: number | null;
    duelParticipationRate: number | null;
    highVsLowScoreLessonLift: number | null;
    highVsLowScoreDuelLift: number | null;
  };
  trustTierOutcomes: Array<{
    tier: string;
    label: string;
    benchmarkCount: number;
    averageTrustScore: number;
    retakeCount: number;
    retakeRate: number | null;
    averageRetakeDelta: number | null;
    positiveRetakeRate: number | null;
    duelParticipationRate: number | null;
  }>;
  itemSignals: BenchmarkCalibrationSignal[];
}

const getAuthHeaders = async () => {
  const accessToken = await getValidAccessToken();

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
      if (response.status === 401 || response.status === 403) {
        await recoverFromSupabaseSessionError({
          status: response.status,
          message: (payload as { error?: string }).error || response.statusText,
        });
      }
      throw new Error(formatBenchmarkApiError((payload as { error?: unknown }).error));
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
  const normalizedReport = hydrateBenchmarkReport(report);
  const payload = await benchmarkFetch<{ report: BenchmarkReport }>('/reports', {
    method: 'POST',
    body: JSON.stringify(normalizedReport),
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
  starterCode?: string;
  referenceCode?: string;
  executionCases?: BenchmarkExecutionCase[];
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
