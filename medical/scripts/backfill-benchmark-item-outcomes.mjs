import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const getAnswerScorePercent = (answer) => {
  if (typeof answer?.scorePercent === 'number') {
    return clamp(Number(answer.scorePercent || 0), 0, 100);
  }
  return answer?.isCorrect ? 100 : 0;
};

const toOutcomeRows = (reportRow) => {
  const report = reportRow?.report_payload || {};
  const questions = Array.isArray(report.questions) ? report.questions : [];
  const answers = Array.isArray(report.answerRecords) ? report.answerRecords : [];
  if (!reportRow?.user_id || !report?.id || questions.length === 0 || answers.length === 0) {
    return [];
  }

  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const scoredQuestions = questions.map((question) => {
    const answer = answerMap.get(question.id) || {};
    return {
      question,
      answer,
      scorePercent: getAnswerScorePercent(answer),
    };
  });
  const totalObservedScore = scoredQuestions.reduce((total, entry) => total + entry.scorePercent, 0);

  return scoredQuestions.map(({ question, answer, scorePercent }) => ({
    user_id: reportRow.user_id,
    client_report_id: report.id,
    question_id: question.id,
    template_id: question.templateId,
    pack_id: question.packId || report.packId || 'unknown-pack',
    language: report.setup?.language,
    format: report.format || 'quick',
    evaluation_strategy: question.evaluationStrategy || answer.evaluationStrategy || 'choice',
    calibration_state: question.calibrationState || 'calibrating',
    score_percent: Math.round(scorePercent),
    is_correct: Boolean(answer.isCorrect),
    latency_ms: typeof answer.latencyMs === 'number' ? Math.max(0, Math.round(answer.latencyMs)) : null,
    ability_without_item:
      scoredQuestions.length > 1
        ? Math.round((((totalObservedScore - scorePercent) / (scoredQuestions.length - 1)) || 0) * 100) / 100
        : Number(report.overallScore || 0),
    trust_score: Math.round(report?.trustSignal?.score || 0),
    confidence_percent: Math.round(report?.confidenceBand?.percent || 0),
    created_at: report.createdAt || reportRow.created_at,
  }));
};

const pageSize = 250;
let from = 0;
let totalReports = 0;
let totalOutcomes = 0;

for (;;) {
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('benchmark_reports')
    .select('user_id, created_at, report_payload')
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) {
    console.error(error.message || 'Failed to load benchmark reports.');
    process.exit(1);
  }

  if (!data || data.length === 0) {
    break;
  }

  const outcomeRows = data.flatMap(toOutcomeRows);
  if (outcomeRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('benchmark_item_outcomes')
      .upsert(outcomeRows, { onConflict: 'user_id,client_report_id,question_id' });

    if (upsertError) {
      console.error(upsertError.message || 'Failed to upsert benchmark item outcomes.');
      process.exit(1);
    }
  }

  totalReports += data.length;
  totalOutcomes += outcomeRows.length;
  from += data.length;
  if (data.length < pageSize) {
    break;
  }
}

console.log(
  JSON.stringify(
    {
      backfilledReports: totalReports,
      backfilledItemOutcomes: totalOutcomes,
    },
    null,
    2
  )
);
