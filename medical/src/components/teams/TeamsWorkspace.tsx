import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileOutput,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { interviewTracks } from '../../data/siteContent';
import { usePlanAccess } from '../../hooks/usePlanAccess';
import { trackEvent } from '../../lib/analytics';
import { getTeamPlanPolicyFromSeatLimit } from '../../../shared/team-plan-policy.js';
import {
  createTeam,
  createTeamAssignment,
  createTeamFeedback,
  createTeamInvite,
  deleteTeamSubmission,
  deleteTeamAssignment,
  deleteTeamFeedback,
  deleteTeamInvite,
  exportTeamReport,
  fetchTeamAnalytics,
  getTeamWorkspace,
  joinTeamByCode,
  listTeams,
  removeTeamMember,
  reviewTeamJoinRequest,
  shareTeamWorkspace,
  TeamAnalytics,
  TeamAssignment,
  TeamAssignmentType,
  TeamAssignmentLifecycleState,
  TeamFeedback,
  TeamFeedbackStatus,
  TeamInvite,
  TeamJoinMode,
  TeamJoinRequest,
  TeamMember,
  TeamRole,
  TeamRubricBreakdown,
  TeamSubmissionStatus,
  TeamSubmissionType,
  TeamSummary,
  TeamUseCase,
  TeamWorkspaceDetail,
  bulkUpdateTeamAssignments,
  unshareTeamWorkspace,
  createTeamSubmission,
  updateTeamAssignment,
  updateTeamFeedback,
  updateTeamInvite,
  updateTeamJoinSettings,
  updateTeamMember,
  updateTeamSubmission,
} from '../../lib/teams';

type TeamsWorkspaceMode = 'app' | 'public';
type WorkspaceModal = null | 'members' | 'assignments' | 'invites' | 'feedback' | 'analytics' | 'reports';
const TEAM_WORKSPACE_OVERVIEW_VALUE = '__overview__';

interface TeamsWorkspaceProps {
  mode?: TeamsWorkspaceMode;
}

interface MemberDraft {
  role: TeamRole;
}

interface InviteDraft {
  id: string | null;
  label: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  maxUses: string;
  expiresInDays: string;
  status: TeamInvite['status'];
}

interface AssignmentDraft {
  id: string | null;
  title: string;
  description: string;
  assignmentType: TeamAssignmentType;
  benchmarkLanguage: TeamAssignment['benchmarkLanguage'];
  trackId: string;
  dueAt: string;
}

interface FeedbackDraft {
  id: string | null;
  memberUserId: string;
  assignmentId: string;
  status: TeamFeedbackStatus;
  summary: string;
  strengths: string;
  focusAreas: string;
  coachNotes: string;
  sharedWithMember: boolean;
}

interface FeedbackRubricDraft {
  correctness: string;
  codeQuality: string;
  problemSolving: string;
  communication: string;
}

interface SubmissionDraft {
  id: string | null;
  title: string;
  submissionType: TeamSubmissionType;
  body: string;
  externalUrl: string;
  codeLanguage: BenchmarkLanguage | '';
  status: TeamSubmissionStatus;
  rubricScore: string;
}

interface JoinSettingsDraft {
  joinMode: TeamJoinMode;
  allowedEmailDomain: string;
}

type MemberConfirmAction =
  | null
  | {
      type: 'role';
      member: TeamMember;
      nextRole: TeamRole;
    }
  | {
      type: 'remove';
      member: TeamMember;
    };

type MemberActivityBand = 'active_now' | 'within_12h' | 'within_24h' | 'within_3d' | 'within_7d' | 'inactive';
type MemberActivityFilter = 'all' | 'active_now' | 'last_24h' | 'last_7d' | 'inactive';
type AssignmentDueBand = 'overdue' | 'due_soon' | 'scheduled' | 'no_due_date';
type AssignmentLifecycleFilter = 'all' | TeamAssignmentLifecycleState;
type FeedbackVisibilityFilter = 'all' | 'shared' | 'private';
type AssignmentSortOption = 'priority' | 'due' | 'completion' | 'recent';
type FeedbackSortOption = 'recent' | 'score' | 'learner';
type AssignmentViewMode = 'list' | 'board' | 'calendar';
type SubmissionAttachmentMode = 'none' | 'existing' | 'new';
type ReviewStatusFilter = 'all' | 'needs_review' | TeamFeedbackStatus;

type ReviewQueueState = 'needs_review' | 'draft' | 'shared' | 'resolved';

type ReviewQueueItem =
  | {
      id: string;
      source: 'submission';
      state: ReviewQueueState;
      sortPriority: number;
      member: TeamMember | null;
      assignment: TeamAssignment | null;
      submission: TeamWorkspaceDetail['submissions'][number];
      feedback: TeamWorkspaceDetail['feedback'][number] | null;
      updatedAt: string;
      preview: string;
      score: number | null;
      historyCount: number;
      submittedAt: string;
    }
  | {
      id: string;
      source: 'feedback';
      state: ReviewQueueState;
      sortPriority: number;
      member: TeamMember | null;
      assignment: TeamAssignment | null;
      submission: TeamWorkspaceDetail['submissions'][number] | null;
      feedback: TeamWorkspaceDetail['feedback'][number];
      updatedAt: string;
      preview: string;
      score: number | null;
      historyCount: number;
      submittedAt: string;
    };

type WorkspaceConfirmAction =
  | null
  | {
      type: 'assignment_archive';
      assignment: TeamAssignment;
    }
  | {
      type: 'feedback_delete';
      entry: TeamFeedback;
    };

const MEMBER_ROLE_ORDER: Record<TeamRole, number> = {
  owner: 0,
  admin: 1,
  coach: 2,
  learner: 3,
};

const TEAM_USE_CASE_OPTIONS: Array<{ value: TeamUseCase; label: string }> = [
  { value: 'bootcamps', label: 'Bootcamp cohort' },
  { value: 'universities', label: 'University / class' },
  { value: 'coding-clubs', label: 'Coding club' },
  { value: 'upskilling', label: 'Internal upskilling' },
  { value: 'general', label: 'General team' },
];

const TEAM_ROLE_OPTIONS: Array<{ value: Exclude<TeamRole, 'owner'>; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'learner', label: 'Learner' },
];

const TEAM_JOIN_MODE_OPTIONS: Array<{ value: TeamJoinMode; label: string; helper: string }> = [
  { value: 'open_code', label: 'Open by code', helper: 'Any active code joins instantly.' },
  { value: 'code_domain', label: 'Code + email domain', helper: 'Only signed-in users on one allowed domain can join.' },
  { value: 'code_approval', label: 'Code + admin approval', helper: 'Codes create requests that owners or admins approve.' },
  { value: 'invite_only', label: 'Invite-only', helper: 'Only direct email invites can be used.' },
];

const MEMBER_ACTIVITY_FILTER_OPTIONS: Array<{ value: MemberActivityFilter; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'active_now', label: 'Active now' },
  { value: 'last_24h', label: 'Last 24 hours' },
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'inactive', label: 'Inactive' },
];

const ASSIGNMENT_LIFECYCLE_FILTER_OPTIONS: Array<{ value: AssignmentLifecycleFilter; label: string }> = [
  { value: 'all', label: 'All states' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'archived', label: 'Archived' },
];

const FEEDBACK_VISIBILITY_FILTER_OPTIONS: Array<{ value: FeedbackVisibilityFilter; label: string }> = [
  { value: 'all', label: 'All visibility' },
  { value: 'shared', label: 'Shared' },
  { value: 'private', label: 'Private' },
];

const CALENDAR_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ASSIGNMENT_TEMPLATES: Array<{
  id: string;
  title: string;
  assignmentType: TeamAssignmentType;
  benchmarkLanguage?: AssignmentDraft['benchmarkLanguage'];
  trackId?: string;
  description: string;
}> = [
  {
    id: 'benchmark-python-screen',
    title: 'Class benchmark',
    assignmentType: 'benchmark',
    benchmarkLanguage: 'python',
    description: 'Measure baseline fluency before the next coaching sprint.',
  },
  {
    id: 'challenge-pack-speed',
    title: 'Timed challenge pack',
    assignmentType: 'challenge_pack',
    benchmarkLanguage: 'javascript',
    description: 'Push timed problem solving and raise pressure-readiness.',
  },
  {
    id: 'roadmap-junior',
    title: 'Junior prep roadmap',
    assignmentType: 'roadmap',
    trackId: interviewTracks[0]?.id || '',
    description: 'Assign a structured roadmap and review completion weekly.',
  },
];

const FEEDBACK_SNIPPETS: Array<{
  id: string;
  label: string;
  summary: string;
  strengths: string;
  focusAreas: string;
}> = [
  {
    id: 'clean-logic',
    label: 'Clean logic',
    summary: 'Strong baseline. The core approach is correct and easy to follow.',
    strengths: 'Good control flow, readable naming, and clear problem framing.',
    focusAreas: 'Push deeper on edge cases and test your output against tricky inputs.',
  },
  {
    id: 'needs-edge-cases',
    label: 'Edge cases',
    summary: 'The main solution works, but edge-case handling still needs attention.',
    strengths: 'Core structure is there and the logic is mostly sound.',
    focusAreas: 'Handle empty input, boundary values, and output formatting more deliberately.',
  },
  {
    id: 'speed-pressure',
    label: 'Speed under pressure',
    summary: 'You can solve the task, but speed drops once pressure increases.',
    strengths: 'Problem-solving instincts are solid once you settle into the task.',
    focusAreas: 'Practice timed reps and simplify your first pass before optimizing.',
  },
  {
    id: 'ready-retake',
    label: 'Ready for retake',
    summary: 'This looks ready for a stronger retake or next-level assignment.',
    strengths: 'Execution is more confident and the solution quality is improving.',
    focusAreas: 'Take a harder benchmark or a more time-constrained challenge next.',
  },
];

const TEAM_INVITE_MIN_USES = 1;
const TEAM_INVITE_MAX_USES = 500;
const TEAM_INVITE_MIN_EXPIRES_DAYS = 1;
const TEAM_INVITE_MAX_EXPIRES_DAYS = 90;

const emptyInviteDraft = (): InviteDraft => ({
  id: null,
  label: 'General learner access',
  email: '',
  role: 'learner',
  maxUses: '25',
  expiresInDays: '14',
  status: 'active',
});

const emptyAssignmentDraft = (): AssignmentDraft => ({
  id: null,
  title: '',
  description: '',
  assignmentType: 'benchmark',
  benchmarkLanguage: 'python',
  trackId: '',
  dueAt: '',
});

const emptyFeedbackDraft = (): FeedbackDraft => ({
  id: null,
  memberUserId: '',
  assignmentId: '',
  status: 'draft',
  summary: '',
  strengths: '',
  focusAreas: '',
  coachNotes: '',
  sharedWithMember: false,
});

const emptyFeedbackRubricDraft = (): FeedbackRubricDraft => ({
  correctness: '',
  codeQuality: '',
  problemSolving: '',
  communication: '',
});

const emptySubmissionDraft = (): SubmissionDraft => ({
  id: null,
  title: '',
  submissionType: 'written',
  body: '',
  externalUrl: '',
  codeLanguage: 'python',
  status: 'submitted',
  rubricScore: '',
});

const emptyJoinSettingsDraft = (): JoinSettingsDraft => ({
  joinMode: 'open_code',
  allowedEmailDomain: '',
});

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRelativeActivityLabel = (value: string | null | undefined) => {
  if (!value) return 'No activity yet';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity yet';

  const diffMs = Date.now() - parsed.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Moments ago';

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) return 'Moments ago';
  if (diffMs < hourMs) return `${Math.max(1, Math.floor(diffMs / minuteMs))}m ago`;
  if (diffMs < dayMs) return `${Math.max(1, Math.floor(diffMs / hourMs))}h ago`;
  if (diffMs < 7 * dayMs) return `${Math.max(1, Math.floor(diffMs / dayMs))}d ago`;
  return formatDateLabel(value);
};

const formatAssignmentTypeLabel = (assignmentType: TeamAssignmentType) => {
  if (assignmentType === 'challenge_pack') return 'Challenge pack';
  if (assignmentType === 'roadmap') return 'Roadmap';
  return 'Benchmark';
};

const formatBenchmarkLanguageLabel = (language: TeamAssignment['benchmarkLanguage']) => {
  if (language === 'javascript') return 'JavaScript';
  if (language === 'java') return 'Java';
  if (language === 'cpp') return 'C++';
  return 'Python';
};

const formatSubmissionTypeLabel = (submissionType: TeamSubmissionType) => {
  if (submissionType === 'code') return 'Code';
  if (submissionType === 'link') return 'Link';
  return 'Written';
};

const formatSubmissionStatusLabel = (status: TeamSubmissionStatus) => {
  if (status === 'needs_revision') return 'Needs revision';
  if (status === 'reviewed') return 'Reviewed';
  return 'Submitted';
};

const formatDateTimeLabel = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeRubricDraftValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(10, Math.max(0, parsed));
};

const normalizeRubricBreakdownDraft = (draft: FeedbackRubricDraft): TeamRubricBreakdown => ({
  correctness: normalizeRubricDraftValue(draft.correctness),
  codeQuality: normalizeRubricDraftValue(draft.codeQuality),
  problemSolving: normalizeRubricDraftValue(draft.problemSolving),
  communication: normalizeRubricDraftValue(draft.communication),
});

const getRubricBreakdownTotal = (breakdown: TeamRubricBreakdown | null | undefined) =>
  breakdown
    ? [breakdown.correctness, breakdown.codeQuality, breakdown.problemSolving, breakdown.communication].reduce(
        (total, value) => total + (value ?? 0),
        0
      )
    : 0;

const hasRubricBreakdownValues = (breakdown: TeamRubricBreakdown | null | undefined) =>
  Boolean(
    breakdown &&
      [breakdown.correctness, breakdown.codeQuality, breakdown.problemSolving, breakdown.communication].some(
        (value) => value !== null
      )
  );

const buildFeedbackRubricDraft = (breakdown: TeamRubricBreakdown | null | undefined): FeedbackRubricDraft => ({
  correctness: breakdown?.correctness === null || breakdown?.correctness === undefined ? '' : String(breakdown.correctness),
  codeQuality: breakdown?.codeQuality === null || breakdown?.codeQuality === undefined ? '' : String(breakdown.codeQuality),
  problemSolving:
    breakdown?.problemSolving === null || breakdown?.problemSolving === undefined ? '' : String(breakdown.problemSolving),
  communication: breakdown?.communication === null || breakdown?.communication === undefined ? '' : String(breakdown.communication),
});

const formatMonthLabel = (value: Date) =>
  value.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const startOfCalendarMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);

const startOfCalendarGrid = (value: Date) => {
  const monthStart = startOfCalendarMonth(value);
  const weekday = monthStart.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  gridStart.setHours(0, 0, 0, 0);
  return gridStart;
};

const addCalendarDays = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const toCalendarDateKey = (value: string | Date) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAssignmentDueMeta = (dueAt: string | null | undefined) => {
  if (!dueAt) {
    return {
      band: 'no_due_date' as AssignmentDueBand,
      label: 'No due date',
      tone: 'default' as const,
      sortValue: Number.POSITIVE_INFINITY,
    };
  }

  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) {
    return {
      band: 'no_due_date' as AssignmentDueBand,
      label: 'No due date',
      tone: 'default' as const,
      sortValue: Number.POSITIVE_INFINITY,
    };
  }

  const diffMs = parsed.getTime() - Date.now();
  if (diffMs < 0) {
    return {
      band: 'overdue' as AssignmentDueBand,
      label: 'Overdue',
      tone: 'danger' as const,
      sortValue: parsed.getTime(),
    };
  }

  if (diffMs <= 7 * 24 * 60 * 60 * 1000) {
    return {
      band: 'due_soon' as AssignmentDueBand,
      label: 'Due soon',
      tone: 'warn' as const,
      sortValue: parsed.getTime(),
    };
  }

  return {
    band: 'scheduled' as AssignmentDueBand,
    label: 'Scheduled',
    tone: 'success' as const,
    sortValue: parsed.getTime(),
  };
};

const getAssignmentLifecycleMeta = (lifecycleState: TeamAssignmentLifecycleState) => {
  switch (lifecycleState) {
    case 'past_due':
      return {
        label: 'Past due',
        tone: 'danger' as const,
        sortPriority: 0,
      };
    case 'archived':
      return {
        label: 'Archived',
        tone: 'default' as const,
        sortPriority: 2,
      };
    case 'active':
    default:
      return {
        label: 'Active',
        tone: 'success' as const,
        sortPriority: 1,
      };
  }
};

const getAssignmentWorkflowStateMeta = (assignment: TeamAssignment) => {
  const dueMeta = getAssignmentDueMeta(assignment.dueAt);
  const startedCount = assignment.completedLearnerCount + assignment.inProgressLearnerCount;

  if (assignment.lifecycleState === 'archived') {
    return {
      label: 'Archived',
      description: 'Inactive history',
      sortPriority: 4,
    };
  }

  if (assignment.lifecycleState === 'past_due' || dueMeta.band === 'overdue') {
    return {
      label: 'Past due',
      description: 'Needs action now',
      sortPriority: 0,
    };
  }

  if (dueMeta.band === 'due_soon') {
    return {
      label: 'Due soon',
      description: 'Inside 7 days',
      sortPriority: 1,
    };
  }

  if (dueMeta.band === 'scheduled' && startedCount === 0) {
    return {
      label: 'Scheduled',
      description: 'Waiting to start',
      sortPriority: 2,
    };
  }

  return {
    label: 'Live',
    description: 'In progress',
    sortPriority: 3,
  };
};

const getFeedbackStateMeta = (entry: TeamFeedback) => {
  if (entry.status === 'resolved') {
    return {
      label: 'Resolved',
      tone: 'success' as const,
      sortPriority: 2,
    };
  }

  if (entry.sharedWithMember || entry.status === 'shared') {
    return {
      label: 'Shared',
      tone: 'success' as const,
      sortPriority: 1,
    };
  }

  return {
    label: 'Needs review',
    tone: 'warn' as const,
    sortPriority: 0,
  };
};

const getReviewQueueStateMeta = (state: ReviewQueueState) => {
  switch (state) {
    case 'resolved':
      return { label: 'Resolved', tone: 'success' as const, sortPriority: 3 };
    case 'shared':
      return { label: 'Shared', tone: 'success' as const, sortPriority: 2 };
    case 'draft':
      return { label: 'Drafted', tone: 'default' as const, sortPriority: 1 };
    case 'needs_review':
    default:
      return { label: 'Needs review', tone: 'warn' as const, sortPriority: 0 };
  }
};

