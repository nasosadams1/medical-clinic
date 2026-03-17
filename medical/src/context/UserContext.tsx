// UserContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { calculateLevelFromXP } from '../hooks/levelSystem';
import { useAuth } from './AuthContext';
import { UserProfile, getUserProfile, getDisplayName, supabase } from '../lib/supabase';
import { checkAchievements, Achievement } from '../data/achievements';
import { avatars } from '../data/avatars';
import { countCompletedLessonsByLanguage, getLessonCountByLanguage } from '../data/lessonCatalog';
import {
  buyHeartsProgression,
  completeLessonProgression,
  consumeHeartProgression,
  equipAvatarProgression,
  isProgressionApiUnavailableError,
  purchaseAvatarProgression,
  recomputeAchievements,
  refreshProgressionState,
  type ProgressionResponse,
} from '../lib/progression';

import NotificationDisplay from '../components/NotificationDisplay.tsx';
import { cacheDuelRating, DEFAULT_DUEL_RATING, getCachedDuelRating } from '../lib/duelRatingCache';

const isUserDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_USER_CONTEXT === '1';

const userDebugLog = (...args: any[]) => {
  if (isUserDebugEnabled) {
    console.log(...args);
  }
};

// Define User interface for local state
export interface User {
  id?: string;
  name: string;
  coins: number;
  totalCoinsEarned: number;
  xp: number;
  completedLessons: string[];
  lifetimeCompletedLessons: string[];
  level: number;
  hearts: number;
  maxHearts: number;
  lastHeartReset: string;
  currentAvatar: string;
  ownedAvatars: string[];
  unlockedAchievements: string[];
  currentStreak: number;
  lastLoginDate: string;
  totalLessonsCompleted: number;
  unlimitedHeartsActive?: boolean;
  xpBoostMultiplier?: number;
  xpBoostExpiresAt?: number;
  unlimitedHeartsExpiresAt?: number;
  projects?: number;
}

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPreviousDateKey = (date = new Date()) => {
  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - 1);
  return getLocalDateKey(previousDate);
};

// Define Notification interface
interface Notification {
  id: string;
  message: string;
  icon?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

// Transaction queue for atomic operations
interface Transaction {
  id: string;
  updates: Partial<User>;
  timestamp: number;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

// Define the shape of the UserContext
interface UserContextType {
  user: User;
  isLoading: boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
  completeLesson: (lessonId: string, xpReward: number, coinsReward: number, actualTimeMinutes?: number) => Promise<void>;
  loseHeart: () => void;
  buyHearts: (amount: number) => Promise<boolean>;
  buyAvatar: (avatarId: string) => Promise<boolean>;
  setAvatar: (avatarId: string) => void;
  purchaseWithCoins: (amount: number) => Promise<boolean>;
  addCoins: (amount: number) => Promise<void>;
  resetHeartsIfNeeded: () => void;
  resetHeartLoss: () => void;
  getLanguageProgress: (language: string) => { completed: number; total: number; percentage: number };
  setAuthenticatedUser: (userData: Partial<User>) => void; // Deprecated, but kept for interface consistency
  resetToGuestUser: () => void;
  isAuthenticated: () => boolean;
  unlockAchievement: (achievementId: string, xpReward: number) => Promise<void>;
  debugUserState: () => void;
  verifyDatabaseSync: () => Promise<void>;
  forceRefreshFromDatabase: () => Promise<void>;
  checkAndUnlockAchievements: () => Promise<void>;
  activateXPBoost: (multiplier: number, durationHours: number) => Promise<void>;
  activateUnlimitedHearts: (durationHours: number) => Promise<void>;
  refillHearts: () => Promise<void>;
  isXPBoostActive: () => boolean;
  isUnlimitedHeartsActive: () => boolean;
  getActiveBoosts: () => { xpBoost?: { multiplier: number; expiresAt: number }; unlimitedHearts?: { expiresAt: number } };
  addNotification: (notification: { message: string; type: 'success' | 'info' | 'warning' | 'error'; icon?: string }) => void;
  refreshDisplayName: () => Promise<void>;
}

// Default guest user state
const defaultGuestUser: User = {
  id: 'guest',
  name: 'Guest User',
  coins: 0,
  totalCoinsEarned: 0,
  xp: 0,
  completedLessons: [],
  lifetimeCompletedLessons: [],
  level: 1,
  hearts: 5,
  maxHearts: 5,
  lastHeartReset: new Date().toDateString(),
  currentAvatar: 'default',
  ownedAvatars: ['default'],
  unlockedAchievements: [],
  currentStreak: 0,
  lastLoginDate: '',
  totalLessonsCompleted: 0,
  unlimitedHeartsActive: false,
  xpBoostMultiplier: 1,
  xpBoostExpiresAt: 0,
  unlimitedHeartsExpiresAt: 0,
  projects: 0
};

const AUTHENTICATED_MUTABLE_USER_FIELDS = new Set<keyof User>(['name']);

const mapProfileToUser = (profile: UserProfile): User => ({
  id: profile.id,
  name: profile.name,
  coins: profile.coins,
  totalCoinsEarned: profile.total_coins_earned,
  xp: profile.xp,
  completedLessons: profile.completed_lessons || [],
  lifetimeCompletedLessons: profile.lifetime_completed_lessons || profile.completed_lessons || [],
  level: profile.level,
  hearts: profile.hearts,
  maxHearts: profile.max_hearts,
  lastHeartReset: profile.last_heart_reset,
  currentAvatar: profile.current_avatar,
  ownedAvatars: profile.owned_avatars || ['default'],
  unlockedAchievements: profile.unlocked_achievements || [],
  currentStreak: profile.current_streak,
  lastLoginDate: profile.last_login_date,
  totalLessonsCompleted: profile.total_lessons_completed,
  unlimitedHeartsActive: false,
  xpBoostMultiplier: profile.xp_boost_multiplier || 1,
  xpBoostExpiresAt: profile.xp_boost_expires_at || 0,
  unlimitedHeartsExpiresAt: profile.unlimited_hearts_expires_at || 0,
  projects: 0,
});

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(defaultGuestUser);
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    updateProfile: updateSupabaseProfile,
    applyAuthoritativeProfile,
    user: authUser,
    profile: authProfile,
    loading: authLoading,
  } = useAuth();
  const [heartLostThisQuestion, setHeartLostThisQuestion] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Transaction management refs
  const transactionQueue = useRef<Transaction[]>([]);
  const isProcessingTransaction = useRef(false);
  const lastUpdateTimestamp = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationCounterRef = useRef(0);
  const lastNotificationRef = useRef<{ key: string; timestamp: number } | null>(null);

