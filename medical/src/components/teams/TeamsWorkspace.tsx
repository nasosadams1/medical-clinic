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
  deleteTeamFeedback,
  deleteTeamInvite,
  exportTeamReport,
  fetchTeamAnalytics,
  getTeamsCapabilities,
  getTeamWorkspace,
  joinTeamByCode,
  listTeams,
  removeTeamMember,
  reviewTeamJoinRequest,
  shareTeamWorkspace,
  TeamAnalytics,
  TeamAssignment,
  TeamAssignmentType,
  TeamCapabilities,
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
  duplicateTeamAssignment,
  unshareTeamWorkspace,
  createTeamSubmission,
  updateTeamAssignment,
  updateTeamFeedback,
  updateTeamInvite,
  updateTeamJoinSettings,
  updateTeamMember,
  updateTeamSubmission,
} from '../../lib/teams';
import {
  formatBenchmarkLanguageLabel as formatAssignmentLanguageLabel,
  getAssignmentAuditSummary,
  getAssignmentOperationalSignal,
  getAssignmentScopeLabelFromSnapshot,
  getTeamAssignmentTypeLabel,
} from '../../../shared/team-assignments.js';
import { getAssignmentDisplayTitle } from '../../../shared/team-assignments-ui-contract.js';
import {
  ActionButton,
  COACHING_STARTERS,
  ConfirmActionDialog,
  EmptyState,
  FormField,
  MetricCard,
  ModalShell,
  ReviewField,
  ReviewStatePill,
  RubricScoreControl,
  StatusPill,
} from './reviewUi';
import { GradeAndCoachModal, GradeAndCoachReviewSidebar } from './gradeAndCoachUi';
import { AssignmentDraft, createAssignmentDraftFromTemplate, emptyAssignmentDraft } from './assignments/model';
import { AssignmentsWorkspace } from './assignments/AssignmentsWorkspace';
import {
  AssignmentDueInputState,
  assignmentDueAtInputToIsoOrNull,
  EMPTY_ASSIGNMENT_DUE_INPUT_STATE,
  formatAssignmentDueAtInput,
  getAssignmentDraftValidation,
  getAssignmentDueInputStateFromValue,
} from './assignments/editorContract';

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
type FeedbackVisibilityFilter = 'all' | 'shared' | 'private';
type FeedbackSortOption = 'recent' | 'score' | 'learner';
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
      assignment: Pick<TeamAssignment, 'id' | 'title'>;
    }
  | {
      type: 'assignment_delete';
      assignments: Array<Pick<TeamAssignment, 'id' | 'title'>>;
    }
  | {
      type: 'feedback_delete';
      entry: TeamFeedback;
    };

type FeedbackDiscardPrompt = null | {
  title: string;
  description: string;
  confirmLabel: string;
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

const TEAM_JOIN_MODE_META: Record<
  TeamJoinMode,
  {
    riskLabel: string;
    tone: 'default' | 'warn' | 'success';
    summary: string;
    audienceLabel: string;
    audienceHelper: string;
    approvalLabel: string;
    approvalHelper: string;
    exposureValue: string;
    exposureHelper: string;
  }
> = {
  open_code: {
    riskLabel: 'Higher exposure',
    tone: 'warn',
    summary: 'Anyone holding a live code can join immediately, so code sharing needs tighter operational discipline.',
    audienceLabel: 'Anyone with an active code',
    audienceHelper: 'Best for tightly controlled cohorts where codes are shared directly by the team.',
    approvalLabel: 'No approval step',
    approvalHelper: 'The join happens as soon as the code is accepted.',
    exposureValue: 'Instant code join',
    exposureHelper: 'Fastest path in, but the code itself is the gate.',
  },
  code_domain: {
    riskLabel: 'Domain guarded',
    tone: 'default',
    summary: 'Codes still move quickly, but the final join is limited to signed-in users on one approved email domain.',
    audienceLabel: 'Users with a live code and the right domain',
    audienceHelper: 'Useful for schools and internal teams where the email boundary is part of the access policy.',
    approvalLabel: 'No approval step',
    approvalHelper: 'The domain check is the gate before the member lands in the workspace.',
    exposureValue: 'Code + domain check',
    exposureHelper: 'Adds a second guard without creating an approval queue.',
  },
  code_approval: {
    riskLabel: 'Approval queue',
    tone: 'default',
    summary: 'Invite codes create requests instead of direct joins, so owners and admins can control who actually enters the workspace.',
    audienceLabel: 'Anyone with a live code can request access',
    audienceHelper: 'Best when coaches want to keep code sharing easy but still hold the final approval.',
    approvalLabel: 'Owner or admin approval',
    approvalHelper: 'Every code join waits in the request queue until someone approves it.',
    exposureValue: 'Code starts a request',
    exposureHelper: 'Most reviewable code-based mode.',
  },
  invite_only: {
    riskLabel: 'Tightest access',
    tone: 'success',
    summary: 'Only direct invites are accepted, which keeps the join surface small and makes invite ownership more explicit.',
    audienceLabel: 'Only invited people',
    audienceHelper: 'Best when the workspace is small and membership changes should stay fully intentional.',
    approvalLabel: 'No open request path',
    approvalHelper: 'Access is granted by issuing a direct invite, not by reviewing code joins later.',
    exposureValue: 'Direct invite only',
    exposureHelper: 'Smallest exposure surface for access control.',
  },
};

const MEMBER_ACTIVITY_FILTER_OPTIONS: Array<{ value: MemberActivityFilter; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'active_now', label: 'Active now' },
  { value: 'last_24h', label: 'Last 24 hours' },
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'inactive', label: 'Inactive' },
];

const FEEDBACK_VISIBILITY_FILTER_OPTIONS: Array<{ value: FeedbackVisibilityFilter; label: string }> = [
  { value: 'all', label: 'All visibility' },
  { value: 'shared', label: 'Shared' },
  { value: 'private', label: 'Private' },
];

const FEEDBACK_RUBRIC_FIELDS: Array<{
  field: keyof FeedbackRubricDraft;
  label: string;
  helper: string;
}> = [
  {
    field: 'correctness',
    label: 'Correctness',
    helper: 'Did the solution actually solve the task?',
  },
  {
    field: 'codeQuality',
    label: 'Code quality',
    helper: 'Was the code clear, structured, and maintainable?',
  },
  {
    field: 'problemSolving',
    label: 'Problem solving',
    helper: 'Did the learner choose a sound approach and adjust well?',
  },
  {
    field: 'communication',
    label: 'Communication',
    helper: 'Can another person understand the thinking and output?',
  },
];

const MANUAL_FEEDBACK_RUBRIC_FIELDS: Array<{
  field: keyof FeedbackRubricDraft;
  label: string;
  helper: string;
}> = [
  {
    field: 'correctness',
    label: 'Clarity',
    helper: 'Is the learner’s current thinking clear enough to coach directly?',
  },
  {
    field: 'codeQuality',
    label: 'Consistency',
    helper: 'Does the current work show repeatable habits instead of one-off guesses?',
  },
  {
    field: 'problemSolving',
    label: 'Reasoning',
    helper: 'Is there a sound approach behind the attempt, even if it is still rough?',
  },
  {
    field: 'communication',
    label: 'Next-step readiness',
    helper: 'Can you point to one clear next move the learner is ready to execute?',
  },
];

const FEEDBACK_WORKFLOW_OPTIONS: Array<{
  value: 'draft' | 'shared' | 'resolved';
  label: string;
  helper: string;
}> = [
  {
    value: 'draft',
    label: 'Save draft',
    helper: 'Keep the note private while you tighten it.',
  },
  {
    value: 'shared',
    label: 'Share to learner',
    helper: 'Publish the learner-facing note right now.',
  },
  {
    value: 'resolved',
    label: 'Mark resolved',
    helper: 'Close the coaching pass after the note is ready.',
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

const serializeFeedbackComposerSnapshot = (input: {
  feedbackDraft: FeedbackDraft;
  feedbackRubricDraft: FeedbackRubricDraft;
  submissionAttachmentMode: SubmissionAttachmentMode;
  selectedSubmissionId: string | null;
  submissionDraft: SubmissionDraft;
}) =>
  JSON.stringify({
    feedbackDraft: input.feedbackDraft,
    feedbackRubricDraft: input.feedbackRubricDraft,
    submissionAttachmentMode: input.submissionAttachmentMode,
    selectedSubmissionId: input.selectedSubmissionId,
    submissionDraft: input.submissionDraft,
  });

const EMPTY_FEEDBACK_COMPOSER_SNAPSHOT = serializeFeedbackComposerSnapshot({
  feedbackDraft: emptyFeedbackDraft(),
  feedbackRubricDraft: emptyFeedbackRubricDraft(),
  submissionAttachmentMode: 'none',
  selectedSubmissionId: null,
  submissionDraft: emptySubmissionDraft(),
});

const ENGLISH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const ENGLISH_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return ENGLISH_DATE_FORMATTER.format(parsed);
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

const isOlderThanHours = (value: string | null | undefined, hours: number) => {
  if (!value) return false;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  return Date.now() - parsed.getTime() >= hours * 60 * 60 * 1000;
};

const formatAssignmentTypeLabel = (assignmentType: TeamAssignmentType) => {
  return getTeamAssignmentTypeLabel(assignmentType);
};

const formatBenchmarkLanguageLabel = (language: TeamAssignment['benchmarkLanguage']) => {
  return formatAssignmentLanguageLabel(language);
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
  return ENGLISH_DATE_TIME_FORMATTER.format(parsed);
};

const formatAnalyticsScore = (value: number | null | undefined) =>
  typeof value === 'number' ? `${value}/100` : '--';

const formatAnalyticsDelta = (value: number | null | undefined) => {
  if (typeof value !== 'number') return 'No baseline yet';
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
};

const getAnalyticsToneClassName = (tone: 'critical' | 'watch' | 'positive') =>
  tone === 'critical'
    ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
    : tone === 'watch'
    ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';

const getAnalyticsSurfaceClassName = (tone: 'critical' | 'watch' | 'positive') =>
  tone === 'critical'
    ? 'border-rose-500/20 bg-rose-500/[0.07]'
    : tone === 'watch'
    ? 'border-amber-400/20 bg-amber-400/[0.06]'
    : 'border-emerald-500/20 bg-emerald-500/[0.06]';

const getAnalyticsStatusTone = (tone: 'critical' | 'watch' | 'positive'): 'danger' | 'warn' | 'success' =>
  tone === 'critical' ? 'danger' : tone === 'watch' ? 'warn' : 'success';

const getAnalyticsTrendToneClassName = (status: TeamAnalytics['trend']['status']) =>
  status === 'up'
    ? 'text-emerald-300'
    : status === 'down'
    ? 'text-rose-300'
    : status === 'flat'
    ? 'text-amber-200'
    : 'text-muted-foreground';

const getAnalyticsTrendBarHeight = (value: number | null) => {
  if (typeof value !== 'number') return 12;
  return Math.max(14, Math.round((value / 100) * 72));
};

const formatAnalyticsTrendHeadline = (
  status: TeamAnalytics['trend']['status'],
  deltaFromPrevious: number | null
) => {
  if (status === 'up' && typeof deltaFromPrevious === 'number') {
    return `+${deltaFromPrevious} vs previous tracked week`;
  }
  if (status === 'down' && typeof deltaFromPrevious === 'number') {
    return `${Math.abs(deltaFromPrevious)} down vs previous tracked week`;
  }
  if (status === 'flat') {
    return 'No lift vs previous tracked week';
  }
  return 'Need one more comparable benchmark';
};

const getAverageValue = (values: number[]) => {
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

const getMedianValue = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
  }
  return sorted[midpoint];
};

const isOlderThanDays = (value: string | null | undefined, days: number) => {
  if (!value) return true;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return true;
  return Date.now() - parsed >= days * 24 * 60 * 60 * 1000;
};

const isDueWithinDays = (value: string | null | undefined, days: number) => {
  if (!value) return false;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return false;
  const now = Date.now();
  return parsed >= now && parsed <= now + days * 24 * 60 * 60 * 1000;
};

const isRenderableTeamAnalytics = (value: TeamAnalytics | null | undefined): value is TeamAnalytics =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'summary' in value &&
      typeof (value as TeamAnalytics).summary?.needsReviewNow === 'number'
  );

