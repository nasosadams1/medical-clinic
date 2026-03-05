// supabase.ts (frontend client configuration)
import { createClient } from '@supabase/supabase-js'

// Environment variables for the frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
}

// Optional: Validate Supabase URL format
if (!supabaseUrl.includes('supabase.co')) {
  console.error('Invalid Supabase URL format:', supabaseUrl)
  throw new Error('Invalid Supabase URL. Should be in format: https://your-project-id.supabase.co')
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Recommended for client-side applications
  }
})

// UserProfile interface for consistent type definitions
export interface UserProfile {
  id: string
  name: string
  email: string
  coins: number
  total_coins_earned: number
  xp: number
  completed_lessons: string[]
  level: number
  hearts: number
  max_hearts: number
  last_heart_reset: string
  current_avatar: string
  owned_avatars: string[]
  unlocked_achievements: string[]
  current_streak: number
  last_login_date: string
  total_lessons_completed: number
  email_verified: boolean
  created_at?: string
  updated_at?: string
  xp_boost_multiplier?: number;
  xp_boost_expires_at?: number;
  unlimited_hearts_expires_at?: number;
}

// LeaderboardEntry interface
export interface LeaderboardEntry {
  user_id: string
  xp: number
  total_lessons_completed: number
  achievements_count: number
  current_streak: number
  level: number
  user_profiles: {
    name: string
    current_avatar: string
  }
}

// Helper function to get display name from Supabase auth metadata
export const getDisplayName = async (userId: string) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user || user.id !== userId) {
      console.error('Error fetching auth user or user mismatch:', error)
      return null
    }

    // Prioritize 'display_name' set by the user, with fallbacks
    const displayName = 
      user.user_metadata?.display_name ||  // Primary: User's chosen display name
      user.user_metadata?.full_name ||     // Fallback to full name
      user.user_metadata?.name ||          // Fallback to name
      user.user_metadata?.username ||      // Fallback to username
      'Unknown User'                       // Default if no name found

    console.log('Display name from auth metadata:', {
      display_name: user.user_metadata?.display_name,
      full_name: user.user_metadata?.full_name,
      name: user.user_metadata?.name,
      username: user.user_metadata?.username,
      email: user.email,
      final_display_name: displayName
    })
    
    return displayName
  } catch (error) {
    console.error('Exception getting display name:', error)
    return null
  }
}

// Function to update display name in Supabase auth metadata
export const updateDisplayName = async (newDisplayName: string) => {
  try {
    console.log('🔄 Updating display name in Supabase auth to:', newDisplayName)
    
    const { data, error } = await supabase.auth.updateUser({
      data: { 
        display_name: newDisplayName,
        full_name: newDisplayName, // Also update full_name as backup
        name: newDisplayName       // Also update name as backup
      }
    })

    if (error) {
      console.error('❌ Error updating display name in auth:', error)
      return { data: null, error }
    }

    console.log('✅ Display name updated in Supabase auth:', data.user?.user_metadata?.display_name)
    return { data, error: null }
  } catch (error) {
    console.error('❌ Exception updating display name:', error)
    return { data: null, error }
  }
}

// Function to update a user's login streak
export const updateLoginStreak = async (userId: string) => {
  try {
    const today = new Date().toDateString()
    
    // Use maybeSingle() to gracefully handle cases where no profile is found
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('current_streak, last_login_date')
      .eq('id', userId)
      .maybeSingle() 

    if (fetchError) {
      console.error('Error fetching user profile for streak:', fetchError)
      return { data: null, error: fetchError }
    }

    if (!profile) {
      console.error('No profile found for user:', userId)
      return { data: null, error: new Error('Profile not found') }
    }

    let newStreak = 0
    const lastLoginDate = profile.last_login_date
    
    if (lastLoginDate) {
      const lastLogin = new Date(lastLoginDate)
      const todayDate = new Date(today)
      const timeDiff = todayDate.getTime() - lastLogin.getTime()
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24))
      
      if (daysDiff === 0) {
        newStreak = profile.current_streak // Already logged in today
      } else if (daysDiff === 1) {
        newStreak = profile.current_streak + 1 // Consecutive day
      } else {
        newStreak = 1 // Streak reset
      }
    } else {
      newStreak = 1 // First login
    }

    // Update the profile with the new streak and last login date
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        current_streak: newStreak,
        last_login_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .maybeSingle() // Consistent error handling

    if (error) {
      console.error('Error updating streak:', error)
      return { data: null, error }
    }

    console.log(`Streak updated for user ${userId}: ${newStreak} days`)
    return { 
      data: { 
        ...data, 
        streak_message: getStreakMessage(newStreak, profile.current_streak) 
      }, 
      error: null 
    }

  } catch (error) {
    console.error('Exception updating login streak:', error)
    return { data: null, error }
  }
}

