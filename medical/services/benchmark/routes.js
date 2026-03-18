import express from 'express';
import { z } from 'zod';
import { createAuthenticatedUserMiddleware } from '../auth-utils.js';

const BenchmarkSetupSchema = z.object({
  goal: z.enum(['interview_prep', 'class_improvement', 'skill_growth']),
  language: z.enum(['python', 'javascript', 'java', 'cpp']),
  roleLevel: z.enum(['beginner', 'intern', 'junior', 'general_practice']),
});

const BenchmarkAnswerRecordSchema = z.object({
  questionId: z.string().trim().min(1).max(160),
  selectedAnswer: z.number().int().min(-1).max(20),
  isCorrect: z.boolean(),
});

const BenchmarkReportSchema = z.object({
  id: z.string().trim().min(1).max(160),
  setup: BenchmarkSetupSchema,
  overallScore: z.number().int().min(0).max(100),
  correctAnswers: z.number().int().min(0).max(100),
  totalQuestions: z.number().int().min(1).max(100),
  strengths: z.array(z.string().trim().min(1).max(120)).max(8),
  weaknesses: z.array(z.string().trim().min(1).max(120)).max(8),
  recommendedTrackIds: z.array(z.string().trim().min(1).max(120)).max(8),
  suggestedLessonIds: z.array(z.string().trim().min(1).max(160)).max(8),
  suggestedDuelProblemTitles: z.array(z.string().trim().min(1).max(160)).max(8),
  duelReadiness: z.object({
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(600),
    confidencePercent: z.number().int().min(0).max(100),
  }),
  summary: z.string().trim().min(1).max(1200),
  createdAt: z.string().trim().min(1).max(80),
  answerRecords: z.array(BenchmarkAnswerRecordSchema).max(25),
});

const ListReportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const buildPersistedReportRow = (userId, report) => ({
  user_id: userId,
  client_report_id: report.id,
  report_payload: report,
  goal: report.setup.goal,
  language: report.setup.language,
  role_level: report.setup.roleLevel,
  overall_score: report.overallScore,
  correct_answers: report.correctAnswers,
  total_questions: report.totalQuestions,
  source: 'benchmark_v1',
  created_at: report.createdAt,
});

export const createBenchmarkRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Benchmark API');

  router.get('/reports', requireAuth, async (req, res) => {
    try {
      const { limit = 8 } = ListReportsQuerySchema.parse(req.query || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .select('id, report_payload, created_at')
        .eq('user_id', req.authenticatedUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message || 'Could not load benchmark history.');
      }

      const reports = (data || [])
        .map((row) => row.report_payload)
        .filter(Boolean);

      return res.json({ reports });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load benchmark history.' });
    }
  });

  router.post('/reports', requireAuth, async (req, res) => {
    try {
      const report = BenchmarkReportSchema.parse(req.body || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .upsert(buildPersistedReportRow(req.authenticatedUser.id, report), {
          onConflict: 'user_id,client_report_id',
        })
        .select('report_payload')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not save benchmark report.');
      }

      return res.status(201).json({ report: data.report_payload });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not save benchmark report.' });
    }
  });

  return router;
};
