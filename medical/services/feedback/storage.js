import crypto from 'crypto';
import path from 'path';
import { FEEDBACK_ATTACHMENT_URL_TTL_SECONDS, FEEDBACK_BUCKET, FEEDBACK_MAX_ATTACHMENT_SIZE } from './config.js';
import { decodeAttachmentBase64, sanitizeFileName, validateAttachmentBuffer } from './sanitize.js';

export const uploadFeedbackAttachments = async ({ supabaseAdmin, feedbackId, userId, attachments }) => {
  if (!attachments?.length) {
    return [];
  }

  const uploaded = [];

  for (const attachment of attachments) {
    const buffer = decodeAttachmentBase64(attachment.contentBase64);
    validateAttachmentBuffer(buffer);

    if (attachment.size > FEEDBACK_MAX_ATTACHMENT_SIZE) {
      throw new Error('Attachment exceeds allowed size.');
    }

    const safeName = sanitizeFileName(attachment.name);
    const extension = path.extname(safeName) || '';
    const fileName = `${crypto.randomUUID()}${extension}`;
    const storagePath = `${userId}/${feedbackId}/${fileName}`;

    const { error } = await supabaseAdmin.storage.from(FEEDBACK_BUCKET).upload(storagePath, buffer, {
      contentType: attachment.contentType,
      upsert: false,
      cacheControl: '3600',
    });

    if (error) {
      throw new Error(`Attachment upload failed: ${error.message}`);
    }

    uploaded.push({
      storage_bucket: FEEDBACK_BUCKET,
      storage_path: storagePath,
      original_name: safeName,
      content_type: attachment.contentType,
      byte_size: buffer.byteLength,
    });
  }

  return uploaded;
};

export const removeFeedbackAttachments = async ({ supabaseAdmin, attachments }) => {
  if (!attachments?.length) {
    return;
  }

  const grouped = attachments.reduce((accumulator, attachment) => {
    const bucket = attachment.storage_bucket || FEEDBACK_BUCKET;
    accumulator[bucket] = accumulator[bucket] || [];
    accumulator[bucket].push(attachment.storage_path);
    return accumulator;
  }, {});

  await Promise.all(
    Object.entries(grouped).map(async ([bucket, paths]) => {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (error) {
        console.error('Failed to remove feedback attachments:', error);
      }
    })
  );
};

export const signFeedbackAttachmentUrls = async ({ supabaseAdmin, attachments }) => {
  if (!attachments?.length) {
    return [];
  }

  return Promise.all(
    attachments.map(async (attachment) => {
      const bucket = attachment.storage_bucket || FEEDBACK_BUCKET;
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(attachment.storage_path, FEEDBACK_ATTACHMENT_URL_TTL_SECONDS);

      return {
        ...attachment,
        signed_url: error ? null : data?.signedUrl || null,
      };
    })
  );
};
