import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { FeedbackStatusUpdateSchema, FeedbackSubmissionSchema } from '../../shared/feedback-contract.js';
import {
  FEEDBACK_ADMIN_USER_IDS,
  FEEDBACK_ALLOWED_TYPES,
  FEEDBACK_READ_MAX,
  FEEDBACK_READ_WINDOW_MS,
  FEEDBACK_REQUEST_MAX,
  FEEDBACK_REQUEST_WINDOW_MS,
} from './config.js';
import { notifyFeedbackChannel } from './notifications.js';
import {
  createFeedbackEntry,
  findRecentDuplicateFeedback,
  getAdminFeedbackEntries,
  getUserFeedbackEntries,
  insertFeedbackAttachments,
  insertFeedbackAuditLog,
  updateFeedbackEntryCounts,
  updateFeedbackStatus,
} from './repository.js';
import {
  buildFeedbackFingerprint,
  sanitizeFeedbackPayload,
} from './sanitize.js';
import {
  removeFeedbackAttachments,
  signFeedbackAttachmentUrls,
  uploadFeedbackAttachments,
} from './storage.js';

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const createAuthenticatedUserMiddleware = (supabaseAdmin) => async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Feedback API is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.feedbackUser = data.user;
  return next();
};

const isFeedbackAdmin = (user) => {
  if (!user) return false;
  if (FEEDBACK_ADMIN_USER_IDS.includes(user.id)) return true;
  if (user.app_metadata?.role === 'admin') return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.user_metadata?.is_admin === true) return true;
  return false;
};

const createAdminOnlyMiddleware = () => (req, res, next) => {
  if (!isFeedbackAdmin(req.feedbackUser)) {
    return res.status(403).json({ error: 'Admin access is required for this feedback endpoint.' });
  }

  return next();
};

const createLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.feedbackUser?.id || ipKeyGenerator(req.ip || ''),
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many feedback requests. Please slow down and try again shortly.' });
    },
  });

const attachSignedUrls = async (supabaseAdmin, entries) =>
  Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      attachments: await signFeedbackAttachmentUrls({
        supabaseAdmin,
        attachments: entry.feedback_attachments || [],
      }),
    }))
  );

