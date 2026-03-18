import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPlanEntitlements, type PlanEntitlement, type SelfServePlanId } from '../lib/billing';

export function usePlanEntitlements() {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<PlanEntitlement[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setEntitlements([]);
      return [];
    }

    setLoading(true);
    try {
      const nextEntitlements = await listPlanEntitlements();
      setEntitlements(nextEntitlements);
      return nextEntitlements;
    } catch {
      setEntitlements([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeEntitlements = useMemo(
    () => entitlements.filter((entitlement) => entitlement.isActive),
    [entitlements]
  );

  const hasActivePlan = useCallback(
    (planId: SelfServePlanId) => activeEntitlements.some((entitlement) => entitlement.itemId === planId),
    [activeEntitlements]
  );

  const getPlanEntitlement = useCallback(
    (planId: SelfServePlanId) =>
      activeEntitlements.find((entitlement) => entitlement.itemId === planId) || null,
    [activeEntitlements]
  );

  const primaryPlan = activeEntitlements[0] || null;

  return {
    entitlements,
    activeEntitlements,
    primaryPlan,
    loading,
    refresh,
    hasActivePlan,
    getPlanEntitlement,
  };
}
