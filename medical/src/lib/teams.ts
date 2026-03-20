import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export type TeamUseCase = 'bootcamps' | 'universities' | 'coding-clubs' | 'upskilling' | 'general';
export type TeamRole = 'owner' | 'admin' | 'coach' | 'learner';
export type TeamAssignmentType = 'benchmark' | 'challenge_pack' | 'roadmap';
export type TeamAssignmentLifecycleState = 'active' | 'past_due' | 'archived';
export type BenchmarkLanguage = 'python' | 'javascript' | 'java' | 'cpp';
export type TeamFeedbackStatus = 'draft' | 'shared' | 'resolved';
export type TeamJoinMode = 'open_code' | 'code_domain' | 'code_approval' | 'invite_only';
export type TeamSubmissionType = 'written' | 'code' | 'link';
export type TeamSubmissionStatus = 'submitted' | 'reviewed' | 'needs_revision';

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
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
}

export interface TeamAssignment {
  id: string;
  title: string;
  description: string;
  assignmentType: TeamAssignmentType;
  benchmarkLanguage: BenchmarkLanguage | null;
  trackId: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  lifecycleState: TeamAssignmentLifecycleState;
  archivedAt: string | null;
  archivedByUserId: string | null;
  eligibleLearnerCount: number;
  completedLearnerCount: number;
  inProgressLearnerCount: number;
  notStartedLearnerCount: number;
  completionRate: number;
  averageProgressPercent: number;
  requiredCompletionCount: number;
  progressUnitLabel: string;
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
    progressTimeline: Array<{ label: string; value: number | null }>;
  };
  members: TeamMember[];
  assignments: TeamAssignment[];
  invites: TeamInvite[];
  submissions: TeamSubmission[];
  feedback: TeamFeedback[];
  joinRequests: TeamJoinRequest[];
}

export interface TeamAnalytics {
  scoreBands: Array<{ label: string; count: number }>;
  roleDistribution: Record<TeamRole, number>;
  recency: {
    recent: number;
    warm: number;
    stale: number;
    missing: number;
  };
  inviteStats: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
    uses: number;
  };
  assignmentStats: {
    total: number;
    active: number;
    pastDue: number;
    archived: number;
    benchmark: number;
    challengePack: number;
    roadmap: number;
    dueSoon: number;
    averageCompletionRate: number;
  };
  streakStats: {
    average: number | null;
    highest: number;
  };
  benchmarkStats: {
    average: number | null;
    median: number | null;
    completionRate: number;
  };
  feedbackStats: {
    total: number;
    shared: number;
    resolved: number;
    drafts: number;
  };
  submissionStats?: {
    total: number;
    submitted: number;
    reviewed: number;
    needsRevision: number;
  };
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
  assignments: Array<Pick<TeamAssignment, 'id' | 'title' | 'assignmentType' | 'benchmarkLanguage' | 'dueAt'>>;
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
      throw new Error((payload as { error?: string }).error || 'Teams request failed.');
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
      throw new Error((payload as { error?: string }).error || 'Teams request failed.');
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

export const bulkUpdateTeamAssignments = async (
  teamId: string,
  input: {
    assignmentIds: string[];
    action: 'archive' | 'restore' | 'set_due_date';
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
