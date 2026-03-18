import express from 'express';
import { z } from 'zod';
import { getRequestIp, resolveOptionalUser } from '../auth-utils.js';

const AnalyticsEventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  path: z.string().trim().min(1).max(240),
  timestamp: z.string().trim().min(1).max(80),
  properties: z.record(z.string(), z.any()).optional().default({}),
  anonymousId: z.string().trim().max(120).optional().nullable(),
  sessionId: z.string().trim().max(120).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
});

const AnalyticsBatchSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(25),
});

const roundAverage = (values) => {
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

const calculateAverageImprovement = (rows) => {
  const reportsByUser = new Map();
  const sortedRows = [...rows].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());

  sortedRows.forEach((row) => {
    const current = reportsByUser.get(row.user_id) || [];
    current.push(row);
    reportsByUser.set(row.user_id, current);
  });

  const improvements = [];
  reportsByUser.forEach((reports) => {
    if (reports.length < 2) return;
    const firstScore = Number(reports[0]?.overall_score || 0);
    const latestScore = Number(reports[reports.length - 1]?.overall_score || 0);
    improvements.push(latestScore - firstScore);
  });

  return roundAverage(improvements);
};

export const createAnalyticsRouter = ({ supabaseAdmin }) => {
  const router = express.Router();

  router.post('/events/batch', async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Analytics API is not configured.' });
      }

      const optionalUser = await resolveOptionalUser(supabaseAdmin, req);
      const parsed = AnalyticsBatchSchema.parse(req.body || {});
      const requestIp = getRequestIp(req);
      const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 500) : null;

      const rows = parsed.events.map((event) => ({
        user_id: optionalUser?.id || null,
        anonymous_id: event.anonymousId || null,
        session_id: event.sessionId || null,
        event_name: event.name,
        path: event.path,
        properties: {
          ...event.properties,
          ip_hint: requestIp,
        },
        referrer: event.referrer || null,
        user_agent: userAgent,
        occurred_at: event.timestamp,
      }));

      const { error } = await supabaseAdmin.from('analytics_events').insert(rows);
      if (error) {
        throw new Error(error.message || 'Could not store analytics events.');
      }

      return res.status(202).json({ accepted: rows.length });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not track analytics events.' });
    }
  });

  router.get('/summary', async (_req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Analytics API is not configured.' });
      }

      const [
        lessonResult,
        matchResult,
        teamResult,
        benchmarkResult,
      ] = await Promise.all([
        supabaseAdmin.from('lesson_completion_events').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabaseAdmin.from('skill_teams').select('*', { count: 'exact', head: true }),
        supabaseAdmin
          .from('benchmark_reports')
          .select('user_id, overall_score, created_at')
          .order('created_at', { ascending: true })
          .limit(5000),
      ]);

      const firstError = lessonResult.error || matchResult.error || teamResult.error || benchmarkResult.error;
      if (firstError) {
        throw new Error(firstError.message || 'Could not load product summary.');
      }

      const averageImprovement = calculateAverageImprovement(benchmarkResult.data || []);
      return res.json({
        challengesCompleted: lessonResult.count || 0,
        duelMatchesPlayed: matchResult.count || 0,
        averageScoreImprovement: averageImprovement,
        teamCount: teamResult.count || 0,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load analytics summary.' });
    }
  });

  return router;
};
