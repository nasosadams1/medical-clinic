import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export type TeamUseCase = 'bootcamps' | 'universities' | 'coding-clubs' | 'upskilling' | 'general';
export type TeamRole = 'owner' | 'admin' | 'coach' | 'learner';
export type TeamAssignmentType = 'benchmark' | 'challenge_pack' | 'roadmap';
export type BenchmarkLanguage = 'python' | 'javascript' | 'java' | 'cpp';

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  useCase: TeamUseCase;
  seatLimit: number;
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
  metadata?: Record<string, unknown>;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string | null;
  avatar: string;
  role: TeamRole;
  status: 'active' | 'inactive';
  joinedAt: string;
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
  const payload = await teamsFetch<{ team: TeamSummary }>('/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return payload.team;
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

export const fetchSharedTeamProof = async (publicToken: string) => {
  const response = await fetch(buildTeamsApiUrl(`/shared/${encodeURIComponent(publicToken)}`));
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Could not load the shared team proof.');
  }

  return payload as PublicTeamProof;
};
