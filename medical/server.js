import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { createFeedbackRouter } from './services/feedback/routes.js';
import { createLegalRouter } from './services/legal/routes.js';
import { createDuelAdminRouter } from './services/duel-admin/routes.js';
import { createDuelProblemAdminRouter } from './services/duel-problems/routes.js';

dotenv.config();

const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';
const ALLOW_LEGACY_UNAUTHENTICATED_SCORE_SUBMIT = process.env.ALLOW_LEGACY_UNAUTHENTICATED_SCORE_SUBMIT === '1';
const allowedOrigins = (process.env.API_ALLOWED_ORIGINS || process.env.DUEL_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return !IS_PRODUCTION;
  return allowedOrigins.includes(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by API server CORS'));
  },
  credentials: true,
};

if (IS_PRODUCTION && allowedOrigins.length === 0) {
  console.error('API_ALLOWED_ORIGINS must be set explicitly in production');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by API server CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: process.env.API_JSON_LIMIT || '20mb' }));



const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

if (!supabaseAdmin) {
  console.warn('Feedback API disabled: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
};

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const sanitizeText = (value, maxLength, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

const resolveAuthDisplayName = (user) =>
  sanitizeText(
    user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.username ||
      user?.email?.split('@')[0] ||
      'Player',
    80,
    'Player'
  );

const normalizeLeaderboardSubmitPayload = (payload = {}, authUser = null) => {
  const lessons = clampInteger(payload?.lessons ?? payload?.completedLessons, 0, 1_000_000_000, 0);

  return {
    name: sanitizeText(payload?.name, 80, resolveAuthDisplayName(authUser)),
    userId: sanitizeText(payload?.userId, 128, authUser?.id || ''),
    avatar: sanitizeText(payload?.avatar, 64, 'default'),
    badge: sanitizeText(payload?.badge, 48, 'Learner'),
    xp: clampInteger(payload?.xp, 0, 1_000_000_000, 0),
    level: clampInteger(payload?.level, 1, 1_000_000, 1),
    lessons,
    completedLessons: lessons,
    projects: clampInteger(payload?.projects, 0, 1_000_000_000, 0),
    streak: clampInteger(payload?.streak, 0, 1_000_000_000, 0),
    achievements: clampInteger(payload?.achievements, 0, 1_000_000_000, 0),
    xpDelta: clampInteger(payload?.xpDelta, 0, 1_000_000_000, 0),
  };
};

const buildAuthoritativeLeaderboardPayload = async (payload = {}, authUser = null) => {
  const normalized = normalizeLeaderboardSubmitPayload(payload, authUser);
  if (!authUser || !supabaseAdmin) {
    return normalized;
  }

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, current_avatar, xp, level, total_lessons_completed, current_streak, unlocked_achievements')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not load leaderboard profile data.');
  }

  const achievements = Array.isArray(profile?.unlocked_achievements)
    ? profile.unlocked_achievements.length
    : normalized.achievements;

  const lessons = clampInteger(profile?.total_lessons_completed, 0, 1_000_000_000, normalized.lessons);

  return {
    ...normalized,
    userId: authUser.id,
    name: sanitizeText(profile?.name, 80, normalized.name),
    avatar: sanitizeText(profile?.current_avatar, 64, normalized.avatar),
    badge: 'Learner',
    xp: clampInteger(profile?.xp, 0, 1_000_000_000, normalized.xp),
    level: clampInteger(profile?.level, 1, 1_000_000, normalized.level),
    lessons,
    completedLessons: lessons,
    streak: clampInteger(profile?.current_streak, 0, 1_000_000_000, normalized.streak),
    achievements: clampInteger(achievements, 0, 1_000_000_000, normalized.achievements),
    xpDelta: 0,
  };
};

