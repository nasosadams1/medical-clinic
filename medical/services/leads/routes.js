import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { createAuthenticatedUserMiddleware, getRequestIp, resolveOptionalUser } from '../auth-utils.js';
import {
  LEADS_ADMIN_USER_IDS,
  LEADS_NOTIFY_WEBHOOK_URL,
  LEADS_READ_MAX,
  LEADS_READ_WINDOW_MS,
  LEADS_REQUEST_MAX,
  LEADS_REQUEST_WINDOW_MS,
  LEADS_WRITE_MAX,
  LEADS_WRITE_WINDOW_MS,
} from './config.js';
import { notifyLeadChannel } from './notifications.js';

const LeadSourceValues = ['teams_page', 'pricing_page', 'benchmark_report', 'general'];
const LeadIntentValues = ['team_demo', 'teams_growth', 'custom_plan', 'interview_sprint', 'pro_upgrade'];
const LeadStatusValues = ['new', 'contacted', 'qualified', 'won', 'lost'];
const LeadPriorityValues = ['low', 'medium', 'high'];

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

const UpdateLeadSchema = z
  .object({
    status: z.enum(LeadStatusValues).optional(),
    priority: z.enum(LeadPriorityValues).optional(),
    nextStep: z.string().trim().max(240).nullable().optional(),
    qualificationNotes: z.string().trim().max(4000).nullable().optional(),
    assignToSelf: z.boolean().optional(),
    unassignOwner: z.boolean().optional(),
    markContactedNow: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priority !== undefined ||
      value.nextStep !== undefined ||
      value.qualificationNotes !== undefined ||
      value.assignToSelf === true ||
      value.unassignOwner === true ||
      value.markContactedNow === true,
    { message: 'At least one lead field must be updated.' }
  );

const isLeadAdmin = (user) => {
  if (!user) return false;
  if (LEADS_ADMIN_USER_IDS.includes(user.id)) return true;
  if (user.app_metadata?.role === 'admin') return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.user_metadata?.is_admin === true) return true;
  return false;
};

const createAdminOnlyMiddleware = () => (req, res, next) => {
  if (!isLeadAdmin(req.leadAdminUser)) {
    return res.status(403).json({ error: 'Admin access is required for the sales pipeline.' });
  }

  return next();
};

const createLimiter = (windowMs, max, label) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.leadAdminUser?.id || ipKeyGenerator(req.ip || ''),
    handler: (_req, res) => {
      res.status(429).json({ error: `Too many ${label} requests. Please try again shortly.` });
    },
  });

const distinct = (values) => [...new Set((values || []).filter(Boolean))];

const loadProfiles = async (supabaseAdmin, userIds) => {
  const ids = distinct(userIds);
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, email, current_avatar')
    .in('id', ids);

  if (error) {
    console.error('Could not load sales lead profiles:', error);
    return new Map();
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
};

const loadLeadEvents = async (supabaseAdmin, leadIds) => {
  const ids = distinct(leadIds);
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from('sales_lead_events')
    .select('*')
    .in('lead_id', ids)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Could not load sales lead events:', error);
    return new Map();
  }

  return (data || []).reduce((map, entry) => {
    if (!map.has(entry.lead_id)) {
      map.set(entry.lead_id, []);
    }
    map.get(entry.lead_id).push(entry);
    return map;
  }, new Map());
};

const enrichLeadEntries = async (supabaseAdmin, entries) => {
  const profilesById = await loadProfiles(
    supabaseAdmin,
    [
      ...entries.map((entry) => entry.user_id),
      ...entries.map((entry) => entry.owner_user_id),
    ]
  );
  const eventsByLeadId = await loadLeadEvents(
    supabaseAdmin,
    entries.map((entry) => entry.id)
  );
  const actorProfilesById = await loadProfiles(
    supabaseAdmin,
    [...eventsByLeadId.values()].flatMap((events) => events.map((event) => event.actor_user_id))
  );

  return entries.map((entry) => {
    const events = (eventsByLeadId.get(entry.id) || []).slice(0, 5).map((event) => ({
      ...event,
      actor_profile: event.actor_user_id ? actorProfilesById.get(event.actor_user_id) || null : null,
    }));

    return {
      ...entry,
      user_profile: entry.user_id ? profilesById.get(entry.user_id) || null : null,
      owner_profile: entry.owner_user_id ? profilesById.get(entry.owner_user_id) || null : null,
      recent_events: events,
    };
  });
};

const insertLeadEvent = async (supabaseAdmin, payload) => {
  if (!supabaseAdmin) {
    return;
  }

  const { error } = await supabaseAdmin.from('sales_lead_events').insert(payload);
  if (error) {
    console.error('Could not persist sales lead event:', error);
  }
};

