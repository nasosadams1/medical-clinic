import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export interface LessonExecutionEvaluationResult {
  passed: boolean;
  message: string;
  scorePercent: number;
  missingSnippets?: string[];
  rubricBreakdown: {
    correctness: number;
    edgeCaseHandling: number;
    codeQuality: number;
    efficiency: number;
  };
  testResults?: Array<{
    label?: string;
    passed: boolean;
    reason: string;
    hidden?: boolean;
    actual?: string;
    stderr?: string;
  }>;
  runtimeMs?: number;
  stderr?: string;
}

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to check lesson code.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
};

export const evaluateLessonPractice = async (payload: {
  lessonId: string;
  submittedCode: string;
}): Promise<LessonExecutionEvaluationResult> => {
  try {
    const response = await fetch(buildApiUrl('/api/progression/lessons/evaluate'), {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const parsed = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((parsed as { error?: string }).error || 'Lesson practice evaluation failed.');
    }

    return parsed as LessonExecutionEvaluationResult;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not reach the lesson runner.');
    }

    throw error;
  }
};