const requireAuthenticatedScoreSubmit = async (req, res, next) => {
  if (ALLOW_LEGACY_UNAUTHENTICATED_SCORE_SUBMIT) {
    return next();
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Score submission requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  const requestedUserId = String(req.body?.userId || '').trim();
  if (!requestedUserId || requestedUserId !== data.user.id) {
    return res.status(403).json({ error: 'You can only submit leaderboard stats for your own account.' });
  }

  req.authUser = data.user;
  return next();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.resolve(__dirname, './leaderboard.db');
const rawDb = new Database(dbFile);
const db = {
  serialize(fn) {
    fn();
  },
  run(sql, params, callback) {
    const values = typeof params === 'function' || params == null ? [] : params;
    const cb = typeof params === 'function' ? params : callback;

    try {
      const result = rawDb.prepare(sql).run(...values);
      if (cb) {
        cb.call(
          {
            lastID: Number(result.lastInsertRowid ?? 0),
            changes: Number(result.changes ?? 0),
          },
          null
        );
      }
      return result;
    } catch (err) {
      if (cb) {
        cb.call({}, err);
        return null;
      }
      throw err;
    }
  },
  get(sql, params, callback) {
    const values = typeof params === 'function' || params == null ? [] : params;
    const cb = typeof params === 'function' ? params : callback;

    try {
      const row = rawDb.prepare(sql).get(...values);
      if (cb) cb(null, row);
      return row;
    } catch (err) {
      if (cb) {
        cb(err, undefined);
        return undefined;
      }
      throw err;
    }
  },
  all(sql, params, callback) {
    const values = typeof params === 'function' || params == null ? [] : params;
    const cb = typeof params === 'function' ? params : callback;

    try {
      const rows = rawDb.prepare(sql).all(...values);
      if (cb) cb(null, rows);
      return rows;
    } catch (err) {
      if (cb) {
        cb(err, []);
        return [];
      }
      throw err;
    }
  },
};

// Initialize database with correct schema
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      avatar TEXT DEFAULT 'ðŸ‘¤',
      badge TEXT DEFAULT 'Beginner',
      external_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stats table with consistent column names
  db.run(`
    CREATE TABLE IF NOT EXISTS stats (
      user_id INTEGER UNIQUE,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      lessons INTEGER DEFAULT 0,
      projects INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      achievements INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Score events for tracking changes over time
  db.run(`
    CREATE TABLE IF NOT EXISTS score_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      xp_delta INTEGER DEFAULT 0,
      lessons_delta INTEGER DEFAULT 0,
      achievements_delta INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: Rename completedLessons to lessons if it exists
  db.all("PRAGMA table_info(stats)", (err, columns) => {
    if (err) {
      console.error('Error checking table info:', err);
      return;
    }
    
    const hasCompletedLessons = columns.some(col => col.name === 'completedLessons');
    const hasLessons = columns.some(col => col.name === 'lessons');
    
    if (hasCompletedLessons && !hasLessons) {
      console.log('Migrating completedLessons to lessons...');
      db.run(`ALTER TABLE stats ADD COLUMN lessons INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding lessons column:', err);
          return;
        }
        db.run(`UPDATE stats SET lessons = completedLessons WHERE completedLessons IS NOT NULL`);
      });
    }
    
    // Add missing columns if they don't exist
    const addColumnIfNotExists = (column, type, defaultValue = null) => {
      const exists = columns.some(col => col.name === column);
      if (!exists) {
        const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : '';
        db.run(`ALTER TABLE stats ADD COLUMN ${column} ${type}${defaultClause}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error(`Error adding ${column} column:`, err);
          }
        });
      }
    };

    addColumnIfNotExists('lessons', 'INTEGER', '0');
    addColumnIfNotExists('achievements', 'INTEGER', '0');
  });

  // Check and add missing columns to score_events
  db.all("PRAGMA table_info(score_events)", (err, columns) => {
    if (err) return;
    
    const addColumnIfNotExists = (column, type, defaultValue = null) => {
      const exists = columns.some(col => col.name === column);
      if (!exists) {
        const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : '';
        db.run(`ALTER TABLE score_events ADD COLUMN ${column} ${type}${defaultClause}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error(`Error adding ${column} column to score_events:`, err);
          }
        });
      }
    };

    addColumnIfNotExists('lessons_delta', 'INTEGER', '0');
    addColumnIfNotExists('achievements_delta', 'INTEGER', '0');
  });
});

// Helper functions
const safeParseInt = (value, defaultValue = 0) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getDateWindow = (frame) => {
  const now = new Date();
  if (frame === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return weekAgo.toISOString();
  }
  if (frame === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return monthAgo.toISOString();
  }
  return null;
};

// Get total player count
const getTotalPlayerCount = (frame = 'all', callback) => {
  let sql = `
    SELECT COUNT(DISTINCT u.id) as total 
    FROM users u 
    LEFT JOIN stats s ON s.user_id = u.id 
    WHERE COALESCE(s.xp, 0) >= 0
  `;
  
  db.get(sql, [], (err, result) => {
    callback(err, result?.total || 0);
  });
};

// FIXED: Get user rank by category - no template literals in SQL
const getUserRank = (userId, category = 'xp', frame = 'all', callback) => {
  if (!userId) return callback(null, 0);

  const dateWindow = getDateWindow(frame);
  let sql, params;

  if (frame === 'all') {
    // All-time ranking based on total stats
    let orderField = 'xp';
    if (category === 'lessons') orderField = 'lessons';
    else if (category === 'achievements') orderField = 'achievements';

    // FIXED: Build SQL without template literals
    sql = `
      SELECT COUNT(*) + 1 as rank
      FROM users u
      LEFT JOIN stats s ON s.user_id = u.id
      WHERE COALESCE(s.` + orderField + `, 0) > (
        SELECT COALESCE(s2.` + orderField + `, 0)
        FROM users u2
        LEFT JOIN stats s2 ON s2.user_id = u2.id
        WHERE u2.external_id = ? OR u2.id = ?
      )
    `;
    params = [userId, userId];
  } else {
    // Time-based ranking - no template literals
    let deltaField = 'xp_delta';
    let totalField = 'xp';
    if (category === 'lessons') {
      deltaField = 'lessons_delta';
      totalField = 'lessons';
    } else if (category === 'achievements') {
      deltaField = 'achievements_delta';
      totalField = 'achievements';
    }

    sql = `
      WITH recent_stats AS (
        SELECT 
          u.id as user_id,
          COALESCE(SUM(se.` + deltaField + `), 0) as recent_delta,
          COALESCE(s.` + totalField + `, 0) as total_value,
          CASE 
            WHEN SUM(se.` + deltaField + `) > 0 THEN SUM(se.` + deltaField + `)
            WHEN s.updated_at >= ? AND s.` + totalField + ` > 0 THEN s.` + totalField + `
            ELSE 0
          END as recent_value
        FROM users u
        LEFT JOIN stats s ON s.user_id = u.id
        LEFT JOIN score_events se ON se.user_id = u.id AND se.created_at >= ?
        GROUP BY u.id, s.` + totalField + `, s.updated_at
      ),
      user_recent AS (
        SELECT COALESCE(rs.recent_value, 0) as user_value
        FROM users u
        LEFT JOIN recent_stats rs ON rs.user_id = u.id
        WHERE u.external_id = ? OR u.id = ?
      )
      SELECT COUNT(*) + 1 as rank
      FROM recent_stats rs
      WHERE rs.recent_value > (SELECT user_value FROM user_recent)
    `;
    params = [dateWindow, dateWindow, userId, userId];
  }

  db.get(sql, params, (err, result) => {
    if (err) {
      console.error('getUserRank error:', err);
      console.error('SQL:', sql);
      console.error('Params:', params);
    }
    callback(err, result?.rank || 0);
  });
};

// FIXED: Get user stats - no template literals in SQL
const getUserStats = (userId, frame = 'all', callback) => {
  if (!userId) return callback(null, null);

  const dateWindow = getDateWindow(frame);
  let sql, params;

  if (frame === 'all') {
    // All-time stats
    sql = `
      SELECT 
        u.id,
        u.name,
        u.avatar,
        u.badge,
        COALESCE(u.external_id, u.id) as external_id,
        COALESCE(s.xp, 0) as xp,
        COALESCE(s.level, 1) as level,
        COALESCE(s.lessons, 0) as lessons,
        COALESCE(s.projects, 0) as projects,
        COALESCE(s.streak, 0) as streak,
        COALESCE(s.achievements, 0) as achievements
      FROM users u
      LEFT JOIN stats s ON s.user_id = u.id
      WHERE u.external_id = ? OR u.id = ?
    `;
    params = [userId, userId];
  } else {
    // Time-based stats - no template literals
    sql = `
      WITH recent_stats AS (
        SELECT 
          u.id,
          u.name,
          u.avatar,
          u.badge,
          COALESCE(u.external_id, u.id) as external_id,
          COALESCE(s.level, 1) as level,
          COALESCE(s.projects, 0) as projects,
          COALESCE(s.streak, 0) as streak,
          CASE 
            WHEN SUM(se.xp_delta) > 0 THEN SUM(se.xp_delta)
            WHEN s.updated_at >= ? AND s.xp > 0 THEN s.xp
            ELSE 0
          END as xp,
          CASE 
            WHEN SUM(se.lessons_delta) > 0 THEN SUM(se.lessons_delta)
            WHEN s.updated_at >= ? AND s.lessons > 0 THEN s.lessons
            ELSE 0
          END as lessons,
          CASE 
            WHEN SUM(se.achievements_delta) > 0 THEN SUM(se.achievements_delta)
            WHEN s.updated_at >= ? AND s.achievements > 0 THEN s.achievements
            ELSE 0
          END as achievements
        FROM users u
        LEFT JOIN stats s ON s.user_id = u.id
        LEFT JOIN score_events se ON se.user_id = u.id AND se.created_at >= ?
        WHERE u.external_id = ? OR u.id = ?
        GROUP BY u.id, u.name, u.avatar, u.badge, u.external_id, s.level, s.projects, s.streak, s.updated_at, s.xp, s.lessons, s.achievements
      )
      SELECT * FROM recent_stats
    `;
    params = [dateWindow, dateWindow, dateWindow, dateWindow, userId, userId];
  }

  db.get(sql, params, (err, result) => {
    if (err) {
      console.error('getUserStats error:', err);
      console.error('SQL:', sql);
      console.error('Params:', params);
      return callback(err, null);
    }
    
    if (!result) return callback(null, null);

    // Ensure all numeric fields are properly converted
    const safeResult = {
      ...result,
      xp: safeParseInt(result.xp, 0),
      level: safeParseInt(result.level, 1),
      lessons: safeParseInt(result.lessons, 0),
      projects: safeParseInt(result.projects, 0),
      streak: safeParseInt(result.streak, 0),
      achievements: safeParseInt(result.achievements, 0)
    };

    callback(null, safeResult);
  });
};

// FIXED: Get paginated leaderboard - no template literals in SQL
const getPaginatedLeaderboard = (frame = 'all', page = 1, limit = 100, sortBy = 'xp', callback) => {
  const offset = (page - 1) * limit;
  const dateWindow = getDateWindow(frame);
  
  let sql, params;

  if (frame === 'all') {
    // All-time leaderboard
    let orderField = 'xp';
    if (sortBy === 'lessons') orderField = 'lessons';
    else if (sortBy === 'achievements') orderField = 'achievements';

    // FIXED: Build SQL without template literals
    sql = `
      WITH ranked_users AS (
        SELECT 
          u.id,
          u.name,
          u.avatar,
          u.badge,
          COALESCE(u.external_id, u.id) as external_id,
          COALESCE(s.xp, 0) as xp,
          COALESCE(s.level, 1) as level,
          COALESCE(s.lessons, 0) as lessons,
          COALESCE(s.projects, 0) as projects,
          COALESCE(s.streak, 0) as streak,
          COALESCE(s.achievements, 0) as achievements,
          ROW_NUMBER() OVER (ORDER BY COALESCE(s.xp, 0) DESC) as globalRank,
          ROW_NUMBER() OVER (ORDER BY COALESCE(s.lessons, 0) DESC) as lessonsRank,
          ROW_NUMBER() OVER (ORDER BY COALESCE(s.achievements, 0) DESC) as achievementsRank
        FROM users u
        LEFT JOIN stats s ON s.user_id = u.id
        ORDER BY COALESCE(s.` + orderField + `, 0) DESC
      )
      SELECT * FROM ranked_users
      LIMIT ? OFFSET ?
    `;
    params = [limit, offset];
  } else {
    // Time-based leaderboard - no template literals
    let orderField = 'recent_xp';
    if (sortBy === 'lessons') orderField = 'recent_lessons';
    else if (sortBy === 'achievements') orderField = 'recent_achievements';

    sql = `
      WITH recent_stats AS (
        SELECT 
          u.id,
          u.name,
          u.avatar,
          u.badge,
          COALESCE(u.external_id, u.id) as external_id,
          COALESCE(s.level, 1) as level,
          COALESCE(s.projects, 0) as projects,
          COALESCE(s.streak, 0) as streak,
          CASE 
            WHEN SUM(se.xp_delta) > 0 THEN SUM(se.xp_delta)
            WHEN s.updated_at >= ? AND s.xp > 0 THEN s.xp
            ELSE 0
          END as recent_xp,
          CASE 
            WHEN SUM(se.lessons_delta) > 0 THEN SUM(se.lessons_delta)
            WHEN s.updated_at >= ? AND s.lessons > 0 THEN s.lessons
            ELSE 0
          END as recent_lessons,
          CASE 
            WHEN SUM(se.achievements_delta) > 0 THEN SUM(se.achievements_delta)
            WHEN s.updated_at >= ? AND s.achievements > 0 THEN s.achievements
            ELSE 0
          END as recent_achievements
        FROM users u
        LEFT JOIN stats s ON s.user_id = u.id
        LEFT JOIN score_events se ON se.user_id = u.id AND se.created_at >= ?
        GROUP BY u.id, u.name, u.avatar, u.badge, u.external_id, s.level, s.projects, s.streak, s.updated_at, s.xp, s.lessons, s.achievements
        HAVING recent_xp > 0 OR recent_lessons > 0 OR recent_achievements > 0
      ),
      ranked_users AS (
        SELECT 
          *,
          recent_xp as xp,
          recent_lessons as lessons,
          recent_achievements as achievements,
          ROW_NUMBER() OVER (ORDER BY recent_xp DESC) as globalRank,
          ROW_NUMBER() OVER (ORDER BY recent_lessons DESC) as lessonsRank,
          ROW_NUMBER() OVER (ORDER BY recent_achievements DESC) as achievementsRank
        FROM recent_stats
        ORDER BY ` + orderField + ` DESC
      )
      SELECT * FROM ranked_users
      LIMIT ? OFFSET ?
    `;
    params = [dateWindow, dateWindow, dateWindow, dateWindow, limit, offset];
  }

  db.all(sql, params, (err, results) => {
    if (err) {
      console.error('getPaginatedLeaderboard error:', err);
      console.error('SQL:', sql);
      console.error('Params:', params);
      return callback(err, []);
    }

    const safeResults = (results || []).map((player, index) => ({
      ...player,
      id: player.external_id || player.id || 'unknown',
      name: player.name || 'Unknown Player',
      xp: safeParseInt(player.xp, 0),
      level: safeParseInt(player.level, 1),
      lessons: safeParseInt(player.lessons, 0),
      projects: safeParseInt(player.projects, 0),
      streak: safeParseInt(player.streak, 0),
      achievements: safeParseInt(player.achievements, 0),
      globalRank: safeParseInt(player.globalRank, (page - 1) * limit + index + 1),
      lessonsRank: safeParseInt(player.lessonsRank, (page - 1) * limit + index + 1),
      achievementsRank: safeParseInt(player.achievementsRank, (page - 1) * limit + index + 1)
    }));

    callback(null, safeResults);
  });
};

// Update user stats
const updateUserStats = (userId, stats, callback) => {
  const {
    xp = 0,
    level = 1,
    lessons = 0,
    projects = 0,
    streak = 0,
    achievements = 0,
    xpDelta = 0,
    lessonsDelta = 0,
    achievementsDelta = 0
  } = stats || {};

  db.serialize(() => {
    // Update or insert stats
    db.run(`
      INSERT INTO stats (user_id, xp, level, lessons, projects, streak, achievements, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        xp = excluded.xp,
        level = excluded.level,
        lessons = excluded.lessons,
        projects = excluded.projects,
        streak = excluded.streak,
        achievements = excluded.achievements,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, xp, level, lessons, projects, streak, achievements], (err) => {
      if (err) return callback(err);

      // ALWAYS create score event for time-based tracking
      db.run(`
        INSERT INTO score_events (user_id, xp_delta, lessons_delta, achievements_delta, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, xpDelta, lessonsDelta, achievementsDelta], (eventErr) => {
        if (eventErr) console.error('Error creating score event:', eventErr);
        callback(null, userId);
      });
    });
  });
};

// Upsert user and stats
const upsertUserAndStats = (payload, callback) => {
  const normalized = normalizeLeaderboardSubmitPayload(payload);
  const {
    name,
    userId: externalId,
    avatar = 'default',
    badge = 'Learner',
    xp = 0,
    level = 1,
    lessons = 0,
    completedLessons = 0,
    projects = 0,
    streak = 0,
    achievements = 0,
    xpDelta = 0
  } = normalized;

  if (!name) return callback(new Error('Name is required'));
  if (!externalId) return callback(new Error('userId is required'));

  const finalLessons = Math.max(lessons || 0, completedLessons || 0, 0);
  const duplicateNamePattern = /users\.name|UNIQUE constraint failed: users\.name/i;
  const fallbackSuffix = String(externalId).slice(0, 8) || 'player';
  const fallbackBase = name.slice(0, Math.max(1, 80 - fallbackSuffix.length - 1));
  const fallbackName = `${fallbackBase}-${fallbackSuffix}`;

  db.serialize(() => {
    db.get(`
      SELECT id FROM users
      WHERE external_id = ? OR (external_id IS NULL AND name = ?)
    `, [externalId, name], (err, existingUser) => {
      if (err) return callback(err);

      const handleUserUpdate = (userId) => {
        db.get(`
          SELECT * FROM stats WHERE user_id = ?
        `, [userId], (statsErr, prevStats) => {
          if (statsErr) return callback(statsErr);

          const lessonsDelta = finalLessons - (prevStats?.lessons || 0);
          const achievementsDelta = achievements - (prevStats?.achievements || 0);
          const calculatedXpDelta = xpDelta || (xp - (prevStats?.xp || 0));

          updateUserStats(userId, {
            xp,
            level,
            lessons: finalLessons,
            projects,
            streak,
            achievements,
            xpDelta: Math.max(0, calculatedXpDelta),
            lessonsDelta: Math.max(0, lessonsDelta),
            achievementsDelta: Math.max(0, achievementsDelta)
          }, callback);
        });
      };

      const updateUserRecord = (candidateName, allowFallback) => {
        db.run(`
          UPDATE users
          SET name = ?, avatar = ?, badge = ?, external_id = ?
          WHERE id = ?
        `, [candidateName, avatar, badge, externalId, existingUser.id], (updateErr) => {
          if (updateErr && allowFallback && duplicateNamePattern.test(updateErr.message || '')) {
            return updateUserRecord(fallbackName, false);
          }
          if (updateErr) return callback(updateErr);
          handleUserUpdate(existingUser.id);
        });
      };

      const insertUserRecord = (candidateName, allowFallback) => {
        db.run(`
          INSERT INTO users (name, avatar, badge, external_id)
          VALUES (?, ?, ?, ?)
        `, [candidateName, avatar, badge, externalId], function(insertErr) {
          if (insertErr && allowFallback && duplicateNamePattern.test(insertErr.message || '')) {
            return insertUserRecord(fallbackName, false);
          }
          if (insertErr) return callback(insertErr);
          handleUserUpdate(this.lastID);
        });
      };

      if (existingUser) {
        updateUserRecord(name, true);
      } else {
        insertUserRecord(name, true);
      }
    });
  });
};

// Add a debug endpoint to check your data
app.get('/debug/:userId', (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }

  const userId = req.params.userId;
  
  Promise.all([
    new Promise(resolve => {
      db.get('SELECT * FROM users WHERE external_id = ? OR id = ?', [userId, userId], (err, user) => {
        resolve({ user, error: err });
      });
    }),
    new Promise(resolve => {
      db.get('SELECT * FROM stats WHERE user_id = (SELECT id FROM users WHERE external_id = ? OR id = ?)', [userId, userId], (err, stats) => {
        resolve({ stats, error: err });
      });
    }),
    new Promise(resolve => {
      db.all('SELECT * FROM score_events WHERE user_id = (SELECT id FROM users WHERE external_id = ? OR id = ?) ORDER BY created_at DESC LIMIT 10', [userId, userId], (err, events) => {
        resolve({ events, error: err });
      });
    })
  ]).then(([userResult, statsResult, eventsResult]) => {
    res.json({
      user: userResult.user,
      stats: statsResult.stats,
      recentEvents: eventsResult.events,
      errors: {
        user: userResult.error,
        stats: statsResult.error,
        events: eventsResult.error
      }
    });
  });
});

// Emit leaderboards to all connected clients
const emitLeaderboards = () => {
  const frames = ['all', 'month', 'week'];
  const frameLabels = ['All Time', 'This Month', 'This Week'];

  frames.forEach((frame, index) => {
    getPaginatedLeaderboard(frame, 1, 100, 'xp', (err, data) => {
      if (!err && data) {
        io.emit('leaderboard:update', {
          frame: frameLabels[index],
          data: data
        });
      } else if (err) {
        console.error(`Error emitting \${frameLabels[index]} leaderboard:`, err);
      }
    });
  });
};

app.use('/api/feedback', createFeedbackRouter({ supabaseAdmin }));
app.use('/api/legal', createLegalRouter({ supabaseAdmin }));
app.use('/api/duel/admin', createDuelAdminRouter({ supabaseAdmin }));
app.use('/api/duel/problems', createDuelProblemAdminRouter({ supabaseAdmin }));

// REST API Endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Leaderboard API is running',
    endpoints: {
      '/leaderboard': 'GET - Get basic leaderboard',
      '/leaderboard/paginated': 'POST - Get paginated leaderboard with rankings',
      '/submit': 'POST - Submit user stats',
      '/debug/:userId': 'GET - Debug user data'
    }
  });
});

app.get('/leaderboard', (req, res) => {
  const frame = (req.query.frame || 'all').toString().toLowerCase();
  getPaginatedLeaderboard(frame, 1, 100, 'xp', (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data || []);
  });
});

app.post('/leaderboard/paginated', (req, res) => {
  const {
    frame = 'all',
    page = 1,
    limit = 100,
    userId,
    sortBy = 'xp'
  } = req.body || {};

  console.log('ðŸ“Š Leaderboard request:', { frame, page, limit, userId, sortBy });

  getPaginatedLeaderboard(frame, page, limit, sortBy, (err, players) => {
    if (err) {
      console.error('âŒ Leaderboard error:', err);
      return res.status(500).json({ error: err.message });
    }

    getTotalPlayerCount(frame, (countErr, totalPlayers) => {
      if (countErr) {
        console.error('âŒ Player count error:', countErr);
        return res.status(500).json({ error: countErr.message });
      }

      if (userId && userId !== 'guest') {
        Promise.all([
          new Promise(resolve => getUserRank(userId, 'xp', frame, (err, rank) => resolve(err ? 0 : rank))),
          new Promise(resolve => getUserRank(userId, 'lessons', frame, (err, rank) => resolve(err ? 0 : rank))),
          new Promise(resolve => getUserRank(userId, 'achievements', frame, (err, rank) => resolve(err ? 0 : rank))),
          new Promise(resolve => getUserStats(userId, frame, (err, stats) => resolve(err ? null : stats)))
        ]).then(([yourRank, yourLessonsRank, yourAchievementsRank, yourStats]) => {
          
          console.log('âœ… Leaderboard response:', {
            frame,
            playersCount: players?.length || 0,
            totalPlayers,
            yourRank,
            yourLessonsRank,
            yourAchievementsRank,
            hasYourStats: !!yourStats,
            yourStatsPreview: yourStats ? { xp: yourStats.xp, lessons: yourStats.lessons, achievements: yourStats.achievements } : null
          });

          res.json({
            players: players || [],
            totalPlayers: totalPlayers || 0,
            yourRank: yourRank || 0,
            yourLessonsRank: yourLessonsRank || 0,
            yourAchievementsRank: yourAchievementsRank || 0,
            yourStats: yourStats ? {
              ...yourStats,
              id: yourStats.external_id || yourStats.id,
              globalRank: yourRank || 0,
              lessonsRank: yourLessonsRank || 0,
              achievementsRank: yourAchievementsRank || 0
            } : null
          });
        });
      } else {
        console.log('âœ… Leaderboard response (no user):', {
          playersCount: players?.length || 0,
          totalPlayers
        });

        res.json({
          players: players || [],
          totalPlayers: totalPlayers || 0,
          yourRank: 0,
          yourLessonsRank: 0,
          yourAchievementsRank: 0,
          yourStats: null
        });
      }
    });
  });
});

app.post('/submit', requireAuthenticatedScoreSubmit, async (req, res) => {
  try {
    const payload = ALLOW_LEGACY_UNAUTHENTICATED_SCORE_SUBMIT
      ? normalizeLeaderboardSubmitPayload(req.body)
      : await buildAuthoritativeLeaderboardPayload(req.body, req.authUser);

    console.log('Leaderboard submit request:', {
      userId: payload.userId,
      xp: payload.xp,
      lessons: payload.completedLessons,
      achievements: payload.achievements,
    });

    upsertUserAndStats(payload, (err, userId) => {
      if (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('Submit success:', userId);

      setTimeout(emitLeaderboards, 100);

      res.json({ success: true, userId: userId || null });
    });
  } catch (error) {
    console.error('Authoritative submit error:', error);
    return res.status(400).json({ error: error.message || 'Could not process leaderboard submit.' });
  }
});

// Socket.IO handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  emitLeaderboards();

  socket.on('leaderboard:get', (frameLabel) => {
    const frameMap = {
      'all time': 'all',
      'this month': 'month',
      'this week': 'week'
    };
    
    const frame = frameMap[frameLabel?.toLowerCase()] || 'all';
    
    getPaginatedLeaderboard(frame, 1, 100, 'xp', (err, data) => {
      if (!err && data) {
        socket.emit('leaderboard:update', {
          frame: frameLabel,
          data: data
        });
      } else if (err) {
        console.error('Error getting leaderboard for socket:', err);
        socket.emit('leaderboard:error', { error: err.message });
      }
    });
  });

  socket.on('score:submit', (payload) => {
    if (!ALLOW_LEGACY_UNAUTHENTICATED_SCORE_SUBMIT) {
      socket.emit('score:error', {
        error: 'Direct socket score submission is disabled. Use the authenticated /submit API instead.',
      });
      return;
    }

    const normalizedPayload = normalizeLeaderboardSubmitPayload(payload);

    upsertUserAndStats(normalizedPayload, (err) => {
      if (!err) {
        emitLeaderboards();
        socket.emit('score:success', { message: 'Score submitted successfully' });
      } else {
        console.error('Error submitting score via socket:', err);
        socket.emit('score:error', { error: err.message });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`ðŸš€ Leaderboard API + WebSocket server running on http://localhost:${PORT}`);
  console.log('ðŸ“Š Database initialized with proper schema');
  console.log('ðŸ”„ Real-time updates enabled via Socket.IO');
  console.log(`ðŸ” Debug endpoint available at http://localhost:${PORT}/debug/:userId`);
});
