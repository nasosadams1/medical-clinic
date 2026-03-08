import dotenv from 'dotenv';

dotenv.config();

const parseUserIds = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const DUEL_ADMIN_USER_IDS = parseUserIds(
  process.env.DUEL_ADMIN_USER_IDS || process.env.FEEDBACK_ADMIN_USER_IDS || ''
);

export const DUEL_ADMIN_READ_WINDOW_MS = Number(process.env.DUEL_ADMIN_READ_WINDOW_MS || 60_000);
export const DUEL_ADMIN_READ_MAX = Number(process.env.DUEL_ADMIN_READ_MAX || 60);
export const DUEL_ADMIN_WRITE_WINDOW_MS = Number(process.env.DUEL_ADMIN_WRITE_WINDOW_MS || 60_000);
export const DUEL_ADMIN_WRITE_MAX = Number(process.env.DUEL_ADMIN_WRITE_MAX || 20);
export const DUEL_ADMIN_DEFAULT_LIMIT = Number(process.env.DUEL_ADMIN_DEFAULT_LIMIT || 25);
