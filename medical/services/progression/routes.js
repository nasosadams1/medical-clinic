import express from 'express';
import { z } from 'zod';
import { calculateLessonXp } from './lesson-catalog.js';
import { checkAchievements } from './achievement-runtime.js';
import { PYTHON_LESSON_EVALUATION_BANK } from './python-lesson-evaluation-bank.generated.js';
import { CPP_LESSON_EVALUATION_BANK } from './cpp-lesson-evaluation-bank.generated.js';
import { JAVA_LESSON_EVALUATION_BANK } from './java-lesson-evaluation-bank.generated.js';
import { JAVASCRIPT_LESSON_EVALUATION_BANK } from './javascript-lesson-evaluation-bank.generated.js';
import { LessonProgramJudgeService } from './lesson-program-judge.js';
import { getAvatarById } from '../../shared/avatar-catalog.js';
import { getBlockingSanction, formatSanctionMessage } from '../sanctions.js';

const CompleteLessonSchema = z.object({
  lessonId: z.string().trim().min(1).max(160),
  actualTimeMinutes: z.number().finite().min(0.05).max(240).optional(),
});

const BuyHeartsSchema = z.object({
  amount: z.number().int().min(1).max(5),
});

const ConsumeHeartSchema = z.object({
  amount: z.number().int().min(1).max(3).optional(),
});

const AvatarIdSchema = z.object({
  avatarId: z.string().trim().min(1).max(64),
});

const EvaluateLessonSchema = z.object({
  lessonId: z.string().trim().min(1).max(160),
  submittedCode: z.string().max(20_000),
});

const lessonProgramJudgeService = new LessonProgramJudgeService();
const LESSON_EVALUATION_BANK = {
  ...PYTHON_LESSON_EVALUATION_BANK,
  ...JAVASCRIPT_LESSON_EVALUATION_BANK,
  ...CPP_LESSON_EVALUATION_BANK,
  ...JAVA_LESSON_EVALUATION_BANK,
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
};

const createAuthenticatedUserMiddleware = (supabaseAdmin) => async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Progression API is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  const sanction = await getBlockingSanction(supabaseAdmin, data.user.id, ['progression']);
  if (sanction) {
    return res.status(403).json({ error: formatSanctionMessage(sanction, 'Progression access is temporarily restricted.') });
  }

  req.progressionUser = data.user;
  return next();
};

const getUtcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);
const calculateLevelFromXP = (xp) => {
  if (xp < 0) return 1;
  return Math.floor((1 + Math.sqrt(1 + 4 * (xp / 25))) / 2);
};
const safeArray = (value) => (Array.isArray(value) ? value : []);

const loadProfile = async (supabaseAdmin, userId) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'USER_PROFILE_NOT_FOUND');
  }

  return data;
};

const persistProfile = async (supabaseAdmin, userId, updates) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not persist profile changes.');
  }

  return data;
};

const normalizeDerivedState = async (supabaseAdmin, profile) => {
  const updates = {};
  const nowMs = Date.now();
  const today = getUtcDateKey();

  if ((profile.last_heart_reset || '') !== today) {
    updates.hearts = profile.max_hearts || 5;
    updates.last_heart_reset = today;
  }

  if ((profile.xp_boost_expires_at || 0) <= nowMs && (profile.xp_boost_multiplier || 1) > 1) {
    updates.xp_boost_multiplier = 1;
    updates.xp_boost_expires_at = 0;
  }

  if ((profile.unlimited_hearts_expires_at || 0) <= nowMs && (profile.unlimited_hearts_expires_at || 0) > 0) {
    updates.unlimited_hearts_expires_at = 0;
  }

  const unlimitedHeartsActive = (updates.unlimited_hearts_expires_at ?? profile.unlimited_hearts_expires_at ?? 0) > nowMs;
  if (unlimitedHeartsActive && (profile.hearts || 0) < (profile.max_hearts || 5)) {
    updates.hearts = profile.max_hearts || 5;
  }

  if (Object.keys(updates).length === 0) {
    return profile;
  }

  return persistProfile(supabaseAdmin, profile.id, updates);
};

