import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { CURRENT_LEGAL_VERSIONS, LEGAL_DOCUMENT_LIST, REQUIRED_LEGAL_DOCUMENT_KEYS } from '../../shared/legal-documents.js';

const LegalAcceptanceSchema = z.object({
  source: z.enum(['signup', 'checkout', 'account']).default('account'),
  documentKeys: z.array(z.string()).optional(),
});

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const createAuthenticatedUserMiddleware = (supabaseAdmin) => async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Legal API is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.legalUser = data.user;
  return next();
};

const createLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.legalUser?.id || ipKeyGenerator(req.ip || ''),
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many legal requests. Please try again shortly.' });
    },
  });

const buildLegalStatus = (rows) => {
  const acceptanceMap = {};

  for (const document of LEGAL_DOCUMENT_LIST) {
    const row = rows.find((item) => item.document_key === document.key && item.version === document.version) || null;
    acceptanceMap[document.key] = {
      version: row?.version || null,
      acceptedAt: row?.accepted_at || null,
      isCurrent: Boolean(row),
    };
  }

  const allCurrentAccepted = LEGAL_DOCUMENT_LIST.every((document) => acceptanceMap[document.key]?.isCurrent);
  const latestAcceptedAt = LEGAL_DOCUMENT_LIST
    .map((document) => acceptanceMap[document.key]?.acceptedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  return {
    documents: LEGAL_DOCUMENT_LIST,
    acceptances: acceptanceMap,
    allCurrentAccepted,
    latestAcceptedAt,
  };
};

async function loadCurrentLegalAcceptances({ supabaseAdmin, userId }) {
  const { data, error } = await supabaseAdmin
    .from('legal_acceptances')
    .select('document_key, version, accepted_at')
    .eq('user_id', userId)
    .in('document_key', REQUIRED_LEGAL_DOCUMENT_KEYS)
    .order('accepted_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Could not load legal acceptance status.');
  }

  return buildLegalStatus(data || []);
}

export const createLegalRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin);
  const readLimiter = createLimiter(60 * 1000, 30);
  const writeLimiter = createLimiter(10 * 60 * 1000, 10);

  router.get('/health', (_req, res) => {
    res.json({ status: supabaseAdmin ? 'ok' : 'degraded' });
  });

  router.get('/status', requireAuth, readLimiter, async (req, res) => {
    try {
      const status = await loadCurrentLegalAcceptances({
        supabaseAdmin,
        userId: req.legalUser.id,
      });

      return res.json(status);
    } catch (error) {
      console.error('Legal status error:', error);
      return res.status(500).json({ error: error.message || 'Could not load legal status.' });
    }
  });

  router.post('/accept', requireAuth, writeLimiter, async (req, res) => {
    try {
      const parsed = LegalAcceptanceSchema.parse(req.body || {});
      const requestedKeys = parsed.documentKeys?.filter((key) => REQUIRED_LEGAL_DOCUMENT_KEYS.includes(key)) || REQUIRED_LEGAL_DOCUMENT_KEYS;
      const uniqueKeys = [...new Set(requestedKeys)];

      if (uniqueKeys.length === 0) {
        return res.status(400).json({ error: 'No valid legal documents were requested for acceptance.' });
      }

      const now = new Date().toISOString();
      const userAgent = String(req.headers['user-agent'] || '').slice(0, 512);
      const ipAddress = String(req.ip || '').slice(0, 128);

      const rows = uniqueKeys.map((documentKey) => ({
        user_id: req.legalUser.id,
        document_key: documentKey,
        version: CURRENT_LEGAL_VERSIONS[documentKey],
        source: parsed.source,
        accepted_at: now,
        ip_address: ipAddress,
        user_agent: userAgent,
      }));

      const { error } = await supabaseAdmin
        .from('legal_acceptances')
        .upsert(rows, { onConflict: 'user_id,document_key,version' });

      if (error) {
        throw new Error(error.message || 'Could not save legal acceptance.');
      }

      const status = await loadCurrentLegalAcceptances({
        supabaseAdmin,
        userId: req.legalUser.id,
      });

      return res.json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0]?.message || 'Invalid legal acceptance request.' });
      }

      console.error('Legal acceptance error:', error);
      return res.status(500).json({ error: error.message || 'Could not record legal acceptance.' });
    }
  });

  return router;
};
