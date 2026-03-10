import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import {
  DUEL_ADMIN_DEFAULT_LIMIT,
  DUEL_ADMIN_READ_MAX,
  DUEL_ADMIN_READ_WINDOW_MS,
  DUEL_ADMIN_USER_IDS,
  DUEL_ADMIN_WRITE_MAX,
  DUEL_ADMIN_WRITE_WINDOW_MS,
} from '../duel-admin/config.js';

const DuelProblemIdSchema = z.object({
  problemId: z.string().uuid(),
});

const DuelProblemTestCaseSchema = z.object({
  input: z.string().max(200000).default(''),
  expected_output: z.string().max(200000).default(''),
  weight: z.number().int().min(1).max(1000).default(1),
  hidden: z.boolean().default(false),
  input_json: z.any().optional(),
  expected_json: z.any().optional(),
  compare_mode: z.string().trim().max(64).nullable().optional(),
  validator: z.string().trim().max(64).nullable().optional(),
  time_limit_ms: z.number().int().min(50).max(120000).nullable().optional(),
});

const DuelProblemPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  statement: z.string().trim().min(1).max(50000),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  time_limit_seconds: z.number().int().min(5).max(7200),
  memory_limit_mb: z.number().int().min(32).max(4096).default(256),
  supported_languages: z
    .array(z.string().trim().min(1).max(32))
    .min(1)
    .max(10)
    .transform((languages) => [...new Set(languages.map((language) => language.toLowerCase()))]),
  test_cases: z.array(DuelProblemTestCaseSchema).min(1).max(200),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).default([]),
  is_active: z.boolean().default(true),
  starter_code: z.record(z.string()).optional(),
});

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
};

const createAuthenticatedUserMiddleware = (supabaseAdmin) => async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Duel problem API is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.duelProblemAdminUser = data.user;
  return next();
};

const isDuelAdmin = (user) => {
  if (!user) return false;
  if (DUEL_ADMIN_USER_IDS.includes(user.id)) return true;
  if (user.app_metadata?.role === 'admin') return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.user_metadata?.is_admin === true) return true;
  return false;
};

const createAdminOnlyMiddleware = () => (req, res, next) => {
  if (!isDuelAdmin(req.duelProblemAdminUser)) {
    return res.status(403).json({ error: 'Admin access is required for duel problem management.' });
  }
  return next();
};

const createLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.duelProblemAdminUser?.id || ipKeyGenerator(req.ip || ''),
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many duel problem requests. Please try again shortly.' });
    },
  });

const normalizeProblemPayload = (payload) => {
  const parsed = DuelProblemPayloadSchema.parse(payload || {});
  const normalizedTestCases = parsed.test_cases.map((testCase) => {
    const normalized = {
      input: testCase.input,
      expected_output: testCase.expected_output,
      weight: testCase.weight,
      hidden: testCase.hidden,
    };

    if (Object.prototype.hasOwnProperty.call(testCase, 'input_json')) {
      normalized.input_json = testCase.input_json;
    }
    if (Object.prototype.hasOwnProperty.call(testCase, 'expected_json')) {
      normalized.expected_json = testCase.expected_json;
    }
    if (Object.prototype.hasOwnProperty.call(testCase, 'compare_mode')) {
      normalized.compare_mode = testCase.compare_mode ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(testCase, 'validator')) {
      normalized.validator = testCase.validator ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(testCase, 'time_limit_ms')) {
      normalized.time_limit_ms = testCase.time_limit_ms ?? null;
    }

    return normalized;
  });

  return {
    ...parsed,
    test_cases: normalizedTestCases,
  };
};

export const createDuelProblemAdminRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin);
  const requireAdmin = createAdminOnlyMiddleware();
  const readLimiter = createLimiter(DUEL_ADMIN_READ_WINDOW_MS, DUEL_ADMIN_READ_MAX);
  const writeLimiter = createLimiter(DUEL_ADMIN_WRITE_WINDOW_MS, DUEL_ADMIN_WRITE_MAX);

  router.get('/capabilities', requireAuth, (req, res) => {
    res.json({ canManageProblems: isDuelAdmin(req.duelProblemAdminUser) });
  });

  router.get('/', requireAuth, requireAdmin, readLimiter, async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || DUEL_ADMIN_DEFAULT_LIMIT, 1), 100);
      const { data, error } = await supabaseAdmin
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return res.json({ entries: data || [] });
    } catch (error) {
      console.error('Duel problem list error:', error);
      return res.status(500).json({ error: error.message || 'Could not load duel problems.' });
    }
  });

  router.post('/', requireAuth, requireAdmin, writeLimiter, async (req, res) => {
    try {
      const payload = normalizeProblemPayload(req.body);
      const { data, error } = await supabaseAdmin
        .from('problems')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return res.status(201).json({ entry: data });
    } catch (error) {
      console.error('Duel problem create error:', error);
      return res.status(400).json({ error: error.message || 'Could not create duel problem.' });
    }
  });

  router.patch('/:problemId', requireAuth, requireAdmin, writeLimiter, async (req, res) => {
    try {
      const { problemId } = DuelProblemIdSchema.parse(req.params || {});
      const payload = normalizeProblemPayload(req.body);
      const { data, error } = await supabaseAdmin
        .from('problems')
        .update(payload)
        .eq('id', problemId)
        .select('*')
        .single();

      if (error) throw error;
      return res.json({ entry: data });
    } catch (error) {
      console.error('Duel problem update error:', error);
      return res.status(400).json({ error: error.message || 'Could not update duel problem.' });
    }
  });

  router.delete('/:problemId', requireAuth, requireAdmin, writeLimiter, async (req, res) => {
    try {
      const { problemId } = DuelProblemIdSchema.parse(req.params || {});
      const { error } = await supabaseAdmin
        .from('problems')
        .delete()
        .eq('id', problemId);

      if (error) throw error;
      return res.status(204).send();
    } catch (error) {
      console.error('Duel problem delete error:', error);
      return res.status(400).json({ error: error.message || 'Could not delete duel problem.' });
    }
  });

  return router;
};