const getMemberActivityIndicator = (
  lastActiveAt: string | null | undefined,
  options?: { isCurrentUser?: boolean; isCurrentlyActive?: boolean }
) => {
  const parsed = lastActiveAt ? new Date(lastActiveAt) : null;
  const lastActiveTimestamp = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : null;

  if (options?.isCurrentlyActive || options?.isCurrentUser) {
    return {
      band: 'active_now' as MemberActivityBand,
      className: 'bg-emerald-400',
      label: 'Active now',
      description: 'Active now',
      sortValue: Number.MAX_SAFE_INTEGER,
    };
  }

  if (!lastActiveTimestamp) {
    return {
      band: 'inactive' as MemberActivityBand,
      className: 'border border-white/10 bg-black',
      label: 'No activity',
      description: 'No recent activity',
      sortValue: -1,
    };
  }

  const ageMs = Date.now() - lastActiveTimestamp;
  if (Number.isNaN(ageMs)) {
    return {
      band: 'inactive' as MemberActivityBand,
      className: 'border border-white/10 bg-black',
      label: 'No activity',
      description: 'No recent activity',
      sortValue: -1,
    };
  }

  const relativeLabel = formatRelativeActivityLabel(lastActiveAt);
  if (ageMs <= 15 * 60 * 1000) {
    return {
      band: 'active_now' as MemberActivityBand,
      className: 'bg-emerald-400',
      label: 'Active now',
      description: 'Active now',
      sortValue: lastActiveTimestamp,
    };
  }
  if (ageMs <= 12 * 60 * 60 * 1000) {
    return {
      band: 'within_12h' as MemberActivityBand,
      className: 'bg-amber-200',
      label: relativeLabel,
      description: 'Active within 12 hours',
      sortValue: lastActiveTimestamp,
    };
  }
  if (ageMs <= 24 * 60 * 60 * 1000) {
    return {
      band: 'within_24h' as MemberActivityBand,
      className: 'bg-amber-400',
      label: relativeLabel,
      description: 'Active within 24 hours',
      sortValue: lastActiveTimestamp,
    };
  }
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) {
    return {
      band: 'within_3d' as MemberActivityBand,
      className: 'bg-rose-300',
      label: relativeLabel,
      description: 'Active within 3 days',
      sortValue: lastActiveTimestamp,
    };
  }
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) {
    return {
      band: 'within_7d' as MemberActivityBand,
      className: 'bg-rose-500',
      label: relativeLabel,
      description: 'Active within 7 days',
      sortValue: lastActiveTimestamp,
    };
  }

  return {
    band: 'inactive' as MemberActivityBand,
    className: 'border border-white/10 bg-black',
    label: relativeLabel,
    description: 'Inactive for over 7 days',
    sortValue: lastActiveTimestamp,
  };
};

const formatTeamRoleLabel = (role: TeamRole) => {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  if (role === 'coach') return 'Coach';
  return 'Learner';
};

const formatDateTimeInput = (value: string | null | undefined) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offset = parsed.getTimezoneOffset();
  const normalized = new Date(parsed.getTime() - offset * 60 * 1000);
  return normalized.toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const getDaysUntil = (value: string | null | undefined) => {
  if (!value) return '14';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '14';
  const diff = parsed.getTime() - Date.now();
  return String(Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24))));
};

const sanitizeIntegerDraftValue = (value: string) => value.replace(/[^\d]/g, '');

const clampInteger = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const parseInviteInteger = (value: string, fallback: number, minimum: number, maximum: number) => {
  const normalized = sanitizeIntegerDraftValue(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return clampInteger(parsed, minimum, maximum);
};

const clampInviteDraftField = (value: string, fallback: number, minimum: number, maximum: number) =>
  String(parseInviteInteger(value, fallback, minimum, maximum));

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const copyTextToClipboard = async (value: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
    return true;
  } catch {
    return false;
  }
};

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 py-6 backdrop-blur sm:py-10">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-elevated">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{title}</div>
            {subtitle ? <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

function ActionButton({
  title,
  value,
  onClick,
  disabled,
  icon,
}: {
  title: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:border-primary/30 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{title}</div>
        <div className="mt-2 text-base font-semibold text-foreground">{value}</div>
      </div>
    </button>
  );
}

function StatusPill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-xp/20 bg-xp/10 text-xp'
      : tone === 'danger'
      ? 'border-destructive/20 bg-destructive/10 text-destructive'
      : tone === 'warn'
      ? 'border-coins/20 bg-coins/10 text-coins'
      : 'border-primary/20 bg-primary/10 text-primary';

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {children}
    </span>
  );
}

function EmptyState({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-6 text-sm text-muted-foreground">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-2">{helper}</div>
    </div>
  );
}

