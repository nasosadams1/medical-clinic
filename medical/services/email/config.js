import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
export const SMTP_PORT = parseInteger(process.env.SMTP_PORT, 587);
export const SMTP_SECURE = parseBoolean(process.env.SMTP_SECURE, SMTP_PORT === 465);
export const SMTP_USER = (process.env.SMTP_USER || '').trim();
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_FROM_EMAIL = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();
export const SMTP_FROM_NAME = (process.env.SMTP_FROM_NAME || 'Codhak').trim();
export const SMTP_REPLY_TO = (process.env.SMTP_REPLY_TO || '').trim();

export const SALES_NOTIFICATION_EMAILS = (process.env.SALES_NOTIFICATION_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://codhak.com'
)
  .trim()
  .replace(/\/+$/, '');

export const isSmtpConfigured = () =>
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_FROM_EMAIL && SMTP_USER && SMTP_PASS);
