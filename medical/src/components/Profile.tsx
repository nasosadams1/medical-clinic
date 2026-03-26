import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Flame,
  Lock,
  Medal,
  Pencil,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserCircle2,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLevelProgress, getLevelTier } from '../hooks/levelSystem';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getEloRankInfo } from '../lib/eloRanks';
import { cacheDuelRating, DEFAULT_DUEL_RATING, getCachedDuelRating } from '../lib/duelRatingCache';
import { avatars } from '../data/avatars';
import { achievements } from '../data/achievements';
import {
  countCompletedLessonsByLanguage,
  formatLessonIdAsDisplayName,
  getLessonCountByLanguage,
} from '../data/lessonCatalog';

type ProfileTabId = 'overview' | 'progress' | 'achievements' | 'activity';
type AvatarRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

const isProfileDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_PROFILE === '1';

const profileDebugLog = (...args: any[]) => {
  if (isProfileDebugEnabled) {
    console.log(...args);
  }
};

const profileDebugError = (...args: any[]) => {
  if (isProfileDebugEnabled) {
    console.error(...args);
  }
};

const pageClassName = 'bg-background text-foreground';
const cardClassName = 'rounded-2xl border border-border bg-card shadow-card';
const panelClassName = 'rounded-2xl border border-border bg-background/80 p-4 shadow-card';

const tabs: Array<{ id: ProfileTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'activity', label: 'Activity', icon: Clock3 },
];

const rarityTone: Record<AvatarRarity, string> = {
  Common: 'bg-slate-500/15 text-slate-200 ring-1 ring-white/10',
  Rare: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20',
  Epic: 'bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-400/20',
  Legendary: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20',
};

const categoryTone: Record<string, string> = {
  learning: 'bg-sky-500/15 text-sky-200',
  practice: 'bg-emerald-500/15 text-emerald-200',
  social: 'bg-fuchsia-500/15 text-fuchsia-200',
  special: 'bg-amber-500/15 text-amber-200',
};

const languageTone: Record<
  'python' | 'javascript' | 'cpp' | 'java',
  { label: string; chip: string; progress: string }
> = {
  python: { label: 'Python', chip: 'bg-sky-500/15 text-sky-200', progress: 'from-sky-500 to-cyan-400' },
  javascript: { label: 'JavaScript', chip: 'bg-amber-500/15 text-amber-200', progress: 'from-amber-400 to-yellow-300' },
  cpp: { label: 'C++', chip: 'bg-fuchsia-500/15 text-fuchsia-200', progress: 'from-fuchsia-500 to-violet-400' },
  java: { label: 'Java', chip: 'bg-rose-500/15 text-rose-200', progress: 'from-rose-500 to-orange-400' },
};

