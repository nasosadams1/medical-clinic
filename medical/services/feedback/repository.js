import { FEEDBACK_DUPLICATE_WINDOW_MINUTES } from './config.js';

const duplicateCutoffIso = () => new Date(Date.now() - FEEDBACK_DUPLICATE_WINDOW_MINUTES * 60 * 1000).toISOString();

export const findRecentDuplicateFeedback = async ({ supabaseAdmin, userId, dedupeHash }) => {
  const { data, error } = await supabaseAdmin
    .from('feedback_entries')
    .select('id, created_at, status')
    .eq('user_id', userId)
    .eq('dedupe_hash', dedupeHash)
    .gte('created_at', duplicateCutoffIso())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not check duplicate feedback: ${error.message}`);
  }

  return data;
};

export const createFeedbackEntry = async ({ supabaseAdmin, entry }) => {
  const { data, error } = await supabaseAdmin
    .from('feedback_entries')
    .insert(entry)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Could not save feedback: ${error.message}`);
  }

  return data;
};

export const insertFeedbackAttachments = async ({ supabaseAdmin, attachments }) => {
  if (!attachments?.length) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('feedback_attachments')
    .insert(attachments)
    .select('*');

  if (error) {
    throw new Error(`Could not save feedback attachments: ${error.message}`);
  }

  return data || [];
};

export const updateFeedbackEntryCounts = async ({ supabaseAdmin, feedbackId, attachmentsCount }) => {
  const { error } = await supabaseAdmin
    .from('feedback_entries')
    .update({ attachments_count: attachmentsCount, updated_at: new Date().toISOString() })
    .eq('id', feedbackId);

  if (error) {
    throw new Error(`Could not finalize feedback entry: ${error.message}`);
  }
};

export const insertFeedbackAuditLog = async ({ supabaseAdmin, feedbackId, actorUserId, action, details = {} }) => {
  const { error } = await supabaseAdmin.from('feedback_audit_logs').insert({
    feedback_id: feedbackId,
    actor_user_id: actorUserId || null,
    action,
    details,
  });

  if (error) {
    throw new Error(`Could not write feedback audit log: ${error.message}`);
  }
};

export const getUserFeedbackEntries = async ({ supabaseAdmin, userId, limit = 20 }) => {
  const { data, error } = await supabaseAdmin
    .from('feedback_entries')
    .select('id, user_id, type, status, subject, message, metadata, attachments_count, created_at, updated_at, resolved_at, feedback_attachments(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Could not load feedback history: ${error.message}`);
  }

  return data || [];
};

export const getAdminFeedbackEntries = async ({ supabaseAdmin, status, type, limit = 50 }) => {
  let query = supabaseAdmin
    .from('feedback_entries')
    .select('id, user_id, type, status, subject, message, metadata, attachments_count, created_at, updated_at, resolved_at, feedback_attachments(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load feedback queue: ${error.message}`);
  }

  return data || [];
};

export const updateFeedbackStatus = async ({ supabaseAdmin, feedbackId, status, resolvedAt }) => {
  const payload = {
    status,
    updated_at: new Date().toISOString(),
    resolved_at: resolvedAt,
  };

  const { data, error } = await supabaseAdmin
    .from('feedback_entries')
    .update(payload)
    .eq('id', feedbackId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update feedback status: ${error.message}`);
  }

  return data;
};