export const createLeadsRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Sales leads API');
  const requireAdmin = createAdminOnlyMiddleware();
  const submitLimiter = createLimiter(LEADS_REQUEST_WINDOW_MS, LEADS_REQUEST_MAX, 'lead capture');
  const readLimiter = createLimiter(LEADS_READ_WINDOW_MS, LEADS_READ_MAX, 'sales pipeline');
  const writeLimiter = createLimiter(LEADS_WRITE_WINDOW_MS, LEADS_WRITE_MAX, 'sales pipeline');

  router.get('/health', (_req, res) => {
    res.json({
      status: supabaseAdmin ? 'ok' : 'degraded',
      notificationsConfigured: Boolean(LEADS_NOTIFY_WEBHOOK_URL),
    });
  });

  router.post('/demo-request', submitLimiter, async (req, res) => {
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
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not store demo request.');
      }

      await insertLeadEvent(supabaseAdmin, {
        lead_id: data.id,
        actor_user_id: optionalUser?.id || null,
        action: 'submitted',
        details: {
          source: parsed.source,
          intent: parsed.intent,
          team_size: parsed.teamSize,
        },
      });

      await notifyLeadChannel(data);

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

  router.get('/admin/capabilities', requireAuth, readLimiter, (req, res) => {
    return res.json({ canReview: isLeadAdmin(req.leadAdminUser) });
  });

  router.get('/admin', requireAuth, requireAdmin, readLimiter, async (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const intent = typeof req.query.intent === 'string' ? req.query.intent.trim() : '';
      const source = typeof req.query.source === 'string' ? req.query.source.trim() : '';
      const priority = typeof req.query.priority === 'string' ? req.query.priority.trim() : '';
      const limit = Math.max(1, Math.min(Number.parseInt(String(req.query.limit || '50'), 10) || 50, 100));

      let query = supabaseAdmin
        .from('sales_leads')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (LeadStatusValues.includes(status)) {
        query = query.eq('status', status);
      }
      if (LeadIntentValues.includes(intent)) {
        query = query.eq('intent', intent);
      }
      if (LeadSourceValues.includes(source)) {
        query = query.eq('source', source);
      }
      if (LeadPriorityValues.includes(priority)) {
        query = query.eq('priority', priority);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const entries = await enrichLeadEntries(supabaseAdmin, data || []);
      return res.json({ entries });
    } catch (error) {
      console.error('Sales lead admin list error:', error);
      return res.status(500).json({ error: error.message || 'Could not load sales leads.' });
    }
  });

  router.patch('/admin/:leadId', requireAuth, requireAdmin, writeLimiter, async (req, res) => {
    try {
      const parsed = UpdateLeadSchema.parse(req.body || {});
      const { leadId } = req.params;

      const { data: existingLead, error: existingLeadError } = await supabaseAdmin
        .from('sales_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (existingLeadError || !existingLead) {
        throw new Error(existingLeadError?.message || 'Sales lead not found.');
      }

      const patch = {};
      const changed = {};

      if (parsed.status && parsed.status !== existingLead.status) {
        patch.status = parsed.status;
        changed.status = parsed.status;
      }

      if (parsed.priority && parsed.priority !== existingLead.priority) {
        patch.priority = parsed.priority;
        changed.priority = parsed.priority;
      }

      if (parsed.nextStep !== undefined) {
        patch.next_step = parsed.nextStep ? parsed.nextStep : null;
        changed.next_step = patch.next_step;
      }

      if (parsed.qualificationNotes !== undefined) {
        patch.qualification_notes = parsed.qualificationNotes ? parsed.qualificationNotes : null;
        changed.qualification_notes = patch.qualification_notes;
      }

      if (parsed.assignToSelf) {
        patch.owner_user_id = req.leadAdminUser.id;
        changed.owner_user_id = req.leadAdminUser.id;
      } else if (parsed.unassignOwner) {
        patch.owner_user_id = null;
        changed.owner_user_id = null;
      }

      if (
        parsed.markContactedNow ||
        (parsed.status && ['contacted', 'qualified', 'won'].includes(parsed.status) && parsed.status !== existingLead.status)
      ) {
        patch.last_contacted_at = new Date().toISOString();
        changed.last_contacted_at = patch.last_contacted_at;
      }

      if (Object.keys(patch).length === 0) {
        return res.json({ entry: (await enrichLeadEntries(supabaseAdmin, [existingLead]))[0] });
      }

      const { data, error } = await supabaseAdmin
        .from('sales_leads')
        .update(patch)
        .eq('id', leadId)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not update sales lead.');
      }

      await insertLeadEvent(supabaseAdmin, {
        lead_id: leadId,
        actor_user_id: req.leadAdminUser.id,
        action: 'updated',
        details: changed,
      });

      const entry = (await enrichLeadEntries(supabaseAdmin, [data]))[0];
      return res.json({ entry });
    } catch (error) {
      console.error('Sales lead update error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Sales lead update is invalid.', issues: error.issues });
      }
      return res.status(400).json({ error: error.message || 'Could not update sales lead.' });
    }
  });

  return router;
};