function formatCountdown(expiresAt: number, currentTime: number) {
  const remaining = Math.max(0, expiresAt - currentTime);
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const Profile: React.FC = () => {
  const { user, updateUser, buyAvatar, setAvatar, checkAndUnlockAchievements, getActiveBoosts, addNotification } = useUser();
  const { refetchProfile } = useAuth();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [showAvatarStore, setShowAvatarStore] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('overview');
  const [duelRating, setDuelRating] = useState<number | null>(() =>
    user?.id === 'guest' ? DEFAULT_DUEL_RATING : getCachedDuelRating(user?.id)
  );
  const [avatarPurchaseFeedback, setAvatarPurchaseFeedback] = useState<null | {
    id: string;
    name: string;
    emoji: string;
    rarity: AvatarRarity;
    description: string;
    remainingCoins: number;
  }>(null);
  const [recentLessonEvents, setRecentLessonEvents] = useState<Array<{ lessonId: string; xp: number; completedAt: string }>>([]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    if (!user || user.id === 'guest') {
      setDuelRating(DEFAULT_DUEL_RATING);
      return;
    }

    setDuelRating(getCachedDuelRating(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.id === 'guest') return;

    let cancelled = false;

    const loadDuelRating = async () => {
      const { data, error } = await supabase.from('duel_users').select('rating').eq('id', user.id).maybeSingle();

      if (cancelled) return;

      if (error) {
        profileDebugError('Failed to load duel rating:', error);
        setDuelRating((currentRating) => currentRating ?? DEFAULT_DUEL_RATING);
        return;
      }

      const nextRating = Number.isFinite(Number(data?.rating)) ? Number(data?.rating) : DEFAULT_DUEL_RATING;
      cacheDuelRating(user.id, nextRating);
      setDuelRating(nextRating);
    };

    void loadDuelRating();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.id === 'guest') {
      setRecentLessonEvents([]);
      return;
    }

    let cancelled = false;

    const loadRecentLessonEvents = async () => {
      const { data, error } = await supabase
        .from('lesson_completion_events')
        .select('lesson_id, xp_earned, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(6);

      if (cancelled) return;

      if (error) {
        profileDebugError('Failed to load recent lesson activity:', error);
        setRecentLessonEvents([]);
        return;
      }

      setRecentLessonEvents(
        (data || []).map((entry) => ({
          lessonId: entry.lesson_id,
          xp: entry.xp_earned ?? 0,
          completedAt: entry.completed_at,
        }))
      );
    };

    void loadRecentLessonEvents();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return (
      <div className={`${pageClassName} flex min-h-screen items-center justify-center px-4 py-10`}>
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary glow-primary">
            <UserCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-display font-semibold text-foreground">Your profile unlocks after sign in</h1>
          <p className="mt-3 text-sm text-muted-foreground">Save benchmark reports, track progress, and build a stronger competitive profile.</p>
        </div>
      </div>
    );
  }

  const currentAvatar = avatars.find((avatar) => avatar.id === user.currentAvatar) ?? avatars[0];
  const levelProgress = getLevelProgress(user.xp);
  const levelTier = getLevelTier(levelProgress.currentLevel);
  const activeBoosts = getActiveBoosts();
  const resolvedDuelRating = duelRating ?? DEFAULT_DUEL_RATING;
  const duelRank = getEloRankInfo(resolvedDuelRating);

  const languageStats = useMemo(
    () =>
      (['python', 'javascript', 'cpp', 'java'] as const).map((language) => {
        const total = getLessonCountByLanguage(language);
        const completed = countCompletedLessonsByLanguage(language, user.completedLessons);
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { id: language, completed, total, percentage, ...languageTone[language] };
      }),
    [user.completedLessons]
  );

  const completedLessonsCount = languageStats.reduce((sum, language) => sum + language.completed, 0);
  const totalLessonsCount = languageStats.reduce((sum, language) => sum + language.total, 0);
  const overallProgress = totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;
  const bestTrack = [...languageStats].sort((a, b) => b.percentage - a.percentage || b.completed - a.completed)[0];
  const biggestGap = [...languageStats].sort((a, b) => a.percentage - b.percentage || a.completed - b.completed)[0];
  const nextAvatarUnlock = avatars.filter((avatar) => !user.ownedAvatars.includes(avatar.id)).sort((a, b) => a.price - b.price)[0];

  const userAchievements = achievements
    .map((achievement) => ({
      ...achievement,
      isUnlocked: user.unlockedAchievements.includes(achievement.id),
    }))
    .sort((a, b) => Number(b.isUnlocked) - Number(a.isUnlocked) || a.name.localeCompare(b.name));
  const unlockedCount = userAchievements.filter((achievement) => achievement.isUnlocked).length;
  const achievementCompletion = userAchievements.length > 0 ? Math.round((unlockedCount / userAchievements.length) * 100) : 0;

  const recentActivity = [
    ...recentLessonEvents.map((entry) => ({
      id: `lesson-${entry.lessonId}-${entry.completedAt}`,
      action: 'Completed lesson',
      item: formatLessonIdAsDisplayName(entry.lessonId),
      xp: entry.xp,
      time: new Date(entry.completedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      icon: '\u{1F4DA}',
    })),
    ...user.unlockedAchievements.slice(-3).reverse().map((achievementId) => {
      const achievement = achievements.find((entry) => entry.id === achievementId);
      return {
        id: `achievement-${achievementId}`,
        action: 'Unlocked achievement',
        item: achievement?.name || 'Achievement',
        xp: achievement?.reward.xp || 0,
        time: 'Recently',
        icon: achievement?.icon || '\u{1F3C6}',
      };
    }),
  ].slice(0, 6);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.length <= 16) {
      setEditName(value);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length > 16) return;

    try {
      await updateUser({ name: trimmedName });
      if (user.id !== 'guest') {
        profileDebugLog('Profile name changed, forcing AuthContext profile refetch and leaderboard sync...');
        await refetchProfile();
      }
      addNotification({ message: 'Profile updated successfully.', type: 'success', icon: '\u2705' });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      addNotification({ message: 'Could not save your profile. Please try again.', type: 'error', icon: '\u26A0\uFE0F' });
    }
  };

  const handleBuyAvatar = async (avatarId: string) => {
    const avatar = avatars.find((entry) => entry.id === avatarId);
    if (!avatar) return;

    try {
      const success = await buyAvatar(avatarId);
      if (success) {
        setAvatarPurchaseFeedback({
          id: avatar.id,
          name: avatar.name,
          emoji: avatar.emoji,
          rarity: avatar.rarity,
          description: avatar.description,
          remainingCoins: Math.max(0, user.coins - avatar.price),
        });
        window.setTimeout(() => void checkAndUnlockAchievements(), 400);
        return;
      }

      if (user.ownedAvatars.includes(avatarId)) {
        addNotification({ message: `${avatar.name} is already in your collection.`, type: 'info', icon: '\u{1F3AD}' });
        return;
      }

      addNotification({
        message: `You need ${avatar.price - user.coins} more coins to unlock ${avatar.name}.`,
        type: 'warning',
        icon: '\u{1FA99}',
      });
    } catch (error) {
      console.error('Failed to buy avatar:', error);
      addNotification({ message: 'Avatar purchase failed. Please try again.', type: 'error', icon: '\u26A0\uFE0F' });
    }
  };

  const handleEquipAvatar = (avatarId: string) => {
    setAvatar(avatarId);
    addNotification({ message: 'Avatar equipped.', type: 'success', icon: '\u{1F3AD}' });
  };

  const scrollToSection = (section: ProfileTabId) => {
    setActiveTab(section);
    document.getElementById(`profile-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={pageClassName}>
      <div className="flex w-full flex-col gap-4 px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3 xl:py-4">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${cardClassName} relative overflow-hidden p-5 sm:p-6 lg:p-8`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(217,70,239,0.18),_transparent_32%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
            <div className="space-y-5">
              <div className="type-label-tight inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Developer skill profile
              </div>

              <div className="flex flex-col gap-5 md:flex-row">
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-br from-primary/25 via-primary/15 to-transparent text-6xl shadow-elevated">
                  {currentAvatar.emoji}
                  <div className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-coins/30 bg-coins text-base font-bold text-coins-foreground shadow-card">
                    {levelProgress.currentLevel}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {levelTier.tier} level band
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${rarityTone[currentAvatar.rarity]}`}>
                      {currentAvatar.rarity} avatar
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={handleNameChange}
                          maxLength={16}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-semibold text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="mt-2 text-xs text-muted-foreground">{editName.length}/16 characters</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveProfile} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditName(user.name);
                            setIsEditing(false);
                          }}
                          className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="type-display-section truncate text-foreground">{user.name}</h1>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit name
                        </button>
                      </div>
                      <p className="type-body-sm mt-2 max-w-2xl text-muted-foreground">
                        Track interview readiness, ranked duel strength, and your practice momentum from one clean profile.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className={panelClassName}>
                      <div className="type-label-tight text-muted-foreground">Duel rating</div>
                      <div className="type-title-md mt-2 text-foreground">{resolvedDuelRating}</div>
                      <div className="type-body-sm mt-1 text-muted-foreground">{duelRank.icon} {duelRank.tier} tier</div>
                    </div>
                    <div className={panelClassName}>
                      <div className="type-label-tight text-muted-foreground">Current streak</div>
                      <div className="type-title-md mt-2 text-foreground">{user.currentStreak} days</div>
                      <div className="type-body-sm mt-1 text-muted-foreground">Consistency compounds quickly.</div>
                    </div>
                    <div className={panelClassName}>
                      <div className="type-label-tight text-muted-foreground">Available coins</div>
                      <div className="type-title-md mt-2 text-foreground">{user.coins.toLocaleString()}</div>
                      <div className="type-body-sm mt-1 text-muted-foreground">{user.totalCoinsEarned.toLocaleString()} earned lifetime</div>
                    </div>
                    <div className={panelClassName}>
                      <div className="type-label-tight text-muted-foreground">Practice coverage</div>
                      <div className="type-title-md mt-2 text-foreground">{overallProgress}%</div>
                      <div className="type-body-sm mt-1 text-muted-foreground">
                        {completedLessonsCount} of {totalLessonsCount} lessons complete
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button onClick={() => setShowAvatarStore(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
                      Avatar collection
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <Link to="/app?section=store" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                      Open store
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link to="/app?section=benchmark" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                      Retake benchmark
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className={`${panelClassName} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="type-label-tight text-muted-foreground">Level progress</div>
                    <div className="type-display-section mt-2 text-foreground">Level {levelProgress.currentLevel}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-right">
                    <div className="type-label-tight text-muted-foreground">Next level</div>
                    <div className="type-title-sm mt-1 text-foreground">{Math.max(0, levelProgress.nextLevelXP - user.xp).toLocaleString()} XP</div>
                  </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-card">
                  <div className="h-3 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400 transition-all duration-500" style={{ width: `${levelProgress.progressPercentage > 0 ? Math.max(6, levelProgress.progressPercentage) : 0}%` }} />
                </div>
                <div className="type-body-sm mt-2 text-muted-foreground">
                  {levelProgress.progressToNext.toLocaleString()} XP earned in this level band.
                </div>
              </div>

              <div className={`${panelClassName} p-5`}>
                <div className="text-sm font-semibold text-foreground">Current momentum</div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                    Best track right now: <span className="font-semibold text-foreground">{bestTrack.label}</span>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                    Biggest gap: <span className="font-semibold text-foreground">{biggestGap.label}</span>
                  </div>
                  {nextAvatarUnlock ? (
                    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                      Next avatar unlock: <span className="font-semibold text-foreground">{nextAvatarUnlock.name}</span> at {nextAvatarUnlock.price.toLocaleString()} coins.
                    </div>
                  ) : null}
                </div>
              </div>

              {activeBoosts.xpBoost || activeBoosts.unlimitedHearts ? (
                <div className={`${panelClassName} p-5`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Zap className="h-4 w-4 text-xp" />
                    Active boosts
                  </div>
                  <div className="mt-4 space-y-3">
                    {activeBoosts.xpBoost ? (
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{activeBoosts.xpBoost.multiplier}x XP boost</div>
                          <div className="text-xs text-muted-foreground">Lesson rewards are boosted.</div>
                        </div>
                        <div className="text-sm font-semibold text-xp">{formatCountdown(activeBoosts.xpBoost.expiresAt, currentTime)}</div>
                      </div>
                    ) : null}
                    {activeBoosts.unlimitedHearts ? (
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Unlimited hearts</div>
                          <div className="text-xs text-muted-foreground">Practice without heart limits.</div>
                        </div>
                        <div className="text-sm font-semibold text-destructive">{formatCountdown(activeBoosts.unlimitedHearts.expiresAt, currentTime)}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>

        <div className="sticky top-2 z-20 flex flex-wrap gap-2 rounded-2xl border border-border bg-card/85 p-2 shadow-card backdrop-blur">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <section id="profile-overview" className={`${cardClassName} scroll-mt-28 p-5 sm:p-6`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Snapshot</div>
              <h2 className="mt-1 text-2xl font-display font-semibold text-foreground">The signal your profile is sending</h2>
              <p className="mt-1 text-sm text-muted-foreground">A cleaner set of metrics that reads like a real product profile, not a leftover game screen.</p>
            </div>
            <Link to="/app?section=practice" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
              Continue practice
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={panelClassName}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-xp/12 text-xp glow-xp"><Trophy className="h-5 w-5" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total XP</div>
                  <div className="mt-1 text-2xl font-display font-semibold text-foreground">{user.xp.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className={panelClassName}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary glow-primary"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lessons</div>
                  <div className="mt-1 text-2xl font-display font-semibold text-foreground">{user.totalLessonsCompleted}</div>
                </div>
              </div>
            </div>
            <div className={panelClassName}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coins/12 text-coins glow-coins"><Coins className="h-5 w-5" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Coins earned</div>
                  <div className="mt-1 text-2xl font-display font-semibold text-foreground">{user.totalCoinsEarned.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className={panelClassName}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary glow-primary"><Medal className="h-5 w-5" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Achievements</div>
                  <div className="mt-1 text-2xl font-display font-semibold text-foreground">{unlockedCount}/{userAchievements.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className={panelClassName}>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-primary" />Next best move</div>
              <p className="mt-3 text-sm text-muted-foreground">Push {biggestGap.label} upward, then refresh your benchmark report to show a stronger coverage profile.</p>
            </div>
            <div className={panelClassName}>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Swords className="h-4 w-4 text-primary" />Duel profile</div>
              <p className="mt-3 text-sm text-muted-foreground">{duelRank.tier} tier at {resolvedDuelRating} rating. This is the clearest live competitive signal on your account.</p>
            </div>
            <div className={panelClassName}>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" />Avatar collection</div>
              <p className="mt-3 text-sm text-muted-foreground">You own {user.ownedAvatars.length} avatar{user.ownedAvatars.length === 1 ? '' : 's'}. Avatar management stays here, while coin packs and boosts live in the store.</p>
            </div>
          </div>
        </section>

        <section id="profile-progress" className={`${cardClassName} scroll-mt-28 p-5 sm:p-6`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Coverage</div>
              <h2 className="mt-1 text-2xl font-display font-semibold text-foreground">Track-by-track progress</h2>
              <p className="mt-1 text-sm text-muted-foreground">Practice is framed as measurable skill coverage instead of a loose lesson wall.</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">{overallProgress}% total completion</div>
          </div>

          <div className="mb-5 rounded-2xl border border-border bg-background/80 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Practice coverage</div>
                <div className="mt-2 text-3xl font-display font-semibold text-foreground">{completedLessonsCount}/{totalLessonsCount} lessons complete</div>
                <p className="mt-2 text-sm text-muted-foreground">Best track: {bestTrack.label}. Lowest coverage: {biggestGap.label}.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-right">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current level band</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{levelTier.tier}</div>
              </div>
            </div>
            <div className="mt-4 h-3 rounded-full bg-card">
              <div className="h-3 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400 transition-all duration-500" style={{ width: `${overallProgress > 0 ? Math.max(6, overallProgress) : 0}%` }} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {languageStats.map((language) => (
              <div key={language.id} className="rounded-2xl border border-border bg-background/80 p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${language.chip}`}>{language.label}</div>
                    <div className="mt-3 text-3xl font-display font-semibold text-foreground">{language.percentage}%</div>
                    <p className="mt-1 text-sm text-muted-foreground">{language.completed} of {language.total} lessons completed</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Coverage</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">{language.completed}/{language.total}</div>
                  </div>
                </div>
                <div className="mt-5 h-2 rounded-full bg-card">
                  <div className={`h-2 rounded-full bg-gradient-to-r ${language.progress}`} style={{ width: `${language.percentage > 0 ? Math.max(6, language.percentage) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="profile-achievements" className={`${cardClassName} scroll-mt-28 p-5 sm:p-6`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Recognition</div>
              <h2 className="mt-1 text-2xl font-display font-semibold text-foreground">Achievements and milestones</h2>
              <p className="mt-1 text-sm text-muted-foreground">A cleaner milestone grid that reads like proof of progress instead of a side quest list.</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">{achievementCompletion}% unlocked</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {userAchievements.map((achievement) => (
              <div key={achievement.id} className={`rounded-2xl border p-5 shadow-card ${achievement.isUnlocked ? 'border-primary/20 bg-background/80' : 'border-border bg-background/70 opacity-85'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${achievement.isUnlocked ? 'bg-primary/12' : 'bg-card'}`}>
                      {achievement.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{achievement.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${categoryTone[achievement.category]}`}>{achievement.category}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                  {achievement.isUnlocked ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reward</span>
                  <span className="font-semibold text-xp">+{achievement.reward.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="profile-activity" className={`${cardClassName} scroll-mt-28 p-5 sm:p-6`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Recent activity</div>
              <h2 className="mt-1 text-2xl font-display font-semibold text-foreground">What happened most recently</h2>
              <p className="mt-1 text-sm text-muted-foreground">A cleaner feed of actual progress events so the profile feels current instead of stitched together.</p>
            </div>
            <Link to="/app?section=leaderboard" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
              View leaderboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary">{entry.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{entry.action}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{entry.item}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-xp">+{entry.xp} XP</div>
                            <div className="mt-1 text-xs text-muted-foreground">{entry.time}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/80 px-6 text-center">
                  <Clock3 className="h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">No recent activity yet</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">Complete a lesson, duel, or benchmark and your recent timeline will start to fill in here.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className={panelClassName}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Flame className="h-4 w-4 text-orange-400" />Momentum summary</div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3"><span>Current streak</span><span className="font-semibold text-foreground">{user.currentStreak} days</span></div>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3"><span>Owned avatars</span><span className="font-semibold text-foreground">{user.ownedAvatars.length}</span></div>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3"><span>Benchmark-ready coverage</span><span className="font-semibold text-foreground">{overallProgress}%</span></div>
                </div>
              </div>
              <div className={panelClassName}>
                <div className="text-sm font-semibold text-foreground">Recommended next action</div>
                <p className="mt-3 text-sm text-muted-foreground">Continue {biggestGap.label}, then rerun the benchmark to turn that work into a stronger profile signal.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link to="/app?section=practice" className="inline-flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                    Open practice
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link to="/app?section=benchmark" className="inline-flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                    Refresh benchmark
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {avatarPurchaseFeedback ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elevated">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-primary/20 bg-primary/10 text-5xl text-primary glow-primary">
                  {avatarPurchaseFeedback.emoji}
                </div>
                <div className={`mx-auto mt-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${rarityTone[avatarPurchaseFeedback.rarity]}`}>
                  {avatarPurchaseFeedback.rarity}
                </div>
                <h3 className="mt-4 text-2xl font-display font-semibold text-foreground">{avatarPurchaseFeedback.name} unlocked</h3>
                <p className="mt-3 text-sm text-muted-foreground">{avatarPurchaseFeedback.description}</p>
                <p className="mt-3 text-sm text-muted-foreground">Remaining coins: <span className="font-semibold text-foreground">{avatarPurchaseFeedback.remainingCoins.toLocaleString()}</span></p>
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button onClick={() => { handleEquipAvatar(avatarPurchaseFeedback.id); setAvatarPurchaseFeedback(null); }} className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
                  Equip now
                </button>
                <button onClick={() => setAvatarPurchaseFeedback(null)} className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                  Keep browsing
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showAvatarStore ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm">
            <div className="mx-auto max-w-6xl">
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} className="rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      Avatar collection
                    </div>
                    <h2 className="mt-3 text-3xl font-display font-semibold text-foreground">Manage your profile identity</h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Avatar unlocks stay here on your profile. Coin packs and boosts now live in the updated store flow.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/app?section=store" onClick={() => setShowAvatarStore(false)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                      Open store
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button onClick={() => setShowAvatarStore(false)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {avatars.map((avatar) => {
                    const isOwned = user.ownedAvatars.includes(avatar.id);
                    const isEquipped = user.currentAvatar === avatar.id;
                    const canAfford = user.coins >= avatar.price;

                    return (
                      <div key={avatar.id} className="rounded-2xl border border-border bg-background/80 p-5 shadow-card">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-border bg-card text-4xl shadow-card">{avatar.emoji}</div>
                          <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${rarityTone[avatar.rarity]}`}>{avatar.rarity}</div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-foreground">{avatar.name}</h3>
                            <div className="text-sm font-semibold text-coins">{avatar.price.toLocaleString()} coins</div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{avatar.description}</p>
                        </div>
                        <div className="mt-5">
                          {isEquipped ? (
                            <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card">
                              <CheckCircle2 className="h-4 w-4" />
                              Equipped
                            </div>
                          ) : isOwned ? (
                            <button onClick={() => handleEquipAvatar(avatar.id)} className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary">
                              Equip avatar
                            </button>
                          ) : (
                            <button onClick={() => handleBuyAvatar(avatar.id)} className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${canAfford ? 'bg-primary text-primary-foreground shadow-card hover:opacity-90' : 'border border-border bg-card text-muted-foreground'}`}>
                              {canAfford ? 'Unlock avatar' : 'Not enough coins'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