const buildFallbackTeamAnalytics = (detail: TeamWorkspaceDetail): TeamAnalytics => {
  const learnerMembers = detail.members.filter((member) => member.role === 'learner' && member.status === 'active');
  const benchmarkedLearners = learnerMembers.filter((member) => typeof member.latestBenchmarkScore === 'number');
  const noBenchmarkYet = learnerMembers.length - benchmarkedLearners.length;
  const averageLatestScore = getAverageValue(
    benchmarkedLearners.map((member) => Number(member.latestBenchmarkScore || 0))
  );
  const medianLatestScore = getMedianValue(
    benchmarkedLearners.map((member) => Number(member.latestBenchmarkScore || 0))
  );
  const benchmarkCoverageRate = learnerMembers.length
    ? Math.round((benchmarkedLearners.length / learnerMembers.length) * 100)
    : 0;
  const quietLearners3d = learnerMembers.filter((member) => isOlderThanDays(member.lastActiveAt, 3)).length;
  const quietLearners7d = learnerMembers.filter((member) => isOlderThanDays(member.lastActiveAt, 7)).length;
  const improvingLearners = learnerMembers.filter(
    (member) => typeof member.improvementDelta === 'number' && member.improvementDelta > 0
  ).length;
  const plateauLearners = learnerMembers.filter(
    (member) => typeof member.improvementDelta === 'number' && member.improvementDelta === 0
  ).length;
  const decliningLearners = learnerMembers.filter(
    (member) => typeof member.improvementDelta === 'number' && member.improvementDelta < 0
  ).length;
  const readyForRetake = learnerMembers.filter((member) => member.recommendedAction === 'Ready for retake').length;
  const feedbackDrafts = detail.feedback.filter((entry) => entry.status === 'draft').length;
  const feedbackResolved = detail.feedback.filter((entry) => entry.status === 'resolved').length;
  const needsReviewNow = detail.submissions.filter((entry) => entry.status === 'submitted').length;
  const needsRevision = detail.submissions.filter((entry) => entry.status === 'needs_revision').length;
  const pendingJoinRequests = detail.joinRequests.filter((request) => request.status === 'pending').length;

  const assignmentSubmissionBacklog = new Map<string, { submitted: number }>();
  detail.submissions.forEach((entry) => {
    if (!entry.assignmentId) return;
    const existing = assignmentSubmissionBacklog.get(entry.assignmentId) || { submitted: 0 };
    if (entry.status === 'submitted') {
      existing.submitted += 1;
    }
    assignmentSubmissionBacklog.set(entry.assignmentId, existing);
  });

  const pastDueAssignments = detail.assignments.filter((assignment) => assignment.lifecycleState === 'past_due').length;
  const dueNext7d = detail.assignments.filter(
    (assignment) => assignment.lifecycleState !== 'archived' && isDueWithinDays(assignment.dueAt, 7)
  ).length;
  const offTrackAssignmentIds = new Set(
    detail.assignments
      .filter((assignment) => {
        if (assignment.lifecycleState === 'archived') return false;
        if (assignment.lifecycleState === 'past_due') return true;
        return isDueWithinDays(assignment.dueAt, 7) && Number(assignment.completionRate || 0) < 60;
      })
      .map((assignment) => assignment.id)
  );

  const priorityAssignments = detail.assignments
    .filter((assignment) => assignment.lifecycleState !== 'archived')
    .map((assignment) => {
      const reviewBacklog = assignmentSubmissionBacklog.get(assignment.id)?.submitted || 0;
      const noLearnerStarted =
        assignment.eligibleLearnerCount > 0 && assignment.notStartedLearnerCount === assignment.eligibleLearnerCount;
      const dueSoon = isDueWithinDays(assignment.dueAt, 7);
      let severity = 0;
      let signal = '';
      let reason = '';

      if (assignment.lifecycleState === 'past_due') {
        severity = 4;
        signal = 'Past due';
        reason = `${assignment.completionRate}% complete with ${assignment.notStartedLearnerCount} not started.`;
      } else if (dueSoon && Number(assignment.completionRate || 0) < 60) {
        severity = 3;
        signal = 'Due soon with low completion';
        reason = `${assignment.completionRate}% complete before the due window closes.`;
      } else if (reviewBacklog > 0) {
        severity = 2;
        signal = 'Coach review backlog';
        reason = `${reviewBacklog} submission${reviewBacklog === 1 ? '' : 's'} waiting on review.`;
      } else if (noLearnerStarted) {
        severity = 1;
        signal = 'No learner has started';
        reason = `${assignment.eligibleLearnerCount} learner${assignment.eligibleLearnerCount === 1 ? '' : 's'} are in scope and none have started yet.`;
      }

      return severity > 0
        ? {
            id: assignment.id,
            title: assignment.title,
            signal,
            reason,
            dueAt: assignment.dueAt,
            completionRate: Number(assignment.completionRate || 0),
            lifecycleState: assignment.lifecycleState,
            learnerCount: assignment.eligibleLearnerCount,
            reviewBacklog,
            severity,
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      const severityDifference = right.severity - left.severity;
      if (severityDifference !== 0) return severityDifference;
      return Number(left.completionRate || 0) - Number(right.completionRate || 0);
    })
    .slice(0, 4)
    .map(({ severity, ...assignment }) => assignment);

  const priorityLearners = learnerMembers
    .map((member) => {
      const quiet7d = isOlderThanDays(member.lastActiveAt, 7);
      const quiet3d = isOlderThanDays(member.lastActiveAt, 3);
      let severity = 0;
      let tone: TeamAnalytics['priorityLearners'][number]['tone'] = 'watch';
      let signal = '';
      let reason = '';

      if (member.latestBenchmarkScore === null && quiet7d) {
        severity = 4;
        tone = 'critical';
        signal = 'No benchmark and quiet';
        reason = 'No benchmark signal yet and no workspace activity in 7+ days.';
      } else if (
        typeof member.latestBenchmarkScore === 'number' &&
        member.latestBenchmarkScore < 55 &&
        (member.improvementDelta === null || member.improvementDelta <= 0)
      ) {
        severity = 4;
        tone = 'critical';
        signal = 'Low score with no lift';
        reason = `Latest benchmark ${member.latestBenchmarkScore}/100${quiet7d ? ' and quiet for 7+ days.' : '.'}`;
      } else if (typeof member.latestBenchmarkScore === 'number' && member.latestBenchmarkScore < 55) {
        severity = 3;
        tone = 'watch';
        signal = 'Needs guided practice';
        reason = `Latest benchmark ${member.latestBenchmarkScore}/100. ${member.recommendedAction}.`;
      } else if (quiet7d) {
        severity = 2;
        tone = 'watch';
        signal = 'Quiet 7d+';
        reason = 'No workspace activity in 7+ days while active in the team.';
      } else if (member.latestBenchmarkScore === null || quiet3d) {
        severity = 1;
        tone = 'watch';
        signal = member.latestBenchmarkScore === null ? 'Needs first benchmark' : 'Quiet 3d+';
        reason =
          member.latestBenchmarkScore === null
            ? 'Still no benchmark signal for this learner.'
            : 'No recent workspace activity in the last 3 days.';
      }

      return severity > 0
        ? {
            userId: member.userId,
            name: member.name,
            signal,
            reason,
            latestScore: member.latestBenchmarkScore,
            improvementDelta: member.improvementDelta,
            lastActiveAt: member.lastActiveAt,
            recommendedAction: member.recommendedAction,
            tone,
            severity,
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      const severityDifference = right.severity - left.severity;
      if (severityDifference !== 0) return severityDifference;
      return Number(left.latestScore ?? Infinity) - Number(right.latestScore ?? Infinity);
    })
    .slice(0, 4)
    .map(({ severity, ...member }) => member);

  const trendPoints = detail.metrics.progressTimeline.map((point, index, points) => {
    const distance = points.length - index - 1;
    return {
      label: distance === 0 ? 'This week' : distance === 1 ? 'Last week' : `${distance}w ago`,
      value: point.value,
      count: point.count ?? (typeof point.value === 'number' ? 1 : 0),
    };
  });
  const latestTrendIndex = [...trendPoints].map((point) => point.value).findLastIndex((value) => typeof value === 'number');
  const previousTrendIndex =
    latestTrendIndex > 0
      ? trendPoints
          .slice(0, latestTrendIndex)
          .map((point) => point.value)
          .findLastIndex((value) => typeof value === 'number')
      : -1;
  const latestTrendValue =
    latestTrendIndex >= 0 && typeof trendPoints[latestTrendIndex]?.value === 'number'
      ? Number(trendPoints[latestTrendIndex].value)
      : null;
  const previousTrendValue =
    previousTrendIndex >= 0 && typeof trendPoints[previousTrendIndex]?.value === 'number'
      ? Number(trendPoints[previousTrendIndex].value)
      : null;
  const deltaFromPrevious =
    latestTrendValue !== null && previousTrendValue !== null ? latestTrendValue - previousTrendValue : null;
  const status: TeamAnalytics['trend']['status'] =
    deltaFromPrevious === null
      ? 'insufficient'
      : deltaFromPrevious > 0
      ? 'up'
      : deltaFromPrevious < 0
      ? 'down'
      : 'flat';
  const summary =
    status === 'up'
      ? `+${deltaFromPrevious} vs previous tracked week. The team is moving in the right direction.`
      : status === 'down'
      ? `${Math.abs(deltaFromPrevious || 0)} down vs previous tracked week. Check follow-through before the next retake.`
      : status === 'flat'
      ? 'No lift vs previous tracked week. Finish the corrective work before testing again.'
      : latestTrendValue !== null
      ? 'Useful first read, but confirm it with another comparable benchmark.'
      : 'No comparable benchmark movement yet.';

  const actionSignals: TeamAnalytics['actionSignals'] = [];
  if (needsReviewNow > 0) {
    actionSignals.push({
      title: 'Coach review backlog',
      detail: `${needsReviewNow} submission${needsReviewNow === 1 ? '' : 's'} are waiting on coach review right now.`,
      tone: 'critical',
    });
  }
  if (quietLearners7d > 0) {
    actionSignals.push({
      title: 'Quiet learners',
      detail: `${quietLearners7d} learner${quietLearners7d === 1 ? '' : 's'} have gone quiet for 7+ days.`,
      tone: 'watch',
    });
  }
  if (offTrackAssignmentIds.size > 0) {
    actionSignals.push({
      title: 'Assignments drifting',
      detail: `${offTrackAssignmentIds.size} assignment${offTrackAssignmentIds.size === 1 ? '' : 's'} are past due or due soon with low completion.`,
      tone: 'critical',
    });
  }
  if (noBenchmarkYet > 0) {
    actionSignals.push({
      title: 'Missing benchmark signal',
      detail: `${noBenchmarkYet} learner${noBenchmarkYet === 1 ? '' : 's'} still have no benchmark signal.`,
      tone: 'watch',
    });
  }
  if (!actionSignals.length) {
    actionSignals.push({
      title: 'No urgent follow-up right now',
      detail: 'The current queue is clear enough to focus on the next benchmark and coaching loop.',
      tone: 'positive',
    });
  }

  const activeAssignments = detail.assignments.filter((assignment) => assignment.lifecycleState !== 'archived').length;
  const onTrackAssignments = Math.max(0, activeAssignments - offTrackAssignmentIds.size);
  const highlights: TeamAnalytics['highlights'] = [];
  if (readyForRetake > 0) {
    highlights.push({
      title: 'Retake-ready learners',
      detail: `${readyForRetake} learner${readyForRetake === 1 ? '' : 's'} are ready for a benchmark retake after corrective work.`,
    });
  }
  if (improvingLearners > 0) {
    highlights.push({
      title: 'Scores are lifting',
      detail: `${improvingLearners} learner${improvingLearners === 1 ? '' : 's'} have a positive benchmark delta from their earlier baseline.`,
    });
  }
  if (onTrackAssignments > 0) {
    highlights.push({
      title: 'Assignments still moving',
      detail: `${onTrackAssignments} active assignment${onTrackAssignments === 1 ? '' : 's'} are not showing risk signals right now.`,
    });
  }
  if (feedbackResolved > 0) {
    highlights.push({
      title: 'Coaching loops resolved',
      detail:
        feedbackResolved === 1
          ? '1 coaching note has already been closed cleanly.'
          : `${feedbackResolved} coaching notes have already been closed cleanly.`,
    });
  }
  if (!highlights.length) {
    highlights.push({
      title: 'No stable positive signal yet',
      detail: 'The team needs a fuller benchmark and coaching loop before momentum is clear.',
    });
  }

  return {
    summary: {
      needsReviewNow,
      quietLearners7d,
      offTrackAssignments: offTrackAssignmentIds.size,
      medianLatestScore,
      benchmarkCoverageRate,
      benchmarkedLearners: benchmarkedLearners.length,
      totalLearners: learnerMembers.length,
    },
    health: {
      activeLearners: learnerMembers.length,
      noBenchmarkYet,
      dueNext7d,
      pastDueAssignments,
      pendingJoinRequests,
    },
    movement: {
      averageLatestScore,
      medianLatestScore,
      improvingLearners,
      plateauLearners,
      decliningLearners,
      readyForRetake,
      averageImprovement: detail.metrics.averageImprovement,
    },
    workflow: {
      needsReviewNow,
      needsRevision,
      feedbackDrafts,
      feedbackResolved,
      quietLearners3d,
      quietLearners7d,
      offTrackAssignments: offTrackAssignmentIds.size,
    },
    trend: {
      points: trendPoints,
      deltaFromPrevious,
      status,
      summary,
    },
    actionSignals: actionSignals.slice(0, 3),
    priorityLearners,
    priorityAssignments,
    highlights: highlights.slice(0, 3),
  };
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

const hasCompleteRubricBreakdown = (breakdown: TeamRubricBreakdown | null | undefined) =>
  Boolean(
    breakdown &&
      [breakdown.correctness, breakdown.codeQuality, breakdown.problemSolving, breakdown.communication].every(
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

const getDaysUntil = (value: string | null | undefined) => {
  if (!value) return '14';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '14';
  const diff = parsed.getTime() - Date.now();
  return String(Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24))));
};

const formatInviteExpiryLabel = (value: string | null | undefined) => {
  if (!value) return 'No expiry';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No expiry';

  const diffDays = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return `Expired ${formatDateLabel(value)}`;
  return `${formatDateLabel(value)} • ${diffDays}d left`;
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

const TeamsWorkspace: React.FC<TeamsWorkspaceProps> = ({ mode = 'app' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasAnyTeamPlan, activeTeamEntitlement, teamPlanPolicy } = usePlanAccess();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(TEAM_WORKSPACE_OVERVIEW_VALUE);
  const [teamDetail, setTeamDetail] = useState<TeamWorkspaceDetail | null>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null);
  const [teamCapabilities, setTeamCapabilities] = useState<TeamCapabilities | null>(null);
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
  const [assignmentDueInputState, setAssignmentDueInputState] = useState<AssignmentDueInputState>(
    EMPTY_ASSIGNMENT_DUE_INPUT_STATE
  );
  const [feedbackDraft, setFeedbackDraft] = useState<FeedbackDraft>(emptyFeedbackDraft());
  const [feedbackRubricDraft, setFeedbackRubricDraft] = useState<FeedbackRubricDraft>(emptyFeedbackRubricDraft());
  const [confirmMemberAction, setConfirmMemberAction] = useState<MemberConfirmAction>(null);
  const [confirmWorkspaceAction, setConfirmWorkspaceAction] = useState<WorkspaceConfirmAction>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | TeamRole>('all');
  const [memberActivityFilter, setMemberActivityFilter] = useState<MemberActivityFilter>('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentEditorOpen, setAssignmentEditorOpen] = useState(false);
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<ReviewStatusFilter>('all');
  const [feedbackVisibilityFilter, setFeedbackVisibilityFilter] = useState<FeedbackVisibilityFilter>('all');
  const [feedbackSort, setFeedbackSort] = useState<FeedbackSortOption>('recent');
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  const [feedbackComposerOpen, setFeedbackComposerOpen] = useState(false);
  const [feedbackDiscardPrompt, setFeedbackDiscardPrompt] = useState<FeedbackDiscardPrompt>(null);
  const [submissionAttachmentMode, setSubmissionAttachmentMode] = useState<SubmissionAttachmentMode>('none');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionDraft, setSubmissionDraft] = useState<SubmissionDraft>(emptySubmissionDraft());
  const [activeFeedbackStarterId, setActiveFeedbackStarterId] = useState<string | null>(null);
  const [showAllSubmissionHistory, setShowAllSubmissionHistory] = useState(false);
  const [showAllFeedbackHistory, setShowAllFeedbackHistory] = useState(false);
  const [showAllComposerHistory, setShowAllComposerHistory] = useState(false);

  const inviteJoinHandledRef = useRef<string | null>(null);
  const feedbackComposerBaselineRef = useRef(EMPTY_FEEDBACK_COMPOSER_SNAPSHOT);
  const feedbackComposerLockedTargetRef = useRef<{ memberUserId: string; assignmentId: string }>({
    memberUserId: '',
    assignmentId: '',
  });
  const pendingFeedbackComposerActionRef = useRef<(() => void) | null>(null);
  const pendingWorkspaceModalBootstrapRef = useRef<(() => void) | null>(null);

  const isSignedIn = Boolean(user);
  const isOverviewSelected = selectedTeamId === TEAM_WORKSPACE_OVERVIEW_VALUE;
  const selectedTeam = isOverviewSelected ? null : teamDetail?.team || null;
  const currentRole =
    selectedTeam?.currentUserRole || teams.find((team) => team.id === selectedTeamId)?.currentUserRole || null;
  const canManageMembers = currentRole === 'owner' || currentRole === 'admin';
  const canManageWorkspace = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'coach';
  const canPublishProof = currentRole === 'owner' || currentRole === 'admin';
  const canCreateTeams = teamCapabilities ? teamCapabilities.canCreateTeam : hasAnyTeamPlan;
  const createTeamBlockedReason = teamCapabilities?.createBlockedReason || null;
  const feedbackComposerSnapshot = useMemo(
    () =>
      serializeFeedbackComposerSnapshot({
        feedbackDraft,
        feedbackRubricDraft,
        submissionAttachmentMode,
        selectedSubmissionId,
        submissionDraft,
      }),
    [feedbackDraft, feedbackRubricDraft, selectedSubmissionId, submissionAttachmentMode, submissionDraft]
  );
  const isEditingFeedback = Boolean(feedbackDraft.id);
  const isFeedbackComposerDirty =
    feedbackComposerOpen && feedbackComposerSnapshot !== feedbackComposerBaselineRef.current;
  const learnerMembers = useMemo(
    () => (teamDetail?.members || []).filter((member) => member.role === 'learner'),
    [teamDetail?.members]
  );
  const selectedTeamPlanPolicy = useMemo(
    () => getTeamPlanPolicyFromSeatLimit(selectedTeam?.seatLimit),
    [selectedTeam?.seatLimit]
  );
  const resolvedTeamAnalytics = useMemo(() => {
    if (isRenderableTeamAnalytics(teamAnalytics)) {
      return teamAnalytics;
    }
    if (teamDetail) {
      return buildFallbackTeamAnalytics(teamDetail);
    }
    return null;
  }, [teamAnalytics, teamDetail]);
  const analyticsHasBenchmarkSignal = Boolean(
    resolvedTeamAnalytics && resolvedTeamAnalytics.summary.benchmarkedLearners > 0
  );
  const analyticsHasMovementBreakdown = Boolean(
    resolvedTeamAnalytics &&
      (resolvedTeamAnalytics.movement.improvingLearners > 0 ||
        resolvedTeamAnalytics.movement.plateauLearners > 0 ||
        resolvedTeamAnalytics.movement.decliningLearners > 0 ||
        resolvedTeamAnalytics.movement.readyForRetake > 0)
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
  const pendingJoinRequests = useMemo(
    () => (teamDetail?.joinRequests || []).filter((request) => request.status === 'pending'),
    [teamDetail?.joinRequests]
  );
  const activeInvites = useMemo(
    () => (teamDetail?.invites || []).filter((invite) => invite.status === 'active'),
    [teamDetail?.invites]
  );
  const accessJoinModeOption =
    TEAM_JOIN_MODE_OPTIONS.find((option) => option.value === joinSettingsDraft.joinMode) || TEAM_JOIN_MODE_OPTIONS[0];
  const accessJoinModeMeta = TEAM_JOIN_MODE_META[joinSettingsDraft.joinMode];

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
      setTeamCapabilities(null);
      setSelectedTeamId(TEAM_WORKSPACE_OVERVIEW_VALUE);
      return;
    }

    setLoadingTeams(true);
    setErrorMessage(null);

    try {
      const [nextTeams, nextCapabilities] = await Promise.all([
        listTeams(),
        getTeamsCapabilities(),
      ]);
      setTeams(nextTeams);
      setTeamCapabilities(nextCapabilities);

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

  const primeFeedbackComposerBaseline = useCallback(
    (input: {
      feedbackDraft: FeedbackDraft;
      feedbackRubricDraft: FeedbackRubricDraft;
      submissionAttachmentMode: SubmissionAttachmentMode;
      selectedSubmissionId: string | null;
      submissionDraft: SubmissionDraft;
    }) => {
      feedbackComposerBaselineRef.current = serializeFeedbackComposerSnapshot(input);
    },
    []
  );
  const resetFeedbackComposerTracking = useCallback(() => {
    feedbackComposerBaselineRef.current = EMPTY_FEEDBACK_COMPOSER_SNAPSHOT;
    feedbackComposerLockedTargetRef.current = {
      memberUserId: '',
      assignmentId: '',
    };
  }, []);
  const resetInviteDraft = useCallback(() => setInviteDraft(emptyInviteDraft()), []);
  const resetAssignmentDraft = useCallback(() => {
    setAssignmentDraft(emptyAssignmentDraft());
    setAssignmentDueInputState(EMPTY_ASSIGNMENT_DUE_INPUT_STATE);
  }, []);
  const resetSubmissionDraft = useCallback(() => setSubmissionDraft(emptySubmissionDraft()), []);
  const resetFeedbackEditor = useCallback(() => setFeedbackDraft(emptyFeedbackDraft()), []);
  const performFeedbackComposerClose = useCallback((onAfterClose?: () => void) => {
    pendingFeedbackComposerActionRef.current = null;
    setFeedbackDiscardPrompt(null);
    resetFeedbackEditor();
    setFeedbackRubricDraft(emptyFeedbackRubricDraft());
    setActiveFeedbackStarterId(null);
    setSubmissionAttachmentMode('none');
    setSelectedSubmissionId(null);
    resetSubmissionDraft();
    resetFeedbackComposerTracking();
    setFeedbackComposerOpen(false);
    onAfterClose?.();
  }, [resetFeedbackComposerTracking, resetFeedbackEditor, resetSubmissionDraft]);
  const closeAssignmentEditor = useCallback(() => {
    resetAssignmentDraft();
    setAssignmentEditorOpen(false);
  }, [resetAssignmentDraft]);
  const openNewAssignmentEditor = useCallback(() => {
    resetAssignmentDraft();
    setAssignmentEditorOpen(true);
  }, [resetAssignmentDraft]);
  const closeFeedbackComposer = useCallback((options?: { force?: boolean; onAfterClose?: () => void }) => {
    if (!options?.force && isFeedbackComposerDirty) {
      pendingFeedbackComposerActionRef.current = options?.onAfterClose || null;
      setFeedbackDiscardPrompt({
        title: 'Discard this draft review?',
        description: 'Your unsaved rubric, learner-facing note, and private coach notes will be lost.',
        confirmLabel: 'Discard draft',
      });
      return false;
    }

    performFeedbackComposerClose(options?.onAfterClose);
    return true;
  }, [isFeedbackComposerDirty, performFeedbackComposerClose]);
  const cancelFeedbackDiscard = useCallback(() => {
    pendingFeedbackComposerActionRef.current = null;
    setFeedbackDiscardPrompt(null);
  }, []);
  const confirmFeedbackDiscard = useCallback(() => {
    const pendingAction = pendingFeedbackComposerActionRef.current || undefined;
    performFeedbackComposerClose(pendingAction);
  }, [performFeedbackComposerClose]);
  const runAfterFeedbackComposerClose = useCallback((action: () => void, options?: { force?: boolean }) => {
    if (!feedbackComposerOpen) {
      action();
      return true;
    }

    return closeFeedbackComposer({
      force: options?.force,
      onAfterClose: action,
    });
  }, [closeFeedbackComposer, feedbackComposerOpen]);
  const openNewFeedbackComposer = useCallback((
    memberUserId?: string,
    assignmentId?: string,
    attachmentMode: SubmissionAttachmentMode = 'none',
    submissionId: string | null = null
  ) => {
    const nextFeedbackDraft = {
      ...emptyFeedbackDraft(),
      memberUserId: memberUserId || '',
      assignmentId: assignmentId || '',
    };
    const nextRubricDraft = emptyFeedbackRubricDraft();
    const nextSubmissionDraft = emptySubmissionDraft();
    const nextSelectedSubmissionId = attachmentMode === 'existing' ? submissionId : null;

    setSelectedFeedbackId(null);
    if (!memberUserId && !assignmentId) {
      setSelectedReviewItemId(null);
    }
    setFeedbackDraft(nextFeedbackDraft);
    setFeedbackRubricDraft(nextRubricDraft);
    setActiveFeedbackStarterId(null);
    setSubmissionAttachmentMode(attachmentMode);
    setSelectedSubmissionId(nextSelectedSubmissionId);
    setSubmissionDraft(nextSubmissionDraft);
    feedbackComposerLockedTargetRef.current = {
      memberUserId: '',
      assignmentId: '',
    };
    primeFeedbackComposerBaseline({
      feedbackDraft: nextFeedbackDraft,
      feedbackRubricDraft: nextRubricDraft,
      submissionAttachmentMode: attachmentMode,
      selectedSubmissionId: nextSelectedSubmissionId,
      submissionDraft: nextSubmissionDraft,
    });
    setFeedbackComposerOpen(true);
  }, [primeFeedbackComposerBaseline]);

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
      toast.error(createTeamBlockedReason || 'A Teams plan is required before you can create a team.');
      if (!teamCapabilities?.isPrivilegedAdmin && teamCapabilities?.activeTeamPlanKey === 'none') {
        navigate('/pricing?intent=teams');
      }
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

  const activateWorkspaceModal = useCallback(
    (modal: Exclude<WorkspaceModal, null>, bootstrap?: () => void) => {
      if (activeModal === modal) {
        pendingWorkspaceModalBootstrapRef.current = null;
        bootstrap?.();
        return;
      }

      pendingWorkspaceModalBootstrapRef.current = bootstrap || null;
      setActiveModal(modal);
    },
    [activeModal]
  );

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
          email: inviteDraft.email.trim() || '',
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
    const validation = getAssignmentDraftValidation(assignmentDraft, assignmentDueInputState);
    if (!validation.readyToSave) {
      toast.error(validation.issues[0]?.message || 'Fix the assignment before saving.');
      return;
    }

    setSubmittingKey('save-assignment');
    try {
      const isEditing = Boolean(assignmentDraft.id);
      const payload = {
        title: validation.title,
        description: validation.description,
        assignmentType: assignmentDraft.assignmentType,
        benchmarkLanguage:
          assignmentDraft.assignmentType === 'benchmark' ? assignmentDraft.benchmarkLanguage || null : null,
        trackId: assignmentDraft.assignmentType === 'roadmap' ? assignmentDraft.trackId || null : null,
        duelTargetCount:
          assignmentDraft.assignmentType === 'duel_activity' ? validation.duelTargetCount ?? undefined : undefined,
        dueAt: assignmentDueAtInputToIsoOrNull(validation.dueAt),
      };

      const savedAssignment = assignmentDraft.id
        ? await updateTeamAssignment(selectedTeamId, assignmentDraft.id, payload)
        : await createTeamAssignment(selectedTeamId, payload);

      toast.success(isEditing ? 'Assignment updated.' : 'Assignment created.');
      closeAssignmentEditor();
      await refreshSelectedTeam(selectedTeamId);
      setSelectedAssignmentId(savedAssignment.id);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save assignment.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const startAssignmentEdit = (assignment: TeamAssignment) => {
    const normalizedTitle = String(assignment.title || '').trim();
    const nextEditorTitle =
      /^Copy of\s+/i.test(normalizedTitle) || /\(copy(?:\s+\d+)?\)/i.test(normalizedTitle)
        ? getAssignmentDisplayTitle(normalizedTitle)
        : normalizedTitle;

    setAssignmentDraft({
      id: assignment.id,
      title: nextEditorTitle,
      description: assignment.description || '',
      assignmentType: assignment.assignmentType,
      benchmarkLanguage: assignment.benchmarkLanguage || 'python',
      trackId: assignment.trackId || '',
      duelTargetCount:
        assignment.assignmentType === 'duel_activity'
          ? String(
              ('requiredMatchCount' in assignment.definitionSnapshot
                ? assignment.definitionSnapshot.requiredMatchCount
                : assignment.requiredCompletionCount) || 3
            )
          : '3',
      dueAt: formatAssignmentDueAtInput(assignment.dueAt),
    });
    setAssignmentDueInputState(getAssignmentDueInputStateFromValue(formatAssignmentDueAtInput(assignment.dueAt)));
    setSelectedAssignmentId(assignment.id);
    setAssignmentEditorOpen(true);
  };

  const handleDuplicateAssignment = async (assignment: TeamAssignment) => {
    if (!selectedTeamId) return;

    setSubmittingKey(`duplicate-assignment-${assignment.id}`);
    try {
      const duplicatedAssignment = await duplicateTeamAssignment(selectedTeamId, assignment.id);
      toast.success('Assignment duplicated.');
      await refreshSelectedTeam(selectedTeamId);
      setSelectedAssignmentId(duplicatedAssignment.id);
    } catch (error: any) {
      toast.error(error?.message || 'Could not duplicate assignment.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleBulkAssignmentAction = async (
    action: 'archive' | 'restore' | 'set_due_date',
    assignmentIds: string[],
    assignmentBulkDueAt: string
  ) => {
    if (!selectedTeamId || assignmentIds.length === 0) return false;
    if (action === 'set_due_date' && assignmentBulkDueAt && !assignmentDueAtInputToIsoOrNull(assignmentBulkDueAt)) {
      toast.error('Enter a valid due date.');
      return false;
    }

    const bulkKey = `bulk-assignment-${action}`;
    setSubmittingKey(bulkKey);
    try {
      await bulkUpdateTeamAssignments(selectedTeamId, {
        assignmentIds,
        action,
        dueAt: action === 'set_due_date' ? assignmentDueAtInputToIsoOrNull(assignmentBulkDueAt) : undefined,
      });
      toast.success(
        action === 'archive'
          ? 'Assignments archived.'
          : action === 'restore'
          ? 'Assignments restored.'
          : 'Assignment due dates updated.'
      );
      await refreshSelectedTeam(selectedTeamId);
      return true;
    } catch (error: any) {
      toast.error(error?.message || 'Could not update the selected assignments.');
      return false;
    } finally {
      setSubmittingKey(null);
    }
  };

  const applyAssignmentTemplate = (templateId: string) => {
    const nextDraft = createAssignmentDraftFromTemplate(templateId);
    if (!nextDraft) return;

    setAssignmentDraft(nextDraft);
    setAssignmentDueInputState(getAssignmentDueInputStateFromValue(nextDraft.dueAt));
    setAssignmentEditorOpen(true);
  };

  const requestArchiveAssignment = (assignment: TeamAssignment) => {
    setConfirmWorkspaceAction({
      type: 'assignment_archive',
      assignment: {
        id: assignment.id,
        title: assignment.title,
      },
    });
  };

  const requestDeleteAssignments = useCallback((assignments: Array<Pick<TeamAssignment, 'id' | 'title'>>) => {
    if (!assignments.length) return;

    setConfirmWorkspaceAction({
      type: 'assignment_delete',
      assignments,
    });
  }, []);

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
    const lockedTarget = feedbackDraft.id ? feedbackComposerLockedTargetRef.current : null;
    const memberUserIdToPersist = lockedTarget?.memberUserId || feedbackDraft.memberUserId;
    const assignmentIdToPersist = lockedTarget ? lockedTarget.assignmentId : feedbackDraft.assignmentId;

    if (!memberUserIdToPersist) {
      toast.error('Select a learner.');
      return;
    }

    const linkedExistingSubmission =
      submissionAttachmentMode === 'existing'
        ? (teamDetail?.submissions || []).find((entry) => entry.id === selectedSubmissionId) || null
        : null;

    let submissionIdToPersist: string | null =
      submissionAttachmentMode === 'existing' ? selectedSubmissionId || null : null;

    if (submissionAttachmentMode === 'existing' && !linkedExistingSubmission) {
      toast.error('Choose an existing submission or switch back to a manual note.');
      return;
    }

    const trimmedSummary = feedbackDraft.summary.trim();
    const trimmedStrengths = feedbackDraft.strengths.trim();
    const trimmedFocusAreas = feedbackDraft.focusAreas.trim();
    const trimmedCoachNotes = feedbackDraft.coachNotes.trim();

    if (feedbackDraft.sharedWithMember && !trimmedSummary && !trimmedStrengths && !trimmedFocusAreas) {
      toast.error('Add learner-facing feedback before you share or resolve this note.');
      return;
    }

    const trimmedSubmissionScore = submissionDraft.rubricScore.trim();
    const parsedSubmissionScore =
      trimmedSubmissionScore === '' ? null : Number(trimmedSubmissionScore);

    if (
      trimmedSubmissionScore !== '' &&
      (!Number.isFinite(parsedSubmissionScore) || parsedSubmissionScore < 0 || parsedSubmissionScore > 100)
    ) {
      toast.error('Enter a valid submission score between 0 and 100.');
      return;
    }

    if (submissionAttachmentMode === 'new') {
      if (!submissionDraft.title.trim()) {
        toast.error('Enter a submission title.');
        return;
      }

      if (submissionDraft.submissionType === 'link' && !submissionDraft.externalUrl.trim()) {
        toast.error('Enter a submission link.');
        return;
      }

      if (submissionDraft.submissionType === 'link') {
        try {
          new URL(submissionDraft.externalUrl.trim());
        } catch {
          toast.error('Enter a valid submission link.');
          return;
        }
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

    if (feedbackDraft.sharedWithMember && !hasCompleteRubricBreakdown(rubricBreakdown)) {
      toast.error('Score all four review dimensions before you share or resolve this review.');
      return;
    }

    setSubmittingKey('save-feedback');
    try {
      const isEditing = Boolean(feedbackDraft.id);
      if (submissionAttachmentMode === 'new') {
        const createdSubmission = await createTeamSubmission(selectedTeamId, {
          memberUserId: memberUserIdToPersist,
          assignmentId: assignmentIdToPersist || null,
          submissionType: submissionDraft.submissionType,
          title: submissionDraft.title.trim(),
          body: submissionDraft.body.trim(),
          externalUrl: submissionDraft.externalUrl.trim() || null,
          codeLanguage: submissionDraft.submissionType === 'code' ? submissionDraft.codeLanguage || 'python' : null,
          status: submissionDraft.status,
          rubricScore: parsedSubmissionScore,
        });
        submissionIdToPersist = createdSubmission.id;
      }

      const payload = {
        memberUserId: memberUserIdToPersist,
        assignmentId: feedbackDraft.id
          ? assignmentIdToPersist || null
          : assignmentIdToPersist || linkedExistingSubmission?.assignmentId || null,
        submissionId: submissionIdToPersist,
        rubricScore,
        rubricBreakdown: hasRubricBreakdownValues(rubricBreakdown) ? rubricBreakdown : null,
        status: feedbackDraft.status,
        summary: trimmedSummary,
        strengths: trimmedStrengths,
        focusAreas: trimmedFocusAreas,
        coachNotes: trimmedCoachNotes,
        sharedWithMember: feedbackDraft.sharedWithMember,
      };

      const savedFeedback = feedbackDraft.id
        ? await updateTeamFeedback(selectedTeamId, feedbackDraft.id, payload)
        : await createTeamFeedback(selectedTeamId, payload);

      toast.success(isEditing ? 'Feedback updated.' : 'Feedback saved.');
      setTeamDetail((current) =>
        current
          ? {
              ...current,
              feedback: [
                savedFeedback,
                ...(current.feedback || []).filter((entry) => entry.id !== savedFeedback.id),
              ],
            }
          : current
      );
      setSelectedFeedbackId(savedFeedback.id);
      setSelectedReviewItemId(submissionIdToPersist ? `submission:${submissionIdToPersist}` : `feedback:${savedFeedback.id}`);
      closeFeedbackComposer({ force: true });
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
    const linkedSubmission = (teamDetail?.submissions || []).find((submission) => submission.id === entry.submissionId) || null;
    const nextFeedbackDraft = {
      id: entry.id,
      memberUserId: entry.memberUserId,
      assignmentId: entry.assignmentId || '',
      status: entry.status,
      summary: entry.summary,
      strengths: entry.strengths,
      focusAreas: entry.focusAreas,
      coachNotes: entry.coachNotes,
      sharedWithMember: entry.sharedWithMember,
    };
    const nextRubricDraft = buildFeedbackRubricDraft(entry.rubricBreakdown);
    const nextSubmissionAttachmentMode = linkedSubmission ? 'existing' : 'none';
    const nextSelectedSubmissionId = linkedSubmission?.id || null;
    const nextSubmissionDraft = linkedSubmission
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
      : emptySubmissionDraft();

    setFeedbackDraft(nextFeedbackDraft);
    setFeedbackRubricDraft(nextRubricDraft);
    setActiveFeedbackStarterId(null);
    setSubmissionAttachmentMode(nextSubmissionAttachmentMode);
    setSelectedSubmissionId(nextSelectedSubmissionId);
    setSubmissionDraft(nextSubmissionDraft);
    feedbackComposerLockedTargetRef.current = {
      memberUserId: entry.memberUserId,
      assignmentId: entry.assignmentId || '',
    };
    primeFeedbackComposerBaseline({
      feedbackDraft: nextFeedbackDraft,
      feedbackRubricDraft: nextRubricDraft,
      submissionAttachmentMode: nextSubmissionAttachmentMode,
      selectedSubmissionId: nextSelectedSubmissionId,
      submissionDraft: nextSubmissionDraft,
    });
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
    const snippet = COACHING_STARTERS.find((entry) => entry.id === snippetId);
    if (!snippet) return;

    setFeedbackDraft((current) => ({
      ...current,
      summary: snippet.summary,
      strengths: snippet.strengths,
      focusAreas: snippet.focusAreas,
    }));
    setActiveFeedbackStarterId(snippet.id);
  };

  const updateFeedbackNoteField = (field: 'summary' | 'strengths' | 'focusAreas', value: string) => {
    setFeedbackDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setActiveFeedbackStarterId(null);
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
      const archiveKey = `archive-assignment-${assignment.id}`;
      setSubmittingKey(archiveKey);
      try {
        await updateTeamAssignment(selectedTeamId, assignment.id, { archived: true });
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

    if (confirmWorkspaceAction.type === 'assignment_delete') {
      const { assignments } = confirmWorkspaceAction;
      setSubmittingKey('bulk-assignment-delete');
      try {
        await bulkUpdateTeamAssignments(selectedTeamId, {
          assignmentIds: assignments.map((assignment) => assignment.id),
          action: 'delete',
        });
        toast.success(assignments.length === 1 ? 'Assignment deleted.' : 'Assignments deleted.');
        setConfirmWorkspaceAction(null);
        await refreshSelectedTeam(selectedTeamId);
      } catch (error: any) {
        toast.error(error?.message || 'Could not delete the selected assignments.');
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
      if (feedbackDraft.id === entry.id) closeFeedbackComposer({ force: true });
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
    setAssignmentDraft(emptyAssignmentDraft());
    setAssignmentDueInputState(EMPTY_ASSIGNMENT_DUE_INPUT_STATE);
    setAssignmentEditorOpen(false);
    setSelectedAssignmentId(null);
    setFeedbackSearchQuery('');
    setFeedbackStatusFilter('all');
    setFeedbackVisibilityFilter('all');
    setFeedbackSort('recent');
    setFeedbackDraft(emptyFeedbackDraft());
    setFeedbackRubricDraft(emptyFeedbackRubricDraft());
    setActiveFeedbackStarterId(null);
    setFeedbackComposerOpen(false);
    setSelectedFeedbackId(null);
    setSelectedReviewItemId(null);
    setSubmissionAttachmentMode('none');
    setSelectedSubmissionId(null);
    setSubmissionDraft(emptySubmissionDraft());
    resetFeedbackComposerTracking();

    if (!activeModal) {
      pendingWorkspaceModalBootstrapRef.current = null;
      return;
    }

    const pendingBootstrap = pendingWorkspaceModalBootstrapRef.current;
    pendingWorkspaceModalBootstrapRef.current = null;
    pendingBootstrap?.();
  }, [activeModal, resetFeedbackComposerTracking, selectedTeamId]);

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

    const members = teamDetail.members || [];
    const assignments = teamDetail.assignments || [];
    const feedbackEntries = teamDetail.feedback || [];
    const submissions = teamDetail.submissions || [];

    const membersById = new Map(members.map((member) => [member.userId, member] as const));
    const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment] as const));
    const feedbackBySubmissionId = new Map<string, TeamFeedback[]>();

    feedbackEntries.forEach((entry) => {
      if (!entry.submissionId) return;
      feedbackBySubmissionId.set(entry.submissionId, [...(feedbackBySubmissionId.get(entry.submissionId) || []), entry]);
    });

    const items: ReviewQueueItem[] = submissions
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

    const looseFeedbackItems = feedbackEntries
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

  const selectedFeedback = useMemo(
    () => filteredFeedback.find((entry) => entry.id === selectedFeedbackId) || filteredFeedback[0] || null,
    [filteredFeedback, selectedFeedbackId]
  );

  const selectedReviewItem = useMemo(
    () => filteredReviewItems.find((item) => item.id === selectedReviewItemId) || filteredReviewItems[0] || null,
    [filteredReviewItems, selectedReviewItemId]
  );

  const selectedReviewFeedback = selectedReviewItem?.feedback || null;
  const selectedReviewItemIndex = selectedReviewItem ? filteredReviewItems.findIndex((item) => item.id === selectedReviewItem.id) : -1;

  const openManualFeedbackComposer = useCallback(() => {
    return runAfterFeedbackComposerClose(() => {
      openNewFeedbackComposer();
    });
  }, [openNewFeedbackComposer, runAfterFeedbackComposerClose]);

  const openContextualFeedbackComposer = useCallback(() => {
    const contextMemberUserId = selectedReviewItem?.member?.userId;
    const contextAssignmentId =
      selectedReviewItem?.assignment?.id || selectedReviewItem?.submission?.assignmentId || selectedReviewItem?.feedback?.assignmentId || undefined;

    return runAfterFeedbackComposerClose(() => {
      openNewFeedbackComposer(contextMemberUserId, contextAssignmentId);
    });
  }, [openNewFeedbackComposer, runAfterFeedbackComposerClose, selectedReviewItem]);

  const resetReviewFilters = useCallback(() => {
    setFeedbackSearchQuery('');
    setFeedbackStatusFilter('all');
    setFeedbackVisibilityFilter('all');
    setFeedbackSort('recent');
  }, []);

  const openAnalyticsReviewQueue = useCallback(() => {
    const firstNeedsReview = reviewQueueItems.find((item) => item.state === 'needs_review') || reviewQueueItems[0] || null;

    return runAfterFeedbackComposerClose(() => {
      activateWorkspaceModal('feedback', () => {
        resetReviewFilters();
        setFeedbackStatusFilter('needs_review');
        setSelectedReviewItemId(firstNeedsReview?.id || null);
        setSelectedFeedbackId(firstNeedsReview?.feedback?.id || null);
      });
    });
  }, [activateWorkspaceModal, resetReviewFilters, reviewQueueItems, runAfterFeedbackComposerClose]);

  const focusAnalyticsLearner = useCallback((memberUserId: string) => {
    const matchingItem =
      reviewQueueItems.find((item) => item.member?.userId === memberUserId && item.state === 'needs_review') ||
      reviewQueueItems.find((item) => item.member?.userId === memberUserId) ||
      null;

    return runAfterFeedbackComposerClose(() => {
      activateWorkspaceModal('feedback', () => {
        resetReviewFilters();

        if (matchingItem) {
          if (matchingItem.state === 'needs_review') {
            setFeedbackStatusFilter('needs_review');
          }
          setFeedbackSearchQuery(matchingItem.member?.name || '');
          setSelectedReviewItemId(matchingItem.id);
          setSelectedFeedbackId(matchingItem.feedback?.id || null);
          return;
        }

        setSelectedReviewItemId(null);
        setSelectedFeedbackId(null);
        openNewFeedbackComposer(memberUserId);
      });
    });
  }, [activateWorkspaceModal, openNewFeedbackComposer, resetReviewFilters, reviewQueueItems, runAfterFeedbackComposerClose]);

  const focusAnalyticsAssignment = useCallback((assignmentId: string) => {
    const matchingReviewItem = reviewQueueItems.find(
      (item) =>
        (item.assignment?.id || item.submission?.assignmentId || item.feedback?.assignmentId) === assignmentId &&
        item.state === 'needs_review'
    );

    return runAfterFeedbackComposerClose(() => {
      if (matchingReviewItem) {
        activateWorkspaceModal('feedback', () => {
          resetReviewFilters();
          setFeedbackStatusFilter('needs_review');
          setFeedbackSearchQuery(matchingReviewItem.assignment?.title || matchingReviewItem.submission?.assignmentTitle || '');
          setSelectedReviewItemId(matchingReviewItem.id);
          setSelectedFeedbackId(matchingReviewItem.feedback?.id || null);
        });
        return;
      }

      activateWorkspaceModal('assignments', () => {
        setSelectedAssignmentId(assignmentId);
      });
    });
  }, [activateWorkspaceModal, resetReviewFilters, reviewQueueItems, runAfterFeedbackComposerClose]);

  const openAnalyticsAssignments = useCallback(() => {
    return runAfterFeedbackComposerClose(() => {
      activateWorkspaceModal('assignments', () => {
        setSelectedAssignmentId(null);
      });
    });
  }, [activateWorkspaceModal, runAfterFeedbackComposerClose]);

  const requestStartFeedbackEdit = useCallback((entry: TeamFeedback) => {
    if (feedbackComposerOpen && feedbackDraft.id === entry.id) return true;
    return runAfterFeedbackComposerClose(() => {
      startFeedbackEdit(entry);
    });
  }, [feedbackComposerOpen, feedbackDraft.id, runAfterFeedbackComposerClose, startFeedbackEdit]);

  const requestCloseFeedbackModal = useCallback(() => {
    runAfterFeedbackComposerClose(() => {
      setActiveModal(null);
    });
  }, [runAfterFeedbackComposerClose]);

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
    setShowAllSubmissionHistory(false);
    setShowAllFeedbackHistory(false);
    setShowAllComposerHistory(false);
  }, [selectedReviewItemId, feedbackComposerOpen]);

  useEffect(() => {
    if (!feedbackComposerOpen || !isFeedbackComposerDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [feedbackComposerOpen, isFeedbackComposerDirty]);

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
      if (confirmMemberAction || confirmWorkspaceAction || feedbackDiscardPrompt) return;

      if (activeModal === 'feedback') {
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault();
          openContextualFeedbackComposer();
          return;
        }
        if (event.key.toLowerCase() === 'e' && selectedReviewFeedback) {
          event.preventDefault();
          requestStartFeedbackEdit(selectedReviewFeedback);
          return;
        }
        if ((event.key.toLowerCase() === 'j' || event.key === 'ArrowDown') && filteredReviewItems.length > 0) {
          event.preventDefault();
          const nextIndex =
            selectedReviewItemIndex >= 0 && selectedReviewItemIndex < filteredReviewItems.length - 1
              ? selectedReviewItemIndex + 1
              : selectedReviewItemIndex >= 0
              ? selectedReviewItemIndex
              : 0;
          const nextItem = filteredReviewItems[nextIndex];
          if (!nextItem) return;
          runAfterFeedbackComposerClose(() => {
            setSelectedReviewItemId(nextItem.id);
            setSelectedFeedbackId(nextItem.feedback?.id || null);
          });
          return;
        }
        if ((event.key.toLowerCase() === 'k' || event.key === 'ArrowUp') && filteredReviewItems.length > 0) {
          event.preventDefault();
          const previousIndex = selectedReviewItemIndex > 0 ? selectedReviewItemIndex - 1 : 0;
          const previousItem = filteredReviewItems[previousIndex];
          if (!previousItem) return;
          runAfterFeedbackComposerClose(() => {
            setSelectedReviewItemId(previousItem.id);
            setSelectedFeedbackId(previousItem.feedback?.id || null);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeModal,
    confirmMemberAction,
    confirmWorkspaceAction,
    feedbackDiscardPrompt,
    filteredReviewItems,
    openContextualFeedbackComposer,
    feedbackComposerOpen,
    requestStartFeedbackEdit,
    runAfterFeedbackComposerClose,
    selectedReviewFeedback,
    selectedReviewItemIndex,
  ]);

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
    (teamDetail?.members || []).find((member) => member.userId === feedbackContextMemberId) || null;
  const feedbackContextAssignment =
    (teamDetail?.assignments || []).find((assignment) => assignment.id === feedbackContextAssignmentId) || null;
  const feedbackContextSubmission =
    (teamDetail?.submissions || []).find((submission) => submission.id === feedbackContextSubmissionId) || null;

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

  const openAssignmentReview = useCallback((submission: TeamWorkspaceDetail['submissions'][number]) => {
    if (!submission.memberUserId) return;

    runAfterFeedbackComposerClose(() => {
      activateWorkspaceModal('feedback', () => {
        resetReviewFilters();
        setSelectedReviewItemId(`submission:${submission.id}`);
        setSelectedFeedbackId(null);
        openNewFeedbackComposer(submission.memberUserId!, submission.assignmentId || undefined, 'existing', submission.id);
      });
    });
  }, [activateWorkspaceModal, openNewFeedbackComposer, resetReviewFilters, runAfterFeedbackComposerClose]);

  const openAssignmentFeedback = useCallback((feedbackId: string) => {
    runAfterFeedbackComposerClose(() => {
      activateWorkspaceModal('feedback', () => {
        setSelectedFeedbackId(feedbackId);
        setFeedbackComposerOpen(false);
      });
    });
  }, [activateWorkspaceModal, runAfterFeedbackComposerClose]);

  const renderAssignmentsModal = () => {
    if (activeModal !== 'assignments' || !teamDetail) return null;

    return (
      <ModalShell
        title="Assignments"
        subtitle="Triage work, review progress, and move the queue forward."
        titlePresentation="headline"
        headerActions={
          assignmentEditorOpen ? null : (
            <button
              type="button"
              onClick={openNewAssignmentEditor}
              disabled={!canManageWorkspace}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New assignment
            </button>
          )
        }
        onClose={() => setActiveModal(null)}
      >
        <AssignmentsWorkspace
          teamDetail={teamDetail}
          canManageWorkspace={canManageWorkspace}
          workspaceAssignmentCount={workspaceCounts.assignments}
          assignmentLimit={selectedTeamPlanPolicy.assignmentLimit}
          trackTitleById={trackTitleById}
          assignmentDraft={assignmentDraft}
          setAssignmentDraft={setAssignmentDraft}
          assignmentDueInputState={assignmentDueInputState}
          onAssignmentDueInputStateChange={setAssignmentDueInputState}
          assignmentEditorOpen={assignmentEditorOpen}
          selectedAssignmentId={selectedAssignmentId}
          submittingKey={submittingKey}
          onSelectAssignmentId={setSelectedAssignmentId}
          onOpenNewAssignmentEditor={openNewAssignmentEditor}
          onCloseAssignmentEditor={closeAssignmentEditor}
          onSaveAssignment={handleSaveAssignment}
          onStartAssignmentEdit={startAssignmentEdit}
          onApplyAssignmentTemplate={applyAssignmentTemplate}
          onDuplicateAssignment={handleDuplicateAssignment}
          onRequestArchiveAssignment={requestArchiveAssignment}
          onRequestDeleteAssignments={requestDeleteAssignments}
          onRestoreAssignment={handleRestoreAssignment}
          onBulkAssignmentAction={handleBulkAssignmentAction}
          onOpenReviewForSubmission={openAssignmentReview}
          onOpenFeedbackEntry={openAssignmentFeedback}
          formatDateLabel={formatDateLabel}
          formatDateTimeLabel={formatDateTimeLabel}
          formatRelativeActivityLabel={formatRelativeActivityLabel}
          formatSubmissionStatusLabel={formatSubmissionStatusLabel}
          formatSubmissionTypeLabel={formatSubmissionTypeLabel}
        />
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
    const hasFilteredQueue = filteredReviewItems.length > 0;
    const composerMode = feedbackComposerOpen ? (isEditingFeedback ? 'edit' : 'new') : 'browse';
    const activeReviewState =
      (feedbackComposerOpen
        ? {
            label: composerMode === 'edit' ? 'Editing review' : 'New review',
            tone: 'default' as const,
            sortPriority: 0,
          }
        : selectedReviewState);
    const activeReviewHeading = feedbackContextMember?.name || selectedReviewItem?.member?.name || '';
    const activeReviewTitle = feedbackComposerOpen
      ? feedbackContextAssignment?.title || 'Manual coaching note'
      : selectedReviewItem
      ? selectedReviewItem.assignment?.title || selectedReviewItem.submission?.assignmentTitle || 'General coaching note'
      : feedbackContextAssignment?.title || 'Manual coaching note';
    const activeSubmissionLabel = feedbackContextSubmission
      ? `Attempt ${feedbackContextSubmission.attemptNumber} | ${formatSubmissionStatusLabel(feedbackContextSubmission.status)}`
      : feedbackComposerOpen && submissionAttachmentMode === 'new'
      ? 'New submission snapshot'
      : 'No submission attached';
    const composerHasAnchoredEvidence = Boolean(
      feedbackContextSubmission ||
        submissionAttachmentMode === 'new' ||
        (submissionAttachmentMode === 'existing' && selectedSubmissionId)
    );
    const composerRubricFields = composerHasAnchoredEvidence ? FEEDBACK_RUBRIC_FIELDS : MANUAL_FEEDBACK_RUBRIC_FIELDS;
    const reviewTypeLabel = composerHasAnchoredEvidence ? 'Anchored review' : 'Manual coaching note';
    const evidenceStatusLabel = composerHasAnchoredEvidence ? activeSubmissionLabel : 'No evidence attached';
    const manualReviewWarning = composerHasAnchoredEvidence
      ? null
      : 'No learner attempt is attached. Score coaching signals here, not code correctness.';
    const composerRubricHeading = composerHasAnchoredEvidence ? 'Anchored rubric' : 'Manual rubric';
    const composerRubricHelper = composerHasAnchoredEvidence
      ? 'Score the anchored work. Leave blank only if you cannot judge a dimension yet.'
      : 'No submission is attached, so score clarity, consistency, reasoning, and next step.';
    const composerModeTitle =
      composerMode === 'edit'
        ? activeReviewHeading
          ? `Edit review for ${activeReviewHeading}`
          : 'Edit review'
        : activeReviewHeading
        ? `Create review for ${activeReviewHeading}`
        : 'Create a coaching note';
    const composerModeHelper =
      composerMode === 'edit'
        ? 'Check the evidence, tighten the note, then save the outcome.'
        : 'Set the scope, score the work, write the note, then save the outcome.';
    const composerQueueLabel =
      selectedReviewItem && filteredReviewItems.length > 0
        ? `${Math.max(selectedReviewItemIndex + 1, 1)} of ${filteredReviewItems.length} in this queue view`
        : `${reviewQueueStats.needsReview} waiting for review`;
    const visibleSubmissionHistory = showAllSubmissionHistory ? submissionHistory : submissionHistory.slice(0, 3);
    const hiddenSubmissionHistoryCount = Math.max(submissionHistory.length - visibleSubmissionHistory.length, 0);
    const visibleFeedbackHistory = showAllFeedbackHistory ? feedbackHistory : feedbackHistory.slice(0, 3);
    const hiddenFeedbackHistoryCount = Math.max(feedbackHistory.length - visibleFeedbackHistory.length, 0);
    const composerHistoryEntries = showAllComposerHistory ? feedbackHistory : feedbackHistory.slice(0, 2);
    const hiddenComposerHistoryCount = Math.max(feedbackHistory.length - composerHistoryEntries.length, 0);
    const composerAttachedSubmissionPreview =
      submissionAttachmentMode === 'new'
        ? submissionDraft.submissionType === 'link'
          ? submissionDraft.externalUrl || 'Add the learner link here.'
          : submissionDraft.body || 'Add the learner submission here.'
        : feedbackContextSubmission?.preview || '';
    const visibleSelectedFeedback = selectedReviewFeedback || selectedFeedback || null;
    const noteSections = visibleSelectedFeedback
      ? [
          { label: 'Summary', value: visibleSelectedFeedback.summary },
          { label: 'Strengths', value: visibleSelectedFeedback.strengths },
          { label: 'Focus areas', value: visibleSelectedFeedback.focusAreas },
          { label: 'Private coach notes', value: visibleSelectedFeedback.coachNotes },
        ].filter((entry) => entry.value.trim().length > 0)
      : [];

    const clearReviewFilters = () => {
      resetReviewFilters();
    };
    const hasNextReviewItem = selectedReviewItemIndex >= 0 && selectedReviewItemIndex < filteredReviewItems.length - 1;
    const selectReviewItem = (item: ReviewQueueItem | null) => {
      if (!item) return;
      runAfterFeedbackComposerClose(() => {
        setSelectedReviewItemId(item.id);
        setSelectedFeedbackId(item.feedback?.id || null);
      });
    };

    const openReviewItem = (item: ReviewQueueItem) => {
      selectReviewItem(item);
    };

    const moveToNextReviewItem = () => {
      if (!hasNextReviewItem) return;
      const nextIndex = selectedReviewItemIndex + 1;
      selectReviewItem(filteredReviewItems[nextIndex] || null);
    };

    const startReviewForItem = (item: ReviewQueueItem) => {
      if (item.feedback) {
        requestStartFeedbackEdit(item.feedback);
        return;
      }

      runAfterFeedbackComposerClose(() => {
        openNewFeedbackComposer(
          item.member?.userId,
          item.assignment?.id || item.submission?.assignmentId || undefined,
          item.submission ? 'existing' : 'none',
          item.submission?.id || null
        );
      });
    };

    const renderQueuePane = () => (
      <aside className="space-y-4">
        <div className="rounded-[1.75rem] border border-border/60 bg-background/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-foreground">Review queue</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pick the next learner and move the note forward.
              </div>
            </div>
            <button
              type="button"
              onClick={openContextualFeedbackComposer}
              disabled={!canManageWorkspace}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New review
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={feedbackSearchQuery}
                onChange={(event) => setFeedbackSearchQuery(event.target.value)}
                placeholder="Search learner, assignment, submission, or note"
                className="h-11 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary/40"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <select
                value={feedbackStatusFilter}
                onChange={(event) => setFeedbackStatusFilter(event.target.value as ReviewStatusFilter)}
                className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
              >
                <option value="recent">Sort by recent</option>
                <option value="score">Sort by score</option>
                <option value="learner">Sort by learner</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <ReviewStatePill label={`${reviewQueueStats.needsReview} need review`} tone="warn" />
              <ReviewStatePill label={`${reviewQueueStats.drafted} drafts`} tone="default" />
              <ReviewStatePill label={`${reviewQueueStats.resolved} resolved`} tone="success" />
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-background/70">
          {!hasReviewQueue ? (
            <div className="p-4">
              <EmptyState
                title="No learner work yet"
                helper={
                  (teamDetail.submissions || []).length > 0
                    ? 'Submitted work is here. Start the first review and turn it into feedback.'
                    : 'The queue will fill as learners submit assignments. Use New review above if you need to start a manual note first.'
                }
              />
            </div>
          ) : !hasFilteredQueue ? (
            <div className="p-4">
              <EmptyState
                title="No queue items match this view"
                helper="Clear the filters and get back to the active review queue."
                action={
                  <button
                    type="button"
                    onClick={clearReviewFilters}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset filters
                  </button>
                }
              />
            </div>
          ) : (
            <div className="max-h-[68vh] divide-y divide-border/70 overflow-y-auto">
              {filteredReviewItems.map((item) => {
                const stateMeta = getReviewQueueStateMeta(item.state);
                const isSelected = selectedReviewItem?.id === item.id;
                const assignmentLabel = item.assignment?.title || item.submission?.assignmentTitle || 'General coaching note';
                const sourceLabel = item.submission
                  ? `Attempt ${item.submission.attemptNumber}`
                  : item.feedback?.authorName
                  ? `Coach note by ${item.feedback.authorName}`
                  : 'Manual review';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openReviewItem(item)}
                    className={`w-full px-4 py-4 text-left transition ${isSelected ? 'bg-primary/10' : 'hover:bg-card/70'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-semibold text-foreground">
                            {item.member?.name || 'Unknown learner'}
                          </div>
                          <ReviewStatePill label={stateMeta.label} tone={stateMeta.tone} />
                        </div>
                        <div className="mt-1 truncate text-sm text-muted-foreground">{assignmentLabel}</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatRelativeActivityLabel(item.updatedAt)}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{sourceLabel}</span>
                      <span>{item.score !== null ? `${item.score} score` : 'Unscored'}</span>
                      {item.historyCount > 1 ? <span>{item.historyCount} reviews</span> : null}
                    </div>
                    <div className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.preview}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    );

    const renderComposerContextPanel = () => (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1rem] bg-card px-3 py-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Learner</div>
            <div className="mt-2 font-semibold text-foreground">{feedbackContextMember?.name || 'Select learner'}</div>
          </div>
          <div className="rounded-[1rem] bg-card px-3 py-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Assignment</div>
            <div className="mt-2 font-semibold text-foreground">{feedbackContextAssignment?.title || 'General coaching note'}</div>
          </div>
          <div className="rounded-[1rem] bg-card px-3 py-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Evidence</div>
            <div className="mt-2 font-semibold text-foreground">{activeSubmissionLabel}</div>
          </div>
          <div className="rounded-[1rem] bg-card px-3 py-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Last active</div>
            <div className="mt-2 font-semibold text-foreground">
              {feedbackContextMember ? formatRelativeActivityLabel(feedbackContextMember.lastActiveAt) : 'No activity yet'}
            </div>
          </div>
        </div>

        <details className="rounded-[1rem] border border-border bg-background/80">
          <summary className="cursor-pointer list-none px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Change attachment</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Only change this when a different attempt should become the source of truth.
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {submissionAttachmentMode === 'none'
                  ? 'Manual'
                  : submissionAttachmentMode === 'existing'
                  ? 'Linked'
                  : 'Snapshot'}
              </span>
            </div>
          </summary>

          <div className="border-t border-border px-4 py-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ['none', 'Manual'],
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
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    submissionAttachmentMode === value ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {submissionAttachmentMode === 'existing' ? (
              <ReviewField
                label="Existing attempt"
                helper={
                  eligibleExistingSubmissions.length > 0
                    ? 'Attach one of this learner\'s recorded attempts.'
                    : 'No recorded attempts match this learner yet.'
                }
              >
                <select
                  value={selectedSubmissionId || ''}
                  onChange={(event) => setSelectedSubmissionId(event.target.value || null)}
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                >
                  <option value="">
                    {eligibleExistingSubmissions.length > 0 ? 'Select attempt' : 'No attempts available'}
                  </option>
                  {eligibleExistingSubmissions.map((submission) => (
                    <option key={submission.id} value={submission.id}>
                      {submission.title} | Attempt {submission.attemptNumber} | {formatSubmissionStatusLabel(submission.status)}
                    </option>
                  ))}
                </select>
              </ReviewField>
            ) : null}

            {submissionAttachmentMode === 'new' ? (
              <div className="space-y-3 rounded-[1rem] bg-card/80 p-3">
                <ReviewField label="Snapshot title">
                  <input
                    value={submissionDraft.title}
                    onChange={(event) => setSubmissionDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Benchmark retry #2"
                    className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                </ReviewField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ReviewField label="Type">
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
                  </ReviewField>

                  <ReviewField label="State">
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
                  </ReviewField>
                </div>

                {submissionDraft.submissionType === 'code' ? (
                  <ReviewField label="Language">
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
                  </ReviewField>
                ) : null}

                {submissionDraft.submissionType === 'link' ? (
                  <ReviewField label="Link">
                    <input
                      value={submissionDraft.externalUrl}
                      onChange={(event) => setSubmissionDraft((current) => ({ ...current, externalUrl: event.target.value }))}
                      placeholder="https://github.com/..."
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </ReviewField>
                ) : (
                  <ReviewField label={submissionDraft.submissionType === 'code' ? 'Code snapshot' : 'Written response'}>
                    <textarea
                      value={submissionDraft.body}
                      onChange={(event) => setSubmissionDraft((current) => ({ ...current, body: event.target.value }))}
                      rows={5}
                      placeholder={
                        submissionDraft.submissionType === 'code'
                          ? 'Paste the learner code snapshot here.'
                          : 'Paste the learner answer or work sample here.'
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </ReviewField>
                )}
              </div>
            ) : null}
          </div>
        </details>

        {(feedbackContextSubmission || submissionAttachmentMode === 'new') && composerAttachedSubmissionPreview ? (
          <details className="rounded-[1rem] border border-border bg-background/80">
            <summary className="cursor-pointer list-none px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {feedbackContextSubmission ? 'Attached work preview' : 'Snapshot preview'}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{activeSubmissionLabel}</div>
                </div>
                {feedbackContextSubmission?.externalUrl ? (
                  <span className="text-xs text-primary">Open link</span>
                ) : null}
              </div>
            </summary>

            <div className="border-t border-border px-4 py-4">
              {feedbackContextSubmission?.externalUrl ? (
                <a
                  href={feedbackContextSubmission.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open link
                </a>
              ) : null}

              <div className="mt-3 max-h-[12rem] overflow-y-auto rounded-[1rem] bg-card px-4 py-3 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                {composerAttachedSubmissionPreview}
              </div>
            </div>
          </details>
        ) : null}

        {submissionHistory.length > 0 ? (
          <details className="rounded-[1rem] border border-border bg-background/80">
            <summary className="cursor-pointer list-none px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Recent attempts</div>
                  <div className="text-sm text-muted-foreground">Re-anchor here only when another attempt should drive the note.</div>
                </div>
                <div className="text-xs text-muted-foreground">{submissionHistory.length} total</div>
              </div>
            </summary>

            <div className="border-t border-border px-4 py-4">
              <div className="space-y-2">
                {visibleSubmissionHistory.map((submission) => (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => {
                      setSelectedReviewItemId(`submission:${submission.id}`);
                      setSelectedFeedbackId(null);
                      setSubmissionAttachmentMode('existing');
                      setSelectedSubmissionId(submission.id);
                    }}
                    className="w-full rounded-[1rem] bg-card px-4 py-3 text-left transition hover:bg-secondary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">{submission.title}</div>
                      <div className="text-xs text-muted-foreground">{formatRelativeActivityLabel(submission.updatedAt)}</div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatSubmissionTypeLabel(submission.submissionType)} | Attempt {submission.attemptNumber} |{' '}
                      {formatSubmissionStatusLabel(submission.status)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </details>
        ) : null}
      </div>
    );

    const renderWorkContextPane = () => {
      if (feedbackComposerOpen) {
        return (
          <aside className="space-y-4 2xl:sticky 2xl:top-0 self-start">
            <div className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
              <div className="text-base font-semibold text-foreground">Review context</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Keep the context tight. The coaching work happens in the main column.
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Learner</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {feedbackContextMember?.name || 'Select learner'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {feedbackContextMember ? formatTeamRoleLabel(feedbackContextMember.role) : 'No learner yet'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Assignment</dt>
                  <dd className="max-w-[70%] text-right font-semibold text-foreground">
                    {feedbackContextAssignment?.title || 'General coaching note'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">Last active</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {feedbackContextMember ? formatRelativeActivityLabel(feedbackContextMember.lastActiveAt) : 'No activity yet'}
                  </dd>
                </div>
                {feedbackContextMember && feedbackContextMember.latestBenchmarkScore !== null ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Latest benchmark</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {feedbackContextMember.latestBenchmarkScore}
                      {feedbackContextMember.latestBenchmarkAt ? ` | ${formatDateLabel(feedbackContextMember.latestBenchmarkAt)}` : ''}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-foreground">Submission anchor</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Optional unless this note needs to point to a specific learner attempt.
                  </div>
                </div>
                <ReviewStatePill
                  label={submissionAttachmentMode === 'none' ? 'Manual' : submissionAttachmentMode === 'existing' ? 'Linked' : 'Snapshot'}
                  tone={submissionAttachmentMode === 'none' ? 'default' : 'warn'}
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {([
                  ['none', 'Manual note'],
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
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      submissionAttachmentMode === value ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {submissionAttachmentMode === 'none' ? (
                <div className="mt-4 rounded-[1.2rem] bg-card/80 px-4 py-4 text-sm text-muted-foreground">
                  Keep this as a manual note unless the feedback needs to be anchored to a real attempt.
                </div>
              ) : null}

              {submissionAttachmentMode === 'existing' ? (
                <div className="mt-4">
                  <ReviewField
                    label="Choose submission"
                    helper={
                      eligibleExistingSubmissions.length > 0
                        ? 'Attach one of this learner’s existing attempts.'
                        : 'No existing submissions match this learner yet.'
                    }
                  >
                    <select
                      value={selectedSubmissionId || ''}
                      onChange={(event) => setSelectedSubmissionId(event.target.value || null)}
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    >
                      <option value="">
                        {eligibleExistingSubmissions.length > 0 ? 'Select submission' : 'No submissions available'}
                      </option>
                      {eligibleExistingSubmissions.map((submission) => (
                        <option key={submission.id} value={submission.id}>
                          {submission.title} | Attempt {submission.attemptNumber} | {formatSubmissionStatusLabel(submission.status)}
                        </option>
                      ))}
                    </select>
                  </ReviewField>
                </div>
              ) : null}

              {submissionAttachmentMode === 'new' ? (
                <div className="mt-4 space-y-3 rounded-[1.35rem] bg-card/80 p-4">
                  <ReviewField label="Submission title">
                    <input
                      value={submissionDraft.title}
                      onChange={(event) => setSubmissionDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Benchmark retry #2"
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </ReviewField>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReviewField label="Submission type">
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
                    </ReviewField>

                    <ReviewField label="Submission state">
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
                    </ReviewField>
                  </div>

                  <ReviewField label="Submission score" helper="Optional">
                    <input
                      value={submissionDraft.rubricScore}
                      onChange={(event) => setSubmissionDraft((current) => ({ ...current, rubricScore: event.target.value }))}
                      placeholder="74"
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </ReviewField>

                  {submissionDraft.submissionType === 'code' ? (
                    <ReviewField label="Code language">
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
                    </ReviewField>
                  ) : null}

                  {submissionDraft.submissionType === 'link' ? (
                    <ReviewField label="Submission link">
                      <input
                        value={submissionDraft.externalUrl}
                        onChange={(event) => setSubmissionDraft((current) => ({ ...current, externalUrl: event.target.value }))}
                        placeholder="https://github.com/..."
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </ReviewField>
                  ) : (
                    <ReviewField label={submissionDraft.submissionType === 'code' ? 'Code' : 'Submission body'}>
                      <textarea
                        value={submissionDraft.body}
                        onChange={(event) => setSubmissionDraft((current) => ({ ...current, body: event.target.value }))}
                        rows={5}
                        placeholder={
                          submissionDraft.submissionType === 'code'
                            ? 'Paste the learner code snapshot here.'
                            : 'Paste the learner answer or submission here.'
                        }
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </ReviewField>
                  )}
                </div>
              ) : null}
            </div>

            {(feedbackContextSubmission || submissionAttachmentMode === 'new') && composerAttachedSubmissionPreview ? (
              <div className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-foreground">
                      {feedbackContextSubmission ? 'Attached work' : 'Snapshot preview'}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{activeSubmissionLabel}</div>
                  </div>
                  {feedbackContextSubmission?.externalUrl ? (
                    <a
                      href={feedbackContextSubmission.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open link
                    </a>
                  ) : null}
                </div>

                {feedbackContextSubmission ? (
                  <div className="mt-4">
                    <ReviewField label="Submission state">
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
                    </ReviewField>
                  </div>
                ) : null}

                <div className="mt-4 max-h-[22rem] overflow-y-auto rounded-[1.2rem] bg-card/80 px-4 py-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {composerAttachedSubmissionPreview}
                </div>
              </div>
            ) : null}

            {submissionHistory.length > 0 ? (
              <div className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
                <div className="text-base font-semibold text-foreground">Recent attempts</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Re-anchor the note if another attempt is the real source of truth.
                </div>
                <div className="mt-3 space-y-2">
                  {submissionHistory.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      onClick={() => {
                        setSelectedReviewItemId(`submission:${submission.id}`);
                        setSelectedFeedbackId(null);
                        setSubmissionAttachmentMode('existing');
                        setSelectedSubmissionId(submission.id);
                      }}
                      className="w-full rounded-2xl bg-card/80 px-4 py-4 text-left transition hover:bg-card"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">{submission.title}</div>
                        <div className="text-xs text-muted-foreground">{formatRelativeActivityLabel(submission.updatedAt)}</div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatSubmissionTypeLabel(submission.submissionType)} | Attempt {submission.attemptNumber} |{' '}
                        {formatSubmissionStatusLabel(submission.status)}
                      </div>
                      <div className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{submission.preview}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        );
      }

      return (
      <div className="space-y-5">
        <div className="rounded-[1.75rem] border border-border/60 bg-background/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-foreground">
                {feedbackContextSubmission ? 'Attached work' : 'No attached work'}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {feedbackContextSubmission
                  ? 'Read the actual learner work before you score and coach it.'
                  : 'This review is still manual. Start the note only if that is intentional.'}
              </div>
            </div>
            {feedbackContextSubmission?.externalUrl ? (
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

          <div className="mt-5 rounded-[1.4rem] bg-card/80 px-4 py-4">
            {feedbackContextSubmission ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-foreground">{feedbackContextSubmission.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatSubmissionTypeLabel(feedbackContextSubmission.submissionType)}
                      {feedbackContextSubmission.codeLanguage
                        ? ` | ${formatBenchmarkLanguageLabel(feedbackContextSubmission.codeLanguage)}`
                        : ''}
                      {feedbackContextSubmission.submittedByName ? ` | Logged by ${feedbackContextSubmission.submittedByName}` : ''}
                    </div>
                  </div>

                  <div className="w-full max-w-[220px]">
                    <ReviewField label="Submission state">
                      <select
                        value={feedbackContextSubmission.status}
                        onChange={(event) =>
                          void handleUpdateSubmissionStatus(
                            feedbackContextSubmission.id,
                            event.target.value as TeamSubmissionStatus
                          )
                        }
                        disabled={
                          !canManageWorkspace || submittingKey === `submission-status-${feedbackContextSubmission.id}`
                        }
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40 disabled:opacity-60"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="needs_revision">Needs revision</option>
                        <option value="reviewed">Reviewed</option>
                      </select>
                    </ReviewField>
                  </div>
                </div>

                <div className="rounded-[1.2rem] bg-background px-4 py-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {feedbackContextSubmission.preview}
                </div>
              </div>
            ) : feedbackComposerOpen && submissionAttachmentMode === 'new' ? (
              <div className="space-y-3">
                <div className="text-base font-semibold text-foreground">{submissionDraft.title || 'Untitled submission'}</div>
                <div className="text-sm text-muted-foreground">
                  {formatSubmissionTypeLabel(submissionDraft.submissionType)}
                  {submissionDraft.submissionType === 'code' && submissionDraft.codeLanguage
                    ? ` | ${formatBenchmarkLanguageLabel(submissionDraft.codeLanguage)}`
                    : ''}
                </div>
                <div className="rounded-[1.2rem] bg-background px-4 py-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {submissionDraft.submissionType === 'link'
                    ? submissionDraft.externalUrl || 'Add the learner link here.'
                    : submissionDraft.body || 'Add the learner submission here.'}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No submission attached"
                helper="Keep the review manual, link existing learner work, or create a snapshot when you need to anchor the note."
                action={
                  feedbackComposerOpen && canManageWorkspace ? (
                    <div className="flex flex-wrap gap-2">
                      {eligibleExistingSubmissions.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSubmissionAttachmentMode('existing')}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                        >
                          Use existing work
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSubmissionAttachmentMode('new')}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Create snapshot
                      </button>
                    </div>
                  ) : null
                }
              />
            )}
          </div>
        </div>

        {submissionHistory.length > 0 || feedbackHistory.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {submissionHistory.length > 0 ? (
              <div className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-foreground">Past attempts</div>
                  <div className="text-xs text-muted-foreground">{submissionHistory.length} total</div>
                </div>
                <div className="mt-3 space-y-2">
                  {visibleSubmissionHistory.map((submission) => (
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
                      className="w-full rounded-2xl bg-card/80 px-4 py-4 text-left transition hover:bg-card"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">{submission.title}</div>
                        <div className="text-xs text-muted-foreground">{formatRelativeActivityLabel(submission.updatedAt)}</div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatSubmissionTypeLabel(submission.submissionType)} | Attempt {submission.attemptNumber} |{' '}
                        {formatSubmissionStatusLabel(submission.status)}
                      </div>
                      <div className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{submission.preview}</div>
                    </button>
                  ))}
                </div>
                {hiddenSubmissionHistoryCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSubmissionHistory(true)}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Show {hiddenSubmissionHistoryCount} more attempt{hiddenSubmissionHistoryCount === 1 ? '' : 's'}
                  </button>
                ) : submissionHistory.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSubmissionHistory(false)}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Show fewer attempts
                  </button>
                ) : null}
              </div>
            ) : null}

            {feedbackHistory.length > 0 ? (
              <div className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-foreground">Previous notes</div>
                  <div className="text-xs text-muted-foreground">{feedbackHistory.length} total</div>
                </div>
                <div className="mt-3 space-y-2">
                  {visibleFeedbackHistory.map((entry) => {
                    const feedbackState = getFeedbackStateMeta(entry);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          runAfterFeedbackComposerClose(() => {
                            setSelectedReviewItemId(entry.submissionId ? `submission:${entry.submissionId}` : `feedback:${entry.id}`);
                            setSelectedFeedbackId(entry.id);
                            setFeedbackComposerOpen(false);
                          });
                        }}
                        className="w-full rounded-2xl bg-card/80 px-4 py-4 text-left transition hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-foreground">
                              {entry.assignmentTitle || 'General coaching note'}
                            </div>
                            <ReviewStatePill label={feedbackState.label} tone={feedbackState.tone} />
                          </div>
                          <div className="text-xs text-muted-foreground">{formatRelativeActivityLabel(entry.updatedAt)}</div>
                        </div>
                        <div className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {entry.summary || entry.focusAreas || entry.strengths || 'Open coaching note'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {hiddenFeedbackHistoryCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllFeedbackHistory(true)}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Show {hiddenFeedbackHistoryCount} more note{hiddenFeedbackHistoryCount === 1 ? '' : 's'}
                  </button>
                ) : feedbackHistory.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllFeedbackHistory(false)}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Show fewer notes
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      );
    };

    const selectComposerHistoryEntry = (entry: TeamFeedback) => {
      runAfterFeedbackComposerClose(() => {
        setSelectedReviewItemId(entry.submissionId ? 'submission:' + entry.submissionId : 'feedback:' + entry.id);
        setSelectedFeedbackId(entry.id);
      });
    };

    const reviewSidebar = (
      <GradeAndCoachReviewSidebar
        feedbackComposerOpen={feedbackComposerOpen}
        activeReviewState={activeReviewState}
        composerModeTitle={composerModeTitle}
        activeReviewTitle={activeReviewTitle}
        composerModeHelper={composerModeHelper}
        reviewTypeLabel={reviewTypeLabel}
        evidenceStatusLabel={evidenceStatusLabel}
        hasAnchoredEvidence={composerHasAnchoredEvidence}
        manualReviewWarning={manualReviewWarning}
        composerRubricHeading={composerRubricHeading}
        composerRubricHelper={composerRubricHelper}
        composerQueueLabel={composerQueueLabel}
        composerLastActiveLabel={feedbackContextMember ? formatRelativeActivityLabel(feedbackContextMember.lastActiveAt) : null}
        composerRubricPercent={composerRubricPercent}
        composerRubricTotal={composerRubricTotal}
        composerHistoryEntries={composerHistoryEntries}
        feedbackHistoryCount={feedbackHistory.length}
        selectedReviewFeedbackId={visibleSelectedFeedback?.id || null}
        getFeedbackStateMeta={getFeedbackStateMeta}
        onSelectComposerHistoryEntry={selectComposerHistoryEntry}
        hiddenComposerHistoryCount={hiddenComposerHistoryCount}
        onShowAllComposerHistory={() => setShowAllComposerHistory(true)}
        onShowLessComposerHistory={() => setShowAllComposerHistory(false)}
        isEditingFeedback={isEditingFeedback}
        feedbackDraft={feedbackDraft}
        setFeedbackDraft={setFeedbackDraft}
        learnerMembers={learnerMembers}
        assignmentOptions={teamDetail.assignments || []}
        rubricFields={composerRubricFields}
        feedbackRubricDraft={feedbackRubricDraft}
        setFeedbackRubricDraft={setFeedbackRubricDraft}
        activeFeedbackStarterId={activeFeedbackStarterId}
        onApplyFeedbackSnippet={applyFeedbackSnippet}
        onUpdateFeedbackNoteField={updateFeedbackNoteField}
        workflowOptions={FEEDBACK_WORKFLOW_OPTIONS}
        onSetFeedbackWorkflowState={setFeedbackWorkflowState}
        onSaveFeedback={handleSaveFeedback}
        canManageWorkspace={canManageWorkspace}
        submittingKey={submittingKey}
        onCancelComposer={closeFeedbackComposer}
        selectedReviewFeedback={visibleSelectedFeedback}
        selectedFeedbackState={selectedFeedbackState}
        noteSections={noteSections}
        formatRelativeActivityLabel={formatRelativeActivityLabel}
        onStartFeedbackEdit={requestStartFeedbackEdit}
        onRequestDeleteFeedback={requestDeleteFeedback}
        hasSelectedReviewItem={Boolean(selectedReviewItem)}
        onStartReviewForSelectedItem={() => {
          if (visibleSelectedFeedback) {
            requestStartFeedbackEdit(visibleSelectedFeedback);
            return;
          }
          if (selectedReviewItem) startReviewForItem(selectedReviewItem);
        }}
        composerContextPanel={renderComposerContextPanel()}
        queueSnapshot={{
          needsReview: reviewQueueStats.needsReview,
          drafted: reviewQueueStats.drafted,
          resolved: reviewQueueStats.resolved,
        }}
      />
    );

    return (
      <GradeAndCoachModal
        feedbackComposerOpen={feedbackComposerOpen}
        onClose={requestCloseFeedbackModal}
        reviewSidebar={reviewSidebar}
        workContextPane={renderWorkContextPane()}
        queuePane={renderQueuePane()}
        hasSelectedReviewItem={Boolean(selectedReviewItem)}
        canManageWorkspace={canManageWorkspace}
        onStartOrEditReview={() => {
          if (selectedReviewItem) startReviewForItem(selectedReviewItem);
        }}
        onMoveToNextReviewItem={moveToNextReviewItem}
        hasNextReviewItem={hasNextReviewItem}
        hasSelectedReviewFeedback={Boolean(visibleSelectedFeedback)}
        activeReviewState={activeReviewState}
        activeReviewHeading={activeReviewHeading}
        activeReviewTitle={activeReviewTitle}
        activeSubmissionLabel={activeSubmissionLabel}
        lastActiveLabel={feedbackContextMember ? formatRelativeActivityLabel(feedbackContextMember.lastActiveAt) : null}
        queueUpdatedLabel={selectedReviewItem ? formatRelativeActivityLabel(selectedReviewItem.updatedAt) : null}
        latestBenchmarkLabel={
          feedbackContextMember && feedbackContextMember.latestBenchmarkScore !== null
            ? String(feedbackContextMember.latestBenchmarkScore) + (feedbackContextMember.latestBenchmarkAt ? ' | ' + formatDateLabel(feedbackContextMember.latestBenchmarkAt) : '')
            : null
        }
        queueSnapshot={{
          needsReview: reviewQueueStats.needsReview,
          drafted: reviewQueueStats.drafted,
          resolved: reviewQueueStats.resolved,
        }}
      />
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

          <div className="inline-flex items-center rounded-full border border-xp/20 bg-xp/10 px-4 py-1.5 type-kicker text-xp">
            Live team workspace
          </div>

          <h1 className="type-display-section mx-auto mt-5 max-w-3xl text-foreground">
            Benchmark a cohort. Track proof of progress.
          </h1>
          <p className="type-body-md mx-auto mt-3 max-w-2xl text-muted-foreground">
            Create a pilot team, assign benchmark-first practice, and use benchmark history to see who is improving.
          </p>

          <div className="mx-auto mt-6 w-full max-w-sm text-left">
            <div className="type-kicker text-muted-foreground">Workspace view</div>
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
                      <div className="text-sm font-semibold text-primary">
                        {!isSignedIn
                          ? 'Sign in required'
                          : teamCapabilities?.activeTeamPlanKey === 'none'
                            ? 'Teams plan required'
                            : 'Team creation unavailable'}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-foreground">
                        {!isSignedIn
                          ? 'Sign in first to create and manage team workspaces.'
                          : createTeamBlockedReason || 'Create workspaces with Teams, Teams Growth, or Custom.'}
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
                    {teamCapabilities
                      ? `${teamCapabilities.activeTeamPlanLabel}: ${teamCapabilities.currentWorkspaceCount}/${teamCapabilities.workspaceLimit} workspace${teamCapabilities.workspaceLimit === 1 ? '' : 's'}, ${teamCapabilities.seatLimit} seats per team.`
                      : activeTeamEntitlement
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
                        : `${workspaceCounts.assignments} active`
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
            {(teamDetail.members || []).length === 0 ? (
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
                          title={`${activityIndicator.description} | ${activityIndicator.label}`}
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
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Join policy"
                value={accessJoinModeOption.label}
                helper={accessJoinModeMeta.summary}
              />
              <MetricCard
                label="Exposure surface"
                value={
                  joinSettingsDraft.joinMode === 'code_domain' && joinSettingsDraft.allowedEmailDomain.trim()
                    ? joinSettingsDraft.allowedEmailDomain.trim()
                    : accessJoinModeMeta.exposureValue
                }
                helper={
                  joinSettingsDraft.joinMode === 'code_domain' && joinSettingsDraft.allowedEmailDomain.trim()
                    ? 'Only signed-in users on this domain can use code-based access.'
                    : accessJoinModeMeta.exposureHelper
                }
              />
              <MetricCard
                label="Active codes"
                value={String(activeInvites.length)}
                helper={
                  workspaceCounts.invites === 0
                    ? 'No invite codes live right now.'
                    : `${workspaceCounts.invites} total code${workspaceCounts.invites === 1 ? '' : 's'} tracked here.`
                }
              />
              <MetricCard
                label="Pending requests"
                value={String(pendingJoinRequests.length)}
                helper={
                  joinSettingsDraft.joinMode === 'code_approval'
                    ? pendingJoinRequests.length === 0
                      ? 'Approval mode is on and the queue is clear.'
                      : 'These joins still need an owner or admin decision.'
                    : 'Requests only appear when code joins require approval.'
                }
              />
              <MetricCard
                label="Default role"
                value="Learner"
                helper="Promote members later if they need coach or admin access."
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Current access policy</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">{accessJoinModeOption.label}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{accessJoinModeMeta.summary}</div>
                  </div>
                  <ReviewStatePill label={accessJoinModeMeta.riskLabel} tone={accessJoinModeMeta.tone} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Who can join</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{accessJoinModeMeta.audienceLabel}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{accessJoinModeMeta.audienceHelper}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Review path</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{accessJoinModeMeta.approvalLabel}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{accessJoinModeMeta.approvalHelper}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Update join settings</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Choose how codes behave before new members land in the workspace.
                </div>
                <div className="mt-4 space-y-4">
                  <FormField label="Join mode">
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
                  </FormField>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    {accessJoinModeOption.helper}
                  </div>
                  {joinSettingsDraft.joinMode === 'code_domain' ? (
                    <FormField label="Allowed email domain" helper="Required in this mode">
                      <input
                        value={joinSettingsDraft.allowedEmailDomain}
                        onChange={(event) =>
                          setJoinSettingsDraft((current) => ({ ...current, allowedEmailDomain: event.target.value }))
                        }
                        placeholder="school.edu"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </FormField>
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
                <div className="mt-1 text-sm text-muted-foreground">
                  Issue a tracked learner invite, then tighten or revoke it if the access surface changes.
                </div>
                <div className="mt-4 space-y-4">
                  <FormField label="Invite label" helper="Visible to admins">
                    <input
                      value={inviteDraft.label}
                      onChange={(event) => setInviteDraft((current) => ({ ...current, label: event.target.value }))}
                      placeholder="General learner access"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>
                  <FormField label="Invite email" helper="Optional direct target">
                    <input
                      value={inviteDraft.email}
                      onChange={(event) => setInviteDraft((current) => ({ ...current, email: event.target.value }))}
                      placeholder="learner@example.com"
                      className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </FormField>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    Every new invite lands as <span className="font-semibold text-foreground">Learner</span>. Promote access later only if the person needs coach or admin rights.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Max joins" helper={`${TEAM_INVITE_MIN_USES}-${selectedTeamInviteUsesCap}`}>
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
                        placeholder="25"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </FormField>
                    <FormField label="Expires in" helper={`${TEAM_INVITE_MIN_EXPIRES_DAYS}-${TEAM_INVITE_MAX_EXPIRES_DAYS} days`}>
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
                        placeholder="14"
                        className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </FormField>
                  </div>
                  {inviteDraft.id ? (
                    <FormField label="Status">
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
                    </FormField>
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Pending join requests</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {joinSettingsDraft.joinMode === 'code_approval'
                        ? 'Approve or deny code-based join requests here before those members enter the workspace.'
                        : 'Requests only appear when the join mode requires owner or admin approval.'}
                    </div>
                  </div>
                  <StatusPill>{pendingJoinRequests.length} pending</StatusPill>
                </div>
                <div className="mt-4 space-y-3">
                  {pendingJoinRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-4">
                      <div className="text-sm font-semibold text-foreground">
                        {joinSettingsDraft.joinMode === 'code_approval' ? 'Approval queue is clear' : 'Approval queue is off'}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {joinSettingsDraft.joinMode === 'code_approval'
                          ? 'New code joins will land here until an owner or admin reviews them.'
                          : 'Switch to Code + admin approval if you want new code joins to wait for review.'}
                      </div>
                    </div>
                  ) : (
                    pendingJoinRequests.map((request) => {
                        const approveKey = `approved-join-request-${request.id}`;
                        const denyKey = `denied-join-request-${request.id}`;
                        return (
                          <div key={request.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground">{request.userName}</div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {request.userEmail || 'No public email'} {request.inviteCode ? `| ${request.inviteCode}` : ''}
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Invite codes</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Track who each code is for, how much usage is left, and whether the invite surface is still acceptable.
                    </div>
                  </div>
                  <StatusPill>{activeInvites.length} active</StatusPill>
                </div>
                <div className="mt-4 space-y-4">
                  {(teamDetail.invites || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-4">
                      <div className="text-sm font-semibold text-foreground">No invite codes live yet</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Create a learner invite here, then promote members later only if they need broader workspace access.
                      </div>
                    </div>
                  ) : (
                    (teamDetail.invites || []).map((invite) => {
                      const deleteKey = `delete-invite-${invite.id}`;
                      const remainingUses = Math.max(0, invite.maxUses - invite.useCount);
                      const inviteStateTone = invite.status === 'active' ? 'success' : 'warn';
                      return (
                        <div key={invite.id} className="rounded-2xl border border-border bg-background p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-semibold text-foreground">{invite.label}</div>
                                <ReviewStatePill
                                  label={invite.status === 'active' ? 'Active' : invite.status === 'expired' ? 'Expired' : 'Revoked'}
                                  tone={inviteStateTone}
                                />
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                {invite.email || 'Reusable invite code'} {invite.createdAt ? `| Created ${formatRelativeActivityLabel(invite.createdAt)}` : ''}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <StatusPill>{invite.code}</StatusPill>
                                <StatusPill>{invite.role}</StatusPill>
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
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Remaining uses</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">
                                {remainingUses}/{invite.maxUses}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {invite.useCount === 0
                                  ? 'No joins claimed yet.'
                                  : `${invite.useCount} join${invite.useCount === 1 ? '' : 's'} already used this code.`}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Expires</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">{formatInviteExpiryLabel(invite.expiresAt)}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {invite.expiresAt ? 'Rotate old codes before they drift into casual sharing.' : 'This code stays live until you revoke it.'}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Last used</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">
                                {invite.lastUsedAt ? formatRelativeActivityLabel(invite.lastUsedAt) : 'Never used'}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {invite.lastUsedAt ? formatDateLabel(invite.lastUsedAt) : 'No member has joined with this code yet.'}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Created by</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">{invite.createdByName || 'Owner or admin'}</div>
                              <div className="mt-1 text-xs text-muted-foreground">Created {formatDateLabel(invite.createdAt)}</div>
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
          </div>
        </ModalShell>
      ) : null}

      {renderFeedbackModal()}

      {activeModal === 'analytics' && teamDetail ? (
        <ModalShell
          title="Team health and progress"
          subtitle="See who needs follow-up, where progress is moving, and which assignments are drifting."
          onClose={() => setActiveModal(null)}
        >
          {submittingKey === 'analytics' && !resolvedTeamAnalytics ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading analytics
              </div>
            </div>
          ) : resolvedTeamAnalytics ? (() => {
              const topPriorityLearner = resolvedTeamAnalytics.priorityLearners[0] || null;
              const topPriorityAssignment = resolvedTeamAnalytics.priorityAssignments[0] || null;
              const movementSummaryItems = [
                ['Improving', resolvedTeamAnalytics.movement.improvingLearners],
                ['Plateau', resolvedTeamAnalytics.movement.plateauLearners],
                ['Declining', resolvedTeamAnalytics.movement.decliningLearners],
                ['Retake ready', resolvedTeamAnalytics.movement.readyForRetake],
              ] as const;
              const priorityCards = [
                {
                  key: 'review',
                  tone: resolvedTeamAnalytics.workflow.needsReviewNow > 0 ? ('critical' as const) : ('positive' as const),
                  eyebrow: 'Review queue',
                  value:
                    resolvedTeamAnalytics.workflow.needsReviewNow > 0
                      ? `${resolvedTeamAnalytics.workflow.needsReviewNow} submission${resolvedTeamAnalytics.workflow.needsReviewNow === 1 ? '' : 's'} need coach review`
                      : 'Coach review queue is clear',
                  helper:
                    resolvedTeamAnalytics.workflow.needsRevision > 0
                      ? `${resolvedTeamAnalytics.workflow.needsRevision} submission${resolvedTeamAnalytics.workflow.needsRevision === 1 ? '' : 's'} already need another learner pass.`
                      : 'Open the review queue first, then clear learner follow-up and assignment drift.',
                  actionLabel: resolvedTeamAnalytics.workflow.needsReviewNow > 0 ? 'Review now' : 'Open queue',
                  onClick: openAnalyticsReviewQueue,
                },
                {
                  key: 'learners',
                  tone: topPriorityLearner?.tone || ('positive' as const),
                  eyebrow: 'Learners at risk',
                  value: topPriorityLearner
                    ? `${topPriorityLearner.name} is the next learner most likely to slip`
                    : 'No learner is slipping hard enough to force follow-up',
                  helper: topPriorityLearner
                    ? topPriorityLearner.reason
                    : 'No one is both quiet and benchmark-light enough to justify a priority learner pull right now.',
                  actionLabel: topPriorityLearner ? 'Open learner' : 'Queue is stable',
                  onClick: topPriorityLearner ? () => focusAnalyticsLearner(topPriorityLearner.userId) : undefined,
                },
                {
                  key: 'assignments',
                  tone: topPriorityAssignment
                    ? topPriorityAssignment.reviewBacklog > 0 || topPriorityAssignment.lifecycleState === 'past_due'
                      ? ('critical' as const)
                      : ('watch' as const)
                    : ('positive' as const),
                  eyebrow: 'Assignment pressure',
                  value: topPriorityAssignment
                    ? `${topPriorityAssignment.title} is the assignment pulling the most queue pressure`
                    : 'No assignment is drifting enough to force intervention',
                  helper: topPriorityAssignment
                    ? topPriorityAssignment.reason
                    : 'Due dates, completion, and review backlog all look stable for the current active assignment set.',
                  actionLabel: topPriorityAssignment
                    ? topPriorityAssignment.reviewBacklog > 0
                      ? 'Review assignment work'
                      : 'Open assignment'
                    : 'Open assignments',
                  onClick: topPriorityAssignment ? () => focusAnalyticsAssignment(topPriorityAssignment.id) : openAnalyticsAssignments,
                },
              ];

              return (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-foreground">What needs action now</div>
                    <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Start with the review queue, then pull quiet learners and drifting assignments back into motion.
                    </div>
                  </div>
                  <StatusPill tone={analyticsHasBenchmarkSignal ? 'default' : 'warn'}>
                    {analyticsHasBenchmarkSignal ? 'Benchmark signal live' : 'Benchmark signal missing'}
                  </StatusPill>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  {priorityCards.map((card) => {
                    const content = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <StatusPill tone={getAnalyticsStatusTone(card.tone)}>{card.eyebrow}</StatusPill>
                          {card.onClick ? <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" /> : null}
                        </div>
                        <div className="mt-4 text-lg font-semibold leading-tight text-foreground">{card.value}</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">{card.helper}</div>
                        <div className="mt-4 text-sm font-semibold text-foreground">{card.actionLabel}</div>
                      </>
                    );

                    if (!card.onClick) {
                      return (
                        <div key={card.key} className={`rounded-2xl border px-4 py-4 ${getAnalyticsSurfaceClassName(card.tone)}`}>
                          {content}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={card.key}
                        type="button"
                        onClick={card.onClick}
                        className={`rounded-2xl border px-4 py-4 text-left transition hover:border-primary/30 hover:bg-card ${getAnalyticsSurfaceClassName(card.tone)}`}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
                <div className="space-y-5">
                  
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-foreground">Learners who need follow-up</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          These learners are closest to slipping without a benchmark or corrective pass next.
                        </div>
                      </div>
                      <StatusPill tone={resolvedTeamAnalytics.priorityLearners.length ? 'warn' : 'success'}>
                        {resolvedTeamAnalytics.priorityLearners.length} shown
                      </StatusPill>
                    </div>
                    <div className="mt-4 space-y-3">
                      {resolvedTeamAnalytics.priorityLearners.length ? (
                        resolvedTeamAnalytics.priorityLearners.map((member) => (
                          <div
                            key={member.userId}
                            className={`rounded-2xl border px-4 py-4 ${getAnalyticsSurfaceClassName(member.tone)}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-foreground">{member.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{member.latestScore === null ? 'No benchmark yet' : `${member.latestScore}/100 latest`}</span>
                                  <span aria-hidden="true">|</span>
                                  <span>{formatRelativeActivityLabel(member.lastActiveAt)}</span>
                                  <span aria-hidden="true">|</span>
                                  <span>{member.improvementDelta === null ? 'No delta yet' : `${formatAnalyticsDelta(member.improvementDelta)} delta`}</span>
                                </div>
                              </div>
                              <StatusPill tone={getAnalyticsStatusTone(member.tone)}>{member.signal}</StatusPill>
                            </div>
                            <div className="mt-3 text-sm leading-6 text-foreground">{member.reason}</div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Next step:</span> {member.recommendedAction}
                              </div>
                              <button
                                type="button"
                                onClick={() => focusAnalyticsLearner(member.userId)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                              >
                                Open learner
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No learner needs urgent follow-up"
                          helper="There is no obvious benchmark or activity risk signal in the current learner set."
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-foreground">Assignments drifting</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            Focus on the assignments that are due, under-complete, or building review backlog.
                          </div>
                        </div>
                        <StatusPill tone={resolvedTeamAnalytics.priorityAssignments.length ? 'warn' : 'success'}>
                          {resolvedTeamAnalytics.priorityAssignments.length} shown
                        </StatusPill>
                      </div>
                      <div className="mt-4 space-y-3">
                        {resolvedTeamAnalytics.priorityAssignments.length ? (
                          resolvedTeamAnalytics.priorityAssignments.map((assignment) => {
                            const assignmentTone =
                              assignment.reviewBacklog > 0 || assignment.lifecycleState === 'past_due'
                                ? ('critical' as const)
                                : ('watch' as const);

                            return (
                              <div
                                key={assignment.id}
                                className={`rounded-2xl border px-4 py-4 ${getAnalyticsSurfaceClassName(assignmentTone)}`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-base font-semibold text-foreground">{assignment.title}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <span>{assignment.completionRate}% complete</span>
                                      <span aria-hidden="true">|</span>
                                      <span>{assignment.dueAt ? `Due ${formatDateLabel(assignment.dueAt)}` : 'No due date'}</span>
                                      <span aria-hidden="true">|</span>
                                      <span>{assignment.learnerCount} learners</span>
                                      {assignment.reviewBacklog > 0 ? (
                                        <>
                                          <span aria-hidden="true">|</span>
                                          <span>{assignment.reviewBacklog} waiting on review</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                  <StatusPill tone={getAnalyticsStatusTone(assignmentTone)}>{assignment.signal}</StatusPill>
                                </div>
                                <div className="mt-3 text-sm leading-6 text-foreground">{assignment.reason}</div>
                                <div className="mt-3 border-t border-border/70 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => focusAnalyticsAssignment(assignment.id)}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-primary/20 hover:bg-secondary"
                                  >
                                    {assignment.reviewBacklog > 0 ? 'Review assignment work' : 'Open assignment'}
                                    <ArrowRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                            <div className="font-semibold text-foreground">Assignments look stable</div>
                            <div className="mt-1">No active assignment is showing obvious due-date or completion risk right now.</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="text-base font-semibold text-foreground">Operational summary</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        Use the queue load first, then keep the clean signals that are actually helping.
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <MetricCard
                          label="Needs review now"
                          value={String(resolvedTeamAnalytics.workflow.needsReviewNow)}
                          helper="Coach-facing submission queue."
                        />
                        <MetricCard
                          label="Needs revision"
                          value={String(resolvedTeamAnalytics.workflow.needsRevision)}
                          helper="Learner submissions returned for another pass."
                        />
                        <MetricCard
                          label="Quiet 3d+"
                          value={String(resolvedTeamAnalytics.workflow.quietLearners3d)}
                          helper="Active learners with no recent movement."
                        />
                        <MetricCard
                          label="Feedback drafts"
                          value={String(resolvedTeamAnalytics.workflow.feedbackDrafts)}
                          helper="Coach notes not shared or resolved yet."
                        />
                      </div>
                      <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pressure next 7d</div>
                        <div className="mt-2 text-sm leading-6 text-foreground">
                          {resolvedTeamAnalytics.health.dueNext7d} due in the next 7 days | {resolvedTeamAnalytics.health.pastDueAssignments} past due |{' '}
                          {resolvedTeamAnalytics.health.pendingJoinRequests} pending join request
                          {resolvedTeamAnalytics.health.pendingJoinRequests === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Signals helping</div>
                        {resolvedTeamAnalytics.highlights.map((highlight) => (
                          <div key={highlight.title} className="rounded-2xl border border-border bg-card px-4 py-3">
                            <div className="text-sm font-semibold text-foreground">{highlight.title}</div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">{highlight.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-foreground">Performance movement</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Use benchmark coverage and the latest comparable score movement to decide whether the team is actually lifting.
                        </div>
                      </div>
                      <StatusPill tone={analyticsHasBenchmarkSignal ? 'default' : 'warn'}>
                        {analyticsHasBenchmarkSignal ? 'Comparable runs only' : 'Need more benchmark signal'}
                      </StatusPill>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricCard
                        label="Benchmark coverage"
                        value={`${resolvedTeamAnalytics.summary.benchmarkCoverageRate}%`}
                        helper={`${resolvedTeamAnalytics.summary.benchmarkedLearners}/${resolvedTeamAnalytics.summary.totalLearners} active learners benchmarked`}
                      />
                      {resolvedTeamAnalytics.movement.averageLatestScore !== null ? (
                        <MetricCard
                          label="Average latest score"
                          value={formatAnalyticsScore(resolvedTeamAnalytics.movement.averageLatestScore)}
                          helper="Latest benchmark only, not lifetime average."
                        />
                      ) : (
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Latest score read</div>
                          <div className="mt-2 text-lg font-semibold leading-tight text-foreground sm:text-xl">No comparable benchmark yet</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Take another comparable run before treating score movement as real.
                          </div>
                        </div>
                      )}
                      {analyticsHasMovementBreakdown ? (
                        <div className="sm:col-span-2 rounded-2xl border border-border bg-card px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Movement split</div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {movementSummaryItems.map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-semibold text-foreground">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="sm:col-span-2 mt-4 rounded-2xl border border-dashed border-border bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                          <div className="font-semibold text-foreground">No meaningful movement split yet</div>
                          <div className="mt-1">
                            The team does not have enough comparable benchmark history yet to separate improving, plateauing, or declining learners.
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Trend</div>
                          <div
                            className={`mt-2 text-sm font-semibold ${getAnalyticsTrendToneClassName(resolvedTeamAnalytics.trend.status)}`}
                          >
                            {formatAnalyticsTrendHeadline(
                              resolvedTeamAnalytics.trend.status,
                              resolvedTeamAnalytics.trend.deltaFromPrevious
                            )}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-muted-foreground">{resolvedTeamAnalytics.trend.summary}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">Weekly team average across comparable runs</div>
                      </div>
                      <div className="mt-5 space-y-3">
                        {resolvedTeamAnalytics.trend.points.map((point) => (
                          <div key={point.label} className="grid grid-cols-[72px_minmax(0,1fr)_70px] items-center gap-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {point.label}
                            </div>
                            <div className="rounded-full bg-background px-2 py-2">
                              <div className="h-2 rounded-full bg-border">
                                <div
                                  className={
                                    typeof point.value === 'number'
                                      ? 'h-2 rounded-full bg-primary'
                                      : 'h-2 rounded-full border border-dashed border-border bg-background'
                                  }
                                  style={{ width: `${typeof point.value === 'number' ? Math.max(point.value, 6) : 6}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-foreground">
                                {typeof point.value === 'number' ? `${point.value}/100` : '--'}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {point.count > 0 ? `${point.count} run${point.count === 1 ? '' : 's'}` : 'No runs'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {false ? (
                    <>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Workflow pressure x</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Use the operational load first: review backlog, revision loops, quiet learners, and due pressure.
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricCard
                        label="Needs review now"
                        value={String(resolvedTeamAnalytics.workflow.needsReviewNow)}
                        helper="Coach-facing submission queue."
                      />
                      <MetricCard
                        label="Needs revision"
                        value={String(resolvedTeamAnalytics.workflow.needsRevision)}
                        helper="Learner submissions returned for another pass."
                      />
                      <MetricCard
                        label="Quiet 3d+"
                        value={String(resolvedTeamAnalytics.workflow.quietLearners3d)}
                        helper="Active learners with no recent movement."
                      />
                      <MetricCard
                        label="Feedback drafts"
                        value={String(resolvedTeamAnalytics.workflow.feedbackDrafts)}
                        helper="Coach notes not shared or resolved yet."
                      />
                    </div>
                    <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-foreground">
                      <div className="font-semibold text-foreground">Upcoming pressure</div>
                      <div className="mt-2 text-muted-foreground">
                        {resolvedTeamAnalytics.health.dueNext7d} due in the next 7 days • {resolvedTeamAnalytics.health.pastDueAssignments} past due •{' '}
                        {resolvedTeamAnalytics.health.pendingJoinRequests} pending join request
                        {resolvedTeamAnalytics.health.pendingJoinRequests === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Positive signals</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Keep the signals that are actually helping: lift, retake readiness, or assignments still moving cleanly.
                    </div>
                    <div className="mt-4 space-y-3">
                      {resolvedTeamAnalytics.highlights.map((highlight) => (
                        <div key={highlight.title} className="rounded-2xl border border-border bg-card px-4 py-4">
                          <div className="text-sm font-semibold text-foreground">{highlight.title}</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">{highlight.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
              );
            })()
          : (
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
              : confirmWorkspaceAction.type === 'assignment_delete'
              ? confirmWorkspaceAction.assignments.length === 1
                ? `Delete ${confirmWorkspaceAction.assignments[0].title}?`
                : `Delete ${confirmWorkspaceAction.assignments.length} assignments?`
              : `Delete feedback for ${confirmWorkspaceAction.entry.memberName}?`
          }
          description={
            confirmWorkspaceAction.type === 'assignment_archive'
              ? 'This assignment will move to Archived and stop counting against the active assignment limit.'
              : confirmWorkspaceAction.type === 'assignment_delete'
              ? 'This permanently deletes the selected assignments from the queue. Any existing submissions and feedback stay in history, but the deleted assignments cannot be restored.'
              : 'This coaching note will be removed from the grading history.'
          }
          confirmLabel={
            confirmWorkspaceAction.type === 'assignment_archive'
              ? 'Confirm archive'
              : confirmWorkspaceAction.type === 'assignment_delete'
              ? confirmWorkspaceAction.assignments.length === 1
                ? 'Delete assignment'
                : 'Delete assignments'
              : 'Confirm delete'
          }
          tone={confirmWorkspaceAction.type === 'assignment_archive' ? 'default' : 'destructive'}
          busy={
            confirmWorkspaceAction.type === 'assignment_archive'
              ? submittingKey === `archive-assignment-${confirmWorkspaceAction.assignment.id}`
              : confirmWorkspaceAction.type === 'assignment_delete'
              ? submittingKey === 'bulk-assignment-delete'
              : submittingKey === `delete-feedback-${confirmWorkspaceAction.entry.id}`
          }
          onCancel={handleCancelWorkspaceAction}
          onConfirm={() => void handleConfirmWorkspaceAction()}
        />
      ) : null}
      {feedbackDiscardPrompt ? (
        <ConfirmActionDialog
          title={feedbackDiscardPrompt.title}
          description={feedbackDiscardPrompt.description}
          confirmLabel={feedbackDiscardPrompt.confirmLabel}
          tone="destructive"
          onCancel={cancelFeedbackDiscard}
          onConfirm={confirmFeedbackDiscard}
        />
      ) : null}
    </div>
  );
};

export default TeamsWorkspace;

