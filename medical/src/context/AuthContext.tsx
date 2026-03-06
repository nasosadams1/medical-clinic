// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import {
  supabase,
  UserProfile,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle as supabaseSignInWithGoogle,
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  resendConfirmationEmail,
  getUserProfile,
  createUserProfile,
  updateUserProfile as supabaseUpdateUserProfile,
  testConnection,
  getDisplayName,
} from "../lib/supabase";

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: any; needsConfirmation?: boolean }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refetchProfile: () => Promise<void>;
  setNavigationCallback: (callback: () => void) => void;
  confirmUser: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ NEW: Leaderboard API base URL (optional). If not set, sync is skipped.
// Add in Vercel env vars if/when you deploy leaderboard:
// VITE_LEADERBOARD_API_URL=https://your-leaderboard-api
const LEADERBOARD_API_URL =
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() || "";
const AUTH_STORAGE_KEY = "codhak-auth";
const isAuthDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === "1";

const authLog = (...args: any[]) => {
  if (isAuthDebugEnabled) {
    console.log(...args);
  }
};

const clearAuthStorage = () => {
  if (typeof window === "undefined") return;

  const shouldRemove = (key: string) =>
    key === AUTH_STORAGE_KEY || key.startsWith("sb-") || key.toLowerCase().includes("supabase");

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && shouldRemove(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const navigationCallbackRef = useRef<(() => void) | null>(null);
  const leaderboardSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncDataRef = useRef<string>("");

  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        console.error("Supabase connection failed. Please check your environment variables.");
      }
    };
    checkConnection();
  }, []);

  // Clear corrupted session
  const clearCorruptedSession = async () => {
    try {
      clearAuthStorage();
      await supabase.auth.signOut({ scope: "local" });
      window.location.reload();
    } catch (error) {
      console.error("Error clearing corrupted session:", error);
      window.location.reload();
    }
  };

  // Enhanced leaderboard sync with proper data mapping and change detection
  const syncProfileToLeaderboard = useCallback(async (profileData: UserProfile) => {
    if (!profileData || !profileData.id || profileData.id === "guest") {
      console.warn(
        "⚠️ AuthContext: Skipping leaderboard sync due to invalid profile data or guest user."
      );
      return;
    }

    // ✅ If not configured (like on Vercel), skip to avoid localhost errors.
    if (!LEADERBOARD_API_URL) {
      // keep it quiet-ish in production; still useful during debugging
      console.warn(
        "⚠️ Leaderboard API not configured (VITE_LEADERBOARD_API_URL). Skipping leaderboard sync."
      );
      return;
    }

    const achievementsCount = Array.isArray(profileData.unlocked_achievements)
      ? profileData.unlocked_achievements.length
      : 0;

    const payload = {
      name: profileData.name || "Unknown User",
      userId: profileData.id,
      avatar: profileData.current_avatar || "👤",
      badge: "Learner",
      xp: Math.max(0, profileData.xp || 0),
      level: Math.max(1, profileData.level || 1),
      completedLessons: Math.max(0, profileData.total_lessons_completed || 0),
      projects: 0,
      streak: Math.max(0, profileData.current_streak || 0),
      achievements: Math.max(0, achievementsCount),
      xpDelta: 0,
    };

    const currentDataHash = JSON.stringify(payload);
    if (currentDataHash === lastSyncDataRef.current) {
      authLog("📊 AuthContext: No changes detected, skipping leaderboard sync");
      return;
    }
    lastSyncDataRef.current = currentDataHash;

    if (leaderboardSyncTimeoutRef.current) {
      clearTimeout(leaderboardSyncTimeoutRef.current);
    }

    leaderboardSyncTimeoutRef.current = setTimeout(async () => {
      try {
        authLog("🔄 AuthContext: Syncing profile to leaderboard:", {
          name: payload.name,
          userId: payload.userId,
          xp: payload.xp,
          lessons: payload.completedLessons,
          achievements: payload.achievements,
          streak: payload.streak,
        });

        const response = await fetch(`${LEADERBOARD_API_URL}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json().catch(() => ({}));
        authLog("✅ AuthContext: Leaderboard sync success:", result);
      } catch (error) {
        console.error("❌ AuthContext: Failed to sync profile to leaderboard:", error);
        // Reset hash so next change attempts again
        lastSyncDataRef.current = "";
      }
    }, 500);
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      authLog(
        `🔄 AuthContext: Fetching profile for user: ${userId} (attempt ${
          retryCount + 1
        })`
      );

      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const { data } = await getUserProfile(userId);

      if (!data) {
        authLog("No profile data returned, creating new profile...");
        await createProfileManually(userId);
        return;
      }

      authLog("✅ AuthContext: Profile found:", {
        name: data.name,
        xp: data.xp,
        lessons: data.total_lessons_completed,
        coins: data.coins,
        achievements: data.unlocked_achievements?.length || 0,
      });

      setProfile(data);
      await syncProfileToLeaderboard(data);
      setLoading(false);
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
      setLoading(false);
    }
  };

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      authLog("🔄 AuthContext: Refetching profile from database...");
      setLoading(true);
      await fetchProfile(user.id);
    }
  }, [user?.id]);

  const createProfileManually = async (userId: string, preferredUsername?: string) => {
    try {
      authLog(
        "Creating profile manually for user:",
        userId,
        "with preferred username:",
        preferredUsername
      );

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting current user:", userError);

        if (userError.message?.includes("User from sub claim in JWT does not exist")) {
          authLog("🚨 Detected corrupted JWT, clearing session...");
          await clearCorruptedSession();
          return;
        }

        setLoading(false);
        return;
      }

      if (!currentUser) {
        console.error("No current user found");
        setLoading(false);
        return;
      }

      const userEmail = currentUser.email || "";

      let userName =
        preferredUsername ||
        currentUser.user_metadata?.display_name ||
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.user_metadata?.username;

      if (!userName || userName.length < 2) {
        const emailPrefix = userEmail.split("@")[0];
        if (emailPrefix && emailPrefix.length >= 2) {
          userName =
            emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
        } else {
          userName = "User";
        }
      }

      userName = userName.trim();

      if (
        !userName ||
        userName.length < 2 ||
        ["master", "default", "admin", "root", "user", "test"].includes(
          userName.toLowerCase()
        )
      ) {
        const timestamp = Date.now().toString().slice(-6);
        const randomSuffix = Math.random().toString(36).substring(2, 5);
        userName = `User_${timestamp}_${randomSuffix}`;
        authLog(`🔧 Generated safe username: ${userName}`);
      }

      const newProfile: Omit<UserProfile, "created_at" | "updated_at"> = {
        id: userId,
        name: userName,
        email: userEmail,
        coins: 0,
        total_coins_earned: 0,
        xp: 0,
        completed_lessons: [],
        lifetime_completed_lessons: [],
        level: 1,
        hearts: 5,
        max_hearts: 5,
        last_heart_reset: new Date().toDateString(),
        current_avatar: "default",
        owned_avatars: ["default"],
        unlocked_achievements: [],
        current_streak: 0,
        last_login_date: "",
        total_lessons_completed: 0,
        email_verified: !!currentUser.email_confirmed_at,
        xp_boost_multiplier: 1,
        xp_boost_expires_at: 0,
        unlimited_hearts_expires_at: 0,
      };

      const { data, error } = await createUserProfile(userId, newProfile);

      if (error) {
        console.error("Error creating profile manually:", error);
        setLoading(false);
        return;
      }

      if (data) {
        authLog("✅ Profile created manually:", data.name);
        setProfile(data);
        await syncProfileToLeaderboard(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Unexpected error creating profile manually:", error);
      setLoading(false);
    }
  };

  const syncDisplayName = useCallback(async () => {
    if (!user?.id || user.id === "guest" || !profile) return;

    try {
      const displayName = await getDisplayName(user.id);
      if (displayName && displayName !== profile.name && displayName !== "Unknown User") {
        authLog("🔄 AuthContext: Syncing display name from auth:", displayName);
        await updateProfile({ name: displayName });
      }
    } catch (error) {
      console.error("Error syncing display name:", error);
    }
  }, [user?.id, profile?.name]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      authLog("🔄 AuthContext: Initial session:", !!session);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        authLog(
          "🔄 AuthContext: Initial session found, fetching profile for user:",
          session.user.id
        );
        fetchProfile(session.user.id);
      } else {
        authLog("🔄 AuthContext: No initial session found");
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      authLog("🔄 AuthContext: Auth state change:", event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        authLog("🔄 AuthContext: User signed in, fetching fresh profile...");
        fetchProfile(session.user.id);

        setTimeout(() => {
          if (navigationCallbackRef.current) navigationCallbackRef.current();
        }, 1000);
      } else if (event === "SIGNED_OUT") {
        authLog("🔄 AuthContext: User signed out, clearing profile");
        setProfile(null);
        lastSyncDataRef.current = "";
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (leaderboardSyncTimeoutRef.current) {
        clearTimeout(leaderboardSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user?.id && profile) {
      syncDisplayName();
    }
  }, [user?.id, profile?.id, syncDisplayName]);

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("name")
        .eq("name", username.trim());

      if (error) {
        console.error("Error checking username:", error);
        return false;
      }

      return !!(data && data.length > 0);
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    authLog("Starting signup process with username:", username);

    try {
      const normalizedUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const usernameExists = await checkUsernameExists(normalizedUsername);
      if (usernameExists) {
        return { error: { message: "Username already taken" } };
      }

      const { data, error } = await signUpWithEmail(
        normalizedEmail,
        password,
        normalizedUsername
      );

      if (error) return { error };

      const needsConfirmation =
        data?.user && !data?.session && !data?.user?.email_confirmed_at;

      authLog("Signup successful:", {
        username: username.trim(),
        userId: data?.user?.id,
        needsConfirmation,
      });

      return { error: null, needsConfirmation: !!needsConfirmation };
    } catch (err: any) {
      console.error("Signup catch error:", err);
      return {
        error: {
          message:
            "Network connection failed. Please check your internet connection and try again.",
        },
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      authLog("Attempting sign in for:", email.trim());

      const { data, error } = await signInWithEmail(email.trim().toLowerCase(), password);

      if (error) {
        console.error("Sign in error:", error);
        return { error };
      }

      authLog("Sign in successful for:", data?.user?.id);
      return { error: null };
    } catch (err: any) {
      console.error("Sign in catch error:", err);
      return { error: { message: "An unexpected error occurred during sign in" } };
    }
  };

  const confirmUser = async (email: string) => {
    try {
      const { error } = await resendConfirmationEmail(email.trim().toLowerCase());
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabaseSignInWithGoogle();
    return { error };
  };

  const signOut = async () => {
    authLog("Signing out...");
    clearAuthStorage();
    await supabaseSignOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabaseResetPassword(email);
    return { error };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      console.warn("❌ AuthContext: Cannot update profile - no authenticated user");
      return;
    }

    authLog("🔄 AuthContext: updateProfile called with:", updates);

    const { data, error } = await supabaseUpdateUserProfile(user.id, updates);

    if (error) {
      console.error("❌ AuthContext: Error updating profile in database:", error);
      throw error;
    }

    if (data) {
      authLog("✅ AuthContext: Profile updated:", {
        name: data.name,
        xp: data.xp,
        totalLessons: data.total_lessons_completed,
        coins: data.coins,
        achievements: data.unlocked_achievements?.length || 0,
      });

      setProfile(data);
      await syncProfileToLeaderboard(data);
    }
  };

  const setNavigationCallback = (callback: () => void) => {
    navigationCallbackRef.current = callback;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateProfile,
        refetchProfile,
        setNavigationCallback,
        confirmUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const AuthUserSync: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const AuthProviderWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <AuthUserSync>{children}</AuthUserSync>
    </AuthProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
