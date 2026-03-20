import { useCallback, useMemo, useState } from 'react';
import type { LanguageSlug } from '../data/siteContent';
import { useAuth } from '../context/AuthContext';
import { usePlanEntitlements } from './usePlanEntitlements';
import { useAdminAccess } from './useAdminAccess';
import {
  FREE_DUEL_DAILY_LIMIT,
  canAccessStarterLesson,
  getTeamPlanPolicy,
  incrementFreeDuelUsage,
  isPremiumLearnerPlanName,
  isTeamPlanName,
  readFreeDuelUsage,
  STARTER_PATH_LANGUAGE,
} from '../lib/planAccess';
import type { PlanEntitlement } from '../lib/billing';

const createAdminOverrideEntitlement = (
  userId: string,
  itemId: string,
  planName: string
): PlanEntitlement => ({
  id: `admin-override:${itemId}`,
  userId,
  itemId,
  planName,
  status: 'active',
  currentPeriodStart: new Date(0).toISOString(),
  currentPeriodEnd: new Date('2099-12-31T00:00:00.000Z').toISOString(),
  purchaseCount: 1,
  lastPaymentIntentId: null,
  metadata: {
    admin_override: true,
  },
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  isActive: true,
});

export function usePlanAccess() {
  const { user } = useAuth();
  const { hasAdminAccess } = useAdminAccess();
  const {
    activeEntitlements,
    primaryPlan: entitlementPrimaryPlan,
    ...entitlementState
  } = usePlanEntitlements();
  const [duelUsageVersion, setDuelUsageVersion] = useState(0);

  const adminOverrideEntitlements = useMemo(() => {
    if (!hasAdminAccess || !user?.id) return [];

    const adminPlans: PlanEntitlement[] = [
      createAdminOverrideEntitlement(user.id, 'pro_monthly', 'Pro'),
      createAdminOverrideEntitlement(user.id, 'interview_sprint', 'Interview Sprint'),
      createAdminOverrideEntitlement(user.id, 'teams_monthly', 'Teams'),
      createAdminOverrideEntitlement(user.id, 'teams_growth_monthly', 'Teams Growth'),
      createAdminOverrideEntitlement(user.id, 'admin_custom', 'Custom'),
    ];

    return adminPlans.filter(
      (entitlement) =>
        !activeEntitlements.some(
          (candidate) =>
            candidate.itemId === entitlement.itemId ||
            candidate.planName.trim().toLowerCase() === entitlement.planName.trim().toLowerCase()
        )
    );
  }, [activeEntitlements, hasAdminAccess, user?.id]);

  const mergedActiveEntitlements = useMemo(
    () => [...activeEntitlements, ...adminOverrideEntitlements],
    [activeEntitlements, adminOverrideEntitlements]
  );

  const mergedActivePlanNames = useMemo(
    () =>
      mergedActiveEntitlements
        .map((entitlement) => entitlement.planName)
        .filter((planName) => planName.trim().length > 0),
    [mergedActiveEntitlements]
  );

  const getMergedPlanEntitlement = useCallback(
    (planId: string) => mergedActiveEntitlements.find((entitlement) => entitlement.itemId === planId) || null,
    [mergedActiveEntitlements]
  );

  const getMergedEntitlementByPlanName = useCallback(
    (planName: string) =>
      mergedActiveEntitlements.find(
        (entitlement) => entitlement.planName.trim().toLowerCase() === planName.trim().toLowerCase()
      ) || null,
    [mergedActiveEntitlements]
  );

  const hasPro = useMemo(
    () =>
      Boolean(getMergedPlanEntitlement('pro_monthly')) ||
      mergedActivePlanNames.some((planName) => planName.trim().toLowerCase() === 'pro'),
    [getMergedPlanEntitlement, mergedActivePlanNames]
  );

  const hasInterviewSprint = useMemo(
    () =>
      Boolean(getMergedPlanEntitlement('interview_sprint')) ||
      mergedActivePlanNames.some((planName) => planName.trim().toLowerCase() === 'interview sprint'),
    [getMergedPlanEntitlement, mergedActivePlanNames]
  );

  const hasPaidLearnerAccess = hasPro || hasInterviewSprint;
  const hasAnyTeamPlan = useMemo(
    () => mergedActivePlanNames.some((planName) => isTeamPlanName(planName)),
    [mergedActivePlanNames]
  );

  const activeTeamEntitlement = useMemo(
    () => {
      const policy = getTeamPlanPolicy(mergedActivePlanNames);
      return (
        mergedActiveEntitlements.find(
          (entitlement) => entitlement.planName.trim().toLowerCase() === policy.label.trim().toLowerCase()
        ) || null
      );
    },
    [mergedActiveEntitlements, mergedActivePlanNames]
  );
  const teamPlanPolicy = useMemo(() => getTeamPlanPolicy(mergedActivePlanNames), [mergedActivePlanNames]);

  const primaryPlan = entitlementPrimaryPlan || adminOverrideEntitlements[0] || null;

  const freeDuelUsage = useMemo(() => readFreeDuelUsage(user?.id), [duelUsageVersion, user?.id]);
  const freeDuelRemaining = useMemo(
    () => (hasPaidLearnerAccess ? null : Math.max(0, FREE_DUEL_DAILY_LIMIT - freeDuelUsage)),
    [freeDuelUsage, hasPaidLearnerAccess]
  );

  const canAccessPracticeLanguage = useCallback(
    (language: LanguageSlug) => hasPaidLearnerAccess || language === STARTER_PATH_LANGUAGE,
    [hasPaidLearnerAccess]
  );

  const canAccessPracticeLesson = useCallback(
    (language: LanguageSlug, languageIndex: number | null | undefined) =>
      hasPaidLearnerAccess || canAccessStarterLesson(language, languageIndex),
    [hasPaidLearnerAccess]
  );

  const recordFreeDuelUse = useCallback(() => {
    if (hasPaidLearnerAccess) return null;
    const nextValue = incrementFreeDuelUsage(user?.id);
    setDuelUsageVersion((current) => current + 1);
    return nextValue;
  }, [hasPaidLearnerAccess, user?.id]);

  const hasPlanName = useCallback(
    (planName: string) =>
      mergedActivePlanNames.some((candidate) => candidate.trim().toLowerCase() === planName.trim().toLowerCase()),
    [mergedActivePlanNames]
  );

  return {
    ...entitlementState,
    activeEntitlements: mergedActiveEntitlements,
    activePlanNames: mergedActivePlanNames,
    primaryPlan,
    getPlanEntitlement: getMergedPlanEntitlement,
    getEntitlementByPlanName: getMergedEntitlementByPlanName,
    hasActivePlan: (planId: string) => Boolean(getMergedPlanEntitlement(planId)),
    hasActivePlanName: (planName: string) => Boolean(getMergedEntitlementByPlanName(planName)),
    hasPlanName,
    hasPro,
    hasInterviewSprint,
    hasPaidLearnerAccess,
    hasAnyTeamPlan,
    activeTeamEntitlement,
    teamPlanPolicy,
    hasAdminAccess,
    freeDuelLimit: FREE_DUEL_DAILY_LIMIT,
    freeDuelUsage,
    freeDuelRemaining,
    canAccessPracticeLanguage,
    canAccessPracticeLesson,
    recordFreeDuelUse,
    hasPremiumLearnerPlanName: (planName: string) => isPremiumLearnerPlanName(planName),
  };
}
