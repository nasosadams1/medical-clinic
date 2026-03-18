import express from 'express';
import { z } from 'zod';
import { getRequestIp, resolveOptionalUser } from '../auth-utils.js';

const LeadSourceValues = ['teams_page', 'pricing_page', 'benchmark_report', 'general'];
const LeadIntentValues = ['team_demo', 'teams_growth', 'custom_plan', 'interview_sprint', 'pro_upgrade'];

const CreateLeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(2).max(120),
  teamSize: z.string().trim().min(1).max(60),
  useCase: z.string().trim().min(2).max(120),
  objective: z.string().trim().min(8).max(600),
  source: z.enum(LeadSourceValues).optional().default('general'),
  intent: z.enum(LeadIntentValues).optional().default('team_demo'),
});

export const createLeadsRouter = ({ supabaseAdmin }) => {
  const router = express.Router();

  router.post('/demo-request', async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Lead capture is not configured.' });
      }

      const optionalUser = await resolveOptionalUser(supabaseAdmin, req);
      const parsed = CreateLeadSchema.parse(req.body || {});
      const requestIp = getRequestIp(req);
      const userAgent =
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 500) : null;

      const { data, error } = await supabaseAdmin
        .from('sales_leads')
        .insert({
          user_id: optionalUser?.id || null,
          lead_type: 'demo_request',
          source: parsed.source,
          intent: parsed.intent,
          name: parsed.name,
          email: parsed.email.toLowerCase(),
          company: parsed.company,
          team_size: parsed.teamSize,
          use_case: parsed.useCase,
          objective: parsed.objective,
          status: 'new',
          metadata: {
            ip_hint: requestIp,
          },
          user_agent: userAgent,
        })
        .select('id, created_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not store demo request.');
      }

      return res.status(201).json({
        lead: {
          id: data.id,
          createdAt: data.created_at,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not submit demo request.' });
    }
  });

  return router;
};
