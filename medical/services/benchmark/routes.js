import express from 'express';
import { randomBytes } from 'node:crypto';
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

const BenchmarkQuestionSchema = z.object({
  id: z.string().trim().min(1).max(200),
  templateId: z.string().trim().min(1).max(200),
  slotId: z.string().trim().min(1).max(120),
  lessonId: z.string().trim().min(1).max(160),
  lessonTitle: z.string().trim().min(1).max(200),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(400)).min(2).max(8),
  correctAnswer: z.number().int().min(0).max(7),
  explanation: z.string().trim().min(1).max(1200),
  competency: z.string().trim().min(1).max(120),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  weight: z.number().min(0.5).max(5),
});

const BenchmarkReportSchema = z.object({
  id: z.string().trim().min(1).max(160),
  benchmarkVersion: z.string().trim().min(1).max(60),
  attemptIndex: z.number().int().min(0).max(1000),
  setup: BenchmarkSetupSchema,
  isPublic: z.boolean().optional(),
  shareToken: z.string().trim().min(1).max(160).nullable().optional(),
  publicSharedAt: z.string().trim().min(1).max(80).nullable().optional(),
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
  estimation: z.object({
    label: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(600),
    targetRoleLabel: z.string().trim().min(1).max(120),
    baselineScore: z.number().int().min(0).max(100),
    competencyCoveragePercent: z.number().int().min(0).max(100),
  }),
  summary: z.string().trim().min(1).max(1200),
  createdAt: z.string().trim().min(1).max(80),
  questions: z.array(BenchmarkQuestionSchema).min(1).max(25),
  answerRecords: z.array(BenchmarkAnswerRecordSchema).max(25),
});

const ListReportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const ReportRouteParamsSchema = z.object({
  reportId: z.string().trim().min(1).max(160),
});

const SharedReportRouteParamsSchema = z.object({
  publicToken: z.string().trim().min(6).max(160),
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
  source: report.benchmarkVersion || 'benchmark_v2',
  created_at: report.createdAt,
});

const mergeReportRow = (row) => ({
  ...(row.report_payload || {}),
  isPublic: Boolean(row.is_public),
  shareToken: row.public_token || null,
  publicSharedAt: row.public_shared_at || null,
});

const buildPublicShareToken = () => randomBytes(12).toString('base64url');

const createUniquePublicShareToken = async (supabaseAdmin) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildPublicShareToken();
    const { data, error } = await supabaseAdmin
      .from('benchmark_reports')
      .select('id')
      .eq('public_token', candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Could not create a public share token.');
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error('Could not create a unique public share token.');
};

export const createBenchmarkRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Benchmark API');

  router.get('/shared/:publicToken', async (req, res) => {
    try {
      const { publicToken } = SharedReportRouteParamsSchema.parse(req.params || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .select('report_payload, is_public, public_token, public_shared_at')
        .eq('public_token', publicToken)
        .eq('is_public', true)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Could not load the shared benchmark report.');
      }

      if (!data?.report_payload) {
        return res.status(404).json({ error: 'Shared benchmark report not found.' });
      }

      return res.json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load the shared benchmark report.' });
    }
  });

  router.get('/reports', requireAuth, async (req, res) => {
    try {
      const { limit = 8 } = ListReportsQuerySchema.parse(req.query || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .select('id, report_payload, created_at, is_public, public_token, public_shared_at')
        .eq('user_id', req.authenticatedUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message || 'Could not load benchmark history.');
      }

      const reports = (data || [])
        .map((row) => mergeReportRow(row))
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
        .select('report_payload, is_public, public_token, public_shared_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not save benchmark report.');
      }

      return res.status(201).json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not save benchmark report.' });
    }
  });

  router.post('/reports/:reportId/share', requireAuth, async (req, res) => {
    try {
      const { reportId } = ReportRouteParamsSchema.parse(req.params || {});
      const { data: existingRow, error: existingError } = await supabaseAdmin
        .from('benchmark_reports')
        .select('*')
        .eq('user_id', req.authenticatedUser.id)
        .eq('client_report_id', reportId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message || 'Could not load the benchmark report for sharing.');
      }

      if (!existingRow) {
        return res.status(404).json({ error: 'Benchmark report not found.' });
      }

      const publicToken = existingRow.public_token || (await createUniquePublicShareToken(supabaseAdmin));
      const publicSharedAt = new Date().toISOString();
      const mergedReportPayload = {
        ...(existingRow.report_payload || {}),
        isPublic: true,
        shareToken: publicToken,
        publicSharedAt,
      };

      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .update({
          is_public: true,
          public_token: publicToken,
          public_shared_at: publicSharedAt,
          report_payload: mergedReportPayload,
        })
        .eq('id', existingRow.id)
        .select('report_payload, is_public, public_token, public_shared_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not publish the benchmark report.');
      }

      return res.json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not publish the benchmark report.' });
    }
  });

  router.delete('/reports/:reportId/share', requireAuth, async (req, res) => {
    try {
      const { reportId } = ReportRouteParamsSchema.parse(req.params || {});
      const { data: existingRow, error: existingError } = await supabaseAdmin
        .from('benchmark_reports')
        .select('*')
        .eq('user_id', req.authenticatedUser.id)
        .eq('client_report_id', reportId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message || 'Could not load the benchmark report.');
      }

      if (!existingRow) {
        return res.status(404).json({ error: 'Benchmark report not found.' });
      }

      const mergedReportPayload = {
        ...(existingRow.report_payload || {}),
        isPublic: false,
        shareToken: existingRow.public_token || null,
        publicSharedAt: null,
      };

      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .update({
          is_public: false,
          public_shared_at: null,
          report_payload: mergedReportPayload,
        })
        .eq('id', existingRow.id)
        .select('report_payload, is_public, public_token, public_shared_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not disable the public benchmark link.');
      }

      return res.json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not disable the public benchmark link.' });
    }
  });

  return router;
};
