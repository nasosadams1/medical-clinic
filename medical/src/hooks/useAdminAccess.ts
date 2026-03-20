import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDuelAdminCapabilities } from '../lib/duelAdmin';
import { fetchFeedbackAdminCapabilities } from '../lib/feedback';
import { fetchLeadAdminCapabilities } from '../lib/leads';

const adminCapabilityCache = new Map<string, boolean>();
const adminCapabilityInflight = new Map<string, Promise<boolean>>();

const isAdminFromMetadata = (user: { id?: string; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> } | null) => {
  if (!user?.id) return false;
  if (user.app_metadata?.role === 'admin') return true;
  if (user.app_metadata?.is_admin === true) return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.user_metadata?.is_admin === true) return true;
  return false;
};

const loadRemoteAdminCapabilities = async (userId: string, accessToken: string) => {
  if (adminCapabilityCache.has(userId)) {
    return adminCapabilityCache.get(userId) || false;
  }

  if (adminCapabilityInflight.has(userId)) {
    return adminCapabilityInflight.get(userId) as Promise<boolean>;
  }

  const inflight = Promise.allSettled([
    fetchDuelAdminCapabilities(accessToken),
    fetchFeedbackAdminCapabilities(accessToken),
    fetchLeadAdminCapabilities(),
  ])
    .then((results) => {
      const hasAdminAccess = results.some(
        (result) => result.status === 'fulfilled' && Boolean(result.value?.canReview)
      );
      adminCapabilityCache.set(userId, hasAdminAccess);
      return hasAdminAccess;
    })
    .catch(() => {
      adminCapabilityCache.set(userId, false);
      return false;
    })
    .finally(() => {
      adminCapabilityInflight.delete(userId);
    });

  adminCapabilityInflight.set(userId, inflight);
  return inflight;
};

export function useAdminAccess() {
  const { user, session } = useAuth();
  const hasDevelopmentAdminAccess = import.meta.env.DEV && Boolean(user?.id);
  const localAdminAccess = useMemo(
    () => hasDevelopmentAdminAccess || isAdminFromMetadata(user),
    [hasDevelopmentAdminAccess, user]
  );
  const [remoteAdminAccess, setRemoteAdminAccess] = useState<boolean>(() => {
    if (!user?.id) return false;
    return adminCapabilityCache.get(user.id) || false;
  });

  useEffect(() => {
    if (!user?.id) {
      setRemoteAdminAccess(false);
      return;
    }

    if (localAdminAccess) {
      adminCapabilityCache.set(user.id, true);
      setRemoteAdminAccess(true);
      return;
    }

    if (!session?.access_token) {
      setRemoteAdminAccess(adminCapabilityCache.get(user.id) || false);
      return;
    }

    let cancelled = false;
    void loadRemoteAdminCapabilities(user.id, session.access_token).then((hasAdminAccess) => {
      if (!cancelled) {
        setRemoteAdminAccess(hasAdminAccess);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [localAdminAccess, session?.access_token, user?.id]);

  const hasAdminAccess = localAdminAccess || remoteAdminAccess;
  const isResolved = !user?.id || localAdminAccess || adminCapabilityCache.has(user.id);

  return {
    hasAdminAccess,
    isAdminAccessResolved: isResolved,
  };
}
