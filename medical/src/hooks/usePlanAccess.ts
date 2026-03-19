import { useCallback, useMemo, useState } from 'react';
import type { LanguageSlug } from '../data/siteContent';
import { useAuth } from '../context/AuthContext';
import { usePlanEntitlements } from './usePlanEntitlements';
import {
  FREE_DUEL_DAILY_LIMIT,
  canAccessStarterLesson,
  incrementFreeDuelUsage,
  isPremiumLearnerPlanName,
  isTeamPlanName,
  readFreeDuelUsage,
  STARTER_PATH_LANGUAGE,
} from '../lib/planAccess';

export function usePlanAccess() {
  const { user } = useAuth();
  const {
    activeEntitlements,
    activePlanNames,
    getEntitlementByPlanName,
    getPlanEntitlement,
    ...entitlementState
  } = usePlanEntitlements();
  const [duelUsageVersion, setDuelUsageVersion] = useState(0);

  const hasPro = useMemo(
    () =>
      Boolean(getPlanEntitlement('pro_monthly')) ||
      activePlanNames.some((planName) => planName.trim().toLowerCase() === 'pro'),
    [activePlanNames, getPlanEntitlement]
  );

  const hasInterviewSprint = useMemo(
    () =>
      Boolean(getPlanEntitlement('interview_sprint')) ||
      activePlanNames.some((planName) => planName.trim().toLowerCase() === 'interview sprint'),
    [activePlanNames, getPlanEntitlement]
  );

  const hasPaidLearnerAccess = hasPro || hasInterviewSprint;
  const hasAnyTeamPlan = useMemo(
    () => activePlanNames.some((planName) => isTeamPlanName(planName)),
    [activePlanNames]
  );

  const activeTeamEntitlement = useMemo(
    () => activeEntitlements.find((entitlement) => isTeamPlanName(entitlement.planName)) || null,
    [activeEntitlements]
  );

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
      activePlanNames.some((candidate) => candidate.trim().toLowerCase() === planName.trim().toLowerCase()),
    [activePlanNames]
  );

  return {
    ...entitlementState,
    activeEntitlements,
    activePlanNames,
    getPlanEntitlement,
    getEntitlementByPlanName,
    hasPlanName,
    hasPro,
    hasInterviewSprint,
    hasPaidLearnerAccess,
    hasAnyTeamPlan,
    activeTeamEntitlement,
    freeDuelLimit: FREE_DUEL_DAILY_LIMIT,
    freeDuelUsage,
    freeDuelRemaining,
    canAccessPracticeLanguage,
    canAccessPracticeLesson,
    recordFreeDuelUse,
    hasPremiumLearnerPlanName: (planName: string) => isPremiumLearnerPlanName(planName),
  };
}
