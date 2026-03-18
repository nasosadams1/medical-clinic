import dotenv from 'dotenv';
dotenv.config();

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const LEADS_ADMIN_USER_IDS = (process.env.LEADS_ADMIN_USER_IDS || process.env.FEEDBACK_ADMIN_USER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export const LEADS_REQUEST_WINDOW_MS = parseInteger(process.env.LEADS_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000);
export const LEADS_REQUEST_MAX = parseInteger(process.env.LEADS_RATE_LIMIT_MAX, 20);
export const LEADS_READ_WINDOW_MS = parseInteger(process.env.LEADS_READ_RATE_LIMIT_WINDOW_MS, 60 * 1000);
export const LEADS_READ_MAX = parseInteger(process.env.LEADS_READ_RATE_LIMIT_MAX, 40);
export const LEADS_WRITE_WINDOW_MS = parseInteger(process.env.LEADS_WRITE_RATE_LIMIT_WINDOW_MS, 60 * 1000);
export const LEADS_WRITE_MAX = parseInteger(process.env.LEADS_WRITE_RATE_LIMIT_MAX, 60);
export const LEADS_NOTIFY_WEBHOOK_URL = (process.env.LEADS_NOTIFY_WEBHOOK_URL || '').trim();
