import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export type TeamUseCase = 'bootcamps' | 'universities' | 'coding-clubs' | 'upskilling' | 'general';
export type TeamRole = 'owner' | 'admin' | 'coach' | 'learner';
export type TeamAssignmentType = 'benchmark' | 'duel_activity' | 'roadmap';
export type TeamAssignmentAudienceType = 'team_wide';
export type TeamAssignmentStatus = 'active' | 'archived';
export type TeamAssignmentLifecycleState = 'active' | 'past_due' | 'archived';
export type BenchmarkLanguage = 'python' | 'javascript' | 'java' | 'cpp';
export type TeamFeedbackStatus = 'draft' | 'shared' | 'resolved';
export type TeamJoinMode = 'open_code' | 'code_domain' | 'code_approval' | 'invite_only';
export type TeamSubmissionType = 'written' | 'code' | 'link';
export type TeamSubmissionStatus = 'submitted' | 'reviewed' | 'needs_revision';

export interface TeamAssignmentSnapshotBase {
  snapshotVersion: number;
  snapshotState: 'captured' | 'legacy_backfill';
  capturedAt: string;
  assignmentType: TeamAssignmentType;
  summary: string;
  requiredCompletionCount: number;
  progressUnitLabel: string;
}

export interface TeamAssignmentBenchmarkSnapshot extends TeamAssignmentSnapshotBase {
  assignmentType: 'benchmark';
  benchmarkLanguage: BenchmarkLanguage;
}

export interface TeamAssignmentRoadmapSnapshot extends TeamAssignmentSnapshotBase {
  assignmentType: 'roadmap';
  track: {
    id: string;
    title: string;
    language: BenchmarkLanguage | 'multi';
    version: number;
    requiredLessonIds: string[];
    requiredLessonCount: number;
    lessonItems: Array<{
      lessonId: string;
      title: string;
    }>;
  };
}

export interface TeamAssignmentDuelActivitySnapshot extends TeamAssignmentSnapshotBase {
  assignmentType: 'duel_activity';
  requiredMatchCount: number;
}

export type TeamAssignmentDefinitionSnapshot =
  | TeamAssignmentBenchmarkSnapshot
  | TeamAssignmentRoadmapSnapshot
  | TeamAssignmentDuelActivitySnapshot;

export type TeamAssignmentCompletionRule =
  | {
      mode: 'benchmark_completion_since_assignment_start';
      language: BenchmarkLanguage | null;
      requiredCount: number;
    }
  | {
      mode: 'lesson_completion_since_assignment_start';
      requiredLessonIds: string[];
      requiredCount: number;
    }
  | {
      mode: 'completed_duel_matches_since_assignment_start';
      requiredCount: number;
    };

export interface TeamRubricBreakdown {
  correctness: number | null;
  codeQuality: number | null;
  problemSolving: number | null;
  communication: number | null;
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  useCase: TeamUseCase;
  seatLimit: number;
  joinMode?: TeamJoinMode;
  allowedEmailDomain?: string | null;
  currentUserRole: TeamRole;
  memberCount: number;
  joinedAt?: string;
  isPublic?: boolean;
  shareToken?: string | null;
  publicSharedAt?: string | null;
}

export interface TeamInvite {
  id: string;
  code: string;
  label: string;
  email: string | null;
  emailDelivery?: 'sent' | 'skipped' | 'failed';
  role: Exclude<TeamRole, 'owner'>;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  lastUsedAt?: string | null;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
}

export interface TeamAssignment {
  id: string;
  title: string;
  description: string;
  assignmentType: TeamAssignmentType;
  status: TeamAssignmentStatus;
  benchmarkLanguage: BenchmarkLanguage | null;
  trackId: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  lifecycleState: TeamAssignmentLifecycleState;
  archivedAt: string | null;
  archivedByUserId: string | null;
  audienceType: TeamAssignmentAudienceType;
  audienceLabel: string;
  eligibleLearnerCount: number;
  completedLearnerCount: number;
  inProgressLearnerCount: number;
  notStartedLearnerCount: number;
  completionRate: number;
  averageProgressPercent: number;
  requiredCompletionCount: number;
  progressUnitLabel: string;
  scopeLabel: string;
  definitionSnapshot: TeamAssignmentDefinitionSnapshot;
  completionRule: TeamAssignmentCompletionRule;
  completionRuleSummary: string;
  metadata?: Record<string, unknown>;
}

