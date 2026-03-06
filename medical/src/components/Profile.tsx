import React, { useState, useEffect } from 'react';
import { getLevelProgress, getLevelTier } from '../hooks/levelSystem';
import {
  User,
  Trophy,
  Calendar,
  Target,
  BookOpen,
  Code,
  Award,
  Heart,
  ShoppingCart,
  Star,
  Crown,
  Zap,
  Lock,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { getEloRankInfo } from '../lib/eloRanks';
import { avatars, getRarityColor } from '../data/avatars';
import { achievements } from '../data/achievements';
import { getTotalLessonsByLanguage, getCompletedLessonsByLanguage, formatLessonDisplayName } from '../data/lessons';

const Profile: React.FC = () => {
  const { 
    user, 
    updateUser, 
    buyHearts, 
    buyAvatar, 
    setAvatar, 
    getLanguageProgress,
    checkAndUnlockAchievements,
    isAuthenticated,
    getActiveBoosts,
    addNotification,
  } = useUser();
  
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [showStore, setShowStore] = useState(false);
  const [showAvatarStore, setShowAvatarStore] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'achievements' | 'activity'>('overview');
  const [isResettingLessons, setIsResettingLessons] = useState(false);
  const [showResetLessonsModal, setShowResetLessonsModal] = useState(false);
  const [duelRating, setDuelRating] = useState(500);
  const [recentLessonEvents, setRecentLessonEvents] = useState<Array<{
    lesson_id: string;
    xp_earned: number;
    completed_at: string;
  }>>([]);

  // Update current time every second for boost timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (!user || user.id === 'guest') {
      setDuelRating(500);
      return;
    }

    let cancelled = false;

    const loadDuelRating = async () => {
      const { data } = await supabase
        .from('duel_users')
        .select('rating')
        .eq('id', user.id)
        .maybeSingle();

      if (!cancelled) {
        setDuelRating(data?.rating ?? 500);
      }
    };

    loadDuelRating();

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
        .limit(5);

      if (cancelled) return;

      if (error) {
        console.error('Failed to load recent lesson activity:', error);
        setRecentLessonEvents([]);
        return;
      }

      setRecentLessonEvents(data ?? []);
    };

    loadRecentLessonEvents();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.completedLessons]);

  const scrollToProfileSection = (sectionId: 'overview' | 'progress' | 'achievements' | 'activity') => {
    setActiveTab(sectionId);
    const element = document.getElementById(`profile-${sectionId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBuyHearts = async (amount: number) => {
    if (!user) return;
    try {
      const success = await buyHearts(amount);
      if (success) {
        addNotification({
          message: `Successfully bought ${amount} heart${amount > 1 ? 's' : ''}.`,
          type: 'success',
          icon: '\u{1F4DA}',
        });
      } else {
        addNotification({
          message: 'Not enough coins, or your hearts are already full.',
          type: 'warning',
          icon: '\u{26A0}',
        });
      }
    } catch (error) {
      console.error('Failed to buy hearts:', error);
      addNotification({
        message: 'Heart purchase failed. Please try again.',
        type: 'error',
        icon: '\u{26A0}',
      });
    }
  };

  const handleBuyAvatar = async (avatarId: string) => {
    if (!user) return;
    const avatar = avatars.find(a => a.id === avatarId);
    if (!avatar) return;

    try {
      const success = await buyAvatar(avatarId);
      if (success) {
        addNotification({
          message: `${avatar.name} unlocked and added to your collection.`,
          type: 'success',
          icon: avatar.emoji,
        });
        setTimeout(() => checkAndUnlockAchievements(), 500);
      } else if (user.ownedAvatars.includes(avatarId)) {
        addNotification({
          message: `You already own ${avatar.name}.`,
          type: 'info',
          icon: avatar.emoji,
        });
      } else {
        addNotification({
          message: `You need ${avatar.price} coins to unlock ${avatar.name}.`,
          type: 'warning',
          icon: '\u{1FA99}',
        });
      }
    } catch (error) {
      console.error('Failed to buy avatar:', error);
      addNotification({
        message: 'Avatar purchase failed. Please try again.',
        type: 'error',
        icon: '\u{26A0}',
      });
    }
  };

  const handleSetAvatar = (avatarId: string) => {
    setAvatar(avatarId); // This will trigger UserContext.updateUser
  };

  const handleResetLessons = () => {
    if (!user || user.id === 'guest' || isResettingLessons) return;

    const replayCost = 400;
    if (user.coins < replayCost) {
      addNotification({ message: `You need ${replayCost} coins to refresh your lessons.`, type: 'warning' });
      return;
    }

    setShowResetLessonsModal(true);
  };

  const confirmResetLessons = async () => {
    if (!user || user.id === 'guest' || isResettingLessons) return;

    const replayCost = 400;
    if (user.coins < replayCost) {
      addNotification({ message: `You need ${replayCost} coins to refresh your lessons.`, type: 'warning' });
      setShowResetLessonsModal(false);
      return;
    }

    setIsResettingLessons(true);
    try {
      await updateUser({
        coins: user.coins - replayCost,
        completedLessons: [],
      });

      addNotification({
        message: 'Lesson path refreshed. Your lifetime progress stayed intact.',
        type: 'success',
      });
      setShowResetLessonsModal(false);
    } catch (error) {
      console.error('Failed to reset lessons:', error);
      addNotification({ message: 'Lesson refresh failed. Please try again.', type: 'error' });
    } finally {
      setIsResettingLessons(false);
    }
  };
  if (!user || !isAuthenticated()) {
    return null;
  }

  const currentAvatar = avatars.find((a) => a.id === user.currentAvatar) || avatars[0];
  
  // Calculate dynamic stats for all 4 languages using robust methods
  const pythonProgress = React.useMemo(() => {
    const total = getTotalLessonsByLanguage('python');
    const completed = getCompletedLessonsByLanguage('python', user.completedLessons);
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [user.completedLessons]);

  const javascriptProgress = React.useMemo(() => {
    const total = getTotalLessonsByLanguage('javascript');
    const completed = getCompletedLessonsByLanguage('javascript', user.completedLessons);
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [user.completedLessons]);

  const cppProgress = React.useMemo(() => {
    const total = getTotalLessonsByLanguage('cpp');
    const completed = getCompletedLessonsByLanguage('cpp', user.completedLessons);
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [user.completedLessons]);

  const javaProgress = React.useMemo(() => {
    const total = getTotalLessonsByLanguage('java');
    const completed = getCompletedLessonsByLanguage('java', user.completedLessons);
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [user.completedLessons]);

  // Calculate overall progress across all languages
  const overallProgress = React.useMemo(() => {
    const totalLessonsAcrossLanguages = pythonProgress.total + javascriptProgress.total + cppProgress.total + javaProgress.total;
    const completedLessonsAcrossLanguages = pythonProgress.completed + javascriptProgress.completed + cppProgress.completed + javaProgress.completed;
    
    if (totalLessonsAcrossLanguages === 0) return 0;
    return Math.round((completedLessonsAcrossLanguages / totalLessonsAcrossLanguages) * 100);
  }, [pythonProgress, javascriptProgress, cppProgress, javaProgress]);

  // Verify that our calculated total matches the user's stored total
  const calculatedTotalCompleted = React.useMemo(() => {
    return pythonProgress.completed + javascriptProgress.completed + cppProgress.completed + javaProgress.completed;
  }, [pythonProgress, javascriptProgress, cppProgress, javaProgress]);
  const levelProgress = getLevelProgress(user.xp);
  const levelTier = getLevelTier(levelProgress.currentLevel);

  const totalXpForCurrentLevelSegment = levelProgress.nextLevelXP - levelProgress.currentLevelXP;

  const stats = [
    { label: 'Total XP', value: user.xp.toLocaleString(), icon: Trophy, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    { label: 'Current Level', value: levelProgress.currentLevel, icon: Target, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { label: 'Lessons Completed', value: user.totalLessonsCompleted, icon: BookOpen, color: 'text-green-500', bgColor: 'bg-green-50' },
    { label: 'Current Streak', value: `${user.currentStreak} days`, icon: Zap, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  ];

  const languageStats = [
    { name: 'Python', progress: pythonProgress, color: 'bg-blue-500', icon: '\u{1F40D}' },
    { name: 'JavaScript', progress: javascriptProgress, color: 'bg-yellow-500', icon: '\u{1F7E8}' },
    { name: 'C++', progress: cppProgress, color: 'bg-purple-500', icon: '\u{26A1}' },
    { name: 'Java', progress: javaProgress, color: 'bg-red-500', icon: '\u{2615}' },
  ];

  const userAchievements = achievements.map((achievement) => ({
    ...achievement,
    isUnlocked: user.unlockedAchievements.includes(achievement.id),
  }));

  const unlockedCount = userAchievements.filter((a) => a.isUnlocked).length;
  const activeBoosts = getActiveBoosts();
  const duelRank = getEloRankInfo(duelRating);

  const formatTimeRemaining = (expiresAt: number) => {
    const remaining = Math.max(0, expiresAt - currentTime);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const recentActivity = [
    ...recentLessonEvents.map((event) => ({
      action: 'Completed lesson',
      item: formatLessonDisplayName(event.lesson_id),
      xp: event.xp_earned,
      time: 'Recently',
      icon: '\u{1F4DA}',
    })),
    ...user.unlockedAchievements.slice(-3).reverse().map((achievementId: string) => {
      const achievement = achievements.find((a) => a.id === achievementId);
      return {
        action: 'Unlocked achievement',
        item: achievement?.name || 'Unknown Achievement',
        xp: achievement?.reward.xp || 0,
        time: 'Recently',
        icon: achievement?.icon || '\u{1F3C6}',
      };
    }),
  ].slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">Player Profile</h1>
            <p className="max-w-2xl text-sm text-gray-600 sm:text-base">Track your coding journey, lifetime progress, and duel milestones across every device.</p>
          </div>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-6 lg:mb-8 lg:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -translate-y-32 translate-x-32 opacity-50"></div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="text-center lg:self-start lg:text-left">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-4xl lg:text-6xl shadow-lg">
                {currentAvatar.emoji}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 lg:w-12 lg:h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm lg:text-lg font-bold text-yellow-900">{levelProgress.currentLevel}</span>
              </div>
              {/* Level Tier Badge */}
              <div className={`absolute -top-2 -left-2 px-1 lg:px-2 py-1 ${levelTier.bgColor} ${levelTier.color} rounded-full text-xs font-bold flex items-center space-x-1`}>
                <span>{levelTier.icon}</span>
                <span className="hidden lg:inline">{levelTier.tier}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="mb-2 flex items-center justify-center gap-2 lg:justify-start">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">{user.name}</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-start">
                <button
                  type="button"
                  onClick={() => setShowAvatarStore(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-100 px-4 py-2.5 text-sm font-medium text-purple-700 transition hover:bg-purple-200"
                >
                  <User className="h-4 w-4" />
                  <span>Avatar Collection</span>
                </button>
              </div>
            </div>
          </div>

          <div className="w-full flex-1">
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className={`${stat.bgColor} rounded-xl p-3 lg:p-4 text-center`}>
                    <Icon className={`w-6 h-6 lg:w-8 lg:h-8 ${stat.color} mx-auto mb-2`} />
                    <div className="text-lg lg:text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base lg:text-lg font-semibold text-gray-700">Level Progress</span>
                <span className="text-sm text-gray-600">
                  {levelProgress.progressToNext} / {totalXpForCurrentLevelSegment} XP
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${levelProgress.progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Level {levelProgress.currentLevel}</span>
                <span>Level {levelProgress.currentLevel + 1}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:gap-4">
              <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <div className="text-lg lg:text-2xl font-bold text-yellow-700">{user.coins}</div>
                <div className="text-xs text-yellow-600">Coins</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="flex justify-center space-x-1 mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Heart
                      key={i}
                      className={`w-3 h-3 lg:w-4 lg:h-4 ${
                        activeBoosts.unlimitedHearts 
                          ? 'text-pink-500 fill-pink-500 animate-pulse' 
                          : i < user.hearts 
                          ? 'text-red-500 fill-red-500' 
                          : 'text-gray-300 fill-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-red-600">
                  {activeBoosts.unlimitedHearts ? 'Unlimited' : 'Hearts'}
                </div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="text-lg lg:text-2xl font-bold text-green-700">{overallProgress}%</div>
                <div className="text-xs text-green-600">Complete</div>
              </div>
            </div>

            {/* Active Boosts Display */}
            {(activeBoosts.xpBoost || activeBoosts.unlimitedHearts) && (
              <div className="mt-4 p-3 lg:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Active Boosts
                </h4>
                <div className="space-y-2">
                  {activeBoosts.xpBoost && (
                    <div className="flex flex-col sm:flex-row items-center justify-between text-sm bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg gap-1">
                      <span className="font-medium">{activeBoosts.xpBoost.multiplier}x XP Boost</span>
                      <span className="text-xs">{formatTimeRemaining(activeBoosts.xpBoost.expiresAt)}</span>
                    </div>
                  )}
                  {activeBoosts.unlimitedHearts && (
                    <div className="flex flex-col sm:flex-row items-center justify-between text-sm bg-pink-100 text-pink-800 px-3 py-2 rounded-lg gap-1">
                      <span className="font-medium">Unlimited Hearts</span>
                      <span className="text-xs">{formatTimeRemaining(activeBoosts.unlimitedHearts.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Replay Lessons Card */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-md lg:mb-8 lg:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-700">
              <RefreshCw className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900">Replay your full lesson path</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Clear your current lesson checklist and replay the track from the beginning. Your lifetime lesson count, XP, coins earned, streak history, and achievements stay intact.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              Cost: <span className="font-semibold text-amber-600">400 coins</span>
            </div>
            <button
              type="button"
              onClick={handleResetLessons}
              disabled={isResettingLessons || user.coins < 400}
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
            >
              {isResettingLessons ? 'Refreshing...' : 'Refresh Lessons'}
            </button>
          </div>
        </div>
      </div>

      {showResetLessonsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Refresh lesson path</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will clear your current lesson completion list so you can replay lessons from the beginning.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              You will lose only your current per-lesson checklist. Your lifetime lesson count, XP, coins earned, streak history, and unlocked achievements will remain on your account.
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Cost: <span className="font-semibold text-amber-600">400 coins</span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowResetLessonsModal(false)}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetLessons}
                disabled={isResettingLessons}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
              >
                {isResettingLessons ? 'Refreshing...' : 'Confirm refresh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-md lg:mb-8">
        {[
          { id: 'overview', label: 'Overview', icon: Trophy },
          { id: 'progress', label: 'Progress', icon: Target },
          { id: 'achievements', label: 'Achievements', icon: Award },
          { id: 'activity', label: 'Activity', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => scrollToProfileSection(tab.id as any)}
              className={`flex min-w-[120px] flex-1 items-center justify-center space-x-2 rounded-lg px-3 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 lg:px-4 lg:text-base ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Sections */}
      <section id="profile-overview" className="mb-6 grid grid-cols-1 gap-4 scroll-mt-24 lg:mb-8 lg:grid-cols-2 lg:gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md sm:p-5 lg:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Code className="w-6 h-6 mr-2 text-blue-500" />
              Language Mastery
            </h3>
            <div className="space-y-6">
              {languageStats.map((lang, index) => (
                <div key={index} className="space-y-3">
                                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{lang.icon}</span>
                      <div>
                        <span className="font-semibold text-gray-900">{lang.name}</span>
                        <div className="text-sm text-gray-600">
                          {lang.progress.completed}/{lang.progress.total} lessons
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{lang.progress.percentage}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${lang.color} h-3 rounded-full transition-all duration-1000`}
                      style={{ width: `${lang.progress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md sm:p-5 lg:p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Star className="w-6 h-6 mr-2 text-yellow-500" />
              Quick Stats
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-700">{unlockedCount}</div>
                <div className="text-sm text-blue-600">Achievements</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-700">{user.totalCoinsEarned}</div>
                <div className="text-sm text-green-600">Total Coins Earned</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-700">{user.ownedAvatars.length}</div>
                <div className="text-sm text-purple-600">Avatars Owned</div>
              </div>
              <div className={`${duelRank.bgColor} rounded-lg p-4 text-center border border-gray-200`}>
                <div className="text-2xl font-bold text-gray-900 sm:text-3xl">{duelRank.icon} {duelRating}</div>
                <div className={`text-sm ${duelRank.color}`}>{duelRank.tier} Rank</div>
              </div>
            </div>
          </div>
      </section>

      <section id="profile-progress" className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-md scroll-mt-24 sm:p-6 lg:mb-8 lg:p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8 flex items-center">
            <Target className="w-7 h-7 mr-3 text-blue-500" />
            Learning Progress
          </h3>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800">Overall Progress</h4>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">{overallProgress}%</span>
                <div className="text-xs text-gray-500">
                  {calculatedTotalCompleted} / {pythonProgress.total + javascriptProgress.total + cppProgress.total + javaProgress.total} lessons
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-6 rounded-full transition-all duration-1000 flex items-center justify-end pr-3"
                style={{ width: `${overallProgress}%` }}
              >
                {overallProgress > 10 && <span className="text-white text-sm font-medium">{overallProgress}%</span>}
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>Progress across all languages</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {languageStats.map((lang, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 lg:p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{lang.icon}</div>
                  <h4 className="text-xl font-bold text-gray-900">{lang.name}</h4>
                </div>

                <div className="relative mx-auto mb-4 h-28 w-28 sm:h-32 sm:w-32">
                  <svg className="h-28 w-28 -rotate-90 transform sm:h-32 sm:w-32" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={lang.color.replace('bg-', '#')}
                      strokeWidth="2"
                      strokeDasharray={`${lang.progress.percentage}, 100`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{lang.progress.percentage}%</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">{lang.progress.completed} / {lang.progress.total}</p>
                  <p className="text-sm text-gray-600">Lessons Completed</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      <section id="profile-achievements" className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-md scroll-mt-24 sm:p-6 lg:mb-8 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 flex items-center">
              <Award className="w-7 h-7 mr-3 text-yellow-500" />
              Achievements
            </h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-600">{unlockedCount}/{achievements.length}</div>
              <div className="text-sm text-gray-600">Unlocked</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userAchievements.map((achievement, index) => (
              <div
                key={index}
                className={`rounded-xl border-2 p-4 transition-all duration-300 sm:p-5 lg:p-6 ${
                  achievement.isUnlocked
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg'
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`text-3xl p-2 rounded-lg ${achievement.isUnlocked ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {achievement.isUnlocked ? achievement.icon : '\u{1F512}'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className={`font-bold ${achievement.isUnlocked ? 'text-green-800' : 'text-gray-600'}`}>
                        {achievement.name}
                      </h4>
                      {achievement.isUnlocked && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className={`text-sm mb-3 ${achievement.isUnlocked ? 'text-green-700' : 'text-gray-500'}`}>
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        achievement.category === 'learning' ? 'bg-blue-100 text-blue-700' :
                        achievement.category === 'practice' ? 'bg-purple-100 text-purple-700' :
                        achievement.category === 'social' ? 'bg-pink-100 text-pink-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {achievement.category}
                      </span>
                      {achievement.isUnlocked && (
                        <span className="text-green-600 font-medium">
                          +{achievement.reward.xp} XP
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      <section id="profile-activity" className="rounded-xl border border-gray-200 bg-white p-4 shadow-md scroll-mt-24 sm:p-6 lg:p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8 flex items-center">
            <Calendar className="w-7 h-7 mr-3 text-blue-500" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {activity.action}: <span className="text-blue-600">{activity.item}</span>
                  </p>
                  <p className="text-sm text-gray-600">{activity.time}</p>
                </div>
                {activity.xp > 0 && (
                  <div className="text-green-600 font-bold text-lg">+{activity.xp} XP</div>
                )}
              </div>
            )) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No recent activity</p>
                <p className="text-gray-400">Complete some lessons to see your progress here!</p>
              </div>
            )}
          </div>
        </section>

      {/* Heart Store Modal */}
      {showStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Heart className="w-6 h-6 text-red-500 fill-red-500 mr-2" />
                Heart Store
              </h3>
              <button onClick={() => setShowStore(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 text-sm mb-2">Current hearts: <span className="font-semibold">{user.hearts}/5</span></p>
              <p className="text-gray-700 text-sm">Your coins: <span className="font-semibold text-yellow-600">{user.coins}</span></p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleBuyHearts(1)}
                disabled={user.hearts >= 5 || user.coins < 20}
                className="w-full p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                  <span className="font-medium">1 Heart</span>
                </div>
                <span className="font-bold text-yellow-600">20 coins</span>
              </button>

              <button
                onClick={() => handleBuyHearts(5 - user.hearts)}
                disabled={user.hearts >= 5 || user.coins < (5 - user.hearts) * 20}
                className="w-full p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors"
              >
                <div className="flex items-center">
                  {Array.from({ length: Math.max(0, 5 - user.hearts) }, (_, i) => (
                    <Heart key={i} className="w-5 h-5 text-red-500 fill-red-500" />
                  ))}
                  {/* Ensure there's a space if hearts are bought, but not if 0 hearts are needed */}
                  {Math.max(0, 5 - user.hearts) > 0 && <span className="font-medium ml-3">Fill Hearts</span>}
                </div>
                <span className="font-bold text-yellow-600">{(5 - user.hearts) * 20} coins</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6 text-center">Hearts reset daily at midnight</p>
          </div>
        </div>
      )}

      {/* Avatar Store Modal */}
      {showAvatarStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Header section - now always at the top */}
            <div className="z-10 border-b border-gray-200 bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Crown className="w-7 h-7 text-yellow-500 mr-3" />
                  Avatar Collection
                </h3>
                <button onClick={() => setShowAvatarStore(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <div className="rounded-full bg-amber-50 px-3 py-1.5">Your coins: <span className="font-bold text-amber-600">{user.coins}</span></div>
                <div className="rounded-full bg-slate-100 px-3 py-1.5">Permanent unlocks</div>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                {avatars.map((avatar) => {
                  const isOwned = user.ownedAvatars.includes(avatar.id);
                  const isCurrent = user.currentAvatar === avatar.id;
                  const canAfford = user.coins >= avatar.price;

                  return (
                    <div
                      key={avatar.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : isOwned
                          ? 'border-green-200 bg-green-50 hover:shadow-md'
                          : canAfford
                          ? 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                          : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2 relative">
                          {avatar.emoji}
                          {isCurrent && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">{avatar.name}</h4>
                        <p className="mb-2 text-xs leading-5 text-gray-600">{avatar.description}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(avatar.rarity)}`}>
                          {avatar.rarity}
                        </span>

                        <div className="mt-3 space-y-3">
                          {!isOwned && avatar.price > 0 && (
                            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                              {avatar.price} coins
                            </div>
                          )}
                          {isCurrent ? (
                            <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">Current</div>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleSetAvatar(avatar.id)}
                              className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Equip
                            </button>
                          ) : avatar.price === 0 ? (
                            <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">Free</div>
                          ) : (
                            <button
                              onClick={() => handleBuyAvatar(avatar.id)}
                              disabled={!canAfford}
                              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                canAfford ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {canAfford ? `Unlock for ${avatar.price}` : `${avatar.price} coins`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;