const evaluateAchievementRewards = (profile) => {
  const unlockedSet = new Set(safeArray(profile.unlocked_achievements));
  const lifetimeCompletedLessons = safeArray(profile.lifetime_completed_lessons).length
    ? safeArray(profile.lifetime_completed_lessons)
    : safeArray(profile.completed_lessons);

  const newlyUnlocked = checkAchievements({
    unlockedAchievements: [...unlockedSet],
    level: profile.level || 1,
    xp: profile.xp || 0,
    currentStreak: profile.current_streak || 0,
    totalLessonsCompleted: profile.total_lessons_completed || 0,
    completedLessons: safeArray(profile.completed_lessons),
    totalCoinsEarned: profile.total_coins_earned || 0,
    ownedAvatars: safeArray(profile.owned_avatars),
    projects: profile.projects || 0,
  }, lifetimeCompletedLessons).filter((achievement) => !unlockedSet.has(achievement.id));

  if (!newlyUnlocked.length) {
    return {
      unlockedAchievements: [...unlockedSet],
      newlyUnlocked,
      awardedXp: 0,
      finalXp: profile.xp || 0,
      finalLevel: profile.level || 1,
    };
  }

  const awardedXp = newlyUnlocked.reduce((total, achievement) => total + Number(achievement.reward?.xp || 0), 0);
  const unlockedAchievements = [...new Set([...unlockedSet, ...newlyUnlocked.map((achievement) => achievement.id)])];
  const finalXp = Math.max(0, Number(profile.xp || 0) + awardedXp);
  return {
    unlockedAchievements,
    newlyUnlocked,
    awardedXp,
    finalXp,
    finalLevel: calculateLevelFromXP(finalXp),
  };
};

const buildProfilePayload = (profile, extras = {}) => ({
  profile,
  ...extras,
});

