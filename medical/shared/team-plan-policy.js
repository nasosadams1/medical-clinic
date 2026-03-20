const normalizePlanName = (value) => String(value || '').trim().toLowerCase();

export const TEAM_PLAN_POLICY_NONE = Object.freeze({
  key: 'none',
  label: 'No team plan',
  workspaceLimit: 0,
  seatLimit: 0,
  inviteMaxUses: 0,
  assignmentLimit: 0,
  learnerMembershipLimit: 3,
  managerMembershipLimit: 0,
  supportsAdvancedAnalytics: false,
  supportsCsvExport: false,
  supportsMultiCohort: false,
});

export const TEAM_PLAN_POLICIES = Object.freeze({
  teams: Object.freeze({
    key: 'teams',
    label: 'Teams',
    workspaceLimit: 1,
    seatLimit: 25,
    inviteMaxUses: 25,
    assignmentLimit: 25,
    learnerMembershipLimit: 3,
    managerMembershipLimit: 5,
    supportsAdvancedAnalytics: false,
    supportsCsvExport: false,
    supportsMultiCohort: false,
  }),
  teams_growth: Object.freeze({
    key: 'teams_growth',
    label: 'Teams Growth',
    workspaceLimit: 6,
    seatLimit: 150,
    inviteMaxUses: 150,
    assignmentLimit: 100,
    learnerMembershipLimit: 3,
    managerMembershipLimit: 12,
    supportsAdvancedAnalytics: true,
    supportsCsvExport: true,
    supportsMultiCohort: true,
  }),
  custom: Object.freeze({
    key: 'custom',
    label: 'Custom',
    workspaceLimit: 50,
    seatLimit: 1000,
    inviteMaxUses: 500,
    assignmentLimit: 500,
    learnerMembershipLimit: 3,
    managerMembershipLimit: 50,
    supportsAdvancedAnalytics: true,
    supportsCsvExport: true,
    supportsMultiCohort: true,
  }),
});

export const getTeamPlanPolicy = (planName) => {
  const normalized = normalizePlanName(planName);
  if (normalized === 'custom') return TEAM_PLAN_POLICIES.custom;
  if (normalized === 'teams growth') return TEAM_PLAN_POLICIES.teams_growth;
  if (normalized === 'teams') return TEAM_PLAN_POLICIES.teams;
  return TEAM_PLAN_POLICY_NONE;
};

export const resolveTeamPlanPolicy = (planNames = []) => {
  const policies = (Array.isArray(planNames) ? planNames : [planNames]).map((planName) => getTeamPlanPolicy(planName));
  if (policies.some((policy) => policy.key === 'custom')) return TEAM_PLAN_POLICIES.custom;
  if (policies.some((policy) => policy.key === 'teams_growth')) return TEAM_PLAN_POLICIES.teams_growth;
  if (policies.some((policy) => policy.key === 'teams')) return TEAM_PLAN_POLICIES.teams;
  return TEAM_PLAN_POLICY_NONE;
};

export const getTeamPlanPolicyFromSeatLimit = (seatLimit) => {
  const normalizedSeatLimit = Number(seatLimit || 0);
  if (!Number.isFinite(normalizedSeatLimit) || normalizedSeatLimit <= 0) {
    return TEAM_PLAN_POLICY_NONE;
  }

  if (normalizedSeatLimit <= TEAM_PLAN_POLICIES.teams.seatLimit) {
    return TEAM_PLAN_POLICIES.teams;
  }

  if (normalizedSeatLimit <= TEAM_PLAN_POLICIES.teams_growth.seatLimit) {
    return TEAM_PLAN_POLICIES.teams_growth;
  }

  return TEAM_PLAN_POLICIES.custom;
};