function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  tone = 'default',
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'default' | 'destructive';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur sm:py-10">
      <div className="absolute inset-0" onClick={busy ? undefined : onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-border bg-card p-6 shadow-elevated">
        <div className="text-lg font-semibold text-foreground">{title}</div>
        <div className="mt-3 text-sm leading-7 text-muted-foreground">{description}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:opacity-60 ${
              tone === 'destructive'
                ? 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15'
                : 'border border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
      {helper ? <div className="mt-1 text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

function FormField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</span>
        {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
      </div>
      {children}
    </label>
  );
}

function ProgressStack({
  completed,
  inProgress,
  notStarted,
}: {
  completed: number;
  inProgress: number;
  notStarted: number;
}) {
  const total = completed + inProgress + notStarted;
  const completedWidth = total > 0 ? (completed / total) * 100 : 0;
  const inProgressWidth = total > 0 ? (inProgress / total) * 100 : 0;
  const notStartedWidth = total > 0 ? (notStarted / total) * 100 : 100;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div className="flex h-full w-full">
        <div className="bg-emerald-400/90" style={{ width: `${completedWidth}%` }} />
        <div className="bg-primary/90" style={{ width: `${inProgressWidth}%` }} />
        <div className="bg-secondary-foreground/20" style={{ width: `${notStartedWidth}%` }} />
      </div>
    </div>
  );
}

const TeamsWorkspace: React.FC<TeamsWorkspaceProps> = ({ mode = 'app' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasAnyTeamPlan, activeTeamEntitlement, teamPlanPolicy } = usePlanAccess();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(TEAM_WORKSPACE_OVERVIEW_VALUE);
  const [teamDetail, setTeamDetail] = useState<TeamWorkspaceDetail | null>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<WorkspaceModal>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamUseCase, setNewTeamUseCase] = useState<TeamUseCase>('bootcamps');
  const [joinCode, setJoinCode] = useState(searchParams.get('invite') || '');

  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>({});
  const [joinSettingsDraft, setJoinSettingsDraft] = useState<JoinSettingsDraft>(emptyJoinSettingsDraft());
  const [inviteDraft, setInviteDraft] = useState<InviteDraft>(emptyInviteDraft());
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>(emptyAssignmentDraft());
  const [feedbackDraft, setFeedbackDraft] = useState<FeedbackDraft>(emptyFeedbackDraft());
  const [feedbackRubricDraft, setFeedbackRubricDraft] = useState<FeedbackRubricDraft>(emptyFeedbackRubricDraft());
  const [confirmMemberAction, setConfirmMemberAction] = useState<MemberConfirmAction>(null);
  const [confirmWorkspaceAction, setConfirmWorkspaceAction] = useState<WorkspaceConfirmAction>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | TeamRole>('all');
  const [memberActivityFilter, setMemberActivityFilter] = useState<MemberActivityFilter>('all');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<'all' | TeamAssignmentType>('all');
  const [assignmentLifecycleFilter, setAssignmentLifecycleFilter] = useState<AssignmentLifecycleFilter>('all');
  const [assignmentSort, setAssignmentSort] = useState<AssignmentSortOption>('priority');
  const [assignmentViewMode, setAssignmentViewMode] = useState<AssignmentViewMode>('list');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [assignmentBulkDueAt, setAssignmentBulkDueAt] = useState('');
  const [assignmentCalendarMonth, setAssignmentCalendarMonth] = useState(() => startOfCalendarMonth(new Date()));
  const [assignmentEditorOpen, setAssignmentEditorOpen] = useState(false);
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<ReviewStatusFilter>('all');
  const [feedbackVisibilityFilter, setFeedbackVisibilityFilter] = useState<FeedbackVisibilityFilter>('all');
  const [feedbackSort, setFeedbackSort] = useState<FeedbackSortOption>('recent');
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  const [feedbackComposerOpen, setFeedbackComposerOpen] = useState(false);
  const [submissionAttachmentMode, setSubmissionAttachmentMode] = useState<SubmissionAttachmentMode>('none');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionDraft, setSubmissionDraft] = useState<SubmissionDraft>(emptySubmissionDraft());

  const inviteJoinHandledRef = useRef<string | null>(null);

  const isSignedIn = Boolean(user);
  const isOverviewSelected = selectedTeamId === TEAM_WORKSPACE_OVERVIEW_VALUE;
  const selectedTeam = isOverviewSelected ? null : teamDetail?.team || null;
  const currentRole =
    selectedTeam?.currentUserRole || teams.find((team) => team.id === selectedTeamId)?.currentUserRole || null;
  const canManageMembers = currentRole === 'owner' || currentRole === 'admin';
  const canManageWorkspace = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'coach';
  const canPublishProof = currentRole === 'owner' || currentRole === 'admin';
  const canCreateTeams = hasAnyTeamPlan;
  const learnerMembers = useMemo(
    () => (teamDetail?.members || []).filter((member) => member.role === 'learner'),
    [teamDetail?.members]
  );
  const selectedTeamPlanPolicy = useMemo(
    () => getTeamPlanPolicyFromSeatLimit(selectedTeam?.seatLimit),
    [selectedTeam?.seatLimit]
  );
  const trackTitleById = useMemo(
    () =>
      new Map(
        interviewTracks.map((track) => [
          track.id,
          track.title,
        ])
      ),
    []
  );
  const canAccessAdvancedAnalytics = selectedTeamPlanPolicy.supportsAdvancedAnalytics;
  const canAccessCsvExport = selectedTeamPlanPolicy.supportsCsvExport;
  const selectedTeamInviteUsesCap = useMemo(() => {
    const policyCap = selectedTeamPlanPolicy.inviteMaxUses || TEAM_INVITE_MAX_USES;
    const seatCap = Number(selectedTeam?.seatLimit || policyCap);
    return clampInteger(Math.min(policyCap, seatCap), TEAM_INVITE_MIN_USES, TEAM_INVITE_MAX_USES);
  }, [selectedTeam?.seatLimit, selectedTeamPlanPolicy.inviteMaxUses]);

  const workspaceCounts = useMemo(
    () => ({
      members: teamDetail?.members.length || 0,
      assignments: teamDetail?.assignments.filter((assignment) => assignment.lifecycleState !== 'archived').length || 0,
      invites: teamDetail?.invites.length || 0,
      feedback: teamDetail?.feedback.length || 0,
    }),
    [teamDetail]
  );

  const hydrateMemberDrafts = (members: TeamMember[]) => {
    setMemberDrafts(
      members.reduce<Record<string, MemberDraft>>((accumulator, member) => {
        accumulator[member.userId] = {
          role: member.role,
        };
        return accumulator;
      }, {})
    );
  };

  const refreshTeamList = useCallback(async (preferredTeamId?: string) => {
    if (!isSignedIn) {
      setTeams([]);
      setSelectedTeamId(TEAM_WORKSPACE_OVERVIEW_VALUE);
      return;
    }

    setLoadingTeams(true);
    setErrorMessage(null);

    try {
      const nextTeams = await listTeams();
      setTeams(nextTeams);

      const nextSelectedTeamId =
        preferredTeamId && nextTeams.some((team) => team.id === preferredTeamId)
          ? preferredTeamId
        : selectedTeamId && nextTeams.some((team) => team.id === selectedTeamId)
          ? selectedTeamId
          : TEAM_WORKSPACE_OVERVIEW_VALUE;

      setSelectedTeamId(nextSelectedTeamId);
      if (nextSelectedTeamId === TEAM_WORKSPACE_OVERVIEW_VALUE) {
        setTeamDetail(null);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load teams.');
    } finally {
      setLoadingTeams(false);
    }
  }, [isSignedIn, selectedTeamId]);

  const refreshSelectedTeam = useCallback(async (teamId: string) => {
    if (!teamId || !isSignedIn) {
      setTeamDetail(null);
      setTeamAnalytics(null);
      return;
    }

    setLoadingDetail(true);
    setErrorMessage(null);

    try {
      const detail = await getTeamWorkspace(teamId);
      const nextLearners = detail.members.filter((member) => member.role === 'learner');
      setTeamDetail(detail);
      hydrateMemberDrafts(detail.members);
      setJoinSettingsDraft({
        joinMode: detail.team.joinMode || 'open_code',
        allowedEmailDomain: detail.team.allowedEmailDomain || '',
      });
      setFeedbackDraft((current) =>
        !current.memberUserId && nextLearners[0]
          ? { ...current, memberUserId: nextLearners[0].userId }
          : current
      );
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load the selected team.');
    } finally {
      setLoadingDetail(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    void refreshTeamList();
  }, [refreshTeamList, user?.id]);

  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === TEAM_WORKSPACE_OVERVIEW_VALUE) {
      setTeamDetail(null);
      setTeamAnalytics(null);
      return;
    }

    void refreshSelectedTeam(selectedTeamId);
  }, [refreshSelectedTeam, selectedTeamId]);

  useEffect(() => {
    if (!isSignedIn || !selectedTeamId || selectedTeamId === TEAM_WORKSPACE_OVERVIEW_VALUE) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSelectedTeam(selectedTeamId);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [isSignedIn, refreshSelectedTeam, selectedTeamId]);

  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    if (!inviteParam) return;

    setJoinCode(inviteParam);
    if (!isSignedIn || inviteJoinHandledRef.current === inviteParam) return;

    inviteJoinHandledRef.current = inviteParam;
    void (async () => {
      try {
        const result = await joinTeamByCode(inviteParam);
        await handleJoinResult(result, inviteParam);
      } catch (error: any) {
        toast.error(error?.message || 'Could not join team with that invite.');
      }
    })();
  }, [isSignedIn, searchParams, setSearchParams]);

  const resetInviteDraft = useCallback(() => setInviteDraft(emptyInviteDraft()), []);
  const resetAssignmentDraft = useCallback(() => setAssignmentDraft(emptyAssignmentDraft()), []);
  const resetSubmissionDraft = useCallback(() => setSubmissionDraft(emptySubmissionDraft()), []);
  const resetFeedbackEditor = useCallback(
    () =>
      setFeedbackDraft((current) => ({
        ...emptyFeedbackDraft(),
        memberUserId: learnerMembers[0]?.userId || current.memberUserId || '',
      })),
    [learnerMembers]
  );
  const closeAssignmentEditor = useCallback(() => {
    resetAssignmentDraft();
    setAssignmentEditorOpen(false);
  }, [resetAssignmentDraft]);
  const openNewAssignmentEditor = useCallback(() => {
    resetAssignmentDraft();
    setAssignmentEditorOpen(true);
  }, [resetAssignmentDraft]);
  const closeFeedbackComposer = useCallback(() => {
    resetFeedbackEditor();
    setFeedbackRubricDraft(emptyFeedbackRubricDraft());
    setSubmissionAttachmentMode('none');
    setSelectedSubmissionId(null);
    resetSubmissionDraft();
    setFeedbackComposerOpen(false);
  }, [resetFeedbackEditor, resetSubmissionDraft]);
  const openNewFeedbackComposer = useCallback((memberUserId?: string, assignmentId?: string) => {
    setSelectedFeedbackId(null);
    setFeedbackDraft({
      ...emptyFeedbackDraft(),
      memberUserId: memberUserId || learnerMembers[0]?.userId || '',
      assignmentId: assignmentId || '',
    });
    setFeedbackRubricDraft(emptyFeedbackRubricDraft());
    setSubmissionAttachmentMode('none');
    setSelectedSubmissionId(null);
    resetSubmissionDraft();
    setFeedbackComposerOpen(true);
  }, [learnerMembers, resetSubmissionDraft]);

  const handleJoinResult = async (
    result: Awaited<ReturnType<typeof joinTeamByCode>>,
    inviteCodeFromUrl?: string | null
  ) => {
    setJoinCode('');

    if (result.status === 'pending') {
      trackEvent('team_join_requested', {
        source: 'teams_workspace',
        mode,
        joinMode: result.team.joinMode || 'code_approval',
      });
      toast.success(`Request sent to ${result.team.name}.`);
      await refreshTeamList();
    } else {
      trackEvent('team_joined', {
        source: 'teams_workspace',
        mode,
        joinMode: result.team.joinMode || 'open_code',
      });
      toast.success(`Joined ${result.team.name}.`);
      await refreshTeamList(result.team.id);
      setSelectedTeamId(result.team.id);
    }

    if (inviteCodeFromUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('invite');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleCreateTeam = async () => {
    if (!isSignedIn) {
      toast.error('Sign in first to create a team.');
      return;
    }

    if (!canCreateTeams) {
      toast.error('A Teams plan is required before you can create a team.');
      navigate('/pricing?intent=teams');
      return;
    }

    if (!newTeamName.trim()) {
      toast.error('Enter a team name.');
      return;
    }

    setSubmittingKey('create-team');
    try {
      const team = await createTeam({
        name: newTeamName.trim(),
        useCase: newTeamUseCase,
        seatLimit: teamPlanPolicy.seatLimit,
      });
      trackEvent('team_created', { useCase: newTeamUseCase, source: 'teams_workspace', mode });
      toast.success(`${team.name} is ready.`);
      setNewTeamName('');
      await refreshTeamList(team.id);
      setSelectedTeamId(team.id);
    } catch (error: any) {
      toast.error(error?.message || 'Could not create team.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleJoinTeam = async () => {
    if (!isSignedIn) {
      toast.error('Sign in first to join a team.');
      return;
    }

    if (!joinCode.trim()) {
      toast.error('Enter an invite code.');
      return;
    }

    setSubmittingKey('join-team');
    try {
      const result = await joinTeamByCode(joinCode.trim());
      await handleJoinResult(result, searchParams.get('invite'));
    } catch (error: any) {
      toast.error(error?.message || 'Could not join team.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleSaveJoinSettings = async () => {
    if (!selectedTeamId || !selectedTeam) return;

    if (joinSettingsDraft.joinMode === 'code_domain' && !joinSettingsDraft.allowedEmailDomain.trim()) {
      toast.error('Enter an allowed email domain.');
      return;
    }

    setSubmittingKey('save-join-settings');
    try {
      const nextTeam = await updateTeamJoinSettings(selectedTeamId, {
        joinMode: joinSettingsDraft.joinMode,
        allowedEmailDomain:
          joinSettingsDraft.joinMode === 'code_domain' ? joinSettingsDraft.allowedEmailDomain.trim() : null,
      });
      setTeamDetail((current) => (current ? { ...current, team: { ...current.team, ...nextTeam } } : current));
      toast.success('Join settings updated.');
      await refreshTeamList(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update join settings.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleReviewJoinRequest = async (request: TeamJoinRequest, status: 'approved' | 'denied') => {
    if (!selectedTeamId) return;

    setSubmittingKey(`${status}-join-request-${request.id}`);
    try {
      await reviewTeamJoinRequest(selectedTeamId, request.id, { status });
      toast.success(status === 'approved' ? `${request.userName} approved.` : `${request.userName} denied.`);
      await refreshSelectedTeam(selectedTeamId);
      await refreshTeamList(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not review join request.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const openModal = async (modal: Exclude<WorkspaceModal, null>) => {
    if (modal === 'analytics' && !canAccessAdvancedAnalytics) {
      toast.error('Expanded analytics unlock with Teams Growth or Custom.');
      return;
    }

    setActiveModal(modal);
    if (modal === 'analytics' && selectedTeamId) {
      setSubmittingKey('analytics');
      try {
        const analytics = await fetchTeamAnalytics(selectedTeamId);
        setTeamAnalytics(analytics);
      } catch (error: any) {
        toast.error(error?.message || 'Could not load team analytics.');
      } finally {
        setSubmittingKey(null);
      }
    }
  };

  const handleSaveInvite = async () => {
    if (!selectedTeamId) return;
    if (!inviteDraft.label.trim()) {
      toast.error('Enter an invite label.');
      return;
    }

    const maxUses = parseInviteInteger(
      inviteDraft.maxUses,
      Math.min(25, selectedTeamInviteUsesCap),
      TEAM_INVITE_MIN_USES,
      selectedTeamInviteUsesCap
    );
    const expiresInDays = parseInviteInteger(
      inviteDraft.expiresInDays,
      14,
      TEAM_INVITE_MIN_EXPIRES_DAYS,
      TEAM_INVITE_MAX_EXPIRES_DAYS
    );

    if (
      String(maxUses) !== sanitizeIntegerDraftValue(inviteDraft.maxUses || '') ||
      String(expiresInDays) !== sanitizeIntegerDraftValue(inviteDraft.expiresInDays || '')
    ) {
      setInviteDraft((current) => ({
        ...current,
        maxUses: String(maxUses),
        expiresInDays: String(expiresInDays),
      }));
    }

    setSubmittingKey('save-invite');
    try {
      if (inviteDraft.id) {
        await updateTeamInvite(selectedTeamId, inviteDraft.id, {
          label: inviteDraft.label.trim(),
          email: inviteDraft.email.trim() || null,
          role: 'learner',
          maxUses,
          expiresInDays,
          status: inviteDraft.status,
        });
        toast.success('Invite updated.');
      } else {
        const createdInvite = await createTeamInvite(selectedTeamId, {
          label: inviteDraft.label.trim(),
          email: inviteDraft.email.trim() || undefined,
          role: 'learner',
          maxUses,
          expiresInDays,
        });
        toast.success(createdInvite.emailDelivery === 'sent' ? 'Invite created and emailed.' : 'Invite created.');
      }

      resetInviteDraft();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save invite.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const startInviteEdit = (invite: TeamInvite) => {
    setInviteDraft({
      id: invite.id,
      label: invite.label,
      email: invite.email || '',
      role: 'learner',
      maxUses: String(invite.maxUses),
      expiresInDays: getDaysUntil(invite.expiresAt),
      status: invite.status,
    });
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!selectedTeamId) return;
    if (!window.confirm('Delete this invite?')) return;

    setSubmittingKey(`delete-invite-${inviteId}`);
    try {
      await deleteTeamInvite(selectedTeamId, inviteId);
      toast.success('Invite deleted.');
      if (inviteDraft.id === inviteId) resetInviteDraft();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete invite.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedTeamId) return;
    if (!assignmentDraft.title.trim()) {
      toast.error('Enter an assignment title.');
      return;
    }
    if (assignmentDraft.assignmentType === 'roadmap' && !assignmentDraft.trackId) {
      toast.error('Select a roadmap track.');
      return;
    }
    if (assignmentDraft.assignmentType !== 'roadmap' && !assignmentDraft.benchmarkLanguage) {
      toast.error('Select a benchmark language.');
      return;
    }

    setSubmittingKey('save-assignment');
    try {
      const isEditing = Boolean(assignmentDraft.id);
      const payload = {
        title: assignmentDraft.title.trim(),
        description: assignmentDraft.description.trim(),
        assignmentType: assignmentDraft.assignmentType,
        benchmarkLanguage:
          assignmentDraft.assignmentType === 'roadmap' ? null : assignmentDraft.benchmarkLanguage || null,
        trackId: assignmentDraft.assignmentType === 'roadmap' ? assignmentDraft.trackId || null : null,
        dueAt: toIsoOrNull(assignmentDraft.dueAt),
      };

      const savedAssignment = assignmentDraft.id
        ? await updateTeamAssignment(selectedTeamId, assignmentDraft.id, payload)
        : await createTeamAssignment(selectedTeamId, payload);

      toast.success(isEditing ? 'Assignment updated.' : 'Assignment created.');
      setSelectedAssignmentId(savedAssignment.id);
      closeAssignmentEditor();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save assignment.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const startAssignmentEdit = (assignment: TeamAssignment) => {
    setAssignmentDraft({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || '',
      assignmentType: assignment.assignmentType,
      benchmarkLanguage: assignment.benchmarkLanguage || 'python',
      trackId: assignment.trackId || '',
      dueAt: formatDateTimeInput(assignment.dueAt),
    });
    setSelectedAssignmentId(assignment.id);
    setAssignmentEditorOpen(true);
  };

  const handleDuplicateAssignment = async (assignment: TeamAssignment) => {
    if (!selectedTeamId) return;

    setSubmittingKey(`duplicate-assignment-${assignment.id}`);
    try {
      const duplicatedAssignment = await createTeamAssignment(selectedTeamId, {
        title: `Copy of ${assignment.title}`,
        description: assignment.description || '',
        assignmentType: assignment.assignmentType,
        benchmarkLanguage: assignment.assignmentType === 'roadmap' ? null : assignment.benchmarkLanguage,
        trackId: assignment.assignmentType === 'roadmap' ? assignment.trackId : null,
        dueAt: assignment.dueAt,
      });
      toast.success('Assignment duplicated.');
      setSelectedAssignmentId(duplicatedAssignment.id);
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not duplicate assignment.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleBulkAssignmentAction = async (action: 'archive' | 'restore' | 'set_due_date') => {
    if (!selectedTeamId || selectedAssignmentIds.length === 0) return;
    if (action === 'set_due_date' && assignmentBulkDueAt && Number.isNaN(new Date(assignmentBulkDueAt).getTime())) {
      toast.error('Enter a valid due date.');
      return;
    }

    const bulkKey = `bulk-assignment-${action}`;
    setSubmittingKey(bulkKey);
    try {
      await bulkUpdateTeamAssignments(selectedTeamId, {
        assignmentIds: selectedAssignmentIds,
        action,
        dueAt: action === 'set_due_date' ? toIsoOrNull(assignmentBulkDueAt) : undefined,
      });
      toast.success(
        action === 'archive'
          ? 'Assignments archived.'
          : action === 'restore'
          ? 'Assignments restored.'
          : 'Assignment due dates updated.'
      );
      setSelectedAssignmentIds([]);
      if (action === 'set_due_date') {
        setAssignmentBulkDueAt('');
      }
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update the selected assignments.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const applyAssignmentTemplate = (templateId: string) => {
    const template = ASSIGNMENT_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;

    setAssignmentDraft({
      id: null,
      title: template.title,
      description: template.description,
      assignmentType: template.assignmentType,
      benchmarkLanguage: template.assignmentType === 'roadmap' ? 'python' : template.benchmarkLanguage || 'python',
      trackId: template.assignmentType === 'roadmap' ? template.trackId || '' : '',
      dueAt: '',
    });
    setAssignmentEditorOpen(true);
  };

  const requestArchiveAssignment = (assignment: TeamAssignment) => {
    setConfirmWorkspaceAction({
      type: 'assignment_archive',
      assignment,
    });
  };

  const handleRestoreAssignment = async (assignment: TeamAssignment) => {
    if (!selectedTeamId) return;
    const restoreKey = `restore-assignment-${assignment.id}`;
    setSubmittingKey(restoreKey);
    try {
      await updateTeamAssignment(selectedTeamId, assignment.id, { archived: false });
      toast.success('Assignment restored.');
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not restore assignment.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleUpdateSubmissionStatus = async (submissionId: string, status: TeamSubmissionStatus) => {
    if (!selectedTeamId) return;
    const submissionKey = `submission-status-${submissionId}`;
    setSubmittingKey(submissionKey);
    try {
      await updateTeamSubmission(selectedTeamId, submissionId, { status });
      toast.success('Submission status updated.');
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update the submission status.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedTeamId) return;
    if (!feedbackDraft.memberUserId) {
      toast.error('Select a learner.');
      return;
    }

    const linkedExistingSubmission =
      submissionAttachmentMode === 'existing'
        ? teamDetail?.submissions.find((entry) => entry.id === selectedSubmissionId) || null
        : null;

    let submissionIdToPersist: string | null =
      submissionAttachmentMode === 'existing' ? selectedSubmissionId || null : null;

    if (submissionAttachmentMode === 'new') {
      if (!submissionDraft.title.trim()) {
        toast.error('Enter a submission title.');
        return;
      }

      if (submissionDraft.submissionType === 'link' && !submissionDraft.externalUrl.trim()) {
        toast.error('Enter a submission link.');
        return;
      }

      if (submissionDraft.submissionType !== 'link' && !submissionDraft.body.trim()) {
        toast.error('Add the submission content.');
        return;
      }
    }

    const rubricBreakdown = normalizeRubricBreakdownDraft(feedbackRubricDraft);
    const rubricBreakdownTotal = getRubricBreakdownTotal(rubricBreakdown);
    const rubricScore = hasRubricBreakdownValues(rubricBreakdown)
      ? Math.round((rubricBreakdownTotal / 40) * 100)
      : null;

    setSubmittingKey('save-feedback');
    try {
      const isEditing = Boolean(feedbackDraft.id);
      if (submissionAttachmentMode === 'new') {
        const createdSubmission = await createTeamSubmission(selectedTeamId, {
          memberUserId: feedbackDraft.memberUserId,
          assignmentId: feedbackDraft.assignmentId || null,
          submissionType: submissionDraft.submissionType,
          title: submissionDraft.title.trim(),
          body: submissionDraft.body.trim(),
          externalUrl: submissionDraft.externalUrl.trim() || null,
          codeLanguage: submissionDraft.submissionType === 'code' ? submissionDraft.codeLanguage || 'python' : null,
          status: submissionDraft.status,
          rubricScore: submissionDraft.rubricScore ? Number(submissionDraft.rubricScore) : null,
        });
        submissionIdToPersist = createdSubmission.id;
      }

      const payload = {
        memberUserId: feedbackDraft.memberUserId,
        assignmentId: feedbackDraft.assignmentId || linkedExistingSubmission?.assignmentId || null,
        submissionId: submissionIdToPersist,
        rubricScore,
        rubricBreakdown: hasRubricBreakdownValues(rubricBreakdown) ? rubricBreakdown : null,
        status: feedbackDraft.status,
        summary: feedbackDraft.summary.trim(),
        strengths: feedbackDraft.strengths.trim(),
        focusAreas: feedbackDraft.focusAreas.trim(),
        coachNotes: feedbackDraft.coachNotes.trim(),
        sharedWithMember: feedbackDraft.sharedWithMember,
      };

      const savedFeedback = feedbackDraft.id
        ? await updateTeamFeedback(selectedTeamId, feedbackDraft.id, payload)
        : await createTeamFeedback(selectedTeamId, payload);

      toast.success(isEditing ? 'Feedback updated.' : 'Feedback saved.');
      setSelectedFeedbackId(savedFeedback.id);
      setSelectedReviewItemId(submissionIdToPersist ? `submission:${submissionIdToPersist}` : `feedback:${savedFeedback.id}`);
      closeFeedbackComposer();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      if (submissionAttachmentMode === 'new' && submissionIdToPersist) {
        try {
          await deleteTeamSubmission(selectedTeamId, submissionIdToPersist);
        } catch {
          // Best-effort rollback for a newly created submission when the note save fails.
        }
      }
      toast.error(error?.message || 'Could not save feedback.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const startFeedbackEdit = (entry: TeamFeedback) => {
    const linkedSubmission = teamDetail?.submissions.find((submission) => submission.id === entry.submissionId) || null;
    setFeedbackDraft({
      id: entry.id,
      memberUserId: entry.memberUserId,
      assignmentId: entry.assignmentId || '',
      status: entry.status,
      summary: entry.summary,
      strengths: entry.strengths,
      focusAreas: entry.focusAreas,
      coachNotes: entry.coachNotes,
      sharedWithMember: entry.sharedWithMember,
    });
    setFeedbackRubricDraft(buildFeedbackRubricDraft(entry.rubricBreakdown));
    setSubmissionAttachmentMode(linkedSubmission ? 'existing' : 'none');
    setSelectedSubmissionId(linkedSubmission?.id || null);
    setSubmissionDraft(
      linkedSubmission
        ? {
            id: linkedSubmission.id,
            title: linkedSubmission.title,
            submissionType: linkedSubmission.submissionType,
            body: linkedSubmission.body,
            externalUrl: linkedSubmission.externalUrl || '',
            codeLanguage: linkedSubmission.codeLanguage || 'python',
            status: linkedSubmission.status,
            rubricScore: linkedSubmission.rubricScore === null ? '' : String(linkedSubmission.rubricScore),
          }
        : emptySubmissionDraft()
    );
    setSelectedFeedbackId(entry.id);
    setSelectedReviewItemId(linkedSubmission ? `submission:${linkedSubmission.id}` : `feedback:${entry.id}`);
    setFeedbackComposerOpen(true);
  };

  const requestDeleteFeedback = (entry: TeamFeedback) => {
    setConfirmWorkspaceAction({
      type: 'feedback_delete',
      entry,
    });
  };

  const setFeedbackWorkflowState = (nextState: 'draft' | 'shared' | 'resolved') => {
    setFeedbackDraft((current) => ({
      ...current,
      status: nextState,
      sharedWithMember: nextState !== 'draft',
    }));
  };

  const applyFeedbackSnippet = (snippetId: string) => {
    const snippet = FEEDBACK_SNIPPETS.find((entry) => entry.id === snippetId);
    if (!snippet) return;

    setFeedbackDraft((current) => ({
      ...current,
      summary: current.summary || snippet.summary,
      strengths: current.strengths || snippet.strengths,
      focusAreas: current.focusAreas || snippet.focusAreas,
    }));
  };

  const requestRoleChange = (member: TeamMember, nextRole: TeamRole) => {
    if (nextRole === member.role) return;
    setConfirmMemberAction({
      type: 'role',
      member,
      nextRole,
    });
  };

  const requestRemoveMember = (member: TeamMember) => {
    setConfirmMemberAction({
      type: 'remove',
      member,
    });
  };

  const handleConfirmMemberAction = async () => {
    if (!selectedTeamId || !confirmMemberAction) return;

    if (confirmMemberAction.type === 'role') {
      const { member, nextRole } = confirmMemberAction;
      const saveKey = `save-member-${member.userId}`;
      setSubmittingKey(saveKey);
      try {
        await updateTeamMember(selectedTeamId, member.userId, {
          role: nextRole === 'owner' ? undefined : nextRole,
        });
        toast.success(`${member.name} is now ${formatTeamRoleLabel(nextRole)}.`);
        setConfirmMemberAction(null);
        await refreshSelectedTeam(selectedTeamId);
      } catch (error: any) {
        toast.error(error?.message || 'Could not update member.');
      } finally {
        setSubmittingKey(null);
      }
      return;
    }

    const { member } = confirmMemberAction;
    const removeKey = `remove-member-${member.userId}`;
    setSubmittingKey(removeKey);
    try {
      await removeTeamMember(selectedTeamId, member.userId);
      toast.success(`${member.name} removed.`);
      setConfirmMemberAction(null);
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove member.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleCancelMemberAction = () => {
    if (confirmMemberAction?.type === 'role') {
      setMemberDrafts((current) => ({
        ...current,
        [confirmMemberAction.member.userId]: {
          role: confirmMemberAction.member.role,
        },
      }));
    }

    setConfirmMemberAction(null);
  };

  const handleConfirmWorkspaceAction = async () => {
    if (!selectedTeamId || !confirmWorkspaceAction) return;

    if (confirmWorkspaceAction.type === 'assignment_archive') {
      const { assignment } = confirmWorkspaceAction;
      const deleteKey = `delete-assignment-${assignment.id}`;
      setSubmittingKey(deleteKey);
      try {
        await deleteTeamAssignment(selectedTeamId, assignment.id);
        toast.success('Assignment archived.');
        if (assignmentDraft.id === assignment.id) closeAssignmentEditor();
        setConfirmWorkspaceAction(null);
        await refreshSelectedTeam(selectedTeamId);
      } catch (error: any) {
        toast.error(error?.message || 'Could not archive assignment.');
      } finally {
        setSubmittingKey(null);
      }
      return;
    }

    const { entry } = confirmWorkspaceAction;
    const deleteKey = `delete-feedback-${entry.id}`;
    setSubmittingKey(deleteKey);
    try {
      await deleteTeamFeedback(selectedTeamId, entry.id);
      toast.success('Feedback deleted.');
      if (feedbackDraft.id === entry.id) closeFeedbackComposer();
      setConfirmWorkspaceAction(null);
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete feedback.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleCancelWorkspaceAction = () => {
    setConfirmWorkspaceAction(null);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!selectedTeamId || !selectedTeam) return;
    if (format === 'csv' && !canAccessCsvExport) {
      toast.error('CSV export unlocks with Teams Growth or Custom.');
      return;
    }

    setSubmittingKey(`export-${format}`);
    try {
      const blob = await exportTeamReport(selectedTeamId, format);
      downloadBlob(blob, `${selectedTeam.slug || selectedTeam.id}-team-report.${format}`);
      toast.success(`${format.toUpperCase()} export downloaded.`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not export team report.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleToggleSharing = async () => {
    if (!selectedTeamId) return;

    setSubmittingKey('share-team');
    try {
      if (teamDetail?.team.isPublic) {
        const nextTeam = await unshareTeamWorkspace(selectedTeamId);
        setTeamDetail((current) => (current ? { ...current, team: { ...current.team, ...nextTeam } } : current));
        toast.success('Public proof page unpublished.');
      } else {
        const nextTeam = await shareTeamWorkspace(selectedTeamId);
        setTeamDetail((current) => (current ? { ...current, team: { ...current.team, ...nextTeam } } : current));
        toast.success('Public proof page published.');
      }
      await refreshTeamList(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update proof sharing.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const sharedProofUrl = useMemo(() => {
    if (!teamDetail?.team.shareToken) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/teams/proof/${teamDetail.team.shareToken}`;
  }, [teamDetail?.team.shareToken]);

  const membersModalStats = useMemo(() => {
    const members = teamDetail?.members || [];

    return members.reduce(
      (accumulator, member) => {
        const activity = getMemberActivityIndicator(member.lastActiveAt, {
          isCurrentlyActive: member.isCurrentlyActive,
          isCurrentUser: member.userId === user?.id,
        });

        accumulator.total += 1;
        if (member.role === 'learner') {
          accumulator.learners += 1;
        } else {
          accumulator.managers += 1;
        }
        if (activity.band === 'active_now') {
          accumulator.activeNow += 1;
        }
        return accumulator;
      },
      {
        total: 0,
        learners: 0,
        managers: 0,
        activeNow: 0,
      }
    );
  }, [teamDetail?.members, user?.id]);

  const filteredMembers = useMemo(() => {
    const members = teamDetail?.members || [];
    const normalizedQuery = memberSearchQuery.trim().toLowerCase();

    const matchesActivityFilter = (band: MemberActivityBand) => {
      if (memberActivityFilter === 'all') return true;
      if (memberActivityFilter === 'active_now') return band === 'active_now';
      if (memberActivityFilter === 'last_24h') {
        return band === 'active_now' || band === 'within_12h' || band === 'within_24h';
      }
      if (memberActivityFilter === 'last_7d') {
        return band === 'within_3d' || band === 'within_7d';
      }
      return band === 'inactive';
    };

    return [...members]
      .filter((member) => (memberRoleFilter === 'all' ? true : member.role === memberRoleFilter))
      .filter((member) => {
        const activity = getMemberActivityIndicator(member.lastActiveAt, {
          isCurrentlyActive: member.isCurrentlyActive,
          isCurrentUser: member.userId === user?.id,
        });
        return matchesActivityFilter(activity.band);
      })
      .filter((member) => {
        if (!normalizedQuery) return true;
        return [member.name, member.email || '', formatTeamRoleLabel(member.role)]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (left.userId === user?.id && right.userId !== user?.id) return -1;
        if (right.userId === user?.id && left.userId !== user?.id) return 1;

        const roleDiff = MEMBER_ROLE_ORDER[left.role] - MEMBER_ROLE_ORDER[right.role];
        if (roleDiff !== 0) return roleDiff;

        const leftActivity = getMemberActivityIndicator(left.lastActiveAt, {
          isCurrentlyActive: left.isCurrentlyActive,
          isCurrentUser: left.userId === user?.id,
        });
        const rightActivity = getMemberActivityIndicator(right.lastActiveAt, {
          isCurrentlyActive: right.isCurrentlyActive,
          isCurrentUser: right.userId === user?.id,
        });
        if (leftActivity.sortValue !== rightActivity.sortValue) {
          return rightActivity.sortValue - leftActivity.sortValue;
        }

        return left.name.localeCompare(right.name);
      });
  }, [teamDetail?.members, memberActivityFilter, memberRoleFilter, memberSearchQuery, user?.id]);

  useEffect(() => {
    setAssignmentSearchQuery('');
    setAssignmentTypeFilter('all');
    setAssignmentLifecycleFilter('all');
    setAssignmentSort('priority');
    setAssignmentViewMode('list');
    setSelectedAssignmentIds([]);
    setAssignmentBulkDueAt('');
    setAssignmentCalendarMonth(startOfCalendarMonth(new Date()));
    setAssignmentDraft(emptyAssignmentDraft());
    setAssignmentEditorOpen(false);
    setSelectedAssignmentId(null);
    setFeedbackSearchQuery('');
    setFeedbackStatusFilter('all');
    setFeedbackVisibilityFilter('all');
    setFeedbackSort('recent');
    setFeedbackDraft(emptyFeedbackDraft());
    setFeedbackRubricDraft(emptyFeedbackRubricDraft());
    setFeedbackComposerOpen(false);
    setSelectedFeedbackId(null);
    setSelectedReviewItemId(null);
    setSubmissionAttachmentMode('none');
    setSelectedSubmissionId(null);
    setSubmissionDraft(emptySubmissionDraft());
  }, [activeModal, selectedTeamId]);

  const assignmentOperationalMeta = useMemo(() => {
    const assignments = teamDetail?.assignments || [];
    const submissions = teamDetail?.submissions || [];
    const feedbackEntries = teamDetail?.feedback || [];

    const latestFeedbackBySubmissionId = new Map<string, TeamFeedback>();
    feedbackEntries
      .filter((entry) => entry.submissionId)
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .forEach((entry) => {
        if (entry.submissionId && !latestFeedbackBySubmissionId.has(entry.submissionId)) {
          latestFeedbackBySubmissionId.set(entry.submissionId, entry);
        }
      });

    return new Map(
      assignments.map((assignment) => {
        const relatedSubmissions = submissions.filter((entry) => entry.assignmentId === assignment.id);
        const relatedSubmissionIds = new Set(relatedSubmissions.map((entry) => entry.id));
        const relatedFeedback = feedbackEntries.filter(
          (entry) => entry.assignmentId === assignment.id || (entry.submissionId ? relatedSubmissionIds.has(entry.submissionId) : false)
        );
        const scoredFeedback = relatedFeedback.map((entry) => entry.rubricScore).filter((value): value is number => value !== null);
        const scoredSubmissions = relatedSubmissions
          .map((entry) => entry.rubricScore)
          .filter((value): value is number => value !== null);
        const averageScoreSource = scoredFeedback.length > 0 ? scoredFeedback : scoredSubmissions;
        const averageScore =
          averageScoreSource.length > 0
            ? Math.round(averageScoreSource.reduce((total, value) => total + value, 0) / averageScoreSource.length)
            : null;
        const needsReviewCount = relatedSubmissions.filter((submission) => {
          const latestFeedback = latestFeedbackBySubmissionId.get(submission.id);
          if (!latestFeedback) return true;
          return latestFeedback.status !== 'resolved' && !latestFeedback.sharedWithMember && latestFeedback.status !== 'shared';
        }).length;
        const lastActivityCandidates = [
          assignment.updatedAt || assignment.createdAt,
          ...relatedSubmissions.map((entry) => entry.updatedAt || entry.createdAt),
          ...relatedFeedback.map((entry) => entry.updatedAt || entry.createdAt),
        ]
          .filter(Boolean)
          .map((value) => new Date(value as string).getTime())
          .filter((value) => Number.isFinite(value));
        const lastActivityAt =
          lastActivityCandidates.length > 0
            ? new Date(Math.max(...lastActivityCandidates)).toISOString()
            : assignment.updatedAt || assignment.createdAt;

        return [
          assignment.id,
          {
            needsReviewCount,
            submissionCount: relatedSubmissions.length,
            feedbackCount: relatedFeedback.length,
            averageScore,
            lastActivityAt,
          },
        ] as const;
      })
    );
  }, [teamDetail?.assignments, teamDetail?.feedback, teamDetail?.submissions]);

  const assignmentModalStats = useMemo(() => {
    const assignments = teamDetail?.assignments || [];

    return assignments.reduce(
      (accumulator, assignment) => {
        const dueMeta = getAssignmentDueMeta(assignment.dueAt);
        const operationalMeta = assignmentOperationalMeta.get(assignment.id);
        accumulator.total += 1;
        if (assignment.lifecycleState === 'active') accumulator.active += 1;
        if (assignment.lifecycleState === 'past_due') accumulator.pastDue += 1;
        if (assignment.lifecycleState === 'archived') accumulator.archived += 1;
        if (assignment.assignmentType === 'benchmark') accumulator.benchmark += 1;
        if (assignment.assignmentType === 'roadmap') accumulator.roadmap += 1;
        if (assignment.assignmentType === 'challenge_pack') accumulator.challengePack += 1;
        if (assignment.lifecycleState !== 'archived' && dueMeta.band === 'due_soon') accumulator.dueSoon += 1;
        accumulator.needsReview += operationalMeta?.needsReviewCount || 0;
        accumulator.totalCompletionRate += assignment.completionRate || 0;
        return accumulator;
      },
      {
        total: 0,
        active: 0,
        pastDue: 0,
        archived: 0,
        benchmark: 0,
        roadmap: 0,
        challengePack: 0,
        dueSoon: 0,
        needsReview: 0,
        totalCompletionRate: 0,
      }
    );
  }, [assignmentOperationalMeta, teamDetail?.assignments]);

  const filteredAssignments = useMemo(() => {
    const assignments = teamDetail?.assignments || [];
    const normalizedQuery = assignmentSearchQuery.trim().toLowerCase();

    return [...assignments]
      .filter((assignment) => (assignmentTypeFilter === 'all' ? true : assignment.assignmentType === assignmentTypeFilter))
      .filter((assignment) => (assignmentLifecycleFilter === 'all' ? true : assignment.lifecycleState === assignmentLifecycleFilter))
      .filter((assignment) => {
        if (!normalizedQuery) return true;
        return [
          assignment.title,
          assignment.description || '',
          assignment.benchmarkLanguage || '',
          assignment.trackId || '',
          trackTitleById.get(assignment.trackId || '') || '',
          formatAssignmentTypeLabel(assignment.assignmentType),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftDue = getAssignmentDueMeta(left.dueAt);
        const rightDue = getAssignmentDueMeta(right.dueAt);
        const leftUpdatedAt = new Date(left.updatedAt || left.createdAt).getTime();
        const rightUpdatedAt = new Date(right.updatedAt || right.createdAt).getTime();

        if (assignmentSort === 'completion') {
          if (left.completionRate !== right.completionRate) {
            return right.completionRate - left.completionRate;
          }
          return rightUpdatedAt - leftUpdatedAt;
        }

        if (assignmentSort === 'recent') {
          return rightUpdatedAt - leftUpdatedAt;
        }

        if (assignmentSort === 'due') {
          const leftSortValue = Number.isFinite(leftDue.sortValue) ? leftDue.sortValue : Number.MAX_SAFE_INTEGER;
          const rightSortValue = Number.isFinite(rightDue.sortValue) ? rightDue.sortValue : Number.MAX_SAFE_INTEGER;
          if (leftSortValue !== rightSortValue) return leftSortValue - rightSortValue;
          return rightUpdatedAt - leftUpdatedAt;
        }

        const leftLifecycle = getAssignmentLifecycleMeta(left.lifecycleState);
        const rightLifecycle = getAssignmentLifecycleMeta(right.lifecycleState);
        if (leftLifecycle.sortPriority !== rightLifecycle.sortPriority) {
          return leftLifecycle.sortPriority - rightLifecycle.sortPriority;
        }

        const leftPriority = leftDue.band === 'overdue' ? 0 : leftDue.band === 'due_soon' ? 1 : leftDue.band === 'scheduled' ? 2 : 3;
        const rightPriority = rightDue.band === 'overdue' ? 0 : rightDue.band === 'due_soon' ? 1 : rightDue.band === 'scheduled' ? 2 : 3;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        if (left.completionRate !== right.completionRate) {
          return right.completionRate - left.completionRate;
        }
        return rightUpdatedAt - leftUpdatedAt;
      });
  }, [
    assignmentLifecycleFilter,
    assignmentSearchQuery,
    assignmentSort,
    assignmentTypeFilter,
    teamDetail?.assignments,
    trackTitleById,
  ]);

  const feedbackModalStats = useMemo(() => {
    const feedbackEntries = teamDetail?.feedback || [];
    const scoredEntries = feedbackEntries.filter((entry) => entry.rubricScore !== null);

    return {
      total: feedbackEntries.length,
      shared: feedbackEntries.filter((entry) => getFeedbackStateMeta(entry).label === 'Shared').length,
      drafts: feedbackEntries.filter((entry) => getFeedbackStateMeta(entry).label === 'Needs review').length,
      resolved: feedbackEntries.filter((entry) => entry.status === 'resolved').length,
      averageScore:
        scoredEntries.length > 0
          ? Math.round(scoredEntries.reduce((sum, entry) => sum + (entry.rubricScore || 0), 0) / scoredEntries.length)
          : null,
    };
  }, [teamDetail?.feedback]);

  const reviewQueueItems = useMemo<ReviewQueueItem[]>(() => {
    if (!teamDetail) return [];

    const membersById = new Map(teamDetail.members.map((member) => [member.userId, member] as const));
    const assignmentsById = new Map(teamDetail.assignments.map((assignment) => [assignment.id, assignment] as const));
    const feedbackBySubmissionId = new Map<string, TeamFeedback[]>();

    teamDetail.feedback.forEach((entry) => {
      if (!entry.submissionId) return;
      feedbackBySubmissionId.set(entry.submissionId, [...(feedbackBySubmissionId.get(entry.submissionId) || []), entry]);
    });

    const items: ReviewQueueItem[] = teamDetail.submissions
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .map((submission) => {
        const relatedFeedback = (feedbackBySubmissionId.get(submission.id) || []).sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        );
        const latestFeedback = relatedFeedback[0] || null;
        const state: ReviewQueueState = latestFeedback
          ? latestFeedback.status === 'resolved'
            ? 'resolved'
            : latestFeedback.sharedWithMember || latestFeedback.status === 'shared'
            ? 'shared'
            : 'draft'
          : 'needs_review';
        const stateMeta = getReviewQueueStateMeta(state);

        return {
          id: `submission:${submission.id}`,
          source: 'submission',
          state,
          sortPriority: stateMeta.sortPriority,
          member: membersById.get(submission.memberUserId) || null,
          assignment: submission.assignmentId ? assignmentsById.get(submission.assignmentId) || null : null,
          submission,
          feedback: latestFeedback,
          updatedAt:
            latestFeedback && new Date(latestFeedback.updatedAt).getTime() > new Date(submission.updatedAt).getTime()
              ? latestFeedback.updatedAt
              : submission.updatedAt,
          preview: latestFeedback?.summary || submission.preview || submission.title,
          score: latestFeedback?.rubricScore ?? submission.rubricScore ?? null,
          historyCount: relatedFeedback.length,
          submittedAt: submission.createdAt,
        };
      });

    const looseFeedbackItems = teamDetail.feedback
      .filter((entry) => !entry.submissionId)
      .map((entry) => {
        const state: ReviewQueueState =
          entry.status === 'resolved'
            ? 'resolved'
            : entry.sharedWithMember || entry.status === 'shared'
            ? 'shared'
            : 'draft';
        const stateMeta = getReviewQueueStateMeta(state);

        return {
          id: `feedback:${entry.id}`,
          source: 'feedback',
          state,
          sortPriority: stateMeta.sortPriority,
          member: membersById.get(entry.memberUserId) || null,
          assignment: entry.assignmentId ? assignmentsById.get(entry.assignmentId) || null : null,
          submission: null,
          feedback: entry,
          updatedAt: entry.updatedAt,
          preview: entry.summary || entry.focusAreas || entry.strengths || 'Open coaching note',
          score: entry.rubricScore,
          historyCount: 1,
          submittedAt: entry.createdAt,
        } satisfies ReviewQueueItem;
      });

    return [...items, ...looseFeedbackItems];
  }, [teamDetail]);

  const filteredFeedback = useMemo(() => {
    const feedbackEntries = teamDetail?.feedback || [];
    const normalizedQuery = feedbackSearchQuery.trim().toLowerCase();

    return [...feedbackEntries]
      .filter((entry) => {
        const feedbackState = getFeedbackStateMeta(entry);
        if (feedbackStatusFilter === 'all') return true;
        if (feedbackStatusFilter === 'draft') return feedbackState.label === 'Needs review';
        if (feedbackStatusFilter === 'shared') return feedbackState.label === 'Shared';
        return entry.status === 'resolved';
      })
      .filter((entry) =>
        feedbackVisibilityFilter === 'all' ? true : feedbackVisibilityFilter === 'shared' ? entry.sharedWithMember : !entry.sharedWithMember
      )
      .filter((entry) => {
        if (!normalizedQuery) return true;
        return [
          entry.memberName,
          entry.assignmentTitle || '',
          entry.authorName,
          entry.summary,
          entry.strengths,
          entry.focusAreas,
          entry.coachNotes,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (feedbackSort === 'learner') {
          return left.memberName.localeCompare(right.memberName);
        }

        if (feedbackSort === 'score') {
          return (right.rubricScore || -1) - (left.rubricScore || -1);
        }

        const leftState = getFeedbackStateMeta(left);
        const rightState = getFeedbackStateMeta(right);
        if (leftState.sortPriority !== rightState.sortPriority) {
          return leftState.sortPriority - rightState.sortPriority;
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [feedbackSearchQuery, feedbackSort, feedbackStatusFilter, feedbackVisibilityFilter, teamDetail?.feedback]);

  const filteredReviewItems = useMemo(() => {
    const normalizedQuery = feedbackSearchQuery.trim().toLowerCase();

    return reviewQueueItems
      .filter((item) => {
        if (feedbackStatusFilter === 'all') return true;
        return item.state === feedbackStatusFilter;
      })
      .filter((item) => {
        if (feedbackVisibilityFilter === 'all') return true;
        if (feedbackVisibilityFilter === 'shared') {
          return item.feedback ? item.feedback.sharedWithMember : false;
        }
        return item.feedback ? !item.feedback.sharedWithMember : true;
      })
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [
          item.member?.name || '',
          item.member?.email || '',
          item.assignment?.title || item.submission?.assignmentTitle || '',
          item.submission?.title || '',
          item.feedback?.summary || '',
          item.feedback?.strengths || '',
          item.feedback?.focusAreas || '',
          item.preview,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (feedbackSort === 'learner') {
          return (left.member?.name || '').localeCompare(right.member?.name || '');
        }

        if (feedbackSort === 'score') {
          if ((right.score ?? -1) !== (left.score ?? -1)) {
            return (right.score ?? -1) - (left.score ?? -1);
          }
        }

        if (left.sortPriority !== right.sortPriority) {
          return left.sortPriority - right.sortPriority;
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [feedbackSearchQuery, feedbackSort, feedbackStatusFilter, feedbackVisibilityFilter, reviewQueueItems]);

  const selectedAssignment = useMemo(
    () => filteredAssignments.find((assignment) => assignment.id === selectedAssignmentId) || filteredAssignments[0] || null,
    [filteredAssignments, selectedAssignmentId]
  );

  const selectedFeedback = useMemo(
    () => filteredFeedback.find((entry) => entry.id === selectedFeedbackId) || filteredFeedback[0] || null,
    [filteredFeedback, selectedFeedbackId]
  );

  const selectedReviewItem = useMemo(
    () => filteredReviewItems.find((item) => item.id === selectedReviewItemId) || filteredReviewItems[0] || null,
    [filteredReviewItems, selectedReviewItemId]
  );

  const selectedReviewFeedback = selectedReviewItem?.feedback || null;

  const selectedAssignments = useMemo(
    () => filteredAssignments.filter((assignment) => selectedAssignmentIds.includes(assignment.id)),
    [filteredAssignments, selectedAssignmentIds]
  );

  const allFilteredAssignmentsSelected =
    filteredAssignments.length > 0 && filteredAssignments.every((assignment) => selectedAssignmentIds.includes(assignment.id));

  const selectedAssignmentIndex = selectedAssignment ? filteredAssignments.findIndex((assignment) => assignment.id === selectedAssignment.id) : -1;
  const selectedReviewItemIndex = selectedReviewItem ? filteredReviewItems.findIndex((item) => item.id === selectedReviewItem.id) : -1;

  useEffect(() => {
    if (activeModal !== 'assignments') return;
    setSelectedAssignmentId((current) =>
      current && filteredAssignments.some((assignment) => assignment.id === current)
        ? current
        : filteredAssignments[0]?.id || null
    );
  }, [activeModal, filteredAssignments]);

  useEffect(() => {
    if (activeModal !== 'feedback') return;
    setSelectedFeedbackId((current) =>
      current && filteredFeedback.some((entry) => entry.id === current) ? current : filteredFeedback[0]?.id || null
    );
  }, [activeModal, filteredFeedback]);

  useEffect(() => {
    if (activeModal !== 'feedback') return;
    setSelectedReviewItemId((current) =>
      current && filteredReviewItems.some((item) => item.id === current) ? current : filteredReviewItems[0]?.id || null
    );
  }, [activeModal, filteredReviewItems]);

  useEffect(() => {
    if (activeModal !== 'assignments') return;
    setSelectedAssignmentIds((current) => current.filter((assignmentId) => filteredAssignments.some((assignment) => assignment.id === assignmentId)));
  }, [activeModal, filteredAssignments]);

  useEffect(() => {
    if (activeModal !== 'assignments' && activeModal !== 'feedback') return;

    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tagName = element.tagName;
      return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || element.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;

      if (activeModal === 'assignments') {
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault();
          openNewAssignmentEditor();
          return;
        }
        if (event.key.toLowerCase() === 'e' && selectedAssignment) {
          event.preventDefault();
          startAssignmentEdit(selectedAssignment);
          return;
        }
        if (event.key.toLowerCase() === 'b') {
          event.preventDefault();
          setAssignmentViewMode((current) => (current === 'list' ? 'board' : current === 'board' ? 'calendar' : 'list'));
          return;
        }
        if ((event.key.toLowerCase() === 'j' || event.key === 'ArrowDown') && filteredAssignments.length > 0) {
          event.preventDefault();
          const nextIndex = selectedAssignmentIndex >= 0 ? Math.min(selectedAssignmentIndex + 1, filteredAssignments.length - 1) : 0;
          setSelectedAssignmentId(filteredAssignments[nextIndex]?.id || null);
          setAssignmentEditorOpen(false);
          return;
        }
        if ((event.key.toLowerCase() === 'k' || event.key === 'ArrowUp') && filteredAssignments.length > 0) {
          event.preventDefault();
          const previousIndex = selectedAssignmentIndex > 0 ? selectedAssignmentIndex - 1 : 0;
          setSelectedAssignmentId(filteredAssignments[previousIndex]?.id || null);
          setAssignmentEditorOpen(false);
          return;
        }
      }

      if (activeModal === 'feedback') {
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault();
          openNewFeedbackComposer(selectedReviewItem?.member?.userId, selectedReviewItem?.assignment?.id || undefined);
          return;
        }
        if (event.key.toLowerCase() === 'e' && selectedReviewFeedback) {
          event.preventDefault();
          startFeedbackEdit(selectedReviewFeedback);
          return;
        }
        if ((event.key.toLowerCase() === 'j' || event.key === 'ArrowDown') && filteredReviewItems.length > 0) {
          event.preventDefault();
          const nextIndex =
            selectedReviewItemIndex >= 0 ? Math.min(selectedReviewItemIndex + 1, filteredReviewItems.length - 1) : 0;
          setSelectedReviewItemId(filteredReviewItems[nextIndex]?.id || null);
          setFeedbackComposerOpen(false);
          return;
        }
        if ((event.key.toLowerCase() === 'k' || event.key === 'ArrowUp') && filteredReviewItems.length > 0) {
          event.preventDefault();
          const previousIndex = selectedReviewItemIndex > 0 ? selectedReviewItemIndex - 1 : 0;
          setSelectedReviewItemId(filteredReviewItems[previousIndex]?.id || null);
          setFeedbackComposerOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeModal,
    filteredAssignments,
    filteredReviewItems,
    openNewAssignmentEditor,
    openNewFeedbackComposer,
    selectedAssignment,
    selectedAssignmentIndex,
    selectedReviewFeedback,
    selectedReviewItem,
    selectedReviewItemIndex,
  ]);

  const toggleAssignmentSelection = useCallback((assignmentId: string) => {
    setSelectedAssignmentIds((current) =>
      current.includes(assignmentId) ? current.filter((entry) => entry !== assignmentId) : [...current, assignmentId]
    );
  }, []);

  const toggleAllFilteredAssignments = useCallback(() => {
    setSelectedAssignmentIds((current) => {
      if (filteredAssignments.length === 0) return current;
      if (filteredAssignments.every((assignment) => current.includes(assignment.id))) {
        return current.filter((assignmentId) => !filteredAssignments.some((assignment) => assignment.id === assignmentId));
      }

      return Array.from(new Set([...current, ...filteredAssignments.map((assignment) => assignment.id)]));
    });
  }, [filteredAssignments]);

  const calendarAssignmentsByDate = useMemo(() => {
    const grouped = new Map<string, TeamAssignment[]>();

    filteredAssignments.forEach((assignment) => {
      if (!assignment.dueAt) return;
      const key = toCalendarDateKey(assignment.dueAt);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) || []), assignment]);
    });

    return grouped;
  }, [filteredAssignments]);

  const assignmentCalendarDays = useMemo(() => {
    const monthStart = startOfCalendarMonth(assignmentCalendarMonth);
    const gridStart = startOfCalendarGrid(monthStart);

    return Array.from({ length: 42 }, (_, index) => {
      const date = addCalendarDays(gridStart, index);
      const key = toCalendarDateKey(date);
      return {
        key,
        date,
        isCurrentMonth: date.getMonth() === monthStart.getMonth(),
        assignments: calendarAssignmentsByDate.get(key) || [],
      };
    });
  }, [assignmentCalendarMonth, calendarAssignmentsByDate]);

  const unscheduledAssignments = useMemo(
    () => filteredAssignments.filter((assignment) => !assignment.dueAt),
    [filteredAssignments]
  );

  const feedbackContextMemberId = feedbackComposerOpen
    ? feedbackDraft.memberUserId
    : selectedReviewItem?.member?.userId || '';
  const feedbackContextAssignmentId = feedbackComposerOpen
    ? feedbackDraft.assignmentId
    : selectedReviewItem?.assignment?.id || '';
  const feedbackContextSubmissionId =
    feedbackComposerOpen && submissionAttachmentMode === 'existing'
      ? selectedSubmissionId || ''
      : !feedbackComposerOpen
      ? selectedReviewItem?.submission?.id || ''
      : '';

  const feedbackContextMember =
    teamDetail?.members.find((member) => member.userId === feedbackContextMemberId) || null;
  const feedbackContextAssignment =
    teamDetail?.assignments.find((assignment) => assignment.id === feedbackContextAssignmentId) || null;
  const feedbackContextSubmission =
    teamDetail?.submissions.find((submission) => submission.id === feedbackContextSubmissionId) || null;

  const eligibleExistingSubmissions = useMemo(() => {
    if (!feedbackContextMemberId) return [];

    return [...(teamDetail?.submissions || [])]
      .filter((entry) => entry.memberUserId === feedbackContextMemberId)
      .filter((entry) => (!feedbackContextAssignmentId ? true : entry.assignmentId === feedbackContextAssignmentId))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [feedbackContextAssignmentId, feedbackContextMemberId, teamDetail?.submissions]);

  useEffect(() => {
    if (!feedbackComposerOpen || submissionAttachmentMode !== 'existing') return;
    setSelectedSubmissionId((current) =>
      current && eligibleExistingSubmissions.some((entry) => entry.id === current)
        ? current
        : eligibleExistingSubmissions[0]?.id || null
    );
  }, [eligibleExistingSubmissions, feedbackComposerOpen, submissionAttachmentMode]);

  const feedbackHistory = useMemo(() => {
    if (!feedbackContextMemberId) return [];

    return [...(teamDetail?.feedback || [])]
      .filter(
        (entry) =>
          entry.memberUserId === feedbackContextMemberId &&
          (feedbackComposerOpen ? entry.id !== feedbackDraft.id : !selectedReviewFeedback || entry.id !== selectedReviewFeedback.id)
      )
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 5);
  }, [feedbackComposerOpen, feedbackContextMemberId, feedbackDraft.id, selectedReviewFeedback, teamDetail?.feedback]);

  const submissionHistory = useMemo(() => {
    if (!feedbackContextMemberId) return [];

    return [...(teamDetail?.submissions || [])]
      .filter((entry) => entry.memberUserId === feedbackContextMemberId)
      .filter((entry) => (!feedbackContextAssignmentId ? true : entry.assignmentId === feedbackContextAssignmentId))
      .filter((entry) => {
        if (!feedbackComposerOpen) return !feedbackContextSubmission || entry.id !== feedbackContextSubmission.id;
        return submissionAttachmentMode !== 'existing' || !selectedSubmissionId || entry.id !== selectedSubmissionId;
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 6);
  }, [
    feedbackComposerOpen,
    feedbackContextAssignmentId,
    feedbackContextMemberId,
    feedbackContextSubmission,
    selectedSubmissionId,
    submissionAttachmentMode,
    teamDetail?.submissions,
  ]);

  const selectedAssignmentFeedback = useMemo(() => {
    if (!selectedAssignment) return [];

    return [...(teamDetail?.feedback || [])]
      .filter((entry) => entry.assignmentId === selectedAssignment.id)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 4);
  }, [selectedAssignment, teamDetail?.feedback]);

  const selectedAssignmentSubmissions = useMemo(() => {
    if (!selectedAssignment) return [];

    return [...(teamDetail?.submissions || [])]
      .filter((entry) => entry.assignmentId === selectedAssignment.id)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 5);
  }, [selectedAssignment, teamDetail?.submissions]);

  const selectedAssignmentOperationalMeta = selectedAssignment ? assignmentOperationalMeta.get(selectedAssignment.id) || null : null;

  const reviewQueueStats = useMemo(() => {
    const scoredItems = filteredReviewItems.filter((item) => item.score !== null);

    return {
      needsReview: filteredReviewItems.filter((item) => item.state === 'needs_review').length,
      drafted: filteredReviewItems.filter((item) => item.state === 'draft').length,
      shared: filteredReviewItems.filter((item) => item.state === 'shared').length,
      resolved: filteredReviewItems.filter((item) => item.state === 'resolved').length,
      averageScore:
        scoredItems.length > 0
          ? Math.round(scoredItems.reduce((sum, item) => sum + (item.score || 0), 0) / scoredItems.length)
          : null,
    };
  }, [filteredReviewItems]);

  const assignmentBoardGroups = useMemo(() => {
    const groups: Record<string, TeamAssignment[]> = {
      'Past due': [],
      'Due soon': [],
      Live: [],
      Scheduled: [],
      Archived: [],
    };

    filteredAssignments.forEach((assignment) => {
      const workflowState = getAssignmentWorkflowStateMeta(assignment);
      groups[workflowState.label] = [...(groups[workflowState.label] || []), assignment];
    });

    return groups;
  }, [filteredAssignments]);

  const renderAssignmentsModal = () => {
    if (activeModal !== 'assignments' || !teamDetail) return null;

    const averageCompletion =
      assignmentModalStats.total > 0 ? Math.round(assignmentModalStats.totalCompletionRate / assignmentModalStats.total) : 0;
    const selectedAssignmentScope = selectedAssignment
      ? selectedAssignment.assignmentType === 'roadmap'
        ? trackTitleById.get(selectedAssignment.trackId || '') || 'Roadmap'
        : formatBenchmarkLanguageLabel(selectedAssignment.benchmarkLanguage)
      : '';

    return (
      <ModalShell
        title="Assignments"
        subtitle="Manage the work queue first. Open creation only when you need it."
        onClose={() => setActiveModal(null)}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-foreground">Assignments queue</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Review deadlines, progress, and state from one operational view.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex rounded-2xl border border-border bg-background p-1">
                {([
                  ['list', 'List'],
                  ['board', 'Board'],
                  ['calendar', 'Calendar'],
                ] as Array<[AssignmentViewMode, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAssignmentViewMode(value)}
                    className={`inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold transition ${
                      assignmentViewMode === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={openNewAssignmentEditor}
                disabled={!canManageWorkspace}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                New assignment
              </button>
              {assignmentEditorOpen ? (
                <button
                  type="button"
                  onClick={closeAssignmentEditor}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Close editor
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={assignmentSearchQuery}
                onChange={(event) => setAssignmentSearchQuery(event.target.value)}
                placeholder="Search assignments"
                className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary/40"
              />
            </div>
            <select
              value={assignmentTypeFilter}
              onChange={(event) => setAssignmentTypeFilter(event.target.value as 'all' | TeamAssignmentType)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="all">All types</option>
              <option value="benchmark">Benchmark</option>
              <option value="challenge_pack">Challenge pack</option>
              <option value="roadmap">Roadmap</option>
            </select>
            <select
              value={assignmentLifecycleFilter}
              onChange={(event) => setAssignmentLifecycleFilter(event.target.value as AssignmentLifecycleFilter)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              {ASSIGNMENT_LIFECYCLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={assignmentSort}
              onChange={(event) => setAssignmentSort(event.target.value as AssignmentSortOption)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="priority">Sort: Priority</option>
              <option value="due">Sort: Due date</option>
              <option value="completion">Sort: Completion</option>
              <option value="recent">Sort: Recent</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: 'All',
                active: assignmentLifecycleFilter === 'all' && assignmentTypeFilter === 'all',
                onClick: () => {
                  setAssignmentLifecycleFilter('all');
                  setAssignmentTypeFilter('all');
                },
              },
              {
                label: 'Active',
                active: assignmentLifecycleFilter === 'active',
                onClick: () => setAssignmentLifecycleFilter('active'),
              },
              {
                label: 'Past due',
                active: assignmentLifecycleFilter === 'past_due',
                onClick: () => setAssignmentLifecycleFilter('past_due'),
              },
              {
                label: 'Benchmarks',
                active: assignmentTypeFilter === 'benchmark',
                onClick: () => setAssignmentTypeFilter('benchmark'),
              },
              {
                label: 'Roadmaps',
                active: assignmentTypeFilter === 'roadmap',
                onClick: () => setAssignmentTypeFilter('roadmap'),
              },
            ].map((view) => (
              <button
                key={view.label}
                type="button"
                onClick={view.onClick}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition ${
                  view.active
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Active" value={String(assignmentModalStats.active)} helper="Live assignments" />
            <MetricCard label="Past due" value={String(assignmentModalStats.pastDue)} helper="Needs follow-up" />
            <MetricCard label="Needs review" value={String(assignmentModalStats.needsReview)} helper="Submitted work waiting on coach review" />
            <MetricCard label="Avg completion" value={`${averageCompletion}%`} helper="Across all assignments" />
            <MetricCard
              label="Plan usage"
              value={`${workspaceCounts.assignments}/${selectedTeamPlanPolicy.assignmentLimit}`}
              helper="Active assignment slots"
            />
          </div>

          {selectedAssignmentIds.length > 0 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{selectedAssignmentIds.length} selected</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Archive, restore, or move the due date for the selected assignments.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="datetime-local"
                    value={assignmentBulkDueAt}
                    onChange={(event) => setAssignmentBulkDueAt(event.target.value)}
                    className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => void handleBulkAssignmentAction('set_due_date')}
                    disabled={submittingKey === 'bulk-assignment-set_due_date'}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                  >
                    Set due date
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAssignmentAction('archive')}
                    disabled={
                      submittingKey === 'bulk-assignment-archive' ||
                      selectedAssignments.every((assignment) => assignment.lifecycleState === 'archived')
                    }
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                  >
                    Archive selected
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAssignmentAction('restore')}
                    disabled={
                      submittingKey === 'bulk-assignment-restore' ||
                      selectedAssignments.every((assignment) => assignment.lifecycleState !== 'archived')
                    }
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                  >
                    Restore selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignmentIds([])}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_390px]">
            <div className="rounded-2xl border border-border bg-background">
              {teamDetail.assignments.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No assignments yet"
                    helper="Create your first benchmark, roadmap, or challenge pack to start tracking learner progress."
                  />
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No assignments match this view"
                    helper="Reset the filters to return to the full assignments queue."
                  />
                </div>
              ) : assignmentViewMode === 'board' ? (
                <div className="grid max-h-[58vh] gap-3 overflow-y-auto p-4 xl:grid-cols-5">
                  {(['Past due', 'Due soon', 'Live', 'Scheduled', 'Archived'] as const).map((column) => (
                    <div key={column} className="rounded-2xl border border-border bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{column}</div>
                        <div className="text-xs text-muted-foreground">{assignmentBoardGroups[column]?.length || 0}</div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {(assignmentBoardGroups[column] || []).length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                            Nothing here.
                          </div>
                        ) : (
                          assignmentBoardGroups[column].map((assignment) => {
                            const isSelected = selectedAssignment?.id === assignment.id;
                            return (
                              <button
                                key={assignment.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAssignmentId(assignment.id);
                                  setAssignmentEditorOpen(false);
                                }}
                                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                                  isSelected ? 'border-primary/30 bg-primary/10' : 'border-border bg-background hover:bg-secondary'
                                }`}
                              >
                                <div className="text-sm font-semibold text-foreground">{assignment.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {assignment.completedLearnerCount}/{assignment.eligibleLearnerCount} complete
                                </div>
                                <div className="mt-3">
                                  <ProgressStack
                                    completed={assignment.completedLearnerCount}
                                    inProgress={assignment.inProgressLearnerCount}
                                    notStarted={assignment.notStartedLearnerCount}
                                  />
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : assignmentViewMode === 'calendar' ? (
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{formatMonthLabel(assignmentCalendarMonth)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Plan deadlines visually and spot overloaded days faster.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAssignmentCalendarMonth(
                            (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                          )
                        }
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignmentCalendarMonth(startOfCalendarMonth(new Date()))}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAssignmentCalendarMonth(
                            (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                          )
                        }
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {CALENDAR_DAY_LABELS.map((label) => (
                      <div key={label} className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {label}
                      </div>
                    ))}
                    {assignmentCalendarDays.map((day) => (
                      <div
                        key={day.key}
                        className={`min-h-[118px] rounded-2xl border p-2 ${
                          day.isCurrentMonth ? 'border-border bg-card/60' : 'border-border/50 bg-background/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className={`text-xs font-semibold ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                            {day.date.getDate()}
                          </div>
                          {day.assignments.length > 0 ? (
                            <div className="text-[11px] text-muted-foreground">{day.assignments.length}</div>
                          ) : null}
                        </div>
                        <div className="mt-2 space-y-2">
                          {day.assignments.slice(0, 3).map((assignment) => (
                            <button
                              key={assignment.id}
                              type="button"
                              onClick={() => {
                                setSelectedAssignmentId(assignment.id);
                                setAssignmentEditorOpen(false);
                              }}
                              className={`w-full rounded-xl border px-2 py-2 text-left transition ${
                                selectedAssignment?.id === assignment.id
                                  ? 'border-primary/30 bg-primary/10'
                                  : 'border-border bg-background hover:bg-secondary'
                              }`}
                            >
                              <div className="truncate text-xs font-semibold text-foreground">{assignment.title}</div>
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {assignment.completedLearnerCount}/{assignment.eligibleLearnerCount} complete
                              </div>
                            </button>
                          ))}
                          {day.assignments.length > 3 ? (
                            <div className="text-[11px] text-muted-foreground">+{day.assignments.length - 3} more</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {unscheduledAssignments.length > 0 ? (
                    <div className="rounded-2xl border border-border bg-card/60 p-4">
                      <div className="text-sm font-semibold text-foreground">Unscheduled assignments</div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {unscheduledAssignments.map((assignment) => (
                          <button
                            key={assignment.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssignmentId(assignment.id);
                              setAssignmentEditorOpen(false);
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              selectedAssignment?.id === assignment.id
                                ? 'border-primary/30 bg-primary/10'
                                : 'border-border bg-background hover:bg-secondary'
                            }`}
                          >
                            <div className="text-sm font-semibold text-foreground">{assignment.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {formatAssignmentTypeLabel(assignment.assignmentType)} |{' '}
                              {assignment.assignmentType === 'roadmap'
                                ? trackTitleById.get(assignment.trackId || '') || 'Roadmap'
                                : formatBenchmarkLanguageLabel(assignment.benchmarkLanguage)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[36px_minmax(0,1.7fr)_150px_150px_170px] gap-4 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary lg:grid">
                    <div>
                      <input
                        type="checkbox"
                        checked={allFilteredAssignmentsSelected}
                        onChange={toggleAllFilteredAssignments}
                        className="h-4 w-4 rounded border-border bg-background"
                      />
                    </div>
                    <div>Assignment</div>
                    <div>State</div>
                    <div>Due</div>
                    <div>Progress</div>
                  </div>
                  <div className="max-h-[58vh] divide-y divide-border overflow-y-auto">
                    {filteredAssignments.map((assignment) => {
                      const dueMeta = getAssignmentDueMeta(assignment.dueAt);
                      const workflowState = getAssignmentWorkflowStateMeta(assignment);
                      const operationalMeta = assignmentOperationalMeta.get(assignment.id);
                      const isSelected = selectedAssignment?.id === assignment.id;
                      const assignmentScope =
                        assignment.assignmentType === 'roadmap'
                          ? trackTitleById.get(assignment.trackId || '') || 'Roadmap track'
                          : formatBenchmarkLanguageLabel(assignment.benchmarkLanguage);

                      return (
                        <div
                          key={assignment.id}
                          className={`grid gap-3 px-4 py-4 transition lg:grid-cols-[36px_minmax(0,1.7fr)_150px_150px_170px] lg:gap-4 ${
                            isSelected ? 'bg-primary/8' : 'hover:bg-card'
                          }`}
                        >
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={selectedAssignmentIds.includes(assignment.id)}
                              onChange={() => toggleAssignmentSelection(assignment.id)}
                              className="h-4 w-4 rounded border-border bg-background"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssignmentId(assignment.id);
                              setAssignmentEditorOpen(false);
                            }}
                            className="contents text-left"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-foreground sm:text-base">{assignment.title}</div>
                              <div className="mt-1 truncate text-sm text-muted-foreground">
                                {formatAssignmentTypeLabel(assignment.assignmentType)} | {assignmentScope} | All learners
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {operationalMeta?.needsReviewCount || 0} awaiting review
                                <span className="mx-2">|</span>
                                {operationalMeta?.averageScore !== null && operationalMeta?.averageScore !== undefined
                                  ? `Avg score ${operationalMeta.averageScore}`
                                  : 'No scores yet'}
                                <span className="mx-2">|</span>
                                Updated {formatRelativeActivityLabel(operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt)}
                              </div>
                            </div>
                            <div className="flex items-start lg:items-center">
                              <div>
                                <div className="text-sm font-semibold text-foreground">{workflowState.label}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{workflowState.description}</div>
                              </div>
                            </div>
                            <div className="flex items-start lg:items-center">
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {assignment.dueAt ? formatDateLabel(assignment.dueAt) : 'No due date'}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {dueMeta.label}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-foreground">
                                  {assignment.completedLearnerCount}/{assignment.eligibleLearnerCount} complete
                                </span>
                                <span className="text-muted-foreground">{assignment.completionRate}%</span>
                              </div>
                              <ProgressStack
                                completed={assignment.completedLearnerCount}
                                inProgress={assignment.inProgressLearnerCount}
                                notStarted={assignment.notStartedLearnerCount}
                              />
                              <div className="text-xs text-muted-foreground">
                                {assignment.inProgressLearnerCount} in progress | {assignment.notStartedLearnerCount} not started
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              {assignmentEditorOpen ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {assignmentDraft.id ? 'Edit assignment' : 'New assignment'}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Define the work, deadline, and learning target without leaving the queue.
                    </div>
                  </div>

                  {!assignmentDraft.id ? (
                    <FormField label="Start from template">
                      <div className="grid gap-2">
                        {ASSIGNMENT_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyAssignmentTemplate(template.id)}
                            className="rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-secondary"
                          >
                            <div className="text-sm font-semibold text-foreground">{template.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    </FormField>
                  ) : null}

                  <FormField label="Assignment type">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ['benchmark', 'Benchmark'],
                        ['roadmap', 'Roadmap'],
                        ['challenge_pack', 'Challenge pack'],
                      ] as Array<[TeamAssignmentType, string]>).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setAssignmentDraft((current) => ({
                              ...current,
                              assignmentType: value,
                              trackId: value === 'roadmap' ? current.trackId : '',
                            }))
                          }
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            assignmentDraft.assignmentType === value
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border bg-card text-foreground hover:bg-secondary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Title">
                    <input
                      value={assignmentDraft.title}
                      onChange={(event) => setAssignmentDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Class benchmark"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  {assignmentDraft.assignmentType === 'roadmap' ? (
                    <FormField label="Track">
                      <select
                        value={assignmentDraft.trackId}
                        onChange={(event) => setAssignmentDraft((current) => ({ ...current, trackId: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      >
                        <option value="">Select a roadmap track</option>
                        {interviewTracks.map((track) => (
                          <option key={track.id} value={track.id}>
                            {track.title}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  ) : (
                    <FormField label="Language">
                      <select
                        value={assignmentDraft.benchmarkLanguage || 'python'}
                        onChange={(event) =>
                          setAssignmentDraft((current) => ({
                            ...current,
                            benchmarkLanguage: event.target.value as AssignmentDraft['benchmarkLanguage'],
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                    </FormField>
                  )}

                  <FormField label="Due date" helper="Optional">
                    <input
                      type="datetime-local"
                      value={assignmentDraft.dueAt}
                      onChange={(event) => setAssignmentDraft((current) => ({ ...current, dueAt: event.target.value }))}
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  <FormField label="Brief" helper="One-line purpose">
                    <textarea
                      value={assignmentDraft.description}
                      onChange={(event) => setAssignmentDraft((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Measure baseline fluency before the next interview sprint."
                      rows={5}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveAssignment}
                      disabled={!canManageWorkspace || submittingKey === 'save-assignment'}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {submittingKey === 'save-assignment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {assignmentDraft.id ? 'Save assignment' : 'Create assignment'}
                    </button>
                    <button
                      type="button"
                      onClick={closeAssignmentEditor}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedAssignment ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Assignment detail</div>
                    <div className="mt-2 text-xl font-semibold text-foreground">{selectedAssignment.title}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {selectedAssignment.description || 'No brief has been added yet.'}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard label="Type" value={formatAssignmentTypeLabel(selectedAssignment.assignmentType)} />
                    <MetricCard label="Focus" value={selectedAssignmentScope} />
                    <MetricCard
                      label="Due"
                      value={selectedAssignment.dueAt ? formatDateLabel(selectedAssignment.dueAt) : 'No due date'}
                      helper={getAssignmentDueMeta(selectedAssignment.dueAt).label}
                    />
                    <MetricCard
                      label="State"
                      value={getAssignmentWorkflowStateMeta(selectedAssignment).label}
                      helper={`Last activity ${formatRelativeActivityLabel(selectedAssignmentOperationalMeta?.lastActivityAt || selectedAssignment.updatedAt || selectedAssignment.createdAt)}`}
                    />
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Completion</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {selectedAssignment.completedLearnerCount} complete | {selectedAssignment.inProgressLearnerCount} in progress |{' '}
                          {selectedAssignment.notStartedLearnerCount} not started
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-foreground">{selectedAssignment.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">completion rate</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ProgressStack
                        completed={selectedAssignment.completedLearnerCount}
                        inProgress={selectedAssignment.inProgressLearnerCount}
                        notStarted={selectedAssignment.notStartedLearnerCount}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricCard label="Learners" value={String(selectedAssignment.eligibleLearnerCount)} />
                      <MetricCard label="Avg progress" value={`${selectedAssignment.averageProgressPercent}%`} />
                      <MetricCard
                        label="Target"
                        value={`${selectedAssignment.requiredCompletionCount} ${selectedAssignment.progressUnitLabel}`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard
                      label="Needs attention"
                      value={String(Math.max(selectedAssignment.eligibleLearnerCount - selectedAssignment.completedLearnerCount, 0))}
                      helper="Learners not fully complete"
                    />
                    <MetricCard
                      label="Needs review"
                      value={String(selectedAssignmentOperationalMeta?.needsReviewCount || 0)}
                      helper="Submission backlog"
                    />
                    <MetricCard
                      label="Coaching notes"
                      value={String(selectedAssignmentFeedback.length)}
                      helper="Linked to this assignment"
                    />
                  </div>

                  {selectedAssignmentSubmissions.length > 0 ? (
                    <div className="rounded-2xl border border-border bg-card px-4 py-4">
                      <div className="text-sm font-semibold text-foreground">Recent submissions</div>
                      <div className="mt-3 space-y-3">
                        {selectedAssignmentSubmissions.map((submission) => (
                          <button
                            key={submission.id}
                            type="button"
                            onClick={() => {
                              if (!submission.memberUserId) return;
                              openNewFeedbackComposer(submission.memberUserId, submission.assignmentId || undefined);
                              setSubmissionAttachmentMode('existing');
                              setSelectedSubmissionId(submission.id);
                            }}
                            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-secondary"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-foreground">{submission.memberName}</div>
                              <div className="text-xs text-muted-foreground">
                                Attempt {submission.attemptNumber} | {formatSubmissionStatusLabel(submission.status)}
                              </div>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {submission.title} | {formatSubmissionTypeLabel(submission.submissionType)}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{submission.preview}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedAssignmentFeedback.length > 0 ? (
                    <div className="rounded-2xl border border-border bg-card px-4 py-4">
                      <div className="text-sm font-semibold text-foreground">Recent coaching activity</div>
                      <div className="mt-3 space-y-3">
                        {selectedAssignmentFeedback.map((entry) => {
                          const state = getFeedbackStateMeta(entry);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => {
                                setActiveModal('feedback');
                                setSelectedFeedbackId(entry.id);
                                setFeedbackComposerOpen(false);
                              }}
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-secondary"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-foreground">{entry.memberName}</div>
                                <div className="text-xs text-muted-foreground">{state.label}</div>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">{entry.summary || 'Open coaching note'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => startAssignmentEdit(selectedAssignment)}
                      disabled={!canManageWorkspace}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDuplicateAssignment(selectedAssignment)}
                      disabled={!canManageWorkspace || submittingKey === `duplicate-assignment-${selectedAssignment.id}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      {submittingKey === `duplicate-assignment-${selectedAssignment.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Duplicate
                    </button>
                    {selectedAssignment.lifecycleState === 'archived' ? (
                      <button
                        type="button"
                        onClick={() => void handleRestoreAssignment(selectedAssignment)}
                        disabled={!canManageWorkspace || submittingKey === `restore-assignment-${selectedAssignment.id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                      >
                        {submittingKey === `restore-assignment-${selectedAssignment.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestArchiveAssignment(selectedAssignment)}
                        disabled={!canManageWorkspace || submittingKey === `delete-assignment-${selectedAssignment.id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                      >
                        {submittingKey === `delete-assignment-${selectedAssignment.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Select an assignment"
                  helper="Choose a row from the queue to inspect progress, deadlines, and quick actions."
                />
              )}
            </div>
          </div>
        </div>
      </ModalShell>
    );
  };

  const renderFeedbackModal = () => {
    if (activeModal !== 'feedback' || !teamDetail) return null;

    const selectedFeedbackState = selectedReviewFeedback
      ? getFeedbackStateMeta(selectedReviewFeedback)
      : selectedFeedback
      ? getFeedbackStateMeta(selectedFeedback)
      : null;
    const selectedReviewState = selectedReviewItem ? getReviewQueueStateMeta(selectedReviewItem.state) : null;
    const composerRubric = normalizeRubricBreakdownDraft(feedbackRubricDraft);
    const composerRubricTotal = getRubricBreakdownTotal(composerRubric);
    const composerRubricPercent = hasRubricBreakdownValues(composerRubric)
      ? Math.round((composerRubricTotal / 40) * 100)
      : null;
    const hasReviewQueue = reviewQueueItems.length > 0;

    const openReviewItem = (item: ReviewQueueItem) => {
      setSelectedReviewItemId(item.id);
      setSelectedFeedbackId(item.feedback?.id || null);
      setFeedbackComposerOpen(false);
    };

    const startReviewForItem = (item: ReviewQueueItem) => {
      if (item.feedback) {
        startFeedbackEdit(item.feedback);
        if (item.submission) {
          setSubmissionAttachmentMode('existing');
          setSelectedSubmissionId(item.submission.id);
        }
        return;
      }

      openNewFeedbackComposer(item.member?.userId, item.assignment?.id || undefined);
      if (item.submission) {
        setSubmissionAttachmentMode('existing');
        setSelectedSubmissionId(item.submission.id);
      }
    };

    return (
      <ModalShell
        title="Grade and coach"
        subtitle="Move through learner work quickly: queue on the left, submission context in the center, scoring on the right."
        onClose={() => setActiveModal(null)}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-foreground">Review queue</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pick the learner who needs attention, inspect the work, then score and share feedback without losing context.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openNewFeedbackComposer(selectedReviewItem?.member?.userId, selectedReviewItem?.assignment?.id || undefined)}
                disabled={!canManageWorkspace}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                New review
              </button>
              {feedbackComposerOpen ? (
                <button
                  type="button"
                  onClick={closeFeedbackComposer}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Close composer
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={feedbackSearchQuery}
                onChange={(event) => setFeedbackSearchQuery(event.target.value)}
                placeholder="Search learner, assignment, submission, or note"
                className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary/40"
              />
            </div>
            <select
              value={feedbackStatusFilter}
              onChange={(event) => setFeedbackStatusFilter(event.target.value as ReviewStatusFilter)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="all">All review states</option>
              <option value="needs_review">Needs review</option>
              <option value="draft">Drafted</option>
              <option value="shared">Shared</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={feedbackVisibilityFilter}
              onChange={(event) => setFeedbackVisibilityFilter(event.target.value as FeedbackVisibilityFilter)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              {FEEDBACK_VISIBILITY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={feedbackSort}
              onChange={(event) => setFeedbackSort(event.target.value as FeedbackSortOption)}
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="recent">Sort: Recent</option>
              <option value="score">Sort: Score</option>
              <option value="learner">Sort: Learner</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'needs_review' as const, label: 'Needs review' },
              { value: 'draft' as const, label: 'Drafted' },
              { value: 'shared' as const, label: 'Shared' },
              { value: 'resolved' as const, label: 'Resolved' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFeedbackStatusFilter(tab.value)}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition ${
                  feedbackStatusFilter === tab.value
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Needs review" value={String(reviewQueueStats.needsReview)} helper="Ready for scoring" />
            <MetricCard label="Drafted" value={String(reviewQueueStats.drafted)} helper="Private feedback drafts" />
            <MetricCard label="Shared" value={String(reviewQueueStats.shared)} helper="Visible to learners" />
            <MetricCard label="Resolved" value={String(reviewQueueStats.resolved)} helper="Feedback loop closed" />
            <MetricCard
              label="Avg score"
              value={reviewQueueStats.averageScore !== null ? `${reviewQueueStats.averageScore}` : '--'}
              helper={`${feedbackModalStats.total} notes on file`}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_390px]">
            <div className="rounded-2xl border border-border bg-background">
              {!hasReviewQueue ? (
                <div className="p-4">
                  <EmptyState
                    title="No submissions or feedback yet"
                    helper={
                      teamDetail.submissions.length > 0
                        ? 'Learner work is available. Start the first review to turn submissions into scored feedback.'
                        : 'When learners submit work, the review queue will populate here.'
                    }
                  />
                </div>
              ) : filteredReviewItems.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No review items in this view"
                    helper="Reset the filters to return to the full coaching queue."
                  />
                </div>
              ) : (
                <div className="max-h-[58vh] divide-y divide-border overflow-y-auto">
                  {filteredReviewItems.map((item) => {
                    const stateMeta = getReviewQueueStateMeta(item.state);
                    const isSelected = selectedReviewItem?.id === item.id;
                    const assignmentLabel = item.assignment?.title || item.submission?.assignmentTitle || 'General coaching note';
                    const submissionMeta = item.submission
                      ? `${item.submission.title} | Attempt ${item.submission.attemptNumber}`
                      : item.feedback?.authorName
                      ? `Coach note by ${item.feedback.authorName}`
                      : 'Manual review note';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openReviewItem(item)}
                        className={`w-full px-4 py-4 text-left transition ${isSelected ? 'bg-primary/8' : 'hover:bg-card'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{item.member?.name || 'Unknown learner'}</div>
                            <div className="mt-1 truncate text-sm text-muted-foreground">{assignmentLabel}</div>
                            <div className="mt-2 text-xs text-muted-foreground">{submissionMeta}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{stateMeta.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{formatRelativeActivityLabel(item.updatedAt)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.score !== null ? `${item.score} score` : 'Unscored'}</span>
                          <span>|</span>
                          <span>{formatDateTimeLabel(item.submittedAt)}</span>
                          {item.submission ? (
                            <>
                              <span>|</span>
                              <span>{formatSubmissionStatusLabel(item.submission.status)}</span>
                            </>
                          ) : null}
                          {item.historyCount > 1 ? (
                            <>
                              <span>|</span>
                              <span>{item.historyCount} reviews</span>
                            </>
                          ) : null}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.preview}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              {feedbackContextMember && selectedReviewItem ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Submission context</div>
                    <div className="mt-2 text-xl font-semibold text-foreground">{feedbackContextMember.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{feedbackContextMember.email || 'No email saved'}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Last active {formatRelativeActivityLabel(feedbackContextMember.lastActiveAt)} | Queue updated{' '}
                      {formatRelativeActivityLabel(selectedReviewItem.updatedAt)}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Review state" value={selectedReviewState?.label || 'Needs review'} />
                    <MetricCard
                      label="Submission"
                      value={selectedReviewItem.submission ? `Attempt ${selectedReviewItem.submission.attemptNumber}` : 'No submission'}
                    />
                    <MetricCard label="Role" value={formatTeamRoleLabel(feedbackContextMember.role)} />
                    <MetricCard
                      label="Latest benchmark"
                      value={
                        feedbackContextMember.latestBenchmarkScore !== null
                          ? `${feedbackContextMember.latestBenchmarkScore}`
                          : '--'
                        }
                      helper={feedbackContextMember.latestBenchmarkAt ? formatDateLabel(feedbackContextMember.latestBenchmarkAt) : 'No benchmark yet'}
                    />
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">Linked assignment</div>
                      {feedbackContextAssignment ? (
                        <div className="text-xs text-muted-foreground">
                          {feedbackContextAssignment.eligibleLearnerCount} learners | {feedbackContextAssignment.completionRate}% complete
                        </div>
                      ) : null}
                    </div>
                    {feedbackContextAssignment ? (
                      <div className="mt-3 space-y-2">
                        <div className="font-semibold text-foreground">{feedbackContextAssignment.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatAssignmentTypeLabel(feedbackContextAssignment.assignmentType)} |{' '}
                          {feedbackContextAssignment.assignmentType === 'roadmap'
                            ? trackTitleById.get(feedbackContextAssignment.trackId || '') || 'Roadmap'
                            : formatBenchmarkLanguageLabel(feedbackContextAssignment.benchmarkLanguage)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due {feedbackContextAssignment.dueAt ? formatDateLabel(feedbackContextAssignment.dueAt) : 'No due date'}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No assignment is linked yet. This review is anchored to the learner rather than a tracked assignment.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">Submission preview</div>
                      {feedbackContextSubmission ? (
                        <div className="text-xs text-muted-foreground">
                          Attempt {feedbackContextSubmission.attemptNumber} | {formatSubmissionStatusLabel(feedbackContextSubmission.status)}
                        </div>
                      ) : submissionAttachmentMode === 'new' && feedbackComposerOpen ? (
                        <div className="text-xs text-muted-foreground">New snapshot</div>
                      ) : null}
                    </div>
                    {feedbackContextSubmission ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="font-semibold text-foreground">{feedbackContextSubmission.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {formatSubmissionTypeLabel(feedbackContextSubmission.submissionType)}
                            {feedbackContextSubmission.codeLanguage ? ` | ${formatBenchmarkLanguageLabel(feedbackContextSubmission.codeLanguage)}` : ''}
                            {feedbackContextSubmission.submittedByName ? ` | Logged by ${feedbackContextSubmission.submittedByName}` : ''}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                            {feedbackContextSubmission.preview}
                          </div>
                          <div className="rounded-2xl border border-border bg-background px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Review state</div>
                            <div className="mt-2">
                              <select
                                value={feedbackContextSubmission.status}
                                onChange={(event) =>
                                  void handleUpdateSubmissionStatus(
                                    feedbackContextSubmission.id,
                                    event.target.value as TeamSubmissionStatus
                                  )
                                }
                                disabled={!canManageWorkspace || submittingKey === `submission-status-${feedbackContextSubmission.id}`}
                                className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40 disabled:opacity-60"
                              >
                                <option value="submitted">Submitted</option>
                                <option value="needs_revision">Needs revision</option>
                                <option value="reviewed">Reviewed</option>
                              </select>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Update the learner-facing review state directly from the queue.
                            </div>
                          </div>
                        </div>
                        {feedbackContextSubmission.externalUrl ? (
                          <a
                            href={feedbackContextSubmission.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open submitted link
                          </a>
                        ) : null}
                      </div>
                    ) : submissionAttachmentMode === 'new' && feedbackComposerOpen ? (
                      <div className="mt-3 space-y-3">
                        <div className="text-sm font-semibold text-foreground">{submissionDraft.title || 'Untitled submission'}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatSubmissionTypeLabel(submissionDraft.submissionType)}
                          {submissionDraft.submissionType === 'code' && submissionDraft.codeLanguage
                            ? ` | ${formatBenchmarkLanguageLabel(submissionDraft.codeLanguage)}`
                            : ''}
                        </div>
                        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                          {submissionDraft.submissionType === 'link'
                            ? submissionDraft.externalUrl || 'Add the learner link here.'
                            : submissionDraft.body || 'Add the learner submission here.'}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No learner submission is attached yet. Start a review to anchor coaching to an existing attempt or create a new snapshot.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="text-sm font-semibold text-foreground">Previous attempts</div>
                    {submissionHistory.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {submissionHistory.map((submission) => (
                          <button
                            key={submission.id}
                            type="button"
                            onClick={() => {
                              setSelectedReviewItemId(`submission:${submission.id}`);
                              setSelectedFeedbackId(null);
                              if (feedbackComposerOpen) {
                                setSubmissionAttachmentMode('existing');
                                setSelectedSubmissionId(submission.id);
                              } else {
                                setFeedbackComposerOpen(false);
                              }
                            }}
                            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-secondary"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-foreground">{submission.title}</div>
                              <div className="text-xs text-muted-foreground">{formatDateLabel(submission.updatedAt)}</div>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {formatSubmissionTypeLabel(submission.submissionType)} | Attempt {submission.attemptNumber} |{' '}
                              {formatSubmissionStatusLabel(submission.status)}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{submission.preview}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">No previous attempts for this learner in this assignment yet.</div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="text-sm font-semibold text-foreground">Review history</div>
                    {!feedbackComposerOpen && selectedReviewFeedback ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <MetricCard label="State" value={selectedFeedbackState?.label || 'Draft'} />
                          <MetricCard
                            label="Visibility"
                            value={selectedReviewFeedback.sharedWithMember ? 'Shared' : 'Private'}
                          />
                          <MetricCard
                            label="Score"
                            value={selectedReviewFeedback.rubricScore !== null ? `${selectedReviewFeedback.rubricScore}` : '--'}
                          />
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground">
                          <div>
                            <div className="font-semibold text-foreground">Summary</div>
                            <div className="mt-1">{selectedReviewFeedback.summary || 'No summary yet.'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">Strengths</div>
                            <div className="mt-1">{selectedReviewFeedback.strengths || 'No strengths captured yet.'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">Focus areas</div>
                            <div className="mt-1">{selectedReviewFeedback.focusAreas || 'No focus areas captured yet.'}</div>
                          </div>
                        </div>
                      </div>
                    ) : feedbackHistory.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {feedbackHistory.map((entry) => {
                          const feedbackState = getFeedbackStateMeta(entry);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => {
                                setSelectedReviewItemId(entry.submissionId ? `submission:${entry.submissionId}` : `feedback:${entry.id}`);
                                setSelectedFeedbackId(entry.id);
                                setFeedbackComposerOpen(false);
                              }}
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-secondary"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-foreground">{feedbackState.label}</div>
                                <div className="text-xs text-muted-foreground">{formatDateLabel(entry.updatedAt)}</div>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {entry.assignmentTitle || 'General coaching note'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No previous coaching notes for this learner yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Select a review item"
                  helper="Choose a learner submission or coaching note from the queue to load context here."
                />
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              {feedbackComposerOpen ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{feedbackDraft.id ? 'Edit review' : 'Score and coach'}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Use the rubric first, then publish learner-facing feedback once the review is ready.
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Learner">
                      <select
                        value={feedbackDraft.memberUserId}
                        onChange={(event) => setFeedbackDraft((current) => ({ ...current, memberUserId: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      >
                        <option value="">Select learner</option>
                        {learnerMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Assignment link" helper="Optional">
                      <select
                        value={feedbackDraft.assignmentId}
                        onChange={(event) => setFeedbackDraft((current) => ({ ...current, assignmentId: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      >
                        <option value="">General coaching note</option>
                        {teamDetail.assignments.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Rubric</div>
                        <div className="mt-1 text-sm text-muted-foreground">Score the work before you write the coaching note.</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-foreground">
                          {composerRubricPercent !== null ? `${composerRubricPercent}` : '--'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {composerRubricPercent !== null ? `${composerRubricTotal}/40 total` : 'Unscored'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {([
                        ['correctness', 'Correctness'],
                        ['codeQuality', 'Code quality'],
                        ['problemSolving', 'Problem solving'],
                        ['communication', 'Communication'],
                      ] as Array<[keyof FeedbackRubricDraft, string]>).map(([field, label]) => (
                        <FormField key={field} label={label} helper="/10">
                          <input
                            value={feedbackRubricDraft[field]}
                            onChange={(event) =>
                              setFeedbackRubricDraft((current) => ({
                                ...current,
                                [field]: event.target.value,
                              }))
                            }
                            placeholder="0-10"
                            className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                          />
                        </FormField>
                      ))}
                    </div>
                  </div>

                  <FormField label="Submission anchor" helper="Attach the note to real learner work when available.">
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        {([
                          ['none', 'No submission'],
                          ['existing', 'Use existing'],
                          ['new', 'Create snapshot'],
                        ] as Array<[SubmissionAttachmentMode, string]>).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setSubmissionAttachmentMode(value);
                              if (value === 'none') {
                                setSelectedSubmissionId(null);
                                setSubmissionDraft(emptySubmissionDraft());
                              }
                              if (value === 'new') {
                                setSelectedSubmissionId(null);
                              }
                            }}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              submissionAttachmentMode === value
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border bg-card text-foreground hover:bg-secondary'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {submissionAttachmentMode === 'existing' ? (
                        <select
                          value={selectedSubmissionId || ''}
                          onChange={(event) => setSelectedSubmissionId(event.target.value || null)}
                          className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                        >
                          <option value="">Select submission</option>
                          {eligibleExistingSubmissions.map((submission) => (
                            <option key={submission.id} value={submission.id}>
                              {submission.title} | Attempt {submission.attemptNumber} | {formatSubmissionStatusLabel(submission.status)}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {submissionAttachmentMode === 'new' ? (
                        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Submission title">
                              <input
                                value={submissionDraft.title}
                                onChange={(event) => setSubmissionDraft((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Benchmark retry #2"
                                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                              />
                            </FormField>
                            <FormField label="Submission type">
                              <select
                                value={submissionDraft.submissionType}
                                onChange={(event) =>
                                  setSubmissionDraft((current) => ({
                                    ...current,
                                    submissionType: event.target.value as TeamSubmissionType,
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                              >
                                <option value="written">Written response</option>
                                <option value="code">Code snapshot</option>
                                <option value="link">External link</option>
                              </select>
                            </FormField>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Submission status">
                              <select
                                value={submissionDraft.status}
                                onChange={(event) =>
                                  setSubmissionDraft((current) => ({
                                    ...current,
                                    status: event.target.value as TeamSubmissionStatus,
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                              >
                                <option value="submitted">Submitted</option>
                                <option value="needs_revision">Needs revision</option>
                                <option value="reviewed">Reviewed</option>
                              </select>
                            </FormField>
                            <FormField label="Submission score" helper="Optional">
                              <input
                                value={submissionDraft.rubricScore}
                                onChange={(event) => setSubmissionDraft((current) => ({ ...current, rubricScore: event.target.value }))}
                                placeholder="74"
                                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                              />
                            </FormField>
                          </div>

                          {submissionDraft.submissionType === 'code' ? (
                            <FormField label="Code language">
                              <select
                                value={submissionDraft.codeLanguage}
                                onChange={(event) =>
                                  setSubmissionDraft((current) => ({
                                    ...current,
                                    codeLanguage: event.target.value as BenchmarkLanguage,
                                  }))
                                }
                                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                              >
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                              </select>
                            </FormField>
                          ) : null}

                          {submissionDraft.submissionType === 'link' ? (
                            <FormField label="Submission link">
                              <input
                                value={submissionDraft.externalUrl}
                                onChange={(event) => setSubmissionDraft((current) => ({ ...current, externalUrl: event.target.value }))}
                                placeholder="https://github.com/..."
                                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                              />
                            </FormField>
                          ) : (
                            <FormField label={submissionDraft.submissionType === 'code' ? 'Code' : 'Submission body'}>
                              <textarea
                                value={submissionDraft.body}
                                onChange={(event) => setSubmissionDraft((current) => ({ ...current, body: event.target.value }))}
                                rows={6}
                                placeholder={
                                  submissionDraft.submissionType === 'code'
                                    ? 'Paste the learner code snapshot here.'
                                    : 'Paste the learner answer or submission here.'
                                }
                                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                              />
                            </FormField>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </FormField>

                  <FormField label="Workflow state">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ['draft', 'Draft'],
                        ['shared', 'Shared'],
                        ['resolved', 'Resolved'],
                      ] as Array<['draft' | 'shared' | 'resolved', string]>).map(([value, label]) => {
                        const active =
                          value === 'draft'
                            ? feedbackDraft.status === 'draft' && !feedbackDraft.sharedWithMember
                            : value === 'shared'
                            ? feedbackDraft.status === 'shared' && feedbackDraft.sharedWithMember
                            : feedbackDraft.status === 'resolved';

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFeedbackWorkflowState(value)}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              active
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border bg-card text-foreground hover:bg-secondary'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>

                  <FormField label="Quick feedback">
                    <div className="flex flex-wrap gap-2">
                      {FEEDBACK_SNIPPETS.map((snippet) => (
                        <button
                          key={snippet.id}
                          type="button"
                          onClick={() => applyFeedbackSnippet(snippet.id)}
                          className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                        >
                          {snippet.label}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Summary">
                    <textarea
                      value={feedbackDraft.summary}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, summary: event.target.value }))}
                      rows={3}
                      placeholder="Strong baseline on syntax and iteration."
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  <FormField label="Strengths">
                    <textarea
                      value={feedbackDraft.strengths}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, strengths: event.target.value }))}
                      rows={3}
                      placeholder="Clear control flow and readable variable names."
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  <FormField label="Focus areas">
                    <textarea
                      value={feedbackDraft.focusAreas}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, focusAreas: event.target.value }))}
                      rows={3}
                      placeholder="Edge cases and output formatting need more consistency."
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  <FormField label="Private coach notes" helper="Internal only">
                    <textarea
                      value={feedbackDraft.coachNotes}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, coachNotes: event.target.value }))}
                      rows={4}
                      placeholder="Use the next session to walk through debugging strategy."
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveFeedback}
                      disabled={!canManageWorkspace || submittingKey === 'save-feedback'}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {submittingKey === 'save-feedback' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {feedbackDraft.status === 'resolved'
                        ? 'Resolve feedback'
                        : feedbackDraft.sharedWithMember
                        ? 'Share feedback'
                        : feedbackDraft.id
                        ? 'Save draft'
                        : 'Create feedback'}
                    </button>
                    <button
                      type="button"
                      onClick={closeFeedbackComposer}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedReviewFeedback ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Feedback detail</div>
                    <div className="mt-2 text-xl font-semibold text-foreground">{selectedReviewFeedback.memberName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedReviewFeedback.assignmentTitle || 'General coaching note'} | {selectedReviewFeedback.authorName}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <MetricCard label="State" value={selectedFeedbackState?.label || 'Draft'} />
                    <MetricCard label="Visibility" value={selectedReviewFeedback.sharedWithMember ? 'Shared' : 'Private'} />
                    <MetricCard
                      label="Score"
                      value={selectedReviewFeedback.rubricScore !== null ? `${selectedReviewFeedback.rubricScore}` : '--'}
                    />
                    <MetricCard label="Updated" value={formatRelativeActivityLabel(selectedReviewFeedback.updatedAt)} />
                  </div>

                  {selectedReviewFeedback.rubricBreakdown ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricCard
                        label="Correctness"
                        value={
                          selectedReviewFeedback.rubricBreakdown.correctness !== null
                            ? `${selectedReviewFeedback.rubricBreakdown.correctness}/10`
                            : '--'
                        }
                      />
                      <MetricCard
                        label="Code quality"
                        value={
                          selectedReviewFeedback.rubricBreakdown.codeQuality !== null
                            ? `${selectedReviewFeedback.rubricBreakdown.codeQuality}/10`
                            : '--'
                        }
                      />
                      <MetricCard
                        label="Problem solving"
                        value={
                          selectedReviewFeedback.rubricBreakdown.problemSolving !== null
                            ? `${selectedReviewFeedback.rubricBreakdown.problemSolving}/10`
                            : '--'
                        }
                      />
                      <MetricCard
                        label="Communication"
                        value={
                          selectedReviewFeedback.rubricBreakdown.communication !== null
                            ? `${selectedReviewFeedback.rubricBreakdown.communication}/10`
                            : '--'
                        }
                      />
                    </div>
                  ) : null}

                  <div className="space-y-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                    <div>
                      <div className="font-semibold text-foreground">Summary</div>
                      <div className="mt-1">{selectedReviewFeedback.summary || 'No summary yet.'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Strengths</div>
                      <div className="mt-1">{selectedReviewFeedback.strengths || 'No strengths captured yet.'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Focus areas</div>
                      <div className="mt-1">{selectedReviewFeedback.focusAreas || 'No focus areas captured yet.'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Private coach notes</div>
                      <div className="mt-1">{selectedReviewFeedback.coachNotes || 'No private coach notes yet.'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => startFeedbackEdit(selectedReviewFeedback)}
                      disabled={!canManageWorkspace}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit feedback
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewFeedbackComposer(selectedReviewFeedback.memberUserId, selectedReviewFeedback.assignmentId || undefined)}
                      disabled={!canManageWorkspace}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      Follow-up note
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (filteredReviewItems.length === 0) return;
                        const nextIndex =
                          selectedReviewItemIndex >= 0 ? Math.min(selectedReviewItemIndex + 1, filteredReviewItems.length - 1) : 0;
                        setSelectedReviewItemId(filteredReviewItems[nextIndex]?.id || null);
                        setFeedbackComposerOpen(false);
                      }}
                      disabled={!selectedReviewItem || filteredReviewItems.length <= 1}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Next learner
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteFeedback(selectedReviewFeedback)}
                      disabled={!canManageWorkspace || submittingKey === `delete-feedback-${selectedReviewFeedback.id}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                    >
                      {submittingKey === `delete-feedback-${selectedReviewFeedback.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ) : selectedReviewItem ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ready to review</div>
                    <div className="mt-2 text-xl font-semibold text-foreground">
                      {selectedReviewItem.member?.name || 'Learner submission'}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedReviewItem.assignment?.title || selectedReviewItem.submission?.assignmentTitle || 'Unlinked submission'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                    <div className="font-semibold text-foreground">No coaching note yet</div>
                    <div className="mt-2">
                      This submission is in the queue but has not been scored or coached yet. Start the review to create a rubric-backed note and decide whether it stays private, is shared, or gets resolved.
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Queue state" value={selectedReviewState?.label || 'Needs review'} />
                    <MetricCard label="Submitted" value={formatRelativeActivityLabel(selectedReviewItem.submittedAt)} />
                    <MetricCard
                      label="History"
                      value={selectedReviewItem.historyCount > 1 ? `${selectedReviewItem.historyCount} reviews` : 'First review'}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => startReviewForItem(selectedReviewItem)}
                      disabled={!canManageWorkspace}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      Start review
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (filteredReviewItems.length === 0) return;
                        const nextIndex =
                          selectedReviewItemIndex >= 0 ? Math.min(selectedReviewItemIndex + 1, filteredReviewItems.length - 1) : 0;
                        setSelectedReviewItemId(filteredReviewItems[nextIndex]?.id || null);
                      }}
                      disabled={filteredReviewItems.length <= 1}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Next learner
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Select a review"
                  helper="Choose a learner from the queue to inspect work, score it, and publish coaching feedback here."
                />
              )}
            </div>
          </div>
        </div>
      </ModalShell>
    );
  };

  const teamSelectorValue = selectedTeamId || TEAM_WORKSPACE_OVERVIEW_VALUE;
  const isBusy = loadingTeams || loadingDetail;
  const createCardDisabled = !isSignedIn || !canCreateTeams;
  const joinCardDisabled = !isSignedIn;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-5 lg:px-6">
      <div className="relative w-full max-w-6xl rounded-[1.75rem] border border-border bg-card p-6 shadow-elevated sm:p-8 lg:p-10">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-primary/20 bg-primary/10 text-primary">
            <Users className="h-10 w-10" />
          </div>

          <div className="inline-flex items-center rounded-full border border-xp/20 bg-xp/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-xp">
            Live team workspace
          </div>

          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold font-display text-foreground sm:text-4xl">
            Benchmark a cohort. Track proof of progress.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Create a pilot team, assign benchmark-first practice, and use benchmark history to see who is improving.
          </p>

          <div className="mx-auto mt-6 w-full max-w-sm text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace view</div>
            <div className="relative mt-3">
              <select
                value={teamSelectorValue}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                disabled={!isSignedIn || loadingTeams}
                className="h-12 w-full appearance-none rounded-2xl border border-border bg-background px-4 pr-11 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value={TEAM_WORKSPACE_OVERVIEW_VALUE}>
                  {loadingTeams ? 'Loading workspace...' : teams.length > 0 ? 'Workspace overview' : 'Get started'}
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {!selectedTeam ? (
            <>
              <section className="rounded-[1.5rem] border border-border bg-background p-5 text-left">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Create a team</div>
                <div className="mt-5">
                  {createCardDisabled ? (
                    <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
                      <div className="text-sm font-semibold text-primary">Teams plan required</div>
                      <div className="mt-2 text-sm leading-7 text-foreground">
                        Create workspaces with Teams, Teams Growth, or Custom.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        placeholder="Cohort or program name"
                        className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                      <select
                        value={newTeamUseCase}
                        onChange={(event) => setNewTeamUseCase(event.target.value as TeamUseCase)}
                        className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      >
                        {TEAM_USE_CASE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleCreateTeam}
                        disabled={submittingKey === 'create-team'}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submittingKey === 'create-team' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create team
                      </button>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-muted-foreground">
                    {activeTeamEntitlement
                      ? `${activeTeamEntitlement.planName}: ${teamPlanPolicy.workspaceLimit} workspace${teamPlanPolicy.workspaceLimit === 1 ? '' : 's'}, ${teamPlanPolicy.managerMembershipLimit} managed teams, ${teamPlanPolicy.seatLimit} seats per team.`
                      : `Learners can join up to ${teamPlanPolicy.learnerMembershipLimit} active teams. Upgrade to create and manage team workspaces.`}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-border bg-background p-5 text-left">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Join with invite code</div>
                <div className="mt-5">
                  <input
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    placeholder="CODH-ABC123"
                    className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                  <button
                    type="button"
                    onClick={handleJoinTeam}
                    disabled={joinCardDisabled || submittingKey === 'join-team'}
                    className="mt-3 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingKey === 'join-team' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    Join team
                  </button>
                  <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                    {joinCardDisabled
                      ? 'Sign in first, then use the invite code you received.'
                      : `Learners can join up to ${teamPlanPolicy.learnerMembershipLimit} active teams. Staff roles unlock higher limits based on the team plan.`}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="rounded-[1.5rem] border border-border bg-background p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Management</div>
                    <div className="mt-2 text-xl font-bold font-display text-foreground">{selectedTeam.name}</div>
                  </div>
                  <StatusPill tone="success">{selectedTeam.useCase.replace('-', ' ')}</StatusPill>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill>{workspaceCounts.members} members</StatusPill>
                  <StatusPill>{selectedTeam.seatLimit} seat cap</StatusPill>
                  <StatusPill>{workspaceCounts.assignments} assignments</StatusPill>
                  <StatusPill>{workspaceCounts.feedback} reviews</StatusPill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <ActionButton
                    title="Members"
                    value={canManageMembers ? 'Roles, status, removals' : `${workspaceCounts.members} in workspace`}
                    onClick={() => openModal('members')}
                    icon={<Users className="h-5 w-5" />}
                  />
                  <ActionButton
                    title="Assignments"
                    value={
                      canManageWorkspace
                        ? `${workspaceCounts.assignments}/${selectedTeamPlanPolicy.assignmentLimit} active`
                        : `${workspaceCounts.assignments} assigned`
                    }
                    onClick={() => openModal('assignments')}
                    icon={<Plus className="h-5 w-5" />}
                  />
                  <ActionButton
                    title="Feedback"
                    value={canManageWorkspace ? 'Grade and coach' : `${workspaceCounts.feedback} feedback items`}
                    onClick={() => openModal('feedback')}
                    icon={<ShieldCheck className="h-5 w-5" />}
                  />
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  {canManageWorkspace
                    ? 'Admin and coach tools stay inside focused modals to keep this workspace clean.'
                    : 'You can view the workspace and use any access your team role allows.'}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-border bg-background p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operations</div>
                    <div className="mt-2 text-xl font-bold font-display text-foreground">Run invites, reporting, and analytics.</div>
                  </div>
                  {teamDetail?.team.isPublic ? <StatusPill tone="success">Proof live</StatusPill> : <StatusPill tone="warn">Proof offline</StatusPill>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill>{workspaceCounts.invites} invites</StatusPill>
                  <StatusPill>{teamDetail?.metrics.benchmarkCompletionRate || 0}% completion</StatusPill>
                  <StatusPill>{teamDetail?.metrics.medianScore ?? '--'} median</StatusPill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <ActionButton
                    title="Access"
                    value={
                      canManageWorkspace
                        ? `Create and edit access (${selectedTeamPlanPolicy.inviteMaxUses} max uses)`
                        : `${workspaceCounts.invites} issued`
                    }
                    onClick={() => openModal('invites')}
                    icon={<Copy className="h-5 w-5" />}
                  />
                  <ActionButton
                    title="Analytics"
                    value={canAccessAdvancedAnalytics ? 'Company and cohort signals' : 'Unlock with Teams Growth'}
                    onClick={() => openModal('analytics')}
                    disabled={!canAccessAdvancedAnalytics}
                    icon={<BarChart3 className="h-5 w-5" />}
                  />
                  <ActionButton
                    title="Reports"
                    value={canAccessCsvExport ? 'Export and publish proof' : 'JSON export and proof page'}
                    onClick={() => openModal('reports')}
                    icon={<FileOutput className="h-5 w-5" />}
                  />
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  {selectedTeamPlanPolicy.supportsAdvancedAnalytics
                    ? 'Benchmarks, feedback, and exports are kept in one place without adding more dashboard clutter.'
                    : 'Teams includes one cohort with core workspace tools. Upgrade to Teams Growth for expanded analytics and CSV reporting.'}
                </div>
              </section>
            </>
          )}
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isBusy ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-card">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing workspace
            </div>
          </div>
        ) : null}
      </div>

      {activeModal === 'members' && teamDetail ? (
        <ModalShell
          title="Team members"
          subtitle="Search, filter, and manage access."
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-4">
            {teamDetail.members.length === 0 ? (
              <EmptyState title="No members yet" helper="Invite learners first, then promote members if needed." />
            ) : (
              <>
                <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={memberSearchQuery}
                        onChange={(event) => setMemberSearchQuery(event.target.value)}
                        placeholder="Search by name or email"
                        className="h-11 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </div>
                    <select
                      value={memberRoleFilter}
                      onChange={(event) => setMemberRoleFilter(event.target.value as 'all' | TeamRole)}
                      className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    >
                      <option value="all">All roles</option>
                      <option value="owner">Owners</option>
                      <option value="admin">Admins</option>
                      <option value="coach">Coaches</option>
                      <option value="learner">Learners</option>
                    </select>
                    <select
                      value={memberActivityFilter}
                      onChange={(event) => setMemberActivityFilter(event.target.value as MemberActivityFilter)}
                      className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    >
                      {MEMBER_ACTIVITY_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusPill>{membersModalStats.total} members</StatusPill>
                    <StatusPill tone="success">{membersModalStats.activeNow} active now</StatusPill>
                    <StatusPill>{membersModalStats.managers} managers</StatusPill>
                    <StatusPill>{membersModalStats.learners} learners</StatusPill>
                    {filteredMembers.length !== membersModalStats.total ? (
                      <StatusPill tone="warn">{filteredMembers.length} shown</StatusPill>
                    ) : null}
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <EmptyState title="No members match these filters" helper="Clear the search or filter controls to see the whole team." />
                ) : (
                  <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
                    {filteredMembers.map((member) => {
                const draft = memberDrafts[member.userId] || { role: member.role };
                const saveKey = `save-member-${member.userId}`;
                const removeKey = `remove-member-${member.userId}`;
                const isOwner = member.role === 'owner';
                const canEditThisMember =
                  canManageMembers && !isOwner && (currentRole === 'owner' || member.role !== 'admin');
                const activityIndicator = getMemberActivityIndicator(member.lastActiveAt, {
                  isCurrentlyActive: member.isCurrentlyActive,
                  isCurrentUser: member.userId === user?.id,
                });
                const memberRoleOptions =
                  currentRole === 'owner'
                    ? TEAM_ROLE_OPTIONS
                    : TEAM_ROLE_OPTIONS.filter((option) => option.value !== 'admin');
                const showRoleEditor = (currentRole === 'owner' || currentRole === 'admin') && canEditThisMember;

                return (
                  <div
                    key={member.userId}
                    className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/25 hover:bg-card"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold text-foreground sm:text-xl">{member.name}</div>
                        <div className="mt-1 text-base text-muted-foreground">{member.email || 'No email saved'}</div>
                        <div className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Joined {formatDateLabel(member.joinedAt)}
                        </div>
                      </div>

                      <div
                        className={`grid gap-3 sm:grid-cols-2 lg:min-w-[520px] ${
                          showRoleEditor ? 'lg:grid-cols-[1fr_170px_auto]' : 'lg:grid-cols-[1fr_170px]'
                        }`}
                      >
                        {showRoleEditor ? (
                          <select
                            value={draft.role}
                            onChange={(event) => {
                              const nextRole = event.target.value as MemberDraft['role'];
                              if (nextRole === member.role) {
                                setMemberDrafts((current) => ({
                                  ...current,
                                  [member.userId]: {
                                    ...draft,
                                    role: nextRole,
                                  },
                                }));
                                return;
                              }

                              setMemberDrafts((current) => ({
                                ...current,
                                [member.userId]: {
                                  ...draft,
                                  role: nextRole,
                                },
                              }));
                              requestRoleChange(member, nextRole);
                            }}
                            disabled={submittingKey === saveKey}
                            className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40 disabled:opacity-60"
                          >
                            {isOwner ? <option value="owner">Owner</option> : null}
                            {memberRoleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex h-11 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground">
                            {formatTeamRoleLabel(member.role)}
                          </div>
                        )}
                        <div
                          title={`${activityIndicator.description} • ${activityIndicator.label}`}
                          className="flex h-11 items-center justify-start gap-3 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground"
                        >
                          <span className={`h-3.5 w-3.5 rounded-full ${activityIndicator.className}`} />
                          <span className="truncate">{activityIndicator.label}</span>
                        </div>
                        {showRoleEditor ? (
                          <button
                            type="button"
                            onClick={() => requestRemoveMember(member)}
                            disabled={submittingKey === removeKey}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                          >
                            {submittingKey === removeKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </ModalShell>
      ) : null}

      {renderAssignmentsModal()}

      {activeModal === 'invites' && teamDetail ? (
        <ModalShell
          title="Access"
          subtitle="Choose how people join, review pending requests, and manage invite codes."
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Join settings</div>
                <div className="mt-4 space-y-3">
                  <select
                    value={joinSettingsDraft.joinMode}
                    onChange={(event) =>
                      setJoinSettingsDraft((current) => ({
                        ...current,
                        joinMode: event.target.value as TeamJoinMode,
                        allowedEmailDomain: event.target.value === 'code_domain' ? current.allowedEmailDomain : '',
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  >
                    {TEAM_JOIN_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    {TEAM_JOIN_MODE_OPTIONS.find((option) => option.value === joinSettingsDraft.joinMode)?.helper}
                  </div>
                  {joinSettingsDraft.joinMode === 'code_domain' ? (
                    <input
                      value={joinSettingsDraft.allowedEmailDomain}
                      onChange={(event) =>
                        setJoinSettingsDraft((current) => ({ ...current, allowedEmailDomain: event.target.value }))
                      }
                      placeholder="school.edu"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSaveJoinSettings}
                    disabled={!canManageMembers || submittingKey === 'save-join-settings'}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submittingKey === 'save-join-settings' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save access mode
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">{inviteDraft.id ? 'Edit invite' : 'Create invite'}</div>
                <div className="mt-4 space-y-3">
                  <input
                    value={inviteDraft.label}
                    onChange={(event) => setInviteDraft((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Invite label"
                    className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                  <input
                    value={inviteDraft.email}
                    onChange={(event) => setInviteDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Optional email"
                    className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    All invites start as <span className="font-semibold text-foreground">Learner</span>. Owners and admins can promote members later.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={inviteDraft.maxUses}
                      onChange={(event) =>
                        setInviteDraft((current) => ({
                          ...current,
                          maxUses: sanitizeIntegerDraftValue(event.target.value),
                        }))
                      }
                      onBlur={() =>
                        setInviteDraft((current) => ({
                          ...current,
                          maxUses: clampInviteDraftField(
                            current.maxUses,
                            Math.min(25, selectedTeamInviteUsesCap),
                            TEAM_INVITE_MIN_USES,
                            selectedTeamInviteUsesCap
                          ),
                        }))
                      }
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={`Max uses (1-${selectedTeamInviteUsesCap})`}
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                    <input
                      value={inviteDraft.expiresInDays}
                      onChange={(event) =>
                        setInviteDraft((current) => ({
                          ...current,
                          expiresInDays: sanitizeIntegerDraftValue(event.target.value),
                        }))
                      }
                      onBlur={() =>
                        setInviteDraft((current) => ({
                          ...current,
                          expiresInDays: clampInviteDraftField(
                            current.expiresInDays,
                            14,
                            TEAM_INVITE_MIN_EXPIRES_DAYS,
                            TEAM_INVITE_MAX_EXPIRES_DAYS
                          ),
                        }))
                      }
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Expires in days (1-90)"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>Invite uses are limited to {TEAM_INVITE_MIN_USES}-{selectedTeamInviteUsesCap} on this plan.</div>
                    <div>Expiry must stay within {TEAM_INVITE_MIN_EXPIRES_DAYS}-{TEAM_INVITE_MAX_EXPIRES_DAYS} days.</div>
                  </div>
                  {inviteDraft.id ? (
                    <select
                      value={inviteDraft.status}
                      onChange={(event) =>
                        setInviteDraft((current) => ({ ...current, status: event.target.value as TeamInvite['status'] }))
                      }
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveInvite}
                      disabled={!canManageWorkspace || submittingKey === 'save-invite'}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {submittingKey === 'save-invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {inviteDraft.id ? 'Save invite' : 'Create invite'}
                    </button>
                    {inviteDraft.id ? (
                      <button
                        type="button"
                        onClick={resetInviteDraft}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Pending join requests</div>
                <div className="mt-4 space-y-3">
                  {teamDetail.joinRequests.filter((request) => request.status === 'pending').length === 0 ? (
                    <EmptyState title="No requests yet" helper="Approval-mode requests show up here for owners and admins." />
                  ) : (
                    teamDetail.joinRequests
                      .filter((request) => request.status === 'pending')
                      .map((request) => {
                        const approveKey = `approved-join-request-${request.id}`;
                        const denyKey = `denied-join-request-${request.id}`;
                        return (
                          <div key={request.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground">{request.userName}</div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {request.userEmail || 'No public email'} {request.inviteCode ? `• ${request.inviteCode}` : ''}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <StatusPill>{request.requestedRole}</StatusPill>
                                  <StatusPill>{formatDateLabel(request.requestedAt)}</StatusPill>
                                  {request.inviteLabel ? <StatusPill>{request.inviteLabel}</StatusPill> : null}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReviewJoinRequest(request, 'approved')}
                                  disabled={!canManageMembers || submittingKey === approveKey}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                                >
                                  {submittingKey === approveKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewJoinRequest(request, 'denied')}
                                  disabled={!canManageMembers || submittingKey === denyKey}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                                >
                                  {submittingKey === denyKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                  Deny
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Invite codes</div>
                <div className="mt-4 space-y-4">
                  {teamDetail.invites.length === 0 ? (
                    <EmptyState title="No invites yet" helper="Create learner invites here, then promote members after they join." />
                  ) : (
                    teamDetail.invites.map((invite) => {
                      const deleteKey = `delete-invite-${invite.id}`;
                      return (
                        <div key={invite.id} className="rounded-2xl border border-border bg-background p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">{invite.label}</div>
                              <div className="mt-2 text-sm text-muted-foreground">{invite.email || 'No email attached'}</div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <StatusPill>{invite.code}</StatusPill>
                                <StatusPill>{invite.role}</StatusPill>
                                <StatusPill>{invite.useCount}/{invite.maxUses} used</StatusPill>
                                <StatusPill>{invite.status}</StatusPill>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  const copied = await copyTextToClipboard(invite.code);
                                  toast[copied ? 'success' : 'error'](copied ? 'Invite code copied.' : 'Could not copy invite code.');
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={() => startInviteEdit(invite)}
                                disabled={!canManageWorkspace || (currentRole === 'coach' && invite.role !== 'learner')}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInvite(invite.id)}
                                disabled={
                                  !canManageWorkspace ||
                                  submittingKey === deleteKey ||
                                  (currentRole === 'coach' && invite.role !== 'learner')
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                              >
                                {submittingKey === deleteKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {renderFeedbackModal()}

      {activeModal === 'analytics' && teamDetail ? (
        <ModalShell
          title="Company analytics"
          subtitle="Operational team signal beyond the base workspace metrics."
          onClose={() => setActiveModal(null)}
        >
          {submittingKey === 'analytics' && !teamAnalytics ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading analytics
              </div>
            </div>
          ) : teamAnalytics ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Score bands</div>
                <div className="mt-4 space-y-3">
                  {teamAnalytics.scoreBands.map((band) => (
                    <div key={band.label} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                      <span className="text-foreground">{band.label}</span>
                      <span className="font-semibold text-primary">{band.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Role distribution</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(teamAnalytics.roleDistribution).map(([role, count]) => (
                    <div key={role} className="rounded-2xl border border-border bg-card px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{role}</div>
                      <div className="mt-2 text-2xl font-bold font-display text-foreground">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Recency and assignment health</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Recent / warm / stale</div>
                    <div className="mt-2 text-sm text-foreground">{teamAnalytics.recency.recent} recent, {teamAnalytics.recency.warm} warm, {teamAnalytics.recency.stale} stale</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Assignments</div>
                    <div className="mt-2 text-sm text-foreground">
                      {teamAnalytics.assignmentStats.active} active • {teamAnalytics.assignmentStats.pastDue} past due • {teamAnalytics.assignmentStats.archived} archived
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {teamAnalytics.assignmentStats.averageCompletionRate}% average completion
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Invites</div>
                    <div className="mt-2 text-sm text-foreground">{teamAnalytics.inviteStats.active} active • {teamAnalytics.inviteStats.uses} uses</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Feedback</div>
                    <div className="mt-2 text-sm text-foreground">{teamAnalytics.feedbackStats.total} total • {teamAnalytics.feedbackStats.shared} shared</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Benchmarks and streaks</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Average benchmark</div>
                    <div className="mt-2 text-2xl font-bold font-display text-foreground">{teamAnalytics.benchmarkStats.average ?? '--'}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Median benchmark</div>
                    <div className="mt-2 text-2xl font-bold font-display text-foreground">{teamAnalytics.benchmarkStats.median ?? '--'}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Completion rate</div>
                    <div className="mt-2 text-2xl font-bold font-display text-foreground">{teamAnalytics.benchmarkStats.completionRate}%</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-primary">Highest streak</div>
                    <div className="mt-2 text-2xl font-bold font-display text-foreground">{teamAnalytics.streakStats.highest}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Analytics unavailable" helper="Load analytics again after the workspace sync finishes." />
          )}
        </ModalShell>
      ) : null}

      {activeModal === 'reports' && teamDetail ? (
        <ModalShell
          title="Reports and proof"
          subtitle="Export the workspace and control the public proof page."
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">Export reporting</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                  disabled={!canManageWorkspace || submittingKey === 'export-json'}
                  className="inline-flex min-h-[112px] flex-col items-start justify-between rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-secondary disabled:opacity-60"
                >
                  <Download className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">JSON export</div>
                    <div className="mt-2 text-sm text-foreground">Full team payload for reporting pipelines.</div>
                  </div>
                </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    disabled={!canManageWorkspace || !canAccessCsvExport || submittingKey === 'export-csv'}
                    className="inline-flex min-h-[112px] flex-col items-start justify-between rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-secondary disabled:opacity-60"
                  >
                    <Download className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">CSV export</div>
                      <div className="mt-2 text-sm text-foreground">
                        {canAccessCsvExport
                          ? 'Clean spreadsheet output for instructors and managers.'
                          : 'Unlock with Teams Growth or Custom.'}
                      </div>
                    </div>
                  </button>
                </div>
                {!canAccessCsvExport ? (
                  <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    JSON export is included here. CSV export unlocks with Teams Growth or Custom.
                  </div>
                ) : null}
              </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">Public proof page</div>
              <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                {teamDetail.team.isPublic ? 'This cohort proof page is live.' : 'Publish a proof page when you are ready to share results.'}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleToggleSharing}
                  disabled={!canPublishProof || submittingKey === 'share-team'}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {submittingKey === 'share-team' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {teamDetail.team.isPublic ? 'Unpublish proof page' : 'Publish proof page'}
                </button>
                {teamDetail.team.isPublic && sharedProofUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const copied = await copyTextToClipboard(sharedProofUrl);
                        toast[copied ? 'success' : 'error'](copied ? 'Proof link copied.' : 'Could not copy proof link.');
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      <Copy className="h-4 w-4" />
                      Copy link
                    </button>
                    <a
                      href={sharedProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open page
                    </a>
                  </>
                ) : null}
              </div>
              {!canPublishProof ? (
                <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  Only owners and admins can publish or unpublish the public proof page.
                </div>
              ) : null}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {confirmMemberAction ? (
        <ConfirmActionDialog
          title={
            confirmMemberAction.type === 'role'
              ? `Change ${confirmMemberAction.member.name}'s role?`
              : `Remove ${confirmMemberAction.member.name}?`
          }
          description={
            confirmMemberAction.type === 'role'
              ? `${confirmMemberAction.member.name} will change from ${formatTeamRoleLabel(
                  confirmMemberAction.member.role
                )} to ${formatTeamRoleLabel(confirmMemberAction.nextRole)}.`
              : `${confirmMemberAction.member.name} will lose access to this team workspace.`
          }
          confirmLabel={confirmMemberAction.type === 'role' ? 'Confirm role change' : 'Confirm removal'}
          tone={confirmMemberAction.type === 'remove' ? 'destructive' : 'default'}
          busy={
            submittingKey === `save-member-${confirmMemberAction.member.userId}` ||
            submittingKey === `remove-member-${confirmMemberAction.member.userId}`
          }
          onCancel={handleCancelMemberAction}
          onConfirm={() => void handleConfirmMemberAction()}
        />
      ) : null}
      {confirmWorkspaceAction ? (
        <ConfirmActionDialog
          title={
            confirmWorkspaceAction.type === 'assignment_archive'
              ? `Archive ${confirmWorkspaceAction.assignment.title}?`
              : `Delete feedback for ${confirmWorkspaceAction.entry.memberName}?`
          }
          description={
            confirmWorkspaceAction.type === 'assignment_archive'
              ? 'This assignment will move to Archived and stop counting against the active assignment limit.'
              : 'This coaching note will be removed from the grading history.'
          }
          confirmLabel={confirmWorkspaceAction.type === 'assignment_archive' ? 'Confirm archive' : 'Confirm delete'}
          tone={confirmWorkspaceAction.type === 'assignment_archive' ? 'default' : 'destructive'}
          busy={
            confirmWorkspaceAction.type === 'assignment_archive'
              ? submittingKey === `delete-assignment-${confirmWorkspaceAction.assignment.id}`
              : submittingKey === `delete-feedback-${confirmWorkspaceAction.entry.id}`
          }
          onCancel={handleCancelWorkspaceAction}
          onConfirm={() => void handleConfirmWorkspaceAction()}
        />
      ) : null}
    </div>
  );
};

export default TeamsWorkspace;