export const createProgressionRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin);

  router.post('/state/refresh', requireAuth, async (req, res) => {
    try {
      const profile = await loadProfile(supabaseAdmin, req.progressionUser.id);
      const normalized = await normalizeDerivedState(supabaseAdmin, profile);
      return res.json(buildProfilePayload(normalized));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not refresh progression state.' });
    }
  });

  router.post('/lessons/evaluate', requireAuth, async (req, res) => {
    try {
      const parsed = EvaluateLessonSchema.parse(req.body || {});
      const definition = LESSON_EVALUATION_BANK?.[parsed.lessonId];

      if (!definition) {
        return res.status(404).json({ error: 'This lesson does not support server-side practice evaluation.' });
      }

      const submittedCode = parsed.submittedCode.trim();
      if (!submittedCode) {
        return res.status(400).json({ error: 'Write code before checking your answer.' });
      }

      const evaluation = await lessonProgramJudgeService.executeLesson(submittedCode, definition);
      return res.json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues?.[0]?.message || 'Invalid lesson evaluation payload.' });
      }

      const errorMessage = String(error?.message || '');
      const statusCode =
        /Isolated lesson execution|lesson execution is not available/i.test(errorMessage)
          ? 503
          : 400;

      return res.status(statusCode).json({ error: errorMessage || 'Could not evaluate lesson practice.' });
    }
  });

  router.post('/achievements/recompute', requireAuth, async (req, res) => {
    try {
      const profile = await normalizeDerivedState(supabaseAdmin, await loadProfile(supabaseAdmin, req.progressionUser.id));
      const achievementResult = evaluateAchievementRewards(profile);
      if (!achievementResult.newlyUnlocked.length) {
        return res.json(buildProfilePayload(profile, { newlyUnlockedAchievements: [], awardedAchievementXp: 0 }));
      }

      const updated = await persistProfile(supabaseAdmin, req.progressionUser.id, {
        xp: achievementResult.finalXp,
        level: achievementResult.finalLevel,
        unlocked_achievements: achievementResult.unlockedAchievements,
      });

      return res.json(buildProfilePayload(updated, {
        newlyUnlockedAchievements: achievementResult.newlyUnlocked,
        awardedAchievementXp: achievementResult.awardedXp,
      }));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not recompute achievements.' });
    }
  });

  router.post('/lessons/complete', requireAuth, async (req, res) => {
    try {
      const parsed = CompleteLessonSchema.parse(req.body || {});
      let profile = await normalizeDerivedState(supabaseAdmin, await loadProfile(supabaseAdmin, req.progressionUser.id));
      const completedLessons = safeArray(profile.completed_lessons);
      if (completedLessons.includes(parsed.lessonId)) {
        return res.json(buildProfilePayload(profile, { alreadyCompleted: true, awardedLessonXp: 0, newlyUnlockedAchievements: [] }));
      }

      const lessonXp = calculateLessonXp({
        lessonId: parsed.lessonId,
        actualTimeMinutes: parsed.actualTimeMinutes,
      });
      const boostMultiplier = (profile.xp_boost_expires_at || 0) > Date.now()
        ? Math.max(1, Number(profile.xp_boost_multiplier || 1))
        : 1;
      const awardedLessonXp = Math.floor(lessonXp * boostMultiplier);
      const lifetimeCompletedLessons = safeArray(profile.lifetime_completed_lessons).length
        ? safeArray(profile.lifetime_completed_lessons)
        : completedLessons;
      const updatedCompletedLessons = [...completedLessons, parsed.lessonId];
      const updatedLifetimeCompletedLessons = lifetimeCompletedLessons.includes(parsed.lessonId)
        ? lifetimeCompletedLessons
        : [...lifetimeCompletedLessons, parsed.lessonId];
      const today = getUtcDateKey();
      const yesterday = getUtcDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const isSameDay = profile.last_login_date === today;
      const isConsecutiveDay = profile.last_login_date === yesterday;

      const baseProgress = {
        ...profile,
        xp: Math.max(0, Number(profile.xp || 0) + awardedLessonXp),
        completed_lessons: updatedCompletedLessons,
        lifetime_completed_lessons: updatedLifetimeCompletedLessons,
        total_lessons_completed: Number(profile.total_lessons_completed || 0) + 1,
        current_streak: isSameDay ? Number(profile.current_streak || 0) : isConsecutiveDay ? Number(profile.current_streak || 0) + 1 : 1,
        last_login_date: today,
      };
      baseProgress.level = calculateLevelFromXP(baseProgress.xp);

      const achievementResult = evaluateAchievementRewards(baseProgress);
      const updatedProfile = await persistProfile(supabaseAdmin, req.progressionUser.id, {
        xp: achievementResult.finalXp,
        level: achievementResult.finalLevel,
        completed_lessons: updatedCompletedLessons,
        lifetime_completed_lessons: updatedLifetimeCompletedLessons,
        total_lessons_completed: baseProgress.total_lessons_completed,
        current_streak: baseProgress.current_streak,
        last_login_date: today,
        unlocked_achievements: achievementResult.unlockedAchievements,
      });

      const { error: eventError } = await supabaseAdmin.from('lesson_completion_events').upsert({
        user_id: req.progressionUser.id,
        lesson_id: parsed.lessonId,
        xp_earned: awardedLessonXp,
        coins_earned: 0,
      }, { onConflict: 'user_id,lesson_id' });

      if (eventError) {
        console.error('Could not persist authoritative lesson completion event:', eventError);
      }

      return res.json(buildProfilePayload(updatedProfile, {
        alreadyCompleted: false,
        awardedLessonXp,
        awardedAchievementXp: achievementResult.awardedXp,
        newlyUnlockedAchievements: achievementResult.newlyUnlocked,
      }));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not complete the lesson.' });
    }
  });

  router.post('/hearts/buy', requireAuth, async (req, res) => {
    try {
      const parsed = BuyHeartsSchema.parse(req.body || {});
      const profile = await normalizeDerivedState(supabaseAdmin, await loadProfile(supabaseAdmin, req.progressionUser.id));
      const maxHearts = Number(profile.max_hearts || 5);
      const currentHearts = Number(profile.hearts || 0);
      const heartsToAdd = Math.min(parsed.amount, Math.max(0, maxHearts - currentHearts));
      if (heartsToAdd <= 0) {
        return res.status(409).json({ error: 'Hearts are already full.' });
      }

      const coinCost = heartsToAdd * 20;
      if (Number(profile.coins || 0) < coinCost) {
        return res.status(409).json({ error: 'Not enough coins for this heart purchase.' });
      }

      const updated = await persistProfile(supabaseAdmin, req.progressionUser.id, {
        coins: Number(profile.coins || 0) - coinCost,
        hearts: currentHearts + heartsToAdd,
      });

      return res.json(buildProfilePayload(updated, { heartsPurchased: heartsToAdd, coinCost }));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not buy hearts.' });
    }
  });

  router.post('/hearts/consume', requireAuth, async (req, res) => {
    try {
      const parsed = ConsumeHeartSchema.parse(req.body || {});
      const profile = await normalizeDerivedState(supabaseAdmin, await loadProfile(supabaseAdmin, req.progressionUser.id));
      const unlimitedActive = (profile.unlimited_hearts_expires_at || 0) > Date.now();
      if (unlimitedActive) {
        if (Number(profile.hearts || 0) < Number(profile.max_hearts || 5)) {
          const updated = await persistProfile(supabaseAdmin, req.progressionUser.id, {
            hearts: Number(profile.max_hearts || 5),
          });
          return res.json(buildProfilePayload(updated, { heartsConsumed: 0, preventedByUnlimited: true }));
        }
        return res.json(buildProfilePayload(profile, { heartsConsumed: 0, preventedByUnlimited: true }));
      }

      const amount = parsed.amount || 1;
      const nextHearts = Math.max(0, Number(profile.hearts || 0) - amount);
      const updated = await persistProfile(supabaseAdmin, req.progressionUser.id, {
        hearts: nextHearts,
      });

      return res.json(buildProfilePayload(updated, { heartsConsumed: Math.max(0, Number(profile.hearts || 0) - nextHearts) }));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not consume a heart.' });
    }
  });

  router.post('/avatar/purchase', requireAuth, async (req, res) => {
    try {
      const parsed = AvatarIdSchema.parse(req.body || {});
      const avatar = getAvatarById(parsed.avatarId);
      if (!avatar) {
        return res.status(404).json({ error: 'Avatar not found.' });
      }

      let profile = await normalizeDerivedState(supabaseAdmin, await loadProfile(supabaseAdmin, req.progressionUser.id));
      const ownedAvatars = safeArray(profile.owned_avatars).length ? safeArray(profile.owned_avatars) : ['default'];
      if (ownedAvatars.includes(parsed.avatarId)) {
        return res.json(buildProfilePayload(profile, { alreadyOwned: true, newlyUnlockedAchievements: [] }));
      }
      if (Number(profile.coins || 0) < Number(avatar.price || 0)) {
        return res.status(409).json({ error: 'Not enough coins to unlock this avatar.' });
      }

      const baseProfile = {
        ...profile,
        coins: Number(profile.coins || 0) - Number(avatar.price || 0),
        owned_avatars: [...ownedAvatars, parsed.avatarId],
        current_avatar: parsed.avatarId,
      };
      const achievementResult = evaluateAchievementRewards(baseProfile);
      const updated = await persistProfile(supabaseAdmin, req.progressionUser.id, {
        coins: baseProfile.coins,
        owned_avatars: baseProfile.owned_avatars,
        current_avatar: baseProfile.current_avatar,
        xp: achievementResult.finalXp,
        level: achievementResult.finalLevel,
        unlocked_achievements: achievementResult.unlockedAchievements,
      });

      return res.json(buildProfilePayload(updated, {
        alreadyOwned: false,
        newlyUnlockedAchievements: achievementResult.newlyUnlocked,
        awardedAchievementXp: achievementResult.awardedXp,
      }));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not purchase the avatar.' });
    }
  });

  router.post('/avatar/equip', requireAuth, async (req, res) => {
    try {
      const parsed = AvatarIdSchema.parse(req.body || {});
      const avatar = getAvatarById(parsed.avatarId);
      if (!avatar) {
        return res.status(404).json({ error: 'Avatar not found.' });
      }

      const profile = await normalizeDerivedState(supabaseAdmin, await loadProfile(supabaseAdmin, req.progressionUser.id));
      const ownedAvatars = safeArray(profile.owned_avatars).length ? safeArray(profile.owned_avatars) : ['default'];
      if (!ownedAvatars.includes(parsed.avatarId)) {
        return res.status(409).json({ error: 'You do not own this avatar yet.' });
      }

      const updated = await persistProfile(supabaseAdmin, req.progressionUser.id, {
        current_avatar: parsed.avatarId,
      });
      return res.json(buildProfilePayload(updated));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not equip the avatar.' });
    }
  });

  return router;
};