// Helper to generate streak messages
const getStreakMessage = (newStreak: number, oldStreak: number): string => {
  if (newStreak === 1 && oldStreak > 1) {
    return `Streak reset! Starting fresh with day 1. Keep it up! 🔥`
  } else if (newStreak === 1 && oldStreak <= 1) {
    return `Welcome back! Starting your streak journey! 🌟`
  } else if (newStreak > oldStreak) {
    return `Awesome! ${newStreak} day streak! Keep the momentum going! 🔥`
  } else {
    return `${newStreak} day streak continues! 🔥`
  }
}

// Function to get streak information
export const getStreakInfo = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('current_streak, last_login_date')
      .eq('id', userId)
      .maybeSingle() // Handles null results gracefully

    if (error) {
      console.error('Error fetching streak info:', error)
      return { data: null, error }
    }

    if (!data) {
      console.warn('No profile found for streak info:', userId)
      return { data: null, error: new Error('Profile not found') }
    }

    const today = new Date().toDateString()
    const isLoggedInToday = data.last_login_date === today

    return {
      data: {
        current_streak: data.current_streak,
        last_login_date: data.last_login_date,
        is_logged_in_today: isLoggedInToday
      },
      error: null
    }
  } catch (error) {
    console.error('Exception getting streak info:', error)
    return { data: null, error }
  }
}

// Handle login streak for OAuth logins
export const handleOAuthLoginStreak = async (userId: string) => {
  return await updateLoginStreak(userId)
}

// Test Supabase connection status
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    console.log('Connection test result:', { data: !!data, error })
    return !error
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}

// Create a new user profile in the 'user_profiles' table
export const createUserProfile = async (userId: string, userData: Partial<UserProfile>) => {
  try {
    console.log('Creating user profile with data:', { userId, name: userData.name })
    
    // Get display name from auth user (primary source)
    const displayName = await getDisplayName(userId)
    
    const profileData = {
      id: userId,
      ...userData,
      name: displayName || userData.name || 'Unknown User' // Prioritize auth display name
    }
    
    console.log('Creating profile with auth display name:', profileData.name)
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .maybeSingle() // Consistent error handling

    if (error) {
      console.error('Database error creating profile:', error)
      return { data: null, error }
    }

    console.log('Profile created successfully in database with auth display name:', data?.name)
    return { data, error: null }
  } catch (error) {
    console.error('Exception creating profile:', error)
    return { data: null, error }
  }
}

