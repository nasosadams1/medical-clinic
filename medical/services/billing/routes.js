import express from 'express';
import { createAuthenticatedUserMiddleware } from '../auth-utils.js';

export const createBillingRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Billing API');

  router.get('/entitlements', requireAuth, async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('plan_entitlements')
        .select('*')
        .eq('user_id', req.authenticatedUser.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message || 'Could not load plan entitlements.');
      }

      return res.json({
        entitlements: data || [],
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load plan entitlements.' });
    }
  });

  return router;
};
