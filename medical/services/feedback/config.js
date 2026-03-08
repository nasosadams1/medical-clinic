import dotenv from 'dotenv';
dotenv.config();

import {
  FEEDBACK_ALLOWED_ATTACHMENT_TYPES,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
} from '../../shared/feedback-contract.js';

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const FEEDBACK_BUCKET = process.env.FEEDBACK_STORAGE_BUCKET || 'feedback-attachments';
export const FEEDBACK_MAX_ATTACHMENTS_COUNT = parseInteger(process.env.FEEDBACK_MAX_ATTACHMENTS, FEEDBACK_MAX_ATTACHMENTS);
export const FEEDBACK_MAX_ATTACHMENT_SIZE = parseInteger(process.env.FEEDBACK_MAX_ATTACHMENT_BYTES, FEEDBACK_MAX_ATTACHMENT_BYTES);
export const FEEDBACK_DUPLICATE_WINDOW_MINUTES = parseInteger(process.env.FEEDBACK_DUPLICATE_WINDOW_MINUTES, 15);
export const FEEDBACK_REQUEST_WINDOW_MS = parseInteger(process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
export const FEEDBACK_REQUEST_MAX = parseInteger(process.env.FEEDBACK_RATE_LIMIT_MAX, 5);
export const FEEDBACK_READ_WINDOW_MS = parseInteger(process.env.FEEDBACK_READ_RATE_LIMIT_WINDOW_MS, 60 * 1000);
export const FEEDBACK_READ_MAX = parseInteger(process.env.FEEDBACK_READ_RATE_LIMIT_MAX, 30);
export const FEEDBACK_ATTACHMENT_URL_TTL_SECONDS = parseInteger(process.env.FEEDBACK_ATTACHMENT_URL_TTL_SECONDS, 60 * 60);
export const FEEDBACK_NOTIFY_WEBHOOK_URL = (process.env.FEEDBACK_NOTIFY_WEBHOOK_URL || '').trim();
export const FEEDBACK_ADMIN_USER_IDS = (process.env.FEEDBACK_ADMIN_USER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
export const FEEDBACK_ALLOWED_TYPES = new Set(FEEDBACK_ALLOWED_ATTACHMENT_TYPES);