const attachUserNames = async (supabaseAdmin, entries) => {
  const userIds = [...new Set(entries.map((entry) => entry.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    return entries;
  }

  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, email')
    .in('id', userIds);

  if (error) {
    console.error('Could not load feedback user profiles:', error);
    return entries;
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return entries.map((entry) => ({
    ...entry,
    user_profile: profileMap.get(entry.user_id) || null,
  }));
};

export const createFeedbackRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin);
  const requireAdmin = createAdminOnlyMiddleware();
  const submitLimiter = createLimiter(FEEDBACK_REQUEST_WINDOW_MS, FEEDBACK_REQUEST_MAX);
  const readLimiter = createLimiter(FEEDBACK_READ_WINDOW_MS, FEEDBACK_READ_MAX);

  router.get('/health', (_req, res) => {
    res.json({ status: supabaseAdmin ? 'ok' : 'degraded' });
  });

  router.get('/', requireAuth, readLimiter, async (req, res) => {
    try {
      const entries = await getUserFeedbackEntries({
        supabaseAdmin,
        userId: req.feedbackUser.id,
      });

      const withUrls = await attachSignedUrls(supabaseAdmin, entries);
      return res.json({ entries: withUrls });
    } catch (error) {
      console.error('Feedback list error:', error);
      return res.status(500).json({ error: error.message || 'Could not load feedback history.' });
    }
  });

  router.post('/', requireAuth, submitLimiter, async (req, res) => {
    let createdEntry = null;
    let uploadedAttachments = [];

    try {
      const parsedPayload = FeedbackSubmissionSchema.parse(req.body);
      const payload = sanitizeFeedbackPayload(parsedPayload);

      if (payload.attachments.some((attachment) => !FEEDBACK_ALLOWED_TYPES.has(attachment.contentType))) {
        return res.status(400).json({ error: 'One or more attachments use an unsupported file type.' });
      }

      const dedupeHash = buildFeedbackFingerprint({
        userId: req.feedbackUser.id,
        type: payload.type,
        subject: payload.subject,
        message: payload.message,
      });

      const duplicate = await findRecentDuplicateFeedback({
        supabaseAdmin,
        userId: req.feedbackUser.id,
        dedupeHash,
      });

      if (duplicate) {
        return res.status(409).json({
          error: 'This feedback was already submitted recently. Please wait before sending it again.',
          duplicate: true,
          existingFeedbackId: duplicate.id,
        });
      }

      createdEntry = await createFeedbackEntry({
        supabaseAdmin,
        entry: {
          user_id: req.feedbackUser.id,
          type: payload.type,
          status: 'new',
          subject: payload.subject,
          message: payload.message,
          metadata: payload.includeMetadata ? payload.metadata || {} : {},
          dedupe_hash: dedupeHash,
          attachments_count: 0,
        },
      });

      uploadedAttachments = await uploadFeedbackAttachments({
        supabaseAdmin,
        feedbackId: createdEntry.id,
        userId: req.feedbackUser.id,
        attachments: payload.attachments,
      });

      if (uploadedAttachments.length > 0) {
        await insertFeedbackAttachments({
          supabaseAdmin,
          attachments: uploadedAttachments.map((attachment) => ({
            feedback_id: createdEntry.id,
            user_id: req.feedbackUser.id,
            ...attachment,
          })),
        });
      }

      await updateFeedbackEntryCounts({
        supabaseAdmin,
        feedbackId: createdEntry.id,
        attachmentsCount: uploadedAttachments.length,
      });

      await insertFeedbackAuditLog({
        supabaseAdmin,
        feedbackId: createdEntry.id,
        actorUserId: req.feedbackUser.id,
        action: 'submitted',
        details: {
          type: payload.type,
          attachmentsCount: uploadedAttachments.length,
          includeMetadata: payload.includeMetadata,
        },
      });

      await notifyFeedbackChannel({
        ...createdEntry,
        attachments_count: uploadedAttachments.length,
      });

      return res.status(201).json({
        success: true,
        feedbackId: createdEntry.id,
        message: 'Feedback submitted successfully.',
      });
    } catch (error) {
      console.error('Feedback submission error:', error);

      if (createdEntry?.id) {
        try {
          if (uploadedAttachments.length > 0) {
            await removeFeedbackAttachments({
              supabaseAdmin,
              attachments: uploadedAttachments,
            });
          }

          await supabaseAdmin.from('feedback_entries').delete().eq('id', createdEntry.id);
        } catch (cleanupError) {
          console.error('Feedback submission cleanup failed:', cleanupError);
        }
      }

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Feedback submission is invalid.',
          issues: error.issues,
        });
      }

      return res.status(500).json({ error: error.message || 'Could not submit feedback.' });
    }
  });

  router.get('/admin/capabilities', requireAuth, readLimiter, async (req, res) => {
    return res.json({ canReview: isFeedbackAdmin(req.feedbackUser) });
  });
  router.get('/admin', requireAuth, requireAdmin, readLimiter, async (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const limit = Number.parseInt(String(req.query.limit || '50'), 10) || 50;

      const entries = await getAdminFeedbackEntries({
        supabaseAdmin,
        status,
        type,
        limit: Math.max(1, Math.min(limit, 100)),
      });

      const withUsers = await attachUserNames(supabaseAdmin, entries);
      const withUrls = await attachSignedUrls(supabaseAdmin, withUsers);
      return res.json({ entries: withUrls });
    } catch (error) {
      console.error('Feedback admin list error:', error);
      return res.status(500).json({ error: error.message || 'Could not load feedback admin queue.' });
    }
  });

  router.patch('/admin/:feedbackId/status', requireAuth, requireAdmin, submitLimiter, async (req, res) => {
    try {
      const parsedPayload = FeedbackStatusUpdateSchema.parse(req.body);
      const resolvedAt = parsedPayload.status === 'resolved' ? new Date().toISOString() : null;
      const updatedEntry = await updateFeedbackStatus({
        supabaseAdmin,
        feedbackId: req.params.feedbackId,
        status: parsedPayload.status,
        resolvedAt,
      });

      await insertFeedbackAuditLog({
        supabaseAdmin,
        feedbackId: req.params.feedbackId,
        actorUserId: req.feedbackUser.id,
        action: 'status_changed',
        details: {
          status: parsedPayload.status,
          note: parsedPayload.note || null,
        },
      });

      return res.json({ entry: updatedEntry });
    } catch (error) {
      console.error('Feedback status update error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Feedback status update is invalid.', issues: error.issues });
      }
      return res.status(500).json({ error: error.message || 'Could not update feedback status.' });
    }
  });

  return router;
};