// Get a user profile by ID
export const getUserProfile = async (userId: string) => {
  try {
    // CRITICAL FIX: Use maybeSingle() instead of single() to handle null results gracefully
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle() // Prevents PGRST116 error when no results found

    // Handle specific error cases, excluding PGRST116 as it's now handled by maybeSingle
    if (error && error.code !== 'PGRST116') {
      console.error('Database error getting profile:', error)
      return { data: null, error }
    }

    // If profile exists, always sync display name from auth metadata
    if (data) {
      const displayName = await getDisplayName(userId)
      
      // Update profile in DB if display name from auth is different and valid
      if (displayName && displayName !== 'Unknown User' && displayName !== data.name) {
        console.log('🔄 Syncing auth display name:', displayName, '(stored:', data.name, ')')
        
        const { data: updatedData } = await supabase
            .from('user_profiles')
            .update({ name: displayName, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .maybeSingle() // Consistent with other queries
          
        return { data: updatedData || { ...data, name: displayName }, error: null }
      }
    }

    return { data, error }
  } catch (error) {
    console.error('Exception getting profile:', error)
    return { data: null, error }
  }
}

// Update an existing user profile
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
  setProfile?: (profile: UserProfile) => void // Optional callback to update local state
) => {
  try {
    if (!userId) throw new Error('No user ID provided')
    if (!updates || Object.keys(updates).length === 0) {
      console.warn('No updates provided for user:', userId)
      return { data: null, error: null }
    }

    console.log('Updating profile for user:', userId, 'with updates:', updates)

    let finalUpdates = { ...updates }
    // If 'name' is being updated, also update it in Supabase auth metadata
    if (updates.name) {
      console.log('🔄 Updating display name in auth:', updates.name)
      const { error: authError } = await updateDisplayName(updates.name)
      if (authError) {
        console.error('❌ Failed to update display name in auth:', authError)
      }
    } else {
      // If no explicit name update, sync from auth to ensure consistency
      const displayName = await getDisplayName(userId)
      if (displayName && displayName !== 'Unknown User') {
        finalUpdates.name = displayName
        console.log('🔄 Auto-syncing auth display name during update:', displayName)
      }
    }

    const updatesWithTimestamp = {
      ...finalUpdates,
      updated_at: new Date().toISOString() // Always update timestamp
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updatesWithTimestamp)
      .eq('id', userId)
      .select()
      .maybeSingle() // Consistent error handling

    if (error) {
      console.error('Database error updating profile:', error)
      return { data: null, error }
    }

    console.log('Profile updated successfully in database with auth display name:', data?.name)

    if (setProfile && data) {
      setProfile(data) // Update local state if callback is provided
    }

    return { data, error: null }
  } catch (err) {
    console.error('Exception updating profile:', err)
    return { data: null, error: err }
  }
}

// Get leaderboard data
export const getLeaderboardData = async (
  limit: number = 100, 
  offset: number = 0, 
  sortBy: 'xp' | 'lessons' | 'achievements' = 'xp'
) => {
  try {
    console.log('📊 Fetching leaderboard with auth display names:', { limit, offset, sortBy });

    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        xp,
        total_lessons_completed,
        unlocked_achievements,
        current_streak,
        level,
        name,
        current_avatar
      `);

    switch (sortBy) {
      case 'lessons':
        query = query.order('total_lessons_completed', { ascending: false });
        break;
      case 'achievements':
        query = query.order('unlocked_achievements', { ascending: false });
        break;
      default:
        query = query.order('xp', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Database error getting leaderboard:', error);
      return { data: null, error };
    }

    // Transform data for consistent frontend usage
    const transformedData = data?.map((profile, index) => ({
      user_id: profile.id,
      xp: profile.xp || 0,
      total_lessons_completed: profile.total_lessons_completed || 0,
      achievements_count: Array.isArray(profile.unlocked_achievements) 
        ? profile.unlocked_achievements.length 
        : 0,
      current_streak: profile.current_streak || 0,
      level: profile.level || 1,
      rank: offset + index + 1,
      user_profiles: {
        name: profile.name || 'Unknown Player', // Use the synced display name
        current_avatar: profile.current_avatar || '👤'
      }
    })) || [];

    console.log('✅ Leaderboard data fetched with auth display names:', transformedData.slice(0, 3));
    return { data: transformedData, error: null };

  } catch (error) {
    console.error('Exception getting leaderboard:', error);
    return { data: null, error };
  }
};

// Get a user's rank on the leaderboard
export const getUserRank = async (userId: string, sortBy: 'xp' | 'lessons' | 'achievements' = 'xp') => {
  try {
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('xp, total_lessons_completed, unlocked_achievements')
      .eq('id', userId)
      .maybeSingle(); // Prevents PGRST116 error

    if (userError || !userProfile) {
      return { data: null, error: userError };
    }

    let userValue: number;
    let compareColumn: string;

    switch (sortBy) {
      case 'lessons':
        userValue = userProfile.total_lessons_completed || 0;
        compareColumn = 'total_lessons_completed';
        break;
      case 'achievements':
        userValue = Array.isArray(userProfile.unlocked_achievements) 
          ? userProfile.unlocked_achievements.length 
          : 0;
        // For achievements, need to fetch all profiles to compare counts
        const { data: allProfiles } = await supabase
          .from('user_profiles')
          .select('unlocked_achievements');
        
        if (allProfiles) {
          const usersWithMoreAchievements = allProfiles.filter(p => {
            const count = Array.isArray(p.unlocked_achievements) ? p.unlocked_achievements.length : 0;
            return count > userValue;
          });
          return { data: usersWithMoreAchievements.length + 1, error: null };
        }
        return { data: 1, error: null };
      default:
        userValue = userProfile.xp || 0;
        compareColumn = 'xp';
    }

    const { data: betterUsers, error: rankError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .gt(compareColumn, userValue); // Count users with a higher value

    if (rankError) {
      return { data: null, error: rankError };
    }

    const rank = (betterUsers?.length || 0) + 1; // Rank is (count of better users) + 1
    return { data: rank, error: null };

  } catch (error) {
    console.error('Exception getting user rank:', error);
    return { data: null, error };
  }
};

// Subscribe to real-time leaderboard updates
export const subscribeToLeaderboardUpdates = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('leaderboard_updates')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'user_profiles' // Specify the table to listen to
      },
      callback
    )
    .subscribe();

  return subscription;
};

// Sign up a new user with email and password
export const signUpWithEmail = async (email: string, password: string, username: string) => {
  try {
    console.log('🔄 Starting signup process for:', email, 'with username:', username)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          username: username,
          display_name: username,  // Primary: Set the display_name to the chosen username
          full_name: username,     // Backup
          name: username           // Backup
        }
      }
    })

    if (error) {
      console.error('❌ Supabase signup error:', error)
      return { data: null, error }
    }

    console.log('✅ Signup response with auth display_name set:', {
      user: data.user?.id,
      display_name: data.user?.user_metadata?.display_name,
      full_name: data.user?.user_metadata?.full_name,
      username: data.user?.user_metadata?.username,
      session: !!data.session,
      needsConfirmation: !data.session && data.user && !data.user.email_confirmed_at
    })

    // Only create profile in the 'user_profiles' table if user is confirmed or has a session
    if (data.user && (data.session || data.user.email_confirmed_at)) {
      console.log('📝 Creating user profile with auth display name...')
      
      const profileResult = await supabase.from('user_profiles').upsert({
        id: data.user.id,
        name: data.user.user_metadata?.display_name || username, // Use auth display_name
        email: email,
        xp: 0,
        level: 1,
        coins: 0, // Initial coins set to 0
        total_coins_earned: 0, // Initial total coins earned set to 0
        completed_lessons: [],
        hearts: 5,
        max_hearts: 5,
        last_heart_reset: new Date().toDateString(),
        current_avatar: 'default',
        owned_avatars: ['default'],
        unlocked_achievements: [],
        current_streak: 0,
        last_login_date: '',
        total_lessons_completed: 0,
        email_verified: !!data.user.email_confirmed_at,
        xp_boost_multiplier: 1,
        xp_boost_expires_at: 0,
        unlimited_hearts_expires_at: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (profileResult.error) {
        console.error('❌ Error creating profile:', profileResult.error)
      } else {
        console.log('✅ Profile created successfully with auth display name:', data.user.user_metadata?.display_name)
      }
    } else if (data.user && !data.session) {
      console.log('📧 User created but needs email confirmation')
    }

    return { data, error: null }
  } catch (err) {
    console.error('❌ Exception during signup:', err)
    return { data: null, error: err }
  }
}

// Sign in an existing user with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (data?.user && !error) {
      const streakResult = await updateLoginStreak(data.user.id)
      if (streakResult.data) {
        console.log('Streak updated:', streakResult.data.streak_message)
        return { data, error, streakData: streakResult.data }
      }
    }

    return { data, error }
  } catch (error) {
    console.error('Sign in exception:', error)
    return { data: null, error }
  }
}

// Sign in with Google using OAuth
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `https://codhak.vercel.app`, // Redirect URL after OAuth
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })

    return { data, error }
  } catch (error) {
    console.error('Google sign in exception:', error)
    return { data: null, error }
  }
}

// Sign out the current user
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Reset user password via email
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `https://codhak.vercel.app/auth/reset-password` // Redirect URL for password reset
  })

  return { data, error }
}

// Get the current authenticated user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Get the current active session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const isMockClient = false
export const getClientInfo = () => ({
  type: 'real',
  hasEnvVars: !!(supabaseUrl && supabaseAnonKey),
  isDevelopment: import.meta.env.DEV,
  supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
  supabaseKey: supabaseAnonKey ? '✅ Set' : '❌ Missing'
})

console.log('🔧 Supabase Client Info:', getClientInfo())
testConnection()
