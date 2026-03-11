import crypto from 'crypto';
import path from 'path';
import {
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MAX_ATTACHMENTS,
} from '../../shared/feedback-contract.js';

const MULTIPLE_NEWLINES = /\n{3,}/g;
const MULTIPLE_SPACES = /[ \t]{2,}/g;

const removeControlCharacters = (value) =>
  Array.from(String(value || ''))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 0x09 || code === 0x0A || code === 0x0D || (code >= 0x20 && code !== 0x7F);
    })
    .join('');

export const normalizeText = (value, maxLength) => {
  const normalized = removeControlCharacters(value)
    .replace(/\r\n?/g, '\n')
    .replace(MULTIPLE_SPACES, ' ')
    .replace(MULTIPLE_NEWLINES, '\n\n')
    .trim();

  return normalized.slice(0, maxLength);
};

export const sanitizeFeedbackPayload = (payload) => ({
  type: payload.type,
  subject: normalizeText(payload.subject, 160),
  message: normalizeText(payload.message, 5000),
  includeMetadata: !!payload.includeMetadata,
  metadata: sanitizeMetadata(payload.metadata),
  attachments: Array.isArray(payload.attachments) ? payload.attachments.slice(0, FEEDBACK_MAX_ATTACHMENTS) : [],
});

export const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  const safe = {};
  const copyString = (key, max = 256) => {
    if (typeof metadata[key] === 'string' && metadata[key].trim()) {
      safe[key] = normalizeText(metadata[key], max);
    }
  };

  copyString('appVersion', 64);
  copyString('environment', 64);
  copyString('page', 256);
  copyString('userAgent', 1024);
  copyString('platform', 128);
  copyString('language', 32);
  copyString('timezone', 64);
  copyString('locale', 64);

  if (metadata.viewport && typeof metadata.viewport === 'object') {
    const width = Number.parseInt(metadata.viewport.width, 10);
    const height = Number.parseInt(metadata.viewport.height, 10);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      safe.viewport = {
        width: Math.max(1, Math.min(width, 10000)),
        height: Math.max(1, Math.min(height, 10000)),
      };
    }
  }

  if (metadata.screen && typeof metadata.screen === 'object') {
    const width = Number.parseInt(metadata.screen.width, 10);
    const height = Number.parseInt(metadata.screen.height, 10);
    const pixelRatio = Number(metadata.screen.pixelRatio);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      safe.screen = {
        width: Math.max(1, Math.min(width, 10000)),
        height: Math.max(1, Math.min(height, 10000)),
        ...(Number.isFinite(pixelRatio) ? { pixelRatio: Math.max(0.5, Math.min(pixelRatio, 10)) } : {}),
      };
    }
  }

  return safe;
};

export const sanitizeFileName = (name) => {
  const baseName = path.basename(String(name || 'attachment'));
  const cleaned = baseName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
  return cleaned || 'attachment';
};

export const decodeAttachmentBase64 = (contentBase64) => {
  const normalized = String(contentBase64 || '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(normalized, 'base64');
};

export const validateAttachmentBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Attachment payload is invalid.');
  }

  if (buffer.byteLength <= 0) {
    throw new Error('Attachment is empty.');
  }

  if (buffer.byteLength > FEEDBACK_MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment exceeds ${Math.floor(FEEDBACK_MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.`);
  }
};

export const buildFeedbackFingerprint = ({ userId, type, subject, message }) =>
  crypto
    .createHash('sha256')
    .update([userId, type, normalizeText(subject, 160).toLowerCase(), normalizeText(message, 5000).toLowerCase()].join('::'))
    .digest('hex');