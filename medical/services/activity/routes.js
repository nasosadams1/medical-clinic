import express from 'express';
import { z } from 'zod';
import { createAuthenticatedUserMiddleware } from '../auth-utils.js';

const ACTIVE_SESSION_WINDOW_MS = 2 * 60 * 1000;

const ActivityHeartbeatSchema = z.object({
  path: z.string().trim().min(1).max(240).optional(),
  visibilityState: z.enum(['visible', 'hidden']).optional(),
  reason: z.enum(['bootstrap', 'interaction', 'focus', 'interval', 'hidden']).optional(),
});

export const createActivityRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Activity API');

  router.post('/heartbeat', requireAuth, async (req, res) => {
    try {
      const parsed = ActivityHeartbeatSchema.parse(req.body || {});
      const now = new Date();
      const nowIso = now.toISOString();
      const visibilityState = parsed.visibilityState || 'visible';
      const isVisible = visibilityState === 'visible';
      const activeSessionExpiresAt = isVisible ? new Date(now.getTime() + ACTIVE_SESSION_WINDOW_MS).toISOString() : nowIso;

      const payload = {
        user_id: req.authenticatedUser.id,
        last_seen_at: nowIso,
        last_active_at: isVisible ? nowIso : null,
        active_session_expires_at: activeSessionExpiresAt,
        last_path: parsed.path || null,
        visibility_state: visibilityState,
        last_reason: parsed.reason || null,
        updated_at: nowIso,
      };

      const { data: existingRow, error: existingRowError } = await supabaseAdmin
        .from('user_activity_presence')
        .select('user_id, last_active_at')
        .eq('user_id', req.authenticatedUser.id)
        .maybeSingle();

      if (existingRowError) {
        throw new Error(existingRowError.message || 'Could not load the current activity presence.');
      }

      const { data, error } = await supabaseAdmin
        .from('user_activity_presence')
        .upsert(
          {
            ...payload,
            last_active_at: isVisible ? nowIso : existingRow?.last_active_at || null,
          },
          { onConflict: 'user_id' }
        )
        .select('user_id, last_seen_at, last_active_at, active_session_expires_at, last_path, visibility_state, last_reason')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not update activity presence.');
      }

      return res.json({
        presence: {
          userId: data.user_id,
          lastSeenAt: data.last_seen_at,
          lastActiveAt: data.last_active_at,
          activeSessionExpiresAt: data.active_session_expires_at,
          lastPath: data.last_path,
          visibilityState: data.visibility_state,
          lastReason: data.last_reason,
          isCurrentlyActive:
            Boolean(data.active_session_expires_at) &&
            new Date(data.active_session_expires_at).getTime() > Date.now(),
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not update activity presence.' });
    }
  });

  return router;
};
