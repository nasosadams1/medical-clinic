// UserContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { calculateLevelFromXP } from '../hooks/levelSystem';
import { useAuth } from './AuthContext';
import { UserProfile, getUserProfile, getDisplayName, supabase } from '../lib/supabase';
import { checkAchievements, Achievement } from '../data/achievements';
import { avatars } from '../data/avatars';
import { getLessonsByLanguage, getLessonById } from '../data/lessons';

import NotificationDisplay from '../components/NotificationDisplay.tsx';

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
  completeLesson: (lessonId: string, xpReward: number, coinsReward: number) => Promise<void>;
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

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(defaultGuestUser);
  const [isInitialized, setIsInitialized] = useState(false);
  const { updateProfile: updateSupabaseProfile, user: authUser, profile: authProfile, loading: authLoading } = useAuth();
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

  // Atomic transaction processor
  const processTransactionQueue = useCallback(async () => {
    if (isProcessingTransaction.current || transactionQueue.current.length === 0) {
      return;
    }

    isProcessingTransaction.current = true;
    
    try {
      const transactions = [...transactionQueue.current];
      transactionQueue.current = []; // Clear queue before processing

      if (transactions.length === 0) {
        isProcessingTransaction.current = false;
        return;
      }

      // Merge all updates into a single atomic operation for local state
      const mergedUpdates: Partial<User> = {};
      let currentState = { ...user };
      
      for (const transaction of transactions) {
        currentState = { ...currentState, ...transaction.updates };
        Object.assign(mergedUpdates, transaction.updates);
      }

      // Validate the final state to prevent negative values
      const finalState = { ...user, ...mergedUpdates };
      if (finalState.coins < 0) finalState.coins = 0;
      if (finalState.hearts < 0) finalState.hearts = 0;
      if (finalState.xp < 0) finalState.xp = 0;

      // Update local state immediately
      setUser(finalState);
      lastUpdateTimestamp.current = Date.now();

      // Sync to database if authenticated
      const supabaseUserId = authUser?.id;
      const hasSupabaseFunction = typeof updateSupabaseProfile === 'function';
      const isUserAuthenticated = supabaseUserId && supabaseUserId !== 'guest';

      if (isUserAuthenticated && hasSupabaseFunction && Object.keys(mergedUpdates).length > 0) {
        const profileUpdates: Partial<UserProfile> = {};
        
        // Map local user updates to Supabase UserProfile fields
        if (mergedUpdates.name !== undefined) profileUpdates.name = finalState.name;
        if (mergedUpdates.coins !== undefined) profileUpdates.coins = finalState.coins;
        if (mergedUpdates.totalCoinsEarned !== undefined) profileUpdates.total_coins_earned = finalState.totalCoinsEarned;
        if (mergedUpdates.xp !== undefined) profileUpdates.xp = finalState.xp;
        if (mergedUpdates.completedLessons !== undefined) profileUpdates.completed_lessons = finalState.completedLessons;
        if (mergedUpdates.lifetimeCompletedLessons !== undefined) profileUpdates.lifetime_completed_lessons = finalState.lifetimeCompletedLessons;
        if (mergedUpdates.level !== undefined) profileUpdates.level = finalState.level;
        if (mergedUpdates.hearts !== undefined) profileUpdates.hearts = finalState.hearts;
        if (mergedUpdates.currentAvatar !== undefined) profileUpdates.current_avatar = finalState.currentAvatar;
        if (mergedUpdates.ownedAvatars !== undefined) profileUpdates.owned_avatars = finalState.ownedAvatars;
        if (mergedUpdates.unlockedAchievements !== undefined) profileUpdates.unlocked_achievements = finalState.unlockedAchievements;
        if (mergedUpdates.currentStreak !== undefined) profileUpdates.current_streak = finalState.currentStreak;
        if (mergedUpdates.lastLoginDate !== undefined) profileUpdates.last_login_date = finalState.lastLoginDate;
        if (mergedUpdates.totalLessonsCompleted !== undefined) profileUpdates.total_lessons_completed = finalState.totalLessonsCompleted;
        if (mergedUpdates.lastHeartReset !== undefined) profileUpdates.last_heart_reset = finalState.lastHeartReset;
        if (mergedUpdates.xpBoostMultiplier !== undefined) profileUpdates.xp_boost_multiplier = finalState.xpBoostMultiplier;
        if (mergedUpdates.xpBoostExpiresAt !== undefined) profileUpdates.xp_boost_expires_at = finalState.xpBoostExpiresAt;
        if (mergedUpdates.unlimitedHeartsExpiresAt !== undefined) profileUpdates.unlimited_hearts_expires_at = finalState.unlimitedHeartsExpiresAt;

        await updateSupabaseProfile(profileUpdates); // Sync to Supabase
      }

      transactions.forEach(transaction => transaction.resolve()); // Resolve all transactions
      
    } catch (error) {
      console.error('❌ Transaction processing failed:', error);
      
      const transactions = [...transactionQueue.current];
      transactionQueue.current = [];
      transactions.forEach(transaction => transaction.reject(error)); // Reject all on error
      
    } finally {
      isProcessingTransaction.current = false;
      
      // Process any new transactions that arrived during processing
      if (transactionQueue.current.length > 0) {
        setTimeout(() => processTransactionQueue(), 0);
      }
    }
  }, [user, updateSupabaseProfile, authUser]);

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
      console.log('🔄 UserContext: Refreshing display name from auth...')
      const displayName = await getDisplayName(authUser.id)
      
      if (displayName && displayName !== user.name && displayName !== 'Unknown User') {
        console.log('🔄 UserContext: Updating display name:', displayName, '(was:', user.name, ')')
        await updateUser({ name: displayName }) // Use the atomic updateUser
        addNotification('Display name updated!', '👤', 'info')
      }
    } catch (error) {
      console.error('Error refreshing display name:', error)
    }
  }, [user, authUser?.id, updateUser, addNotification]); // Dependencies for refreshDisplayName

  // Effect for initializing user state from AuthContext
  useEffect(() => {
    console.log('🔧 UserContext: Initialization effect triggered:', {
      authLoading,
      hasAuthUser: !!authUser,
      hasProfile: !!authProfile,
      isInitialized,
      currentUserId: user?.id
    });

    if (authLoading) {
      console.log('🔧 UserContext: AuthContext still loading, waiting...');
      return;
    }

    if (authUser && authProfile) {
      console.log('🔧 UserContext: INITIALIZING with authenticated user and display name:', authProfile.name);
      
      const authenticatedUser: User = {
        id: authProfile.id,
        name: authProfile.name, // Use display name from auth profile
        coins: authProfile.coins,
        totalCoinsEarned: authProfile.total_coins_earned,
        xp: authProfile.xp,
        completedLessons: authProfile.completed_lessons || [],
        lifetimeCompletedLessons: authProfile.lifetime_completed_lessons || authProfile.completed_lessons || [],
        level: authProfile.level,
        hearts: authProfile.hearts,
        maxHearts: authProfile.max_hearts,
        lastHeartReset: authProfile.last_heart_reset,
        currentAvatar: authProfile.current_avatar,
        ownedAvatars: authProfile.owned_avatars || ['default'],
        unlockedAchievements: authProfile.unlocked_achievements || [],
        currentStreak: authProfile.current_streak,
        lastLoginDate: authProfile.last_login_date,
        totalLessonsCompleted: authProfile.total_lessons_completed,
        unlimitedHeartsActive: false, // Managed by boost expiration
        xpBoostMultiplier: authProfile.xp_boost_multiplier || 1,
        xpBoostExpiresAt: authProfile.xp_boost_expires_at || 0,
        unlimitedHeartsExpiresAt: authProfile.unlimited_hearts_expires_at || 0,
        projects: 0, // Placeholder
      };

      setUser(authenticatedUser);
      setIsInitialized(true);
    } else if (!authUser && (user.id !== 'guest' || !isInitialized)) {
      console.log('🔧 UserContext: INITIALIZING with guest user');
      setUser(defaultGuestUser);
      setIsInitialized(true);
    } else if (isInitialized && authUser && authProfile && user?.id === authProfile.id) {
      // If already initialized and authenticated, check for profile changes from AuthContext
      const hasChanges = 
        user.name !== authProfile.name ||
        user.xp !== authProfile.xp ||
        user.totalLessonsCompleted !== authProfile.total_lessons_completed ||
        (user.lifetimeCompletedLessons?.length || 0) !== ((authProfile.lifetime_completed_lessons || authProfile.completed_lessons || []).length) ||
        user.coins !== authProfile.coins ||
        user.xpBoostMultiplier !== (authProfile.xp_boost_multiplier || 1) ||
        user.xpBoostExpiresAt !== (authProfile.xp_boost_expires_at || 0) ||
        user.unlimitedHeartsExpiresAt !== (authProfile.unlimited_hearts_expires_at || 0);

      if (hasChanges) {
        console.log('🔧 UserContext: Profile updated, syncing changes including display name');
        setUser(prev => ({
          ...prev,
          name: authProfile.name, // Sync display name
          coins: authProfile.coins,
          totalCoinsEarned: authProfile.total_coins_earned,
          xp: authProfile.xp,
          completedLessons: authProfile.completed_lessons || [],
          lifetimeCompletedLessons: authProfile.lifetime_completed_lessons || authProfile.completed_lessons || [],
          level: authProfile.level,
          hearts: authProfile.hearts,
          maxHearts: authProfile.max_hearts,
          lastHeartReset: authProfile.last_heart_reset,
          currentAvatar: authProfile.current_avatar,
          ownedAvatars: authProfile.owned_avatars || ['default'],
          unlockedAchievements: authProfile.unlocked_achievements || [],
          currentStreak: authProfile.current_streak,
          lastLoginDate: authProfile.last_login_date,
          totalLessonsCompleted: authProfile.total_lessons_completed,
          xpBoostMultiplier: authProfile.xp_boost_multiplier || 1,
          xpBoostExpiresAt: authProfile.xp_boost_expires_at || 0,
          unlimitedHeartsExpiresAt: authProfile.unlimited_hearts_expires_at || 0,
          projects: 0,
        }));
      }
    }
  }, [authUser, authProfile, authLoading, isInitialized, user?.id, user?.name, user?.xp, user?.totalLessonsCompleted, user?.lifetimeCompletedLessons, user?.coins, user?.xpBoostMultiplier, user?.xpBoostExpiresAt, user?.unlimitedHeartsExpiresAt]);

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

    const checkBoosts = () => {
      const now = Date.now();
      let needsUpdate = false;
      const updates: Partial<User> = {};

      // Check XP boost expiration
      if (user.xpBoostExpiresAt && user.xpBoostExpiresAt <= now && user.xpBoostMultiplier && user.xpBoostMultiplier > 1) {
        console.log('⚡ XP Boost expired');
        updates.xpBoostMultiplier = 1;
        updates.xpBoostExpiresAt = 0;
        needsUpdate = true;
        addNotification('XP Boost expired', '⚡', 'info');
      }

      // Check unlimited hearts expiration
      if (user.unlimitedHeartsExpiresAt && user.unlimitedHeartsExpiresAt <= now) {
        console.log('💖 Unlimited Hearts expired');
        updates.unlimitedHeartsExpiresAt = 0;
        needsUpdate = true;
        addNotification('Unlimited Hearts expired', '💖', 'info');
      }

      // CRITICAL: Maintain unlimited hearts at maximum while active
      const unlimitedActive = user.unlimitedHeartsExpiresAt && user.unlimitedHeartsExpiresAt > now;
      if (unlimitedActive && user.hearts < user.maxHearts) {
        console.log('💖 Maintaining unlimited hearts at maximum');
        updates.hearts = user.maxHearts;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log('🔄 Applying boost updates:', updates);
        queueUpdate(updates); // Apply updates using the atomic queue
      }
    };

    checkBoosts(); // Check immediately on mount/dependency change

    const interval = setInterval(checkBoosts, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval); // Cleanup interval
  }, [isInitialized, user.id, user.xpBoostExpiresAt, user.unlimitedHeartsExpiresAt, user.xpBoostMultiplier, user.hearts, user.maxHearts, addNotification, queueUpdate]);

  const buyHearts = useCallback(async (amount: number): Promise<boolean> => {
    const cost = amount * 20; // Example cost
    
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
      
      addNotification(`Purchased ${heartsToAdd} heart${heartsToAdd > 1 ? 's' : ''}!`, '❤️', 'success');
      return true;
    } catch (error) {
      console.error('❌ Heart purchase failed:', error);
      return false;
    }
  }, [user.coins, user.hearts, user.maxHearts, queueUpdate, addNotification]);

  const buyAvatar = useCallback(async (avatarId: string): Promise<boolean> => {
    const avatar = avatars.find(a => a.id === avatarId);
    if (!avatar || user.ownedAvatars.includes(avatarId) || user.coins < avatar.price) {
      return false;
    }

    try {
      await queueUpdate({
        coins: user.coins - avatar.price,
        ownedAvatars: [...user.ownedAvatars, avatarId],
        currentAvatar: avatarId,
      });
      
      addNotification(`Avatar Purchased`, '🎭', 'success');
      return true;
    } catch (error) {
      console.error('❌ Avatar purchase failed:', error);
      return false;
    }
  }, [user.ownedAvatars, user.coins, queueUpdate, addNotification]);

  const purchaseWithCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (user.coins < amount) return false;
    
    try {
      await queueUpdate({ coins: user.coins - amount });
      return true;
    } catch (error) {
      console.error('❌ Coin purchase failed:', error);
      return false;
    }
  }, [user.coins, queueUpdate]);

  const addCoins = useCallback(async (amount: number): Promise<void> => {
    await queueUpdate({
      coins: user.coins + amount,
      totalCoinsEarned: user.totalCoinsEarned + amount,
    });
  }, [user.coins, user.totalCoinsEarned, queueUpdate]);

  const activateXPBoost = useCallback(async (multiplier: number, durationHours: number) => {
    const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
    
    console.log(`⚡ ACTIVATING XP BOOST: ${multiplier}x for ${durationHours} hours, expires at:`, new Date(expiresAt));
    
    await queueUpdate({
      xpBoostMultiplier: multiplier,
      xpBoostExpiresAt: expiresAt
    });
    
    addNotification(
      `${multiplier}x XP Boost activated for ${durationHours} hour${durationHours > 1 ? 's' : ''}!`,
      '⚡',
      'success'
    );
  }, [queueUpdate, addNotification]);

  const activateUnlimitedHearts = useCallback(async (durationHours: number) => {
    const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
    
    console.log(`💖 ACTIVATING UNLIMITED HEARTS: ${durationHours} hours, expires at:`, new Date(expiresAt));
    
    await queueUpdate({
      unlimitedHeartsExpiresAt: expiresAt,
      hearts: user.maxHearts // Refill hearts to max when unlimited is activated
    });
    
    addNotification(
      `Unlimited Hearts activated for ${durationHours} hour${durationHours > 1 ? 's' : ''}!`,
      '💖',
      'success'
    );
  }, [queueUpdate, user.maxHearts, addNotification]);

  const refillHearts = useCallback(async () => {
    console.log(`❤️ Refilling hearts from ${user.hearts} to ${user.maxHearts}`);
    await queueUpdate({ hearts: user.maxHearts });
    addNotification('Hearts refilled!', '❤️', 'success');
  }, [queueUpdate, user.maxHearts, user.hearts, addNotification]);

  const debugUserState = useCallback(() => {
    console.log('🔍 FULL DEBUG STATE:', {
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

  const forceRefreshFromDatabase = useCallback(async () => {
    if (!authUser?.id || authUser.id === 'guest') {
      console.log('🔄 Cannot refresh - no authenticated user');
      return;
    }

    try {
      console.log('🔄 FORCING DATABASE REFRESH for user:', authUser.id);
      const { data, error } = await getUserProfile(authUser.id); // Fetches and syncs display name
      
      if (error) {
        console.error('❌ Database refresh failed:', error);
        return;
      }

      if (data) {
        console.log('🔄 FRESH DATABASE DATA with display name:', {
          id: data.id,
          name: data.name,
          xp: data.xp,
          totalLessons: data.total_lessons_completed,
          coins: data.coins,
          completedLessons: data.completed_lessons?.length || 0,
          xpBoostMultiplier: data.xp_boost_multiplier,
          xpBoostExpiresAt: data.xp_boost_expires_at,
          unlimitedHeartsExpiresAt: data.unlimited_hearts_expires_at
        });

        setUser({
          id: data.id,
          name: data.name,
          coins: data.coins,
          totalCoinsEarned: data.total_coins_earned,
          xp: data.xp,
          completedLessons: data.completed_lessons || [],
          lifetimeCompletedLessons: data.lifetime_completed_lessons || data.completed_lessons || [],
          level: data.level,
          hearts: data.hearts,
          maxHearts: data.max_hearts,
          lastHeartReset: data.last_heart_reset,
          currentAvatar: data.current_avatar,
          ownedAvatars: data.owned_avatars || ['default'],
          unlockedAchievements: data.unlocked_achievements || [],
          currentStreak: data.current_streak,
          lastLoginDate: data.last_login_date,
          totalLessonsCompleted: data.total_lessons_completed,
          unlimitedHeartsActive: false,
          xpBoostMultiplier: data.xp_boost_multiplier || 1,
          xpBoostExpiresAt: data.xp_boost_expires_at || 0,
          unlimitedHeartsExpiresAt: data.unlimited_hearts_expires_at || 0,
          projects: 0,
        });

        console.log('✅ USER STATE FORCE UPDATED FROM DATABASE WITH DISPLAY NAME');
      }
    } catch (error) {
      console.error('❌ Force refresh error:', error);
    }
  }, [authUser?.id]);

  const verifyDatabaseSync = useCallback(async () => {
    if (!authUser?.id || authUser.id === 'guest') return;

    try {
      console.log('🔍 VERIFYING DATABASE SYNC...');
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
          console.warn('⚠️ DATABASE MISMATCH DETECTED! Auto-syncing from database...');
          await forceRefreshFromDatabase();
        } else {
          console.log('✅ DATABASE SYNC VERIFIED - All data matches including display name');
        }
      }
    } catch (error) {
      console.error('❌ Database verification failed: ', error);
    }
  }, [authUser?.id, user, forceRefreshFromDatabase]);

  const setAuthenticatedUser = useCallback((userData: Partial<User>) => {
    console.warn('⚠️ setAuthenticatedUser is deprecated - initialization is now automatic. Do not use this function.');
    // This function is deprecated as user initialization is now handled by AuthContext and this effect.
    // If you need to update user data, use `updateUser`.
  }, []);

  const resetToGuestUser = useCallback(() => {
    console.log('🔧 RESETTING TO GUEST USER');
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
      console.log('🏆 Skipping achievement check - user not authenticated or data not ready.');
      return;
    }

    console.log('🏆 Checking achievements for user:', user.name);
    
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

      console.log(`🎉 Awarded ${totalXPFromAchievements} XP for new achievements.`);
    }
  }, [user, queueUpdate, addNotification, isAuthenticated]);

  const completeLesson = useCallback(async (lessonId: string, xpReward: number, coinsReward: number) => {
    const timestamp = new Date().toISOString();
    console.log('🎓 LESSON COMPLETION STARTED:', {
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
      console.warn('⚠️ LESSON ALREADY COMPLETED:', lessonId);
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

    console.log('🎓 LESSON COMPLETION UPDATES:', {
      timestamp,
      lessonId,
      lessonUpdates,
      calculations: {
        oldXP: user.xp,
        xpReward,
        boostedXP,
        newXP,
        oldCoins: user.coins,
        coinsReward,
        newCoins,
        oldTotalLessons: user.totalLessonsCompleted,
        newTotalLessons,
        newLevel,
        oldCompletedLessons: user.completedLessons.length,
        newCompletedLessonsCount: updatedCompletedLessons.length,
        oldLifetimeCompletedLessons: user.lifetimeCompletedLessons.length,
        newLifetimeCompletedLessons: updatedLifetimeCompletedLessons.length
      }
    });

    try {
      // CRITICAL FIX: Update lesson completion first
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
      console.log('✅ LESSON COMPLETION SUCCESS:', {
        timestamp,
        lessonId,
        newTotalCompleted: newTotalLessons,
        newCompletedLessonsArray: updatedCompletedLessons
      });

      // CRITICAL FIX: Check achievements with the UPDATED user state
      // Create a temporary updated user object for achievement checking
      const updatedUserForAchievements = {
        ...user,
        ...lessonUpdates
      };

      console.log('🏆 Checking achievements with updated state:', {
        xp: updatedUserForAchievements.xp,
        level: updatedUserForAchievements.level,
        totalLessons: updatedUserForAchievements.totalLessonsCompleted,
        completedLessons: updatedUserForAchievements.completedLessons.length,
        lifetimeCompletedLessons: updatedUserForAchievements.lifetimeCompletedLessons.length
      });

      const unlockedSet = new Set(updatedUserForAchievements.unlockedAchievements || []);
      const newlyUnlockedAchievements = checkAchievements(
        updatedUserForAchievements, 
        updatedUserForAchievements.lifetimeCompletedLessons
      ).filter((achievement) => !unlockedSet.has(achievement.id));

      if (newlyUnlockedAchievements.length > 0) {
        console.log('🎉 NEW ACHIEVEMENTS UNLOCKED:', newlyUnlockedAchievements.map(a => a.name));
        
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

        // CRITICAL FIX: Add achievement XP on top of lesson XP
        const finalXP = newXP + totalAchievementXP;
        const finalLevel = calculateLevelFromXP(finalXP);

        console.log('🎉 ADDING ACHIEVEMENT XP:', {
          lessonXP: newXP,
          achievementXP: totalAchievementXP,
          finalXP,
          finalLevel
        });

        await queueUpdate({
          xp: finalXP,
          level: finalLevel,
          unlockedAchievements: Array.from(updatedUnlockedAchievements),
        });

        console.log(`✅ Awarded ${totalAchievementXP} XP for ${newlyUnlockedAchievements.length} achievement(s).`);
      } else {
        console.log('ℹ️ No new achievements unlocked');
      }
      
    } catch (error) {
      console.error('❌ LESSON COMPLETION FAILED:', {
        timestamp,
        error,
        lessonId,
        updates: lessonUpdates
      });
      throw error;
    }
  }, [user, queueUpdate, isXPBoostActive, addNotification]); // Removed checkAndUnlockAchievements as it's called internally now

  const resetHeartLoss = useCallback(() => {
    setHeartLostThisQuestion(false);
  }, []);

  const resetHeartsIfNeeded = useCallback(async () => {
    const today = new Date().toDateString();
    if (user.lastHeartReset !== today) {
      await queueUpdate({
        hearts: user.maxHearts,
        lastHeartReset: today,
      });
    }
  }, [user.lastHeartReset, user.maxHearts, queueUpdate]);

  const loseHeart = useCallback(() => {
    if (isUnlimitedHeartsActive()) {
      console.log('💖 Unlimited hearts active - preventing heart loss and maintaining at maximum');
      if (user.hearts < user.maxHearts) {
        queueUpdate({ hearts: user.maxHearts });
      }
      return; 
    }
    
    if (heartLostThisQuestion) return;

    console.log('💔 LOSING HEART:', user.hearts);
    setHeartLostThisQuestion(true);
    queueUpdate({ hearts: Math.max(0, user.hearts - 1) });
  }, [heartLostThisQuestion, queueUpdate, isUnlimitedHeartsActive, user.hearts, user.maxHearts]);

  const setAvatar = useCallback((avatarId: string) => {
    if (!user.ownedAvatars.includes(avatarId)) return;
    queueUpdate({ currentAvatar: avatarId });
  }, [user.ownedAvatars, queueUpdate]);

  const unlockAchievement = useCallback(async (achievementId: string, xpReward: number) => { 
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
  }, [user, queueUpdate, addNotification, isAuthenticated]);
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
    
    const languageLessons = getLessonsByLanguage(language as ValidLanguage);
    const totalLessons = languageLessons.length;
    
    const completed = user.completedLessons.filter(lessonId => {
      const lesson = getLessonById(lessonId);
      return lesson && lesson.language === language;
    }).length;

    return {
      completed,
      total: totalLessons,
      percentage: Math.round((completed / totalLessons) * 100)
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