export interface TeamFeedback {
  id: string;
  memberUserId: string;
  memberName: string;
  assignmentId: string | null;
  assignmentTitle: string | null;
  submissionId: string | null;
  authorUserId: string | null;
  authorName: string;
  rubricScore: number | null;
  rubricBreakdown: TeamRubricBreakdown | null;
  status: TeamFeedbackStatus;
  summary: string;
  strengths: string;
  focusAreas: string;
  coachNotes: string;
  sharedWithMember: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSubmission {
  id: string;
  memberUserId: string;
  memberName: string;
  assignmentId: string | null;
  assignmentTitle: string | null;
  submittedByUserId: string | null;
  submittedByName: string | null;
  submissionType: TeamSubmissionType;
  title: string;
  body: string;
  preview: string;
  externalUrl: string | null;
  codeLanguage: BenchmarkLanguage | null;
  status: TeamSubmissionStatus;
  rubricScore: number | null;
  attemptNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamJoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  requestedRole: Exclude<TeamRole, 'owner'>;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  note: string;
  inviteId: string | null;
  inviteCode: string | null;
  inviteLabel: string | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  requestedAt: string;
  reviewedAt: string | null;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string | null;
  avatar: string;
  role: TeamRole;
  status: 'active' | 'inactive';
  joinedAt: string;
  lastActiveAt: string | null;
  isCurrentlyActive: boolean;
  currentStreak: number;
  latestBenchmarkScore: number | null;
  latestBenchmarkAt: string | null;
  benchmarkCount: number;
  improvementDelta: number | null;
  latestBenchmarkStatus: string;
  recommendedAction: string;
}

export interface TeamWorkspaceDetail {
  team: TeamSummary & { createdAt: string; updatedAt: string };
  metrics: {
    activeLearners: number;
    benchmarkCompletionCount: number;
    benchmarkCompletionRate: number;
    medianScore: number | null;
    averageImprovement: number | null;
    needsAttentionCount: number;
    retakeReadyCount: number;
    topPerformer: { name: string; score: number | null; streak: number } | null;
    progressTimeline: Array<{ label: string; value: number | null; count: number }>;
  };
  members: TeamMember[];
  assignments: TeamAssignment[];
  invites: TeamInvite[];
  submissions: TeamSubmission[];
  feedback: TeamFeedback[];
  joinRequests: TeamJoinRequest[];
}

export interface TeamCapabilities {
  canCreateTeam: boolean;
  createBlockedReason: string | null;
  isPrivilegedAdmin: boolean;
  activeTeamPlanKey: string;
  activeTeamPlanLabel: string;
  workspaceLimit: number;
  seatLimit: number;
  currentWorkspaceCount: number;
}

export interface TeamAnalytics {
  summary: {
    needsReviewNow: number;
    quietLearners7d: number;
    offTrackAssignments: number;
    medianLatestScore: number | null;
    benchmarkCoverageRate: number;
    benchmarkedLearners: number;
    totalLearners: number;
  };
  health: {
    activeLearners: number;
    noBenchmarkYet: number;
    dueNext7d: number;
    pastDueAssignments: number;
    pendingJoinRequests: number;
  };
  movement: {
    averageLatestScore: number | null;
    medianLatestScore: number | null;
    improvingLearners: number;
    plateauLearners: number;
    decliningLearners: number;
    readyForRetake: number;
    averageImprovement: number | null;
  };
  workflow: {
    needsReviewNow: number;
    needsRevision: number;
    feedbackDrafts: number;
    feedbackResolved: number;
    quietLearners3d: number;
    quietLearners7d: number;
    offTrackAssignments: number;
  };
  trend: {
    points: Array<{ label: string; value: number | null; count: number }>;
    deltaFromPrevious: number | null;
    status: 'up' | 'flat' | 'down' | 'insufficient';
    summary: string;
  };
  actionSignals: Array<{
    title: string;
    detail: string;
    tone: 'critical' | 'watch' | 'positive';
  }>;
  priorityLearners: Array<{
    userId: string;
    name: string;
    signal: string;
    reason: string;
    latestScore: number | null;
    improvementDelta: number | null;
    lastActiveAt: string | null;
    recommendedAction: string;
    tone: 'critical' | 'watch' | 'positive';
  }>;
  priorityAssignments: Array<{
    id: string;
    title: string;
    signal: string;
    reason: string;
    dueAt: string | null;
    completionRate: number;
    lifecycleState: TeamAssignmentLifecycleState;
    learnerCount: number;
    reviewBacklog: number;
  }>;
  highlights: Array<{
    title: string;
    detail: string;
  }>;
}

export interface PublicTeamProof {
  team: {
    id: string;
    name: string;
    slug: string;
    description: string;
    useCase: TeamUseCase;
    memberCount: number;
    publicSharedAt: string | null;
  };
  metrics: TeamWorkspaceDetail['metrics'];
  assignments: Array<Pick<TeamAssignment, 'id' | 'title' | 'assignmentType' | 'benchmarkLanguage' | 'dueAt' | 'scopeLabel'>>;
  improvementLeaders: Array<{
    userId: string;
    publicName: string;
    latestBenchmarkScore: number | null;
    improvementDelta: number | null;
    benchmarkCount: number;
    recommendedAction: string;
  }>;
}

export class TeamsApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeamsApiUnavailableError';
  }
}