  // Function to add a notification to the state and auto-remove it
  const addNotification = useCallback((message: string, icon?: string, type: Notification['type'] = 'success') => {
    const dedupeKey = `${type}:${icon || ''}:${message}`;
    const now = Date.now();

    if (lastNotificationRef.current && lastNotificationRef.current.key === dedupeKey && now - lastNotificationRef.current.timestamp < 1500) {
      return;
    }

    lastNotificationRef.current = { key: dedupeKey, timestamp: now };
    notificationCounterRef.current += 1;

    const id = `${now}-${notificationCounterRef.current}`;
    setNotifications(prev => [...prev, { id, message, icon, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000); // Notifications disappear after 5 seconds
  }, []);

  const isAuthenticatedSessionUser = !!authUser?.id && authUser.id !== 'guest';

  const logUnexpectedProgressionError = useCallback((message: string, error: unknown) => {
    if (isProgressionApiUnavailableError(error)) {
      return;
    }

    console.error(message, error);
  }, []);

  const pushAchievementNotifications = useCallback((entries: Array<Record<string, any>> = []) => {
    entries.forEach((achievement) => {
      if (!achievement?.name) return;
      const xpReward = Number(achievement?.reward?.xp || 0);
      const rewardSuffix = xpReward > 0 ? ` +${xpReward} XP` : '';
      addNotification(`Achievement Unlocked: ${achievement.name}!${rewardSuffix}`, achievement.icon, 'success');
    });
  }, [addNotification]);

  const applyProgressionResponse = useCallback(async (response: ProgressionResponse, options: { notifyAchievements?: boolean } = {}) => {
    if (!response?.profile) return;

    await applyAuthoritativeProfile(response.profile);
    setUser(mapProfileToUser(response.profile));
    lastUpdateTimestamp.current = Date.now();

    if (options.notifyAchievements !== false) {
      pushAchievementNotifications(response.newlyUnlockedAchievements || []);
    }
  }, [applyAuthoritativeProfile, pushAchievementNotifications]);

  const refreshAuthoritativeProfile = useCallback(async () => {
    if (!authUser?.id || authUser.id === 'guest') {
      return;
    }

    try {
      const { data, error } = await getUserProfile(authUser.id);
      if (error) {
        console.error('Database refresh failed:', error);
        return;
      }

      if (data) {
        await applyAuthoritativeProfile(data);
        setUser(mapProfileToUser(data));
        lastUpdateTimestamp.current = Date.now();
      }
    } catch (error) {
      console.error('Force refresh error:', error);
    }
  }, [applyAuthoritativeProfile, authUser?.id]);

  // Atomic transaction processor
  const processTransactionQueue = useCallback(async () => {
    if (isProcessingTransaction.current || transactionQueue.current.length === 0) {
      return;
    }

    isProcessingTransaction.current = true;
    let transactions: Transaction[] = [];

    try {
      transactions = [...transactionQueue.current];
      transactionQueue.current = [];

      if (transactions.length === 0) {
        isProcessingTransaction.current = false;
        return;
      }

      const mergedUpdates: Partial<User> = {};
      let currentState = { ...user };

      for (const transaction of transactions) {
        currentState = { ...currentState, ...transaction.updates };
        Object.assign(mergedUpdates, transaction.updates);
      }

      const effectiveUpdates = isAuthenticatedSessionUser
        ? Object.fromEntries(
            Object.entries(mergedUpdates).filter(([key]) => AUTHENTICATED_MUTABLE_USER_FIELDS.has(key as keyof User))
          ) as Partial<User>
        : mergedUpdates;

      const blockedKeys = isAuthenticatedSessionUser
        ? Object.keys(mergedUpdates).filter((key) => !AUTHENTICATED_MUTABLE_USER_FIELDS.has(key as keyof User))
        : [];

      if (blockedKeys.length > 0) {
        console.warn('Authoritative progression blocked client-side updates for authenticated user:', blockedKeys);
      }

      const finalState = { ...user, ...effectiveUpdates };
      if (finalState.coins < 0) finalState.coins = 0;
      if (finalState.hearts < 0) finalState.hearts = 0;
      if (finalState.xp < 0) finalState.xp = 0;

      setUser(finalState);
      lastUpdateTimestamp.current = Date.now();

      if (isAuthenticatedSessionUser && typeof updateSupabaseProfile === 'function' && Object.keys(effectiveUpdates).length > 0) {
        const profileUpdates: Partial<UserProfile> = {};
        if (effectiveUpdates.name !== undefined) profileUpdates.name = finalState.name;
        await updateSupabaseProfile(profileUpdates);
      }

      transactions.forEach(transaction => transaction.resolve());
    } catch (error) {
      console.error('Transaction processing failed:', error);
      transactions.forEach(transaction => transaction.reject(error));
    } finally {
      isProcessingTransaction.current = false;

      if (transactionQueue.current.length > 0) {
        setTimeout(() => processTransactionQueue(), 0);
      }
    }
  }, [isAuthenticatedSessionUser, updateSupabaseProfile, user]);

  // Debounced batch update function (queues updates)
  const queueUpdate = useCallback((updates: Partial<User>): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction: Transaction = {
        id: `${Date.now()}-${Math.random()}`,
        updates,
        timestamp: Date.now(),
        resolve,
        reject
      };

      transactionQueue.current.push(transaction);
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        processTransactionQueue();
      }, 50); // 50ms debounce for batching rapid updates
    });
  }, [processTransactionQueue]);

  // Public function to update user state, using the transaction queue
  const updateUser = useCallback(async (updates: Partial<User>) => {
    return queueUpdate(updates);
  }, [queueUpdate]);

  // NEW: Function to refresh display name from auth, using updateUser
  const refreshDisplayName = useCallback(async () => {
    if (!user || user.id === 'guest' || !authUser?.id) return

    try {
      console.log('ðŸ”„ UserContext: Refreshing display name from auth...')
      const displayName = await getDisplayName(authUser.id)
      
      if (displayName && displayName !== user.name && displayName !== 'Unknown User') {
        console.log('ðŸ”„ UserContext: Updating display name:', displayName, '(was:', user.name, ')')
        await updateUser({ name: displayName }) // Use the atomic updateUser
        addNotification('Display name updated!', 'ðŸ‘¤', 'info')
      }
    } catch (error) {
      console.error('Error refreshing display name:', error)
    }
  }, [user, authUser?.id, updateUser, addNotification]); // Dependencies for refreshDisplayName

  // Effect for initializing user state from AuthContext
  useEffect(() => {
    userDebugLog('UserContext: Initialization effect triggered:', {
      authLoading,
      hasAuthUser: !!authUser,
      hasProfile: !!authProfile,
      isInitialized,
      currentUserId: user?.id
    });

    if (authLoading) {
      userDebugLog('UserContext: AuthContext still loading, waiting...');
      return;
    }

    if (authUser && authProfile) {
      setUser(mapProfileToUser(authProfile));
      setIsInitialized(true);
      return;
    }

    if (!authUser && (user.id !== 'guest' || !isInitialized)) {
      setUser(defaultGuestUser);
      setIsInitialized(true);
    }
  }, [authUser, authProfile, authLoading, isInitialized, user?.id]);

  useEffect(() => {
    if (!authUser?.id || authUser.id === 'guest') {
      return;
    }

    let cancelled = false;

    const primeDuelRatingCache = async () => {
      const cachedRating = getCachedDuelRating(authUser.id);
      if (cachedRating !== null) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('duel_users')
          .select('rating')
          .eq('id', authUser.id)
          .maybeSingle();

        if (cancelled || error) {
          return;
        }

        cacheDuelRating(authUser.id, data?.rating ?? DEFAULT_DUEL_RATING);
      } catch (error) {
        userDebugLog('UserContext: Failed to prime duel rating cache:', error);
      }
    };

    void primeDuelRatingCache();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  const isLoading = authLoading && !isInitialized;

  // Check if XP boost is active
  const isXPBoostActive = useCallback((): boolean => {
    return !!(user.xpBoostExpiresAt && user.xpBoostExpiresAt > Date.now());
  }, [user.xpBoostExpiresAt]);

  // Check if unlimited hearts is active
  const isUnlimitedHeartsActive = useCallback((): boolean => {
    const isActive = !!(user.unlimitedHeartsExpiresAt && user.unlimitedHeartsExpiresAt > Date.now());
    return isActive;
  }, [user.unlimitedHeartsExpiresAt]);

  // Effect to manage boost expirations and unlimited hearts state
  useEffect(() => {
    if (!isInitialized || user.id === 'guest') return;

    let cancelled = false;
    const refreshIntervalMs = isAuthenticatedSessionUser ? 30_000 : 3_000;

    const checkBoosts = async () => {
      if (isAuthenticatedSessionUser) {
        try {
          const response = await refreshProgressionState();
          if (!cancelled) {
            await applyProgressionResponse(response, { notifyAchievements: false });
          }
        } catch (error) {
          logUnexpectedProgressionError('Could not refresh authoritative progression state:', error);
        }
        return;
      }

      const now = Date.now();
      let needsUpdate = false;
      const updates: Partial<User> = {};

      if (user.xpBoostExpiresAt && user.xpBoostExpiresAt <= now && user.xpBoostMultiplier && user.xpBoostMultiplier > 1) {
        updates.xpBoostMultiplier = 1;
        updates.xpBoostExpiresAt = 0;
        needsUpdate = true;
        addNotification('XP Boost expired', '\u26A1', 'info');
      }

      if (user.unlimitedHeartsExpiresAt && user.unlimitedHeartsExpiresAt <= now) {
        updates.unlimitedHeartsExpiresAt = 0;
        needsUpdate = true;
        addNotification('Unlimited Hearts expired', '\u{1F496}', 'info');
      }

      const unlimitedActive = user.unlimitedHeartsExpiresAt && user.unlimitedHeartsExpiresAt > now;
      if (unlimitedActive && user.hearts < user.maxHearts) {
        updates.hearts = user.maxHearts;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await queueUpdate(updates);
      }
    };

    void checkBoosts();

    const interval = setInterval(() => {
      void checkBoosts();
    }, refreshIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    addNotification,
    applyProgressionResponse,
    isAuthenticatedSessionUser,
    isInitialized,
    logUnexpectedProgressionError,
    queueUpdate,
    user.hearts,
    user.id,
    user.maxHearts,
    user.unlimitedHeartsExpiresAt,
    user.xpBoostExpiresAt,
    user.xpBoostMultiplier,
  ]);

  const buyHearts = useCallback(async (amount: number): Promise<boolean> => {
    if (isAuthenticatedSessionUser) {
      try {
        const response = await buyHeartsProgression(amount);
        await applyProgressionResponse(response);
        const purchased = Number(response.heartsPurchased || 0);
        if (purchased > 0) {
          addNotification(`Purchased ${purchased} heart${purchased > 1 ? 's' : ''}!`, '\u2764\uFE0F', 'success');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Heart purchase failed:', error);
        return false;
      }
    }

    const cost = amount * 20;
    if (user.coins < cost || user.hearts >= user.maxHearts) {
      return false;
    }

    const heartsToAdd = Math.min(amount, user.maxHearts - user.hearts);
    const actualCost = heartsToAdd * 20;

    try {
      await queueUpdate({
        coins: user.coins - actualCost,
        hearts: user.hearts + heartsToAdd,
      });

      addNotification(`Purchased ${heartsToAdd} heart${heartsToAdd > 1 ? 's' : ''}!`, '\u2764\uFE0F', 'success');
      return true;
    } catch (error) {
      console.error('Heart purchase failed:', error);
      return false;
    }
  }, [addNotification, applyProgressionResponse, isAuthenticatedSessionUser, queueUpdate, user.coins, user.hearts, user.maxHearts]);

  const buyAvatar = useCallback(async (avatarId: string): Promise<boolean> => {
    const avatar = avatars.find(a => a.id === avatarId);
    if (!avatar) {
      return false;
    }

    if (isAuthenticatedSessionUser) {
      try {
        const response = await purchaseAvatarProgression(avatarId);
        await applyProgressionResponse(response);
        if (response.alreadyOwned) {
          return false;
        }

        addNotification('Avatar Purchased', '\u{1F3AD}', 'success');
        return true;
      } catch (error) {
        console.error('Avatar purchase failed:', error);
        return false;
      }
    }

    if (user.ownedAvatars.includes(avatarId) || user.coins < avatar.price) {
      return false;
    }

    try {
      await queueUpdate({
        coins: user.coins - avatar.price,
        ownedAvatars: [...user.ownedAvatars, avatarId],
        currentAvatar: avatarId,
      });

      addNotification('Avatar Purchased', '\u{1F3AD}', 'success');
      return true;
    } catch (error) {
      console.error('Avatar purchase failed:', error);
      return false;
    }
  }, [addNotification, applyProgressionResponse, isAuthenticatedSessionUser, queueUpdate, user.coins, user.ownedAvatars]);

  const purchaseWithCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (isAuthenticatedSessionUser) {
      console.warn('Direct authenticated coin spending is disabled.');
      return false;
    }

    if (user.coins < amount) return false;

    try {
      await queueUpdate({ coins: user.coins - amount });
      return true;
    } catch (error) {
      console.error('Coin purchase failed:', error);
      return false;
    }
  }, [isAuthenticatedSessionUser, queueUpdate, user.coins]);

  const addCoins = useCallback(async (amount: number): Promise<void> => {
    if (isAuthenticatedSessionUser) {
      console.warn('Direct authenticated coin grants are disabled.');
      await refreshAuthoritativeProfile();
      return;
    }

    await queueUpdate({
      coins: user.coins + amount,
      totalCoinsEarned: user.totalCoinsEarned + amount,
    });
  }, [isAuthenticatedSessionUser, queueUpdate, refreshAuthoritativeProfile, user.coins, user.totalCoinsEarned]);

  const activateXPBoost = useCallback(async (multiplier: number, durationHours: number) => {
    if (isAuthenticatedSessionUser) {
      console.warn('Authoritative XP boost activation is not available from the client helper.');
      await refreshAuthoritativeProfile();
      return;
    }

    const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
    await queueUpdate({
      xpBoostMultiplier: multiplier,
      xpBoostExpiresAt: expiresAt
    });

    addNotification(
      `${multiplier}x XP Boost activated for ${durationHours} hour${durationHours > 1 ? 's' : ''}!`,
      '\u26A1',
      'success'
    );
  }, [addNotification, isAuthenticatedSessionUser, queueUpdate, refreshAuthoritativeProfile]);

  const activateUnlimitedHearts = useCallback(async (durationHours: number) => {
    if (isAuthenticatedSessionUser) {
      console.warn('Authoritative unlimited hearts activation is not available from the client helper.');
      await refreshAuthoritativeProfile();
      return;
    }

    const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
    await queueUpdate({
      unlimitedHeartsExpiresAt: expiresAt,
      hearts: user.maxHearts
    });

    addNotification(
      `Unlimited Hearts activated for ${durationHours} hour${durationHours > 1 ? 's' : ''}!`,
      '\u{1F496}',
      'success'
    );
  }, [addNotification, isAuthenticatedSessionUser, queueUpdate, refreshAuthoritativeProfile, user.maxHearts]);

  const refillHearts = useCallback(async () => {
    if (isAuthenticatedSessionUser) {
      console.warn('Authoritative heart refills are not available from the client helper.');
      try {
        const response = await refreshProgressionState();
        await applyProgressionResponse(response, { notifyAchievements: false });
      } catch (error) {
        logUnexpectedProgressionError('Could not refresh authoritative progression state:', error);
        throw error;
      }
      return;
    }

    await queueUpdate({ hearts: user.maxHearts });
    addNotification('Hearts refilled!', '\u2764\uFE0F', 'success');
  }, [addNotification, applyProgressionResponse, isAuthenticatedSessionUser, logUnexpectedProgressionError, queueUpdate, user.maxHearts]);

  const debugUserState = useCallback(() => {
    console.log('ðŸ” FULL DEBUG STATE:', {
      timestamp: new Date().toISOString(),
      userContext: {
        id: user?.id,
        name: user?.name,
        xp: user?.xp,
        totalLessons: user?.totalLessonsCompleted,
        coins: user?.coins,
        hearts: user?.hearts,
        unlimitedHeartsActive: isUnlimitedHeartsActive(),
        unlimitedHeartsExpiresAt: user?.unlimitedHeartsExpiresAt,
        xpBoostActive: isXPBoostActive(),
        xpBoostExpiresAt: user?.xpBoostExpiresAt,
        isLoading,
        isInitialized
      },
      authContext: {
        userId: authUser?.id,
        profileId: authProfile?.id,
        profileName: authProfile?.name,
        profileXP: authProfile?.xp,
        profileLessons: authProfile?.total_lessons_completed,
        profileCoins: authProfile?.coins,
        authLoading
      },
      transactionSystem: {
        queueLength: transactionQueue.current.length,
        isProcessing: isProcessingTransaction.current,
        lastUpdate: lastUpdateTimestamp.current
      }
    });
  }, [user, authUser, authProfile, isLoading, isInitialized, authLoading, isUnlimitedHeartsActive, isXPBoostActive]);

  const forceRefreshFromDatabase = refreshAuthoritativeProfile;


  const verifyDatabaseSync = useCallback(async () => {
    if (!authUser?.id || authUser.id === 'guest') return;

    try {
      console.log('ðŸ” VERIFYING DATABASE SYNC...');
      const { data } = await getUserProfile(authUser.id);
      if (data) {
        const hasDiscrepancy = 
          data.name !== user.name ||
          data.xp !== user.xp ||
          data.total_lessons_completed !== user.totalLessonsCompleted ||
          data.coins !== user.coins ||
          (data.completed_lessons?.length || 0) !== user.completedLessons.length ||
          (data.xp_boost_multiplier || 1) !== (user.xpBoostMultiplier || 1) ||
          (data.xp_boost_expires_at || 0) !== (user.xpBoostExpiresAt || 0) ||
          (data.unlimited_hearts_expires_at || 0) !== (user.unlimitedHeartsExpiresAt || 0);

        if (hasDiscrepancy) {
          console.warn('âš ï¸ DATABASE MISMATCH DETECTED! Auto-syncing from database...');
          await forceRefreshFromDatabase();
        } else {
          console.log('âœ… DATABASE SYNC VERIFIED - All data matches including display name');
        }
      }
    } catch (error) {
      console.error('âŒ Database verification failed: ', error);
    }
  }, [authUser?.id, user, forceRefreshFromDatabase]);

  const setAuthenticatedUser = useCallback((userData: Partial<User>) => {
    console.warn('âš ï¸ setAuthenticatedUser is deprecated - initialization is now automatic. Do not use this function.');
    // This function is deprecated as user initialization is now handled by AuthContext and this effect.
    // If you need to update user data, use `updateUser`.
  }, []);

  const resetToGuestUser = useCallback(() => {
    console.log('ðŸ”§ RESETTING TO GUEST USER');
    setUser(defaultGuestUser);
    setHeartLostThisQuestion(false);
    transactionQueue.current = []; // Clear transaction queue
    isProcessingTransaction.current = false;
  }, []);

  const isAuthenticated = useCallback((): boolean => {
    const authenticated = user.id !== 'guest' && user.id !== undefined && authUser?.id === user.id;
    return authenticated;
  }, [user.id, authUser?.id]);


  const checkAndUnlockAchievements = useCallback(async () => {
    if (!user || user.id === 'guest' || !user.unlockedAchievements) {
      return;
    }

    if (isAuthenticatedSessionUser) {
      try {
        const response = await recomputeAchievements();
        await applyProgressionResponse(response);
      } catch (error) {
        console.error('Could not recompute authoritative achievements:', error);
      }
      return;
    }

    const unlockedSet = new Set(user.unlockedAchievements || []);
    const newlyUnlockedAchievements = checkAchievements(user, user.lifetimeCompletedLessons).filter(
      (achievement) => !unlockedSet.has(achievement.id)
    );

    if (newlyUnlockedAchievements.length > 0) {
      let totalXPFromAchievements = 0;
      const updatedUnlockedAchievements = new Set(user.unlockedAchievements || []);

      newlyUnlockedAchievements.forEach(achievement => {
        totalXPFromAchievements += achievement.reward.xp;
        updatedUnlockedAchievements.add(achievement.id);

        addNotification(
          `Achievement Unlocked: ${achievement.name}! +${achievement.reward.xp} XP`,
          achievement.icon,
          'success'
        );
      });

      await queueUpdate({
        xp: user.xp + totalXPFromAchievements,
        unlockedAchievements: Array.from(updatedUnlockedAchievements),
        level: calculateLevelFromXP(user.xp + totalXPFromAchievements),
      });
    }
  }, [addNotification, applyProgressionResponse, isAuthenticatedSessionUser, queueUpdate, user]);

  const completeLesson = useCallback(async (lessonId: string, xpReward: number, coinsReward: number, actualTimeMinutes?: number) => {
    if (isAuthenticatedSessionUser) {
      try {
        const response = await completeLessonProgression({
          lessonId,
          actualTimeMinutes,
        });
        await applyProgressionResponse(response);
        return;
      } catch (error) {
        console.error('Authoritative lesson completion failed:', error);
        throw error;
      }
    }

    const timestamp = new Date().toISOString();
    console.log('LESSON COMPLETION STARTED:', {
      timestamp,
      lessonId,
      xpReward,
      coinsReward,
      currentState: {
        xp: user.xp,
        coins: user.coins,
        totalLessons: user.totalLessonsCompleted,
        completedLessons: user.completedLessons.length,
        currentCompletedLessons: user.completedLessons
      }
    });

    if (user.completedLessons.includes(lessonId)) {
      return;
    }

    const today = getLocalDateKey();
    const yesterday = getPreviousDateKey();
    const isSameDay = user.lastLoginDate === today;
    const isConsecutiveDay = user.lastLoginDate === yesterday;

    const boostMultiplier = isXPBoostActive() ? (user.xpBoostMultiplier || 1) : 1;
    const boostedXP = Math.floor(xpReward * boostMultiplier);

    const updatedCompletedLessons = [...user.completedLessons, lessonId];
    const updatedLifetimeCompletedLessons = user.lifetimeCompletedLessons.includes(lessonId)
      ? user.lifetimeCompletedLessons
      : [...user.lifetimeCompletedLessons, lessonId];
    const newXP = user.xp + boostedXP;
    const newLevel = calculateLevelFromXP(newXP);
    const newCoins = user.coins + coinsReward;
    const newTotalCoins = user.totalCoinsEarned + coinsReward;
    const newTotalLessons = user.totalLessonsCompleted + 1;

    const lessonUpdates = {
      xp: newXP,
      coins: newCoins,
      totalCoinsEarned: newTotalCoins,
      completedLessons: updatedCompletedLessons,
      lifetimeCompletedLessons: updatedLifetimeCompletedLessons,
      totalLessonsCompleted: newTotalLessons,
      level: newLevel,
      currentStreak: isSameDay ? user.currentStreak : isConsecutiveDay ? user.currentStreak + 1 : 1,
      lastLoginDate: today,
    };

    try {
      await queueUpdate(lessonUpdates);

      try {
        await supabase.from('lesson_completion_events').insert({
          user_id: user.id,
          lesson_id: lessonId,
          xp_earned: boostedXP,
          coins_earned: coinsReward,
        });
      } catch (eventError) {
        console.error('Failed to record lesson completion event:', eventError);
      }

      const updatedUserForAchievements = {
        ...user,
        ...lessonUpdates
      };

      const unlockedSet = new Set(updatedUserForAchievements.unlockedAchievements || []);
      const newlyUnlockedAchievements = checkAchievements(
        updatedUserForAchievements,
        updatedUserForAchievements.lifetimeCompletedLessons
      ).filter((achievement) => !unlockedSet.has(achievement.id));

      if (newlyUnlockedAchievements.length > 0) {
        let totalAchievementXP = 0;
        const updatedUnlockedAchievements = new Set(updatedUserForAchievements.unlockedAchievements || []);

        newlyUnlockedAchievements.forEach(achievement => {
          totalAchievementXP += achievement.reward.xp;
          updatedUnlockedAchievements.add(achievement.id);

          addNotification(
            `Achievement Unlocked: ${achievement.name}! +${achievement.reward.xp} XP`,
            achievement.icon,
            'success'
          );
        });

        const finalXP = newXP + totalAchievementXP;
        const finalLevel = calculateLevelFromXP(finalXP);

        await queueUpdate({
          xp: finalXP,
          level: finalLevel,
          unlockedAchievements: Array.from(updatedUnlockedAchievements),
        });
      }
    } catch (error) {
      console.error('LESSON COMPLETION FAILED:', {
        timestamp,
        error,
        lessonId,
        updates: lessonUpdates
      });
      throw error;
    }
  }, [addNotification, applyProgressionResponse, isAuthenticatedSessionUser, isXPBoostActive, queueUpdate, user]);

  const resetHeartLoss = useCallback(() => {
    setHeartLostThisQuestion(false);
  }, []);

  const resetHeartsIfNeeded = useCallback(async () => {
    if (isAuthenticatedSessionUser) {
      try {
        const response = await refreshProgressionState();
        await applyProgressionResponse(response, { notifyAchievements: false });
      } catch (error) {
        logUnexpectedProgressionError('Could not refresh hearts from authoritative progression state:', error);
      }
      return;
    }

    const today = new Date().toDateString();
    if (user.lastHeartReset !== today) {
      await queueUpdate({
        hearts: user.maxHearts,
        lastHeartReset: today,
      });
    }
  }, [applyProgressionResponse, isAuthenticatedSessionUser, logUnexpectedProgressionError, queueUpdate, user.lastHeartReset, user.maxHearts]);

  const loseHeart = useCallback(() => {
    if (heartLostThisQuestion) return;

    if (isAuthenticatedSessionUser) {
      setHeartLostThisQuestion(true);
      void (async () => {
        try {
          const response = await consumeHeartProgression(1);
          await applyProgressionResponse(response, { notifyAchievements: false });
        } catch (error) {
          console.error('Authoritative heart consumption failed:', error);
          setHeartLostThisQuestion(false);
        }
      })();
      return;
    }

    if (isUnlimitedHeartsActive()) {
      if (user.hearts < user.maxHearts) {
        void queueUpdate({ hearts: user.maxHearts });
      }
      return;
    }

    setHeartLostThisQuestion(true);
    void queueUpdate({ hearts: Math.max(0, user.hearts - 1) });
  }, [applyProgressionResponse, heartLostThisQuestion, isAuthenticatedSessionUser, isUnlimitedHeartsActive, queueUpdate, user.hearts, user.maxHearts]);

  const setAvatar = useCallback((avatarId: string) => {
    if (isAuthenticatedSessionUser) {
      void (async () => {
        try {
          const response = await equipAvatarProgression(avatarId);
          await applyProgressionResponse(response, { notifyAchievements: false });
        } catch (error) {
          console.error('Authoritative avatar equip failed:', error);
        }
      })();
      return;
    }

    if (!user.ownedAvatars.includes(avatarId)) return;
    void queueUpdate({ currentAvatar: avatarId });
  }, [applyProgressionResponse, isAuthenticatedSessionUser, queueUpdate, user.ownedAvatars]);

  const unlockAchievement = useCallback(async (achievementId: string, xpReward: number) => {
    if (isAuthenticatedSessionUser) {
      await checkAndUnlockAchievements();
      return;
    }

    if (!isAuthenticated()) return;
    if (user.unlockedAchievements.includes(achievementId)) return;

    const updatedUnlockedAchievements = [...user.unlockedAchievements, achievementId];
    const newXP = user.xp + xpReward;
    const newLevel = calculateLevelFromXP(newXP);

    await queueUpdate({
      xp: newXP,
      unlockedAchievements: updatedUnlockedAchievements,
      level: newLevel,
    });

    const unlockedAch = checkAchievements(user, user.completedLessons).find(a => a.id === achievementId);
    if (unlockedAch) {
      addNotification(
        `Achievement Unlocked: ${unlockedAch.name}! +${xpReward} XP`,
        unlockedAch.icon,
        'success'
      );
    }
  }, [addNotification, checkAndUnlockAchievements, isAuthenticated, isAuthenticatedSessionUser, queueUpdate, user]);
  const getActiveBoosts = useCallback(() => {
    const boosts: { xpBoost?: { multiplier: number; expiresAt: number }; unlimitedHearts?: { expiresAt: number } } = {};
    
    if (isXPBoostActive()) {
      boosts.xpBoost = {
        multiplier: user.xpBoostMultiplier || 1,
        expiresAt: user.xpBoostExpiresAt || 0
      };
    }
    
    if (isUnlimitedHeartsActive()) {
      boosts.unlimitedHearts = {
        expiresAt: user.unlimitedHeartsExpiresAt || 0
      };
    }
    
    return boosts;
  }, [isXPBoostActive, isUnlimitedHeartsActive, user.xpBoostMultiplier, user.xpBoostExpiresAt, user.unlimitedHeartsExpiresAt]);

  const getLanguageProgress = useCallback((language: string) => {
    const validLanguages = ["python", "javascript", "cpp", "java"] as const;
    type ValidLanguage = typeof validLanguages[number];
    
    if (!validLanguages.includes(language as ValidLanguage)) {
      console.warn(`Invalid language: ${language}. Returning empty progress.`);
      return { completed: 0, total: 0, percentage: 0 };
    }

    const totalLessons = getLessonCountByLanguage(language as ValidLanguage);
    const completed = countCompletedLessonsByLanguage(language as ValidLanguage, user.completedLessons);

    return {
      completed,
      total: totalLessons,
      percentage: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
    };
  }, [user.completedLessons]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      updateUser,
      completeLesson,
      loseHeart,
      buyHearts,
      buyAvatar,
      setAvatar,
      purchaseWithCoins,
      addCoins,
      resetHeartsIfNeeded,
      resetHeartLoss,
      getLanguageProgress,
      setAuthenticatedUser, // Deprecated
      resetToGuestUser,
      isAuthenticated,
      unlockAchievement,
      debugUserState,
      verifyDatabaseSync,
      forceRefreshFromDatabase,
      checkAndUnlockAchievements,
      activateXPBoost,
      activateUnlimitedHearts,
      refillHearts,
      isXPBoostActive,
      isUnlimitedHeartsActive,
      getActiveBoosts,
      addNotification: (notification: { message: string; type: 'success' | 'info' | 'warning' | 'error'; icon?: string }) => {
        addNotification(notification.message, notification.icon, notification.type);
      },
      refreshDisplayName,
    }}>
      {children}
      <NotificationDisplay notifications={notifications} />
    </UserContext.Provider>
  );
};

// Custom hook to use UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};



