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

  const activePlanNames = useMemo(
    () =>
      activeEntitlements.map((entitlement) => entitlement.planName).filter((planName) => planName.trim().length > 0),
    [activeEntitlements]
  );

  const hasActivePlan = useCallback(
    (planId: SelfServePlanId) => activeEntitlements.some((entitlement) => entitlement.itemId === planId),
    [activeEntitlements]
  );

  const hasActivePlanName = useCallback(
    (planName: string) =>
      activeEntitlements.some(
        (entitlement) => entitlement.planName.trim().toLowerCase() === planName.trim().toLowerCase()
      ),
    [activeEntitlements]
  );

  const getPlanEntitlement = useCallback(
    (planId: SelfServePlanId) =>
      activeEntitlements.find((entitlement) => entitlement.itemId === planId) || null,
    [activeEntitlements]
  );

  const getEntitlementByPlanName = useCallback(
    (planName: string) =>
      activeEntitlements.find(
        (entitlement) => entitlement.planName.trim().toLowerCase() === planName.trim().toLowerCase()
      ) || null,
    [activeEntitlements]
  );

  const primaryPlan = activeEntitlements[0] || null;

  return {
    entitlements,
    activeEntitlements,
    activePlanNames,
    primaryPlan,
    loading,
    refresh,
    hasActivePlan,
    hasActivePlanName,
    getPlanEntitlement,
    getEntitlementByPlanName,
  };
}