const buildTeamsApiUrl = (path = '') => buildApiUrl(`/api/teams${path}`);

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to use team workspaces.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
};

const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to use team workspaces.');
  }

  return accessToken;
};

const isLegacyCapabilitiesRouteError = (message: string) => {
  const normalized = String(message || '');
  return (
    normalized.includes('"teamId"') &&
    normalized.includes('Invalid UUID')
  );
};

const isLegacyBulkAssignmentDeleteRouteError = (message: string, path: string) => {
  const normalizedPath = String(path || '');
  const normalizedMessage = String(message || '');

  return (
    normalizedPath.includes('/assignments/bulk') &&
    normalizedMessage.includes('Invalid option') &&
    normalizedMessage.includes('archive') &&
    normalizedMessage.includes('restore') &&
    normalizedMessage.includes('set_due_date')
  );
};

const normalizeTeamsApiErrorMessage = (message: string, path: string) => {
  if (path === '/capabilities' && isLegacyCapabilitiesRouteError(message)) {
    return 'The live Teams API is outdated and needs redeploying before team creation can work.';
  }

  if (isLegacyBulkAssignmentDeleteRouteError(message, path)) {
    return 'The local Teams API is outdated and needs a restart before permanent assignment deletion can work.';
  }

  return message;
};

const teamsFetch = async <T>(path: string, init: RequestInit = {}) => {
  try {
    const response = await fetch(buildTeamsApiUrl(path), {
      ...init,
      headers: {
        ...(await getAuthHeaders()),
        ...(init.headers || {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const rawMessage = (payload as { error?: string }).error || 'Teams request failed.';
      throw new Error(normalizeTeamsApiErrorMessage(rawMessage, path));
    }

    return payload as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new TeamsApiUnavailableError('Could not reach the teams API.');
    }

    throw error;
  }
};

const teamsFetchRaw = async (path: string, init: RequestInit = {}) => {
  try {
    const accessToken = await getAuthToken();
    const response = await fetch(buildTeamsApiUrl(path), {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const rawMessage = (payload as { error?: string }).error || 'Teams request failed.';
      throw new Error(normalizeTeamsApiErrorMessage(rawMessage, path));
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new TeamsApiUnavailableError('Could not reach the teams API.');
    }

    throw error;
  }
};

export const listTeams = async () => {
  const payload = await teamsFetch<{ teams: TeamSummary[] }>('');
  return payload.teams || [];
};

export const getTeamsCapabilities = async () => {
  try {
    return await teamsFetch<TeamCapabilities>('/capabilities');
  } catch (error: any) {
    return {
      canCreateTeam: false,
      createBlockedReason: error?.message || 'Could not load team creation access.',
      isPrivilegedAdmin: false,
      activeTeamPlanKey: 'none',
      activeTeamPlanLabel: 'No team plan',
      workspaceLimit: 0,
      seatLimit: 0,
      currentWorkspaceCount: 0,
    };
  }
};

export const createTeam = async (input: {
  name: string;
  description?: string;
  useCase?: TeamUseCase;
  seatLimit?: number;
}) => {
  const payload = await teamsFetch<{ team: TeamSummary }>('', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.team;
};

export const getTeamWorkspace = async (teamId: string) => {
  return teamsFetch<TeamWorkspaceDetail>(`/${teamId}`);
};

export const shareTeamWorkspace = async (teamId: string) => {
  const payload = await teamsFetch<{ team: TeamWorkspaceDetail['team'] }>(`/${teamId}/share`, {
    method: 'POST',
  });
  return payload.team;
};

export const unshareTeamWorkspace = async (teamId: string) => {
  const payload = await teamsFetch<{ team: TeamWorkspaceDetail['team'] }>(`/${teamId}/share`, {
    method: 'DELETE',
  });
  return payload.team;
};

export const createTeamInvite = async (
  teamId: string,
  input: {
    label?: string;
    email?: string;
    role?: Exclude<TeamRole, 'owner'>;
    expiresInDays?: number;
    maxUses?: number;
  }
) => {
  const payload = await teamsFetch<{ invite: TeamInvite }>(`/${teamId}/invites`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.invite;
};

export const joinTeamByCode = async (code: string) => {
  const payload = await teamsFetch<{
    status: 'joined' | 'pending';
    team: TeamSummary;
    joinRequest?: TeamJoinRequest | null;
  }>('/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return payload;
};

export const updateTeamJoinSettings = async (
  teamId: string,
  input: {
    joinMode: TeamJoinMode;
    allowedEmailDomain?: string | null;
  }
) => {
  const payload = await teamsFetch<{ team: TeamWorkspaceDetail['team'] }>(`/${teamId}/join-settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.team;
};

export const reviewTeamJoinRequest = async (
  teamId: string,
  requestId: string,
  input: {
    status: 'approved' | 'denied';
    note?: string;
  }
) => {
  const payload = await teamsFetch<{ joinRequest: TeamJoinRequest }>(`/${teamId}/join-requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.joinRequest;
};

export const createTeamAssignment = async (
  teamId: string,
  input: {
    title: string;
    description?: string;
    assignmentType: TeamAssignmentType;
    benchmarkLanguage?: BenchmarkLanguage | null;
    trackId?: string | null;
    duelTargetCount?: number;
    dueAt?: string | null;
  }
) => {
  const payload = await teamsFetch<{ assignment: TeamAssignment }>(`/${teamId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.assignment;
};

export const updateTeamAssignment = async (
  teamId: string,
  assignmentId: string,
  input: Partial<{
    title: string;
    description: string;
    assignmentType: TeamAssignmentType;
    benchmarkLanguage: BenchmarkLanguage | null;
    trackId: string | null;
    duelTargetCount: number;
    dueAt: string | null;
    archived: boolean;
  }>
) => {
  const payload = await teamsFetch<{ assignment: TeamAssignment }>(`/${teamId}/assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.assignment;
};

export const duplicateTeamAssignment = async (teamId: string, assignmentId: string) => {
  const payload = await teamsFetch<{ assignment: TeamAssignment }>(`/${teamId}/assignments/${assignmentId}/duplicate`, {
    method: 'POST',
  });
  return payload.assignment;
};

export const bulkUpdateTeamAssignments = async (
  teamId: string,
  input: {
    assignmentIds: string[];
    action: 'archive' | 'restore' | 'set_due_date' | 'delete';
    dueAt?: string | null;
  }
) => {
  const payload = await teamsFetch<{ assignments: TeamAssignment[] }>(`/${teamId}/assignments/bulk`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.assignments || [];
};

export const deleteTeamAssignment = async (teamId: string, assignmentId: string) => {
  await teamsFetch<void>(`/${teamId}/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
};

export const updateTeamInvite = async (
  teamId: string,
  inviteId: string,
  input: Partial<{
    label: string;
    email: string | null;
    role: Exclude<TeamRole, 'owner'>;
    expiresInDays: number;
    maxUses: number;
    status: TeamInvite['status'];
  }>
) => {
  const payload = await teamsFetch<{ invite: TeamInvite }>(`/${teamId}/invites/${inviteId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.invite;
};

export const deleteTeamInvite = async (teamId: string, inviteId: string) => {
  await teamsFetch<void>(`/${teamId}/invites/${inviteId}`, {
    method: 'DELETE',
  });
};

export const updateTeamMember = async (
  teamId: string,
  userId: string,
  input: Partial<{
    role: Exclude<TeamRole, 'owner'>;
    status: TeamMember['status'];
  }>
) => {
  const payload = await teamsFetch<{ membership: { role: TeamRole; status: TeamMember['status'] } }>(`/${teamId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.membership;
};

export const removeTeamMember = async (teamId: string, userId: string) => {
  await teamsFetch<void>(`/${teamId}/members/${userId}`, {
    method: 'DELETE',
  });
};

export const listTeamFeedback = async (teamId: string) => {
  const payload = await teamsFetch<{ feedback: TeamFeedback[] }>(`/${teamId}/feedback`);
  return payload.feedback || [];
};

export const createTeamFeedback = async (
  teamId: string,
  input: {
    memberUserId: string;
    assignmentId?: string | null;
    submissionId?: string | null;
    rubricScore?: number | null;
    rubricBreakdown?: TeamRubricBreakdown | null;
    status?: TeamFeedbackStatus;
    summary?: string;
    strengths?: string;
    focusAreas?: string;
    coachNotes?: string;
    sharedWithMember?: boolean;
  }
) => {
  const payload = await teamsFetch<{ feedback: TeamFeedback }>(`/${teamId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.feedback;
};

export const updateTeamFeedback = async (
  teamId: string,
  feedbackId: string,
  input: Partial<{
    assignmentId: string | null;
    submissionId: string | null;
    rubricScore: number | null;
    rubricBreakdown: TeamRubricBreakdown | null;
    status: TeamFeedbackStatus;
    summary: string;
    strengths: string;
    focusAreas: string;
    coachNotes: string;
    sharedWithMember: boolean;
  }>
) => {
  const payload = await teamsFetch<{ feedback: TeamFeedback }>(`/${teamId}/feedback/${feedbackId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.feedback;
};

export const deleteTeamFeedback = async (teamId: string, feedbackId: string) => {
  await teamsFetch<void>(`/${teamId}/feedback/${feedbackId}`, {
    method: 'DELETE',
  });
};

export const listTeamSubmissions = async (teamId: string) => {
  const payload = await teamsFetch<{ submissions: TeamSubmission[] }>(`/${teamId}/submissions`);
  return payload.submissions || [];
};

export const createTeamSubmission = async (
  teamId: string,
  input: {
    memberUserId: string;
    assignmentId?: string | null;
    submissionType: TeamSubmissionType;
    title: string;
    body?: string;
    externalUrl?: string | null;
    codeLanguage?: BenchmarkLanguage | null;
    status?: TeamSubmissionStatus;
    rubricScore?: number | null;
  }
) => {
  const payload = await teamsFetch<{ submission: TeamSubmission }>(`/${teamId}/submissions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.submission;
};

export const updateTeamSubmission = async (
  teamId: string,
  submissionId: string,
  input: Partial<{
    assignmentId: string | null;
    submissionType: TeamSubmissionType;
    title: string;
    body: string;
    externalUrl: string | null;
    codeLanguage: BenchmarkLanguage | null;
    status: TeamSubmissionStatus;
    rubricScore: number | null;
  }>
) => {
  const payload = await teamsFetch<{ submission: TeamSubmission }>(`/${teamId}/submissions/${submissionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.submission;
};

export const deleteTeamSubmission = async (teamId: string, submissionId: string) => {
  await teamsFetch<void>(`/${teamId}/submissions/${submissionId}`, {
    method: 'DELETE',
  });
};

export const fetchTeamAnalytics = async (teamId: string) => {
  const payload = await teamsFetch<{ analytics: TeamAnalytics }>(`/${teamId}/analytics`);
  return payload.analytics;
};

export const exportTeamReport = async (teamId: string, format: 'json' | 'csv') => {
  const response = await teamsFetchRaw(`/${teamId}/export?format=${encodeURIComponent(format)}`);
  return response.blob();
};

export const fetchSharedTeamProof = async (publicToken: string) => {
  const response = await fetch(buildTeamsApiUrl(`/shared/${encodeURIComponent(publicToken)}`));
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Could not load the shared team proof.');
  }

  return payload as PublicTeamProof;
};
