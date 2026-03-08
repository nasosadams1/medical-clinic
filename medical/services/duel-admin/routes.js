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
} from './config.js';

const AdminStatusUpdateSchema = z.object({
  status: z.enum(['new', 'in_review', 'resolved', 'dismissed']),
  note: z.string().trim().max(1000).optional(),
});

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
};

const createAuthenticatedUserMiddleware = (supabaseAdmin) => async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Duel moderation API is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.duelAdminUser = data.user;
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
  if (!isDuelAdmin(req.duelAdminUser)) {
    return res.status(403).json({ error: 'Admin access is required for duel moderation.' });
  }
  return next();
};

const createLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.duelAdminUser?.id || ipKeyGenerator(req.ip || ''),
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many moderation requests. Please try again shortly.' });
    },
  });

const loadProfiles = async (supabaseAdmin, userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, email, current_avatar')
    .in('id', ids);

  if (error) {
    console.error('Could not load duel moderation profiles:', error);
    return new Map();
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
};

const loadMatches = async (supabaseAdmin, matchIds) => {
  const ids = [...new Set(matchIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('*')
    .in('id', ids);

  if (error) {
    throw new Error(error.message || 'Could not load match records.');
  }

  return new Map((data || []).map((match) => [match.id, match]));
};

const loadProblems = async (supabaseAdmin, problemIds) => {
  const ids = [...new Set(problemIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('problems')
    .select('id, title, difficulty')
    .in('id', ids);

  if (error) {
    throw new Error(error.message || 'Could not load duel problems.');
  }

  return new Map((data || []).map((problem) => [problem.id, problem]));
};

const enrichCases = async (supabaseAdmin, cases) => {
  const matchesById = await loadMatches(supabaseAdmin, cases.map((entry) => entry.match_id));
  const problemsById = await loadProblems(
    supabaseAdmin,
    [...matchesById.values()].map((match) => match.problem_id)
  );
  const profilesById = await loadProfiles(
    supabaseAdmin,
    [...matchesById.values()].flatMap((match) => [match.player_a_id, match.player_b_id, match.winner_id]).filter(Boolean)
  );

  return cases.map((entry) => {
    const match = matchesById.get(entry.match_id) || null;
    const problem = match ? problemsById.get(match.problem_id) || null : null;
    return {
      ...entry,
      match: match
        ? {
            id: match.id,
            status: match.status,
            match_type: match.match_type,
            problem_difficulty: match.problem_difficulty,
            duel_result_strength: match.duel_result_strength,
            created_at: match.created_at,
            started_at: match.started_at,
            completed_at: match.completed_at,
            winner_id: match.winner_id,
            player_a: profilesById.get(match.player_a_id) || { id: match.player_a_id },
            player_b: profilesById.get(match.player_b_id) || { id: match.player_b_id },
          }
        : null,
      problem,
      reviewed_by_profile: entry.reviewed_by ? profilesById.get(entry.reviewed_by) || null : null,
    };
  });
};

export const createDuelAdminRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin);
  const requireAdmin = createAdminOnlyMiddleware();
  const readLimiter = createLimiter(DUEL_ADMIN_READ_WINDOW_MS, DUEL_ADMIN_READ_MAX);
  const writeLimiter = createLimiter(DUEL_ADMIN_WRITE_WINDOW_MS, DUEL_ADMIN_WRITE_MAX);

  router.get('/capabilities', requireAuth, (req, res) => {
    res.json({ canReview: isDuelAdmin(req.duelAdminUser) });
  });

  router.get('/cases', requireAuth, requireAdmin, readLimiter, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || DUEL_ADMIN_DEFAULT_LIMIT, 100);
      const status = String(req.query.status || '').trim();

      let query = supabaseAdmin
        .from('anti_cheat_cases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && ['new', 'in_review', 'resolved', 'dismissed'].includes(status)) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      const entries = await enrichCases(supabaseAdmin, data || []);
      return res.json({ entries });
    } catch (error) {
      console.error('Duel moderation queue error:', error);
      return res.status(500).json({ error: error.message || 'Could not load duel moderation cases.' });
    }
  });

  router.get('/matches/:matchId/replay', requireAuth, requireAdmin, readLimiter, async (req, res) => {
    try {
      const { matchId } = req.params;

      const [{ data: replayRow, error: replayError }, { data: submissionRows, error: submissionError }, { data: eventRows, error: eventError }, { data: caseRows, error: caseError }, { data: matchRow, error: matchError }] = await Promise.all([
        supabaseAdmin.from('match_replays').select('*').eq('match_id', matchId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from('submissions').select('*').eq('match_id', matchId).order('submitted_at', { ascending: true }),
        supabaseAdmin.from('match_events').select('*').eq('match_id', matchId).order('created_at', { ascending: true }),
        supabaseAdmin.from('anti_cheat_cases').select('*').eq('match_id', matchId).order('created_at', { ascending: false }),
        supabaseAdmin.from('matches').select('*').eq('id', matchId).maybeSingle(),
      ]);

      if (replayError) throw replayError;
      if (submissionError) throw submissionError;
      if (eventError) throw eventError;
      if (caseError) throw caseError;
      if (matchError) throw matchError;

      const profilesById = await loadProfiles(
        supabaseAdmin,
        [matchRow?.player_a_id, matchRow?.player_b_id, ...(caseRows || []).map((entry) => entry.reviewed_by)].filter(Boolean)
      );

      return res.json({
        replay: replayRow,
        submissions: submissionRows || [],
        events: eventRows || [],
        cases: (caseRows || []).map((entry) => ({
          ...entry,
          reviewed_by_profile: entry.reviewed_by ? profilesById.get(entry.reviewed_by) || null : null,
        })),
        match: matchRow
          ? {
              ...matchRow,
              player_a: profilesById.get(matchRow.player_a_id) || { id: matchRow.player_a_id },
              player_b: profilesById.get(matchRow.player_b_id) || { id: matchRow.player_b_id },
            }
          : null,
      });
    } catch (error) {
      console.error('Duel replay fetch error:', error);
      return res.status(500).json({ error: error.message || 'Could not load duel replay.' });
    }
  });

  router.patch('/cases/:caseId/status', requireAuth, requireAdmin, writeLimiter, async (req, res) => {
    try {
      const parsed = AdminStatusUpdateSchema.parse(req.body || {});
      const { caseId } = req.params;
      const patch = {
        status: parsed.status,
        resolution_note: parsed.note || null,
        reviewed_by: req.duelAdminUser.id,
        reviewed_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('anti_cheat_cases')
        .update(patch)
        .eq('id', caseId)
        .select('*')
        .single();

      if (error) throw error;

      const { error: eventError } = await supabaseAdmin
        .from('anti_cheat_case_events')
        .insert({
          case_id: caseId,
          actor_user_id: req.duelAdminUser.id,
          action: 'status_updated',
          details: {
            status: parsed.status,
            note: parsed.note || null,
          },
        });

      if (eventError) {
        console.error('Could not persist anti-cheat case event:', eventError);
      }

      return res.json({ entry: data });
    } catch (error) {
      console.error('Duel moderation status update error:', error);
      return res.status(400).json({ error: error.message || 'Could not update moderation case.' });
    }
  });

  return router;
};
