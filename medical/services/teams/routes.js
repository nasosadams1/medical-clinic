import express from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createAuthenticatedUserMiddleware, isPrivilegedAdmin } from '../auth-utils.js';
import { FRONTEND_URL } from '../email/config.js';
import { sendTransactionalEmail } from '../email/mailer.js';
import { buildTeamInviteEmail } from '../email/templates.js';
import {
  TEAM_PLAN_POLICY_NONE,
  TEAM_PLAN_POLICIES,
  getTeamPlanPolicyFromSeatLimit,
  resolveTeamPlanPolicy,
} from '../../shared/team-plan-policy.js';

const TEAM_USE_CASES = ['bootcamps', 'universities', 'coding-clubs', 'upskilling', 'general'];
const ASSIGNMENT_TYPES = ['benchmark', 'challenge_pack', 'roadmap'];
const BENCHMARK_LANGUAGES = ['python', 'javascript', 'java', 'cpp'];
const TEAM_FEEDBACK_STATUSES = ['draft', 'shared', 'resolved'];
const TEAM_JOIN_MODES = ['open_code', 'code_domain', 'code_approval', 'invite_only'];

const CreateTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(''),
  useCase: z.enum(TEAM_USE_CASES).optional().default('bootcamps'),
  seatLimit: z.number().int().min(1).max(1000).optional().default(1000),
});

const CreateInviteSchema = z.object({
  label: z.string().trim().max(80).optional().default('General learner access'),
  email: z.union([z.string().trim().email(), z.literal('')]).optional().transform((value) => value || null),
  role: z.enum(['admin', 'coach', 'learner']).optional().default('learner'),
  expiresInDays: z.number().int().min(1).max(90).optional().default(14),
  maxUses: z.number().int().min(1).max(500).optional().default(25),
});

const JoinTeamSchema = z.object({
  code: z.string().trim().min(4).max(32),
});

const UpdateJoinSettingsSchema = z
  .object({
    joinMode: z.enum(TEAM_JOIN_MODES),
    allowedEmailDomain: z
      .union([z.string().trim().min(1).max(160), z.literal(''), z.null()])
      .optional()
      .transform((value) => (typeof value === 'string' ? value.trim() : value ?? null)),
  })
  .superRefine((value, ctx) => {
    if (value.joinMode === 'code_domain' && !String(value.allowedEmailDomain || '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowedEmailDomain'],
        message: 'Email domain restriction requires an allowed domain.',
      });
    }
  });

const CreateAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(''),
  assignmentType: z.enum(ASSIGNMENT_TYPES),
  benchmarkLanguage: z.union([z.enum(BENCHMARK_LANGUAGES), z.null()]).optional().default(null),
  trackId: z.union([z.string().trim().min(1).max(120), z.null()]).optional().default(null),
  dueAt: z.union([z.string().trim().min(1).max(80), z.null()]).optional().default(null),
});

const UpdateAssignmentSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    assignmentType: z.enum(ASSIGNMENT_TYPES).optional(),
    benchmarkLanguage: z.union([z.enum(BENCHMARK_LANGUAGES), z.null()]).optional(),
    trackId: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
    dueAt: z.union([z.string().trim().min(1).max(80), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one assignment field to update.',
  });

const UpdateInviteSchema = z
  .object({
    label: z.string().trim().max(80).optional(),
    email: z.union([z.string().trim().email(), z.literal('')]).optional().transform((value) => (value === '' ? null : value)),
    role: z.enum(['admin', 'coach', 'learner']).optional(),
    expiresInDays: z.number().int().min(1).max(90).optional(),
    maxUses: z.number().int().min(1).max(500).optional(),
    status: z.enum(['active', 'expired', 'revoked']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one invite field to update.',
  });

const UpdateMembershipSchema = z
  .object({
    role: z.enum(['admin', 'coach', 'learner']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one membership field to update.',
  });

const CreateFeedbackSchema = z.object({
  memberUserId: z.string().uuid(),
  assignmentId: z.union([z.string().uuid(), z.null()]).optional().default(null),
  rubricScore: z.union([z.number().int().min(0).max(100), z.null()]).optional().default(null),
  status: z.enum(TEAM_FEEDBACK_STATUSES).optional().default('draft'),
  summary: z.string().trim().max(800).optional().default(''),
  strengths: z.string().trim().max(800).optional().default(''),
  focusAreas: z.string().trim().max(800).optional().default(''),
  coachNotes: z.string().trim().max(1600).optional().default(''),
  sharedWithMember: z.boolean().optional().default(false),
});

const UpdateFeedbackSchema = z
  .object({
    assignmentId: z.union([z.string().uuid(), z.null()]).optional(),
    rubricScore: z.union([z.number().int().min(0).max(100), z.null()]).optional(),
    status: z.enum(TEAM_FEEDBACK_STATUSES).optional(),
    summary: z.string().trim().max(800).optional(),
    strengths: z.string().trim().max(800).optional(),
    focusAreas: z.string().trim().max(800).optional(),
    coachNotes: z.string().trim().max(1600).optional(),
    sharedWithMember: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one feedback field to update.',
  });

const TeamRouteParamsSchema = z.object({
  teamId: z.string().uuid(),
});

const TeamMemberRouteParamsSchema = TeamRouteParamsSchema.extend({
  userId: z.string().uuid(),
});

const TeamInviteRouteParamsSchema = TeamRouteParamsSchema.extend({
  inviteId: z.string().uuid(),
});

const TeamAssignmentRouteParamsSchema = TeamRouteParamsSchema.extend({
  assignmentId: z.string().uuid(),
});

const TeamFeedbackRouteParamsSchema = TeamRouteParamsSchema.extend({
  feedbackId: z.string().uuid(),
});

const TeamJoinRequestRouteParamsSchema = TeamRouteParamsSchema.extend({
  requestId: z.string().uuid(),
});

const TeamExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
});

const ReviewJoinRequestSchema = z.object({
  status: z.enum(['approved', 'denied']),
  note: z.string().trim().max(500).optional().default(''),
});

const SharedTeamRouteParamsSchema = z.object({
  publicToken: z.string().trim().min(8).max(64),
});

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'team';

const buildInviteCode = () => `CODH-${randomBytes(3).toString('hex').toUpperCase()}`;

const buildPublicShareToken = () => randomBytes(12).toString('hex');

const normalizeEmailDomain = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');

  return normalized || null;
};

const getEmailDomain = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return null;
  return normalizeEmailDomain(normalized.slice(atIndex + 1));
};

const inviteMatchesUserEmail = (invite, authenticatedUser) => {
  const inviteEmail = String(invite?.email || '').trim().toLowerCase();
  if (!inviteEmail) return true;
  const userEmail = String(authenticatedUser?.email || '').trim().toLowerCase();
  return Boolean(userEmail && userEmail === inviteEmail);
};

const buildTeamInviteJoinUrl = (inviteCode) =>
  `${FRONTEND_URL}/app?section=teams&invite=${encodeURIComponent(inviteCode)}`;

const isValidDateInput = (value) => {
  if (!value) return true;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const getMedian = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
  }
  return sorted[midpoint];
};

const getAverage = (values) => {
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

const escapeCsvValue = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const createCsvSection = (title, rows) => [title, ...rows.map((row) => row.map(escapeCsvValue).join(',')), ''].join('\n');

const formatPublicMemberName = (name) => {
  const normalized = String(name || 'Codhak learner').trim();
  if (!normalized) return 'Codhak learner';

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

const buildStarterAssignments = (useCase, userId) => {
  const benchmarkTitle =
    useCase === 'upskilling'
      ? 'Junior screening benchmark'
      : useCase === 'universities'
      ? 'Class benchmark'
      : 'Initial cohort benchmark';

  return [
    {
      title: benchmarkTitle,
      description: 'Run the first benchmark to establish a shared baseline and identify who needs a guided path first.',
      assignment_type: 'benchmark',
      benchmark_language: 'python',
      track_id: null,
      due_at: null,
      created_by: userId,
      metadata: { seeded: true },
    },
    {
      title: 'Roadmap follow-up',
      description: 'Assign the recommended practice path after the first benchmark report is in.',
      assignment_type: 'roadmap',
      benchmark_language: null,
      track_id: 'junior-developer-screening',
      due_at: null,
      created_by: userId,
      metadata: { seeded: true },
    },
  ];
};

const isManagerRole = (role) => role === 'owner' || role === 'admin' || role === 'coach';

const loadActiveMembershipsForUser = async (supabaseAdmin, userId) => {
  const { data, error } = await supabaseAdmin
    .from('skill_team_memberships')
    .select('team_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message || 'Could not load active team memberships.');
  }

  return data || [];
};

const countUserMembershipsByRole = (memberships, excludeTeamId = null) =>
  memberships.reduce(
    (accumulator, membership) => {
      if (excludeTeamId && membership.team_id === excludeTeamId) {
        return accumulator;
      }

      if (isManagerRole(membership.role)) {
        accumulator.manager += 1;
      } else {
        accumulator.learner += 1;
      }

      return accumulator;
    },
    { learner: 0, manager: 0 }
  );

const ensureMembershipLimitAvailable = async ({
  supabaseAdmin,
  userId,
  nextRole,
  teamPolicy,
  teamId,
}) => {
  const activeMemberships = await loadActiveMembershipsForUser(supabaseAdmin, userId);
  const counts = countUserMembershipsByRole(activeMemberships, teamId);

  if (isManagerRole(nextRole)) {
    const limit = Number(teamPolicy?.managerMembershipLimit || TEAM_PLAN_POLICY_NONE.managerMembershipLimit || 0);
    if (limit > 0 && counts.manager >= limit) {
      throw new Error(
        `This role is limited to ${limit} active team workspace${limit === 1 ? '' : 's'} on this plan.`
      );
    }
    return;
  }

  const limit = Number(teamPolicy?.learnerMembershipLimit || TEAM_PLAN_POLICY_NONE.learnerMembershipLimit || 3);
  if (counts.learner >= limit) {
    throw new Error(`Learners can only join ${limit} active team${limit === 1 ? '' : 's'} at a time.`);
  }
};

const loadMembership = async (supabaseAdmin, teamId, userId) => {
  const { data, error } = await supabaseAdmin
    .from('skill_team_memberships')
    .select('team_id, user_id, role, status, joined_at')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not load team membership.');
  }

  return data;
};

const ensureTeamAccess = async (supabaseAdmin, teamId, userId, authenticatedUser = null) => {
  const membership = await loadMembership(supabaseAdmin, teamId, userId);
  if (!membership || membership.status !== 'active') {
    if (isPrivilegedAdmin(authenticatedUser)) {
      return {
        team_id: teamId,
        user_id: userId,
        role: 'owner',
        status: 'active',
        joined_at: null,
        is_admin_override: true,
      };
    }

    throw new Error('You do not have access to this team.');
  }
  return membership;
};

const ensureTeamRole = (membership, allowedRoles) => {
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error('You do not have permission to manage this team.');
  }
};

const ensureInviteRoleAllowed = (inviteRole) => {
  if (inviteRole && inviteRole !== 'learner') {
    throw new Error('Invites can only create learner access. Promote members after they join.');
  }
};

const ensureRoleTransitionAllowed = (actorMembership, targetMembership, nextRole) => {
  if (nextRole === 'owner' && targetMembership.role !== 'owner') {
    throw new Error('Owner role changes are not supported from the team workspace.');
  }

  if (actorMembership.role === 'owner') {
    return;
  }

  if (actorMembership.role !== 'admin') {
    throw new Error('Only owners and admins can change team roles.');
  }

  if (targetMembership.role === 'owner' || targetMembership.role === 'admin') {
    throw new Error('Admins can only manage coaches and learners.');
  }

  if (nextRole === 'admin' || nextRole === 'owner') {
    throw new Error('Only owners can assign admin access.');
  }
};

const ensureAssignmentPayloadIsValid = (payload) => {
  const isRoadmap = payload.assignmentType === 'roadmap';

  if (!isValidDateInput(payload.dueAt)) {
    throw new Error('Assignment due date is invalid.');
  }

  if (isRoadmap) {
    if (!payload.trackId) {
      throw new Error('Roadmap assignments require a track.');
    }
    if (payload.benchmarkLanguage) {
      throw new Error('Roadmap assignments cannot also set a benchmark language.');
    }
    return;
  }

  if (!payload.benchmarkLanguage) {
    throw new Error('Benchmark and challenge assignments require a language.');
  }
  if (payload.trackId) {
    throw new Error('Only roadmap assignments can include a track.');
  }
};

const loadTeamAssignment = async (supabaseAdmin, teamId, assignmentId) => {
  const { data, error } = await supabaseAdmin
    .from('skill_team_assignments')
    .select('*')
    .eq('team_id', teamId)
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Could not load that assignment.');
  }

  return data;
};

const ensureFeedbackTargetsAreValid = async (supabaseAdmin, teamId, memberUserId, assignmentId = null) => {
  const targetMembership = await loadMembership(supabaseAdmin, teamId, memberUserId);

  if (!targetMembership) {
    throw new Error('The selected learner is not part of this team.');
  }

  if (targetMembership.role !== 'learner') {
    throw new Error('Feedback can only be attached to learner accounts.');
  }

  if (assignmentId) {
    const assignment = await loadTeamAssignment(supabaseAdmin, teamId, assignmentId);
    if (!assignment) {
      throw new Error('The selected assignment does not belong to this team.');
    }
  }

  return targetMembership;
};

const ensureOwnerStateChangeAllowed = async (supabaseAdmin, teamId, actorMembership, targetMembership, parsedUpdate) => {
  if (targetMembership.role !== 'owner') {
    return;
  }

  if (actorMembership.role !== 'owner') {
    throw new Error('Only an owner can manage another owner.');
  }

  if (parsedUpdate.role !== undefined && parsedUpdate.role !== 'owner') {
    throw new Error('Owner role changes are not supported from the team workspace.');
  }

  if (parsedUpdate.status !== 'inactive') {
    return;
  }

  const { data: owners, error } = await supabaseAdmin
    .from('skill_team_memberships')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('role', 'owner')
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message || 'Could not validate team ownership.');
  }

  if ((owners || []).length <= 1) {
    throw new Error('The last owner must stay active.');
  }
};

const buildProgressTimeline = (reports) => {
  const now = Date.now();
  return Array.from({ length: 4 }, (_, index) => {
    const bucketIndex = 3 - index;
    const bucketStart = now - (bucketIndex + 1) * 7 * 24 * 60 * 60 * 1000;
    const bucketEnd = now - bucketIndex * 7 * 24 * 60 * 60 * 1000;
    const bucketReports = reports.filter((report) => {
      const reportTime = new Date(report.created_at).getTime();
      return reportTime >= bucketStart && reportTime < bucketEnd;
    });
    const average =
      bucketReports.length > 0
        ? Math.round(
            bucketReports.reduce((total, report) => total + Number(report.overall_score || 0), 0) / bucketReports.length
          )
        : null;

    return {
      label: `Week ${index + 1}`,
      value: average,
    };
  });
};

const createUniquePublicTeamToken = async (supabaseAdmin) => {
  for (let index = 0; index < 8; index += 1) {
    const candidate = buildPublicShareToken();
    const { data, error } = await supabaseAdmin
      .from('skill_teams')
      .select('id')
      .eq('public_token', candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Could not create a team proof token.');
    }

    if (!data) {
      return candidate;
    }
  }

  return `${buildPublicShareToken()}${Date.now().toString().slice(-4)}`;
};

const createUniqueInviteCode = async (supabaseAdmin) => {
  for (let index = 0; index < 8; index += 1) {
    const candidate = buildInviteCode();
    const { data, error } = await supabaseAdmin
      .from('skill_team_invites')
      .select('id')
      .eq('code', candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Could not create an invite code.');
    }

    if (!data) {
      return candidate;
    }
  }

  return `${buildInviteCode()}${Date.now().toString().slice(-4)}`;
};

const createDefaultJoinInvite = async (supabaseAdmin, { teamId, createdBy, maxUses }) => {
  const code = await createUniqueInviteCode(supabaseAdmin);
  const { error } = await supabaseAdmin.from('skill_team_invites').insert({
    team_id: teamId,
    code,
    label: 'General learner access',
    email: null,
    role: 'learner',
    max_uses: maxUses,
    use_count: 0,
    status: 'active',
    expires_at: null,
    created_by: createdBy,
  });

  if (error) {
    throw new Error(error.message || 'Could not create the default join code.');
  }
};

const serializeJoinRequest = (requestRow, profileMap = new Map(), inviteMap = new Map()) => ({
  id: requestRow.id,
  userId: requestRow.user_id,
  userName: profileMap.get(requestRow.user_id)?.name || profileMap.get(requestRow.user_id)?.email || 'Learner',
  userEmail: profileMap.get(requestRow.user_id)?.email || null,
  requestedRole: requestRow.requested_role,
  status: requestRow.status,
  note: requestRow.note || '',
  inviteId: requestRow.invite_id || null,
  inviteCode: requestRow.invite_id ? inviteMap.get(requestRow.invite_id)?.code || null : null,
  inviteLabel: requestRow.invite_id ? inviteMap.get(requestRow.invite_id)?.label || null : null,
  reviewedByUserId: requestRow.reviewed_by_user_id || null,
  reviewedByName: requestRow.reviewed_by_user_id
    ? profileMap.get(requestRow.reviewed_by_user_id)?.name || profileMap.get(requestRow.reviewed_by_user_id)?.email || 'Reviewer'
    : null,
  requestedAt: requestRow.requested_at,
  reviewedAt: requestRow.reviewed_at || null,
});

const getRecommendedTeamAction = ({ latestScore, improvementDelta, latestBenchmarkAt }) => {
  if (latestScore === null || latestScore === undefined) {
    return 'Needs first benchmark';
  }

  const benchmarkAgeDays = latestBenchmarkAt
    ? Math.floor((Date.now() - new Date(latestBenchmarkAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (latestScore < 55) {
    return 'Needs guided practice';
  }

  if ((improvementDelta !== null && improvementDelta >= 8) || (benchmarkAgeDays !== null && benchmarkAgeDays >= 7)) {
    return 'Ready for retake';
  }

  if (latestScore >= 80) {
    return 'Ready for competitive proof';
  }

  return 'Continue roadmap';
};

const buildTeamDetail = ({
  team,
  memberships,
  profiles,
  assignments,
  invites,
  reports,
  feedback = [],
  joinRequests = [],
  authActivityByUserId = new Map(),
}) => {
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const assignmentMap = new Map((assignments || []).map((assignment) => [assignment.id, assignment]));
  const inviteMap = new Map((invites || []).map((invite) => [invite.id, invite]));
  const latestReportsByUser = new Map();
  const reportsByUser = new Map();

  [...reports]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .forEach((report) => {
      if (!latestReportsByUser.has(report.user_id)) {
        latestReportsByUser.set(report.user_id, report);
      }

      const existing = reportsByUser.get(report.user_id) || [];
      existing.push(report);
      reportsByUser.set(report.user_id, existing);
    });

  const members = memberships.map((membership) => {
    const profile = profileMap.get(membership.user_id);
    const activityPresence = authActivityByUserId.get(membership.user_id);
    const memberReports = reportsByUser.get(membership.user_id) || [];
    const orderedReports = [...memberReports].sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
    const latestReport = latestReportsByUser.get(membership.user_id);
    const earliestReport = orderedReports[0];
    const improvementDelta =
      orderedReports.length >= 2
        ? Number(latestReport?.overall_score || 0) - Number(earliestReport?.overall_score || 0)
        : null;
    const latestScore = latestReport ? Number(latestReport.overall_score || 0) : null;
    const lastActiveAt =
      [activityPresence?.lastActiveAt, latestReport?.created_at]
        .filter(Boolean)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;
    const isCurrentlyActive = Boolean(activityPresence?.isCurrentlyActive);

    return {
      userId: membership.user_id,
      name: profile?.name || profile?.email || 'Codhak learner',
      email: profile?.email || null,
      avatar: profile?.current_avatar || 'default',
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joined_at,
      lastActiveAt,
      isCurrentlyActive,
      currentStreak: Number(profile?.current_streak || 0),
      latestBenchmarkScore: latestScore,
      latestBenchmarkAt: latestReport?.created_at || null,
      benchmarkCount: orderedReports.length,
      improvementDelta,
      latestBenchmarkStatus: latestReport ? 'Benchmarked' : 'Benchmark pending',
      recommendedAction: getRecommendedTeamAction({
        latestScore,
        improvementDelta,
        latestBenchmarkAt: latestReport?.created_at || null,
      }),
    };
  });

  const completedScores = members
    .map((member) => member.latestBenchmarkScore)
    .filter((value) => typeof value === 'number');

  const improvementDeltas = Array.from(reportsByUser.values())
    .filter((entries) => entries.length >= 2)
    .map((entries) => {
      const ordered = [...entries].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
      return Number(ordered[ordered.length - 1]?.overall_score || 0) - Number(ordered[0]?.overall_score || 0);
    });

  const topPerformer = [...members]
    .filter((member) => typeof member.latestBenchmarkScore === 'number')
    .sort((left, right) => Number(right.latestBenchmarkScore || 0) - Number(left.latestBenchmarkScore || 0))[0] || null;

  return {
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      useCase: team.use_case,
      seatLimit: team.seat_limit,
      joinMode: team.join_mode || 'open_code',
      allowedEmailDomain: normalizeEmailDomain(team.allowed_email_domain),
      memberCount: members.length,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      isPublic: Boolean(team.is_public),
      shareToken: team.public_token || null,
      publicSharedAt: team.public_shared_at || null,
    },
    metrics: {
      activeLearners: members.filter((member) => member.status === 'active').length,
      benchmarkCompletionCount: completedScores.length,
      benchmarkCompletionRate: members.length > 0 ? Math.round((completedScores.length / members.length) * 100) : 0,
      medianScore: getMedian(completedScores),
      averageImprovement: improvementDeltas.length
        ? Math.round(improvementDeltas.reduce((total, value) => total + value, 0) / improvementDeltas.length)
        : null,
      needsAttentionCount: members.filter(
        (member) => member.latestBenchmarkScore === null || Number(member.latestBenchmarkScore || 0) < 55
      ).length,
      retakeReadyCount: members.filter((member) => member.recommendedAction === 'Ready for retake').length,
      topPerformer: topPerformer
        ? {
            name: topPerformer.name,
            score: topPerformer.latestBenchmarkScore,
            streak: topPerformer.currentStreak,
          }
        : null,
      progressTimeline: buildProgressTimeline(reports),
    },
    members,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      assignmentType: assignment.assignment_type,
      benchmarkLanguage: assignment.benchmark_language,
      trackId: assignment.track_id,
      dueAt: assignment.due_at,
      createdAt: assignment.created_at,
      metadata: assignment.metadata || {},
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      code: invite.code,
      label: invite.label,
      email: invite.email,
      role: invite.role,
      maxUses: invite.max_uses,
      useCount: invite.use_count,
      expiresAt: invite.expires_at,
      status: invite.status,
      createdAt: invite.created_at,
    })),
    joinRequests: joinRequests
      .slice()
      .sort((left, right) => new Date(right.requested_at).getTime() - new Date(left.requested_at).getTime())
      .map((entry) => serializeJoinRequest(entry, profileMap, inviteMap)),
    feedback: feedback.map((entry) => ({
      id: entry.id,
      memberUserId: entry.member_user_id,
      memberName: profileMap.get(entry.member_user_id)?.name || profileMap.get(entry.member_user_id)?.email || 'Learner',
      assignmentId: entry.assignment_id,
      assignmentTitle: entry.assignment_id ? assignmentMap.get(entry.assignment_id)?.title || null : null,
      authorUserId: entry.author_user_id,
      authorName: profileMap.get(entry.author_user_id)?.name || profileMap.get(entry.author_user_id)?.email || 'Coach',
      rubricScore: entry.rubric_score,
      status: entry.status,
      summary: entry.summary || '',
      strengths: entry.strengths || '',
      focusAreas: entry.focus_areas || '',
      coachNotes: entry.coach_notes || '',
      sharedWithMember: Boolean(entry.shared_with_member),
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })),
  };
};

const loadAuthActivityByUserIds = async (supabaseAdmin, userIds = []) => {
  if (!userIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from('user_activity_presence')
    .select('user_id, last_active_at, active_session_expires_at')
    .in('user_id', userIds);

  if (error) {
    return new Map();
  }

  return new Map(
    (data || []).map((entry) => [
      entry.user_id,
      {
        lastActiveAt: entry.last_active_at || null,
        isCurrentlyActive:
          Boolean(entry.active_session_expires_at) &&
          new Date(entry.active_session_expires_at).getTime() > Date.now(),
      },
    ])
  );
};

const buildPublicTeamProof = ({ detail }) => ({
  team: {
    id: detail.team.id,
    name: detail.team.name,
    slug: detail.team.slug,
    description: detail.team.description,
    useCase: detail.team.useCase,
    memberCount: detail.team.memberCount,
    publicSharedAt: detail.team.publicSharedAt || null,
  },
  metrics: detail.metrics,
  assignments: detail.assignments.slice(0, 4).map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    assignmentType: assignment.assignmentType,
    benchmarkLanguage: assignment.benchmarkLanguage,
    dueAt: assignment.dueAt,
  })),
  improvementLeaders: [...detail.members]
    .filter((member) => member.improvementDelta !== null || member.latestBenchmarkScore !== null)
    .sort((left, right) => {
      const deltaDifference = Number(right.improvementDelta || -Infinity) - Number(left.improvementDelta || -Infinity);
      if (deltaDifference !== 0 && Number.isFinite(deltaDifference)) {
        return deltaDifference;
      }

      return Number(right.latestBenchmarkScore || 0) - Number(left.latestBenchmarkScore || 0);
    })
    .slice(0, 6)
    .map((member) => ({
      userId: member.userId,
      publicName: formatPublicMemberName(member.name),
      latestBenchmarkScore: member.latestBenchmarkScore,
      improvementDelta: member.improvementDelta,
      benchmarkCount: member.benchmarkCount,
      recommendedAction: member.recommendedAction,
    })),
});

const createUniqueTeamSlug = async (supabaseAdmin, name) => {
  const base = slugify(name);
  let candidate = base;

  for (let index = 0; index < 8; index += 1) {
    const { data, error } = await supabaseAdmin
      .from('skill_teams')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Could not validate team slug.');
    }

    if (!data) {
      return candidate;
    }

    candidate = `${base}-${index + 2}`;
  }

  return `${base}-${Date.now().toString().slice(-4)}`;
};

const loadActiveTeamEntitlements = async (supabaseAdmin, userId) => {
  const { data, error } = await supabaseAdmin
    .from('plan_entitlements')
    .select('plan_name, item_id, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message || 'Could not load team plan entitlements.');
  }

  const activeRows = (data || []).filter((entry) => {
    const expiresAt = new Date(entry.current_period_end || '').getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  });

  return activeRows;
};

const resolveUserTeamPlanPolicy = async (supabaseAdmin, authenticatedUser) => {
  if (isPrivilegedAdmin(authenticatedUser)) {
    return TEAM_PLAN_POLICIES.custom;
  }

  const entitlements = await loadActiveTeamEntitlements(supabaseAdmin, authenticatedUser.id);
  return resolveTeamPlanPolicy(entitlements.map((entry) => entry.plan_name));
};

const ensureWorkspaceCreationAllowed = async (supabaseAdmin, authenticatedUser) => {
  const policy = await resolveUserTeamPlanPolicy(supabaseAdmin, authenticatedUser);
  if (policy.workspaceLimit <= 0) {
    throw new Error('An active Teams plan is required before you can create a team.');
  }

  if (isPrivilegedAdmin(authenticatedUser)) {
    return policy;
  }

  await ensureMembershipLimitAvailable({
    supabaseAdmin,
    userId: authenticatedUser.id,
    nextRole: 'owner',
    teamPolicy: policy,
    teamId: null,
  });

  const { count, error } = await supabaseAdmin
    .from('skill_teams')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', authenticatedUser.id);

  if (error) {
    throw new Error(error.message || 'Could not validate your team workspace limit.');
  }

  if (Number(count || 0) >= policy.workspaceLimit) {
    throw new Error(
      policy.supportsMultiCohort
        ? `Your ${policy.label} plan has reached its workspace limit of ${policy.workspaceLimit}.`
        : `Your ${policy.label} plan includes ${policy.workspaceLimit} team workspace. Upgrade to Teams Growth for multi-cohort access.`
    );
  }

  return policy;
};

const ensureTeamCapacityAvailable = async (supabaseAdmin, teamId, nextSeatCount = 1) => {
  const [{ data: team, error: teamError }, { count: activeMembers, error: memberError }] = await Promise.all([
    supabaseAdmin.from('skill_teams').select('id, seat_limit').eq('id', teamId).single(),
    supabaseAdmin
      .from('skill_team_memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active'),
  ]);

  if (teamError || !team) {
    throw new Error(teamError?.message || 'Could not load the team seat limit.');
  }

  if (memberError) {
    throw new Error(memberError.message || 'Could not validate current team capacity.');
  }

  if (Number(activeMembers || 0) + nextSeatCount > Number(team.seat_limit || 0)) {
    throw new Error(`This team is at capacity for its plan (${team.seat_limit} seats).`);
  }

  return team;
};

const loadTeamWorkspaceResources = async (supabaseAdmin, teamId) => {
  const [
    { data: team, error: teamError },
    { data: memberships, error: membershipsError },
    { data: assignments, error: assignmentsError },
    { data: invites, error: invitesError },
    { data: feedback, error: feedbackError },
    { data: joinRequests, error: joinRequestsError },
  ] = await Promise.all([
    supabaseAdmin.from('skill_teams').select('*').eq('id', teamId).single(),
    supabaseAdmin.from('skill_team_memberships').select('*').eq('team_id', teamId).order('joined_at', { ascending: true }),
    supabaseAdmin.from('skill_team_assignments').select('*').eq('team_id', teamId).order('created_at', { ascending: false }),
    supabaseAdmin.from('skill_team_invites').select('*').eq('team_id', teamId).order('created_at', { ascending: false }),
    supabaseAdmin.from('skill_team_feedback').select('*').eq('team_id', teamId).order('updated_at', { ascending: false }),
    supabaseAdmin.from('skill_team_join_requests').select('*').eq('team_id', teamId).order('requested_at', { ascending: false }),
  ]);

  const firstError = teamError || membershipsError || assignmentsError || invitesError || feedbackError || joinRequestsError;
  if (firstError || !team) {
    throw new Error(firstError?.message || 'Could not load team workspace.');
  }

  const userIds = Array.from(
    new Set(
      [
        ...(memberships || []).map((entry) => entry.user_id),
        ...(feedback || []).flatMap((entry) => [entry.member_user_id, entry.author_user_id].filter(Boolean)),
        ...(joinRequests || []).flatMap((entry) => [entry.user_id, entry.reviewed_by_user_id].filter(Boolean)),
      ].filter(Boolean)
    )
  );

  const [{ data: profiles, error: profilesError }, { data: reports, error: reportsError }, authActivityByUserId] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from('user_profiles').select('id, name, email, current_avatar, current_streak, updated_at').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabaseAdmin.from('benchmark_reports').select('user_id, overall_score, created_at').in('user_id', userIds).order('created_at', { ascending: false }).limit(1000)
      : Promise.resolve({ data: [], error: null }),
    loadAuthActivityByUserIds(supabaseAdmin, userIds),
  ]);

  if (profilesError || reportsError) {
    throw new Error(profilesError?.message || reportsError?.message || 'Could not load team analytics.');
  }

  return {
    team,
    memberships: memberships || [],
    assignments: assignments || [],
    invites: invites || [],
    joinRequests: joinRequests || [],
    feedback: feedback || [],
    profiles: profiles || [],
    reports: reports || [],
    authActivityByUserId,
  };
};

const buildTeamAnalytics = ({ detail }) => {
  const scoreBands = [
    { label: '0-54', count: 0 },
    { label: '55-69', count: 0 },
    { label: '70-84', count: 0 },
    { label: '85-100', count: 0 },
  ];
  const roleDistribution = {
    owner: 0,
    admin: 0,
    coach: 0,
    learner: 0,
  };
  const recency = {
    recent: 0,
    warm: 0,
    stale: 0,
    missing: 0,
  };

  detail.members.forEach((member) => {
    roleDistribution[member.role] += 1;

    const score = member.latestBenchmarkScore;
    if (typeof score === 'number') {
      if (score < 55) scoreBands[0].count += 1;
      else if (score < 70) scoreBands[1].count += 1;
      else if (score < 85) scoreBands[2].count += 1;
      else scoreBands[3].count += 1;
    }

    if (!member.latestBenchmarkAt) {
      recency.missing += 1;
      return;
    }

    const ageDays = Math.floor((Date.now() - new Date(member.latestBenchmarkAt).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 7) recency.recent += 1;
    else if (ageDays <= 30) recency.warm += 1;
    else recency.stale += 1;
  });

  const inviteStats = {
    total: detail.invites.length,
    active: detail.invites.filter((invite) => invite.status === 'active').length,
    expired: detail.invites.filter((invite) => invite.status === 'expired').length,
    revoked: detail.invites.filter((invite) => invite.status === 'revoked').length,
    uses: detail.invites.reduce((total, invite) => total + Number(invite.useCount || 0), 0),
  };

  const assignmentStats = {
    total: detail.assignments.length,
    benchmark: detail.assignments.filter((assignment) => assignment.assignmentType === 'benchmark').length,
    challengePack: detail.assignments.filter((assignment) => assignment.assignmentType === 'challenge_pack').length,
    roadmap: detail.assignments.filter((assignment) => assignment.assignmentType === 'roadmap').length,
    dueSoon: detail.assignments.filter((assignment) => {
      if (!assignment.dueAt) return false;
      const dueAt = new Date(assignment.dueAt).getTime();
      return dueAt >= Date.now() && dueAt <= Date.now() + 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  const streakValues = detail.members.map((member) => Number(member.currentStreak || 0));
  const benchmarkValues = detail.members
    .map((member) => member.latestBenchmarkScore)
    .filter((value) => typeof value === 'number');

  return {
    scoreBands,
    roleDistribution,
    recency,
    inviteStats,
    assignmentStats,
    streakStats: {
      average: getAverage(streakValues),
      highest: streakValues.length ? Math.max(...streakValues) : 0,
    },
    benchmarkStats: {
      average: getAverage(benchmarkValues),
      median: detail.metrics.medianScore,
      completionRate: detail.metrics.benchmarkCompletionRate,
    },
    feedbackStats: {
      total: detail.feedback.length,
      shared: detail.feedback.filter((entry) => entry.status === 'shared').length,
      resolved: detail.feedback.filter((entry) => entry.status === 'resolved').length,
      drafts: detail.feedback.filter((entry) => entry.status === 'draft').length,
    },
  };
};

const buildTeamExportPayload = ({ detail, analytics }) => ({
  exportedAt: new Date().toISOString(),
  team: detail.team,
  metrics: detail.metrics,
  analytics,
  members: detail.members,
  assignments: detail.assignments,
  invites: detail.invites,
  feedback: detail.feedback,
});

const buildTeamCsvExport = ({ detail, analytics }) =>
  [
    createCsvSection('team_summary', [
      ['name', 'use_case', 'members', 'completion_rate', 'median_score', 'average_improvement'],
      [
        detail.team.name,
        detail.team.useCase,
        detail.team.memberCount,
        detail.metrics.benchmarkCompletionRate,
        detail.metrics.medianScore ?? '',
        detail.metrics.averageImprovement ?? '',
      ],
    ]),
    createCsvSection('members', [
      ['name', 'email', 'role', 'status', 'latest_score', 'benchmark_count', 'improvement_delta', 'recommended_action'],
      ...detail.members.map((member) => [
        member.name,
        member.email || '',
        member.role,
        member.status,
        member.latestBenchmarkScore ?? '',
        member.benchmarkCount,
        member.improvementDelta ?? '',
        member.recommendedAction,
      ]),
    ]),
    createCsvSection('assignments', [
      ['title', 'type', 'language', 'track_id', 'due_at'],
      ...detail.assignments.map((assignment) => [
        assignment.title,
        assignment.assignmentType,
        assignment.benchmarkLanguage || '',
        assignment.trackId || '',
        assignment.dueAt || '',
      ]),
    ]),
    createCsvSection('feedback', [
      ['member', 'assignment', 'score', 'status', 'shared_with_member', 'summary'],
      ...detail.feedback.map((entry) => [
        entry.memberName,
        entry.assignmentTitle || '',
        entry.rubricScore ?? '',
        entry.status,
        entry.sharedWithMember ? 'yes' : 'no',
        entry.summary,
      ]),
    ]),
    createCsvSection('analytics', [
      ['metric', 'value'],
      ['active_invites', analytics.inviteStats.active],
      ['invite_uses', analytics.inviteStats.uses],
      ['recent_benchmarks', analytics.recency.recent],
      ['warm_benchmarks', analytics.recency.warm],
      ['stale_benchmarks', analytics.recency.stale],
      ['missing_benchmarks', analytics.recency.missing],
      ['feedback_shared', analytics.feedbackStats.shared],
    ]),
  ].join('\n');

export const createTeamsRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Teams API');
  const getActorMembership = (teamId, req) =>
    ensureTeamAccess(supabaseAdmin, teamId, req.authenticatedUser.id, req.authenticatedUser);

  router.get('/shared/:publicToken', async (req, res) => {
    try {
      const { publicToken } = SharedTeamRouteParamsSchema.parse(req.params || {});
      const { data: team, error: teamError } = await supabaseAdmin
        .from('skill_teams')
        .select('*')
        .eq('public_token', publicToken)
        .eq('is_public', true)
        .maybeSingle();

      if (teamError || !team) {
        throw new Error(teamError?.message || 'This team proof page is not available.');
      }

      const [{ data: memberships, error: membershipsError }, { data: assignments, error: assignmentsError }] =
        await Promise.all([
          supabaseAdmin
            .from('skill_team_memberships')
            .select('*')
            .eq('team_id', team.id)
            .order('joined_at', { ascending: true }),
          supabaseAdmin
            .from('skill_team_assignments')
            .select('*')
            .eq('team_id', team.id)
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

      if (membershipsError || assignmentsError) {
        throw new Error(membershipsError?.message || assignmentsError?.message || 'This team proof page is not available.');
      }

      const userIds = (memberships || []).map((entry) => entry.user_id);
      const [{ data: profiles, error: profilesError }, { data: reports, error: reportsError }] = await Promise.all([
        userIds.length
          ? supabaseAdmin.from('user_profiles').select('id, name, email, current_avatar, current_streak').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? supabaseAdmin.from('benchmark_reports').select('user_id, overall_score, created_at').in('user_id', userIds).order('created_at', { ascending: false }).limit(500)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesError || reportsError) {
        throw new Error(profilesError?.message || reportsError?.message || 'Could not load shared team proof.');
      }

      const detail = buildTeamDetail({
        team,
        memberships: memberships || [],
        profiles: profiles || [],
        assignments: assignments || [],
        invites: [],
        reports: reports || [],
      });

      return res.json(buildPublicTeamProof({ detail }));
    } catch (error) {
      return res.status(404).json({ error: error.message || 'This team proof page is not available.' });
    }
  });

  router.get('/', requireAuth, async (req, res) => {
    try {
      if (isPrivilegedAdmin(req.authenticatedUser)) {
        const [{ data: teams, error: teamsError }, { data: allMemberships, error: membershipError }] = await Promise.all([
          supabaseAdmin.from('skill_teams').select('*').order('created_at', { ascending: true }),
          supabaseAdmin.from('skill_team_memberships').select('team_id, status'),
        ]);

        if (teamsError || membershipError) {
          throw new Error(teamsError?.message || membershipError?.message || 'Could not load team summaries.');
        }

        const countsByTeamId = new Map();
        (allMemberships || []).forEach((membership) => {
          const current = countsByTeamId.get(membership.team_id) || 0;
          countsByTeamId.set(membership.team_id, current + (membership.status === 'active' ? 1 : 0));
        });

        return res.json({
          teams: (teams || []).map((team) => ({
            id: team.id,
            name: team.name,
            slug: team.slug,
            description: team.description,
            useCase: team.use_case,
            seatLimit: team.seat_limit,
            currentUserRole: 'owner',
            memberCount: countsByTeamId.get(team.id) || 0,
            joinedAt: team.created_at,
            isPublic: Boolean(team.is_public),
            shareToken: team.public_token || null,
            publicSharedAt: team.public_shared_at || null,
          })),
        });
      }

      const { data: memberships, error } = await supabaseAdmin
        .from('skill_team_memberships')
        .select('team_id, role, status, joined_at')
        .eq('user_id', req.authenticatedUser.id)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Could not load teams.');
      }

      const teamIds = (memberships || []).map((membership) => membership.team_id);
      if (teamIds.length === 0) {
        return res.json({ teams: [] });
      }

      const [{ data: teams, error: teamsError }, { data: allMemberships, error: membershipError }] = await Promise.all([
        supabaseAdmin.from('skill_teams').select('*').in('id', teamIds).order('created_at', { ascending: true }),
        supabaseAdmin.from('skill_team_memberships').select('team_id, status').in('team_id', teamIds),
      ]);

      if (teamsError || membershipError) {
        throw new Error(teamsError?.message || membershipError?.message || 'Could not load team summaries.');
      }

      const countsByTeamId = new Map();
      (allMemberships || []).forEach((membership) => {
        const current = countsByTeamId.get(membership.team_id) || 0;
        countsByTeamId.set(membership.team_id, current + (membership.status === 'active' ? 1 : 0));
      });

      const teamsById = new Map((teams || []).map((team) => [team.id, team]));
      const response = (memberships || [])
        .map((membership) => {
          const team = teamsById.get(membership.team_id);
          if (!team) return null;
          return {
            id: team.id,
            name: team.name,
            slug: team.slug,
            description: team.description,
            useCase: team.use_case,
            seatLimit: team.seat_limit,
            currentUserRole: membership.role,
            memberCount: countsByTeamId.get(team.id) || 0,
            joinedAt: membership.joined_at,
            isPublic: Boolean(team.is_public),
            shareToken: team.public_token || null,
            publicSharedAt: team.public_shared_at || null,
          };
        })
        .filter(Boolean);

      return res.json({ teams: response });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load teams.' });
    }
  });

  router.post('/', requireAuth, async (req, res) => {
    try {
      const parsed = CreateTeamSchema.parse(req.body || {});
      const planPolicy = await ensureWorkspaceCreationAllowed(supabaseAdmin, req.authenticatedUser);
      const slug = await createUniqueTeamSlug(supabaseAdmin, parsed.name);

      const { data: team, error: teamError } = await supabaseAdmin
        .from('skill_teams')
        .insert({
          name: parsed.name,
          slug,
          description: parsed.description,
          use_case: parsed.useCase,
          seat_limit: Math.min(parsed.seatLimit, planPolicy.seatLimit),
          created_by: req.authenticatedUser.id,
        })
        .select('*')
        .single();

      if (teamError || !team) {
        throw new Error(teamError?.message || 'Could not create team.');
      }

      const { error: membershipError } = await supabaseAdmin.from('skill_team_memberships').insert({
        team_id: team.id,
        user_id: req.authenticatedUser.id,
        role: 'owner',
        status: 'active',
      });

      if (membershipError) {
        throw new Error(membershipError.message || 'Could not create the team owner membership.');
      }

      const { error: assignmentError } = await supabaseAdmin.from('skill_team_assignments').insert(
        buildStarterAssignments(parsed.useCase, req.authenticatedUser.id).map((assignment) => ({
          team_id: team.id,
          ...assignment,
        }))
      );

      if (assignmentError) {
        throw new Error(assignmentError.message || 'Could not create starter assignments.');
      }

      await createDefaultJoinInvite(supabaseAdmin, {
        teamId: team.id,
        createdBy: req.authenticatedUser.id,
        maxUses: Math.min(planPolicy.inviteMaxUses, team.seat_limit),
      });

      return res.status(201).json({
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description,
          useCase: team.use_case,
          seatLimit: team.seat_limit,
          currentUserRole: 'owner',
          memberCount: 1,
          isPublic: Boolean(team.is_public),
          shareToken: team.public_token || null,
          publicSharedAt: team.public_shared_at || null,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not create team.' });
    }
  });

  router.get('/:teamId', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const detail = buildTeamDetail(resources);

      return res.json({
        ...detail,
        team: {
          ...detail.team,
          currentUserRole: membership.role,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load team workspace.' });
    }
  });

  router.patch('/:teamId/join-settings', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin']);
      const parsed = UpdateJoinSettingsSchema.parse(req.body || {});

      const { data: updatedTeam, error } = await supabaseAdmin
        .from('skill_teams')
        .update({
          join_mode: parsed.joinMode,
          allowed_email_domain: parsed.joinMode === 'code_domain' ? normalizeEmailDomain(parsed.allowedEmailDomain) : null,
        })
        .eq('id', teamId)
        .select('*')
        .single();

      if (error || !updatedTeam) {
        throw new Error(error?.message || 'Could not update join settings.');
      }

      return res.json({
        team: {
          id: updatedTeam.id,
          name: updatedTeam.name,
          slug: updatedTeam.slug,
          description: updatedTeam.description,
          useCase: updatedTeam.use_case,
          seatLimit: updatedTeam.seat_limit,
          joinMode: updatedTeam.join_mode,
          allowedEmailDomain: normalizeEmailDomain(updatedTeam.allowed_email_domain),
          currentUserRole: membership.role,
          memberCount: 0,
          createdAt: updatedTeam.created_at,
          updatedAt: updatedTeam.updated_at,
          isPublic: Boolean(updatedTeam.is_public),
          shareToken: updatedTeam.public_token || null,
          publicSharedAt: updatedTeam.public_shared_at || null,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not update join settings.' });
    }
  });

  router.post('/:teamId/share', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin']);

      const { data: existingTeam, error: teamError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, is_public, public_token, public_shared_at')
        .eq('id', teamId)
        .single();

      if (teamError || !existingTeam) {
        throw new Error(teamError?.message || 'Could not load team proof settings.');
      }

      const publicToken = existingTeam.public_token || (await createUniquePublicTeamToken(supabaseAdmin));
      const publicSharedAt = existingTeam.public_shared_at || new Date().toISOString();

      const { data: updatedTeam, error: updateError } = await supabaseAdmin
        .from('skill_teams')
        .update({
          is_public: true,
          public_token: publicToken,
          public_shared_at: publicSharedAt,
        })
        .eq('id', teamId)
        .select('*')
        .single();

      if (updateError || !updatedTeam) {
        throw new Error(updateError?.message || 'Could not publish the team proof page.');
      }

      return res.json({
        team: {
          id: updatedTeam.id,
          name: updatedTeam.name,
          slug: updatedTeam.slug,
          description: updatedTeam.description,
          useCase: updatedTeam.use_case,
          seatLimit: updatedTeam.seat_limit,
          memberCount: 0,
          createdAt: updatedTeam.created_at,
          updatedAt: updatedTeam.updated_at,
          currentUserRole: membership.role,
          isPublic: Boolean(updatedTeam.is_public),
          shareToken: updatedTeam.public_token || null,
          publicSharedAt: updatedTeam.public_shared_at || null,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not publish the team proof page.' });
    }
  });

  router.delete('/:teamId/share', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin']);

      const { data: updatedTeam, error: updateError } = await supabaseAdmin
        .from('skill_teams')
        .update({
          is_public: false,
          public_shared_at: null,
        })
        .eq('id', teamId)
        .select('*')
        .single();

      if (updateError || !updatedTeam) {
        throw new Error(updateError?.message || 'Could not disable the team proof page.');
      }

      return res.json({
        team: {
          id: updatedTeam.id,
          name: updatedTeam.name,
          slug: updatedTeam.slug,
          description: updatedTeam.description,
          useCase: updatedTeam.use_case,
          seatLimit: updatedTeam.seat_limit,
          memberCount: 0,
          createdAt: updatedTeam.created_at,
          updatedAt: updatedTeam.updated_at,
          currentUserRole: membership.role,
          isPublic: Boolean(updatedTeam.is_public),
          shareToken: updatedTeam.public_token || null,
          publicSharedAt: updatedTeam.public_shared_at || null,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not disable the team proof page.' });
    }
  });

  router.post('/:teamId/invites', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);

      const { data: teamSummary, error: teamSummaryError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, name, slug, seat_limit, join_mode')
        .eq('id', teamId)
        .single();

      if (teamSummaryError || !teamSummary) {
        throw new Error(teamSummaryError?.message || 'Could not load team details for invite delivery.');
      }

      const parsed = CreateInviteSchema.parse(req.body || {});
      ensureInviteRoleAllowed(parsed.role);
      if ((teamSummary.join_mode || 'open_code') === 'invite_only' && !parsed.email) {
        throw new Error('Invite-only teams require a direct email on every invite.');
      }
      const inviteMaxUsesCap = getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit).inviteMaxUses;
      const code = await createUniqueInviteCode(supabaseAdmin);
      const expiresAt = new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('skill_team_invites')
        .insert({
          team_id: teamId,
          code,
          label: parsed.label,
          email: parsed.email,
          role: parsed.role,
          max_uses: Math.min(parsed.maxUses, inviteMaxUsesCap),
          use_count: 0,
          status: 'active',
          expires_at: expiresAt,
          created_by: req.authenticatedUser.id,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not create invite.');
      }

      let emailDelivery = 'skipped';

      if (parsed.email) {
        const emailPayload = buildTeamInviteEmail({
          teamName: teamSummary.name,
          inviteCode: data.code,
          inviteRole: data.role,
          inviteLabel: data.label,
          expiresAt: data.expires_at,
          joinUrl: buildTeamInviteJoinUrl(data.code),
        });

        const delivery = await sendTransactionalEmail({
          to: parsed.email,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html,
        });

        emailDelivery = delivery.delivered ? 'sent' : delivery.skipped ? 'skipped' : 'failed';
      }

      return res.status(201).json({
        invite: {
          id: data.id,
          code: data.code,
          label: data.label,
          email: data.email,
          role: data.role,
          maxUses: data.max_uses,
          useCount: data.use_count,
          expiresAt: data.expires_at,
          status: data.status,
          createdAt: data.created_at,
          emailDelivery,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not create invite.' });
    }
  });

  router.post('/join', requireAuth, async (req, res) => {
    try {
      const parsed = JoinTeamSchema.parse(req.body || {});
      const { data: invite, error } = await supabaseAdmin
        .from('skill_team_invites')
        .select('*')
        .eq('code', parsed.code.toUpperCase())
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Could not load invite.');
      }

      if (!invite || invite.status !== 'active') {
        throw new Error('This invite code is not active.');
      }

      if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
        throw new Error('This invite code has expired.');
      }

      if (Number(invite.use_count || 0) >= Number(invite.max_uses || 0)) {
        throw new Error('This invite code has already reached its usage limit.');
      }

      const { data: teamSummary, error: teamSummaryError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, name, slug, description, use_case, seat_limit, join_mode, allowed_email_domain, is_public, public_token, public_shared_at')
        .eq('id', invite.team_id)
        .single();

      if (teamSummaryError || !teamSummary) {
        throw new Error(teamSummaryError?.message || 'Could not load team limits for this invite.');
      }

      const existingMembership = await loadMembership(supabaseAdmin, invite.team_id, req.authenticatedUser.id);
      if (existingMembership?.status === 'active') {
        return res.status(200).json({
          status: 'joined',
          team: {
            id: teamSummary.id,
            name: teamSummary.name,
            slug: teamSummary.slug,
            description: teamSummary.description,
            useCase: teamSummary.use_case,
            seatLimit: teamSummary.seat_limit,
            joinMode: teamSummary.join_mode || 'open_code',
            allowedEmailDomain: normalizeEmailDomain(teamSummary.allowed_email_domain),
            currentUserRole: existingMembership.role,
            isPublic: Boolean(teamSummary.is_public),
            shareToken: teamSummary.public_token || null,
            publicSharedAt: teamSummary.public_shared_at || null,
          },
        });
      }

      if (!inviteMatchesUserEmail(invite, req.authenticatedUser)) {
        throw new Error('This invite is reserved for a different email address.');
      }

      const joinMode = teamSummary.join_mode || 'open_code';
      const allowedEmailDomain = normalizeEmailDomain(teamSummary.allowed_email_domain);

      if (joinMode === 'invite_only' && !invite.email) {
        throw new Error('This team only accepts direct email invites.');
      }

      if (joinMode === 'code_domain') {
        if (!allowedEmailDomain) {
          throw new Error('This team requires an allowed email domain before members can join.');
        }

        const userDomain = getEmailDomain(req.authenticatedUser.email);
        if (!userDomain || userDomain !== allowedEmailDomain) {
          throw new Error(`This team only accepts ${allowedEmailDomain} email addresses.`);
        }
      }

      if (joinMode === 'code_approval') {
        const { data: existingPendingRequest, error: existingPendingRequestError } = await supabaseAdmin
          .from('skill_team_join_requests')
          .select('*')
          .eq('team_id', invite.team_id)
          .eq('user_id', req.authenticatedUser.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingPendingRequestError) {
          throw new Error(existingPendingRequestError.message || 'Could not create your join request.');
        }

        let pendingRequest = existingPendingRequest;
        if (!pendingRequest) {
          const { data: createdRequest, error: createRequestError } = await supabaseAdmin
            .from('skill_team_join_requests')
            .insert({
              team_id: invite.team_id,
              invite_id: invite.id,
              user_id: req.authenticatedUser.id,
              requested_role: invite.role,
              status: 'pending',
              note: '',
            })
            .select('*')
            .single();

          if (createRequestError || !createdRequest) {
            throw new Error(createRequestError?.message || 'Could not create your join request.');
          }

          pendingRequest = createdRequest;
        }

        return res.status(existingPendingRequest ? 200 : 202).json({
          status: 'pending',
          team: {
            id: teamSummary.id,
            name: teamSummary.name,
            slug: teamSummary.slug,
            description: teamSummary.description,
            useCase: teamSummary.use_case,
            seatLimit: teamSummary.seat_limit,
            joinMode,
            allowedEmailDomain,
            currentUserRole: invite.role,
            isPublic: Boolean(teamSummary.is_public),
            shareToken: teamSummary.public_token || null,
            publicSharedAt: teamSummary.public_shared_at || null,
          },
          joinRequest: {
            id: pendingRequest.id,
            userId: req.authenticatedUser.id,
            userName:
              String(req.authenticatedUser.user_metadata?.name || '').trim() ||
              String(req.authenticatedUser.email || '').trim() ||
              'Learner',
            userEmail: req.authenticatedUser.email || null,
            requestedRole: pendingRequest.requested_role,
            status: pendingRequest.status,
            note: pendingRequest.note || '',
            inviteId: pendingRequest.invite_id || null,
            inviteCode: invite.code,
            inviteLabel: invite.label,
            reviewedByUserId: null,
            reviewedByName: null,
            requestedAt: pendingRequest.requested_at,
            reviewedAt: pendingRequest.reviewed_at || null,
          },
        });
      }

      await ensureMembershipLimitAvailable({
        supabaseAdmin,
        userId: req.authenticatedUser.id,
        nextRole: invite.role,
        teamPolicy: getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit),
        teamId: invite.team_id,
      });

      await ensureTeamCapacityAvailable(supabaseAdmin, invite.team_id);

      const { error: membershipError } = await supabaseAdmin.from('skill_team_memberships').upsert(
        {
          team_id: invite.team_id,
          user_id: req.authenticatedUser.id,
          role: invite.role,
          status: 'active',
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,user_id' }
      );

      if (membershipError) {
        throw new Error(membershipError.message || 'Could not join team.');
      }

      const nextUseCount = Number(invite.use_count || 0) + 1;
      const nextStatus = nextUseCount >= Number(invite.max_uses || 0) ? 'expired' : invite.status;

      const { data: claimedInvite, error: inviteUpdateError } = await supabaseAdmin
        .from('skill_team_invites')
        .update({
          use_count: nextUseCount,
          status: nextStatus,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
        .eq('status', 'active')
        .eq('use_count', Number(invite.use_count || 0))
        .select('id')
        .maybeSingle();

      if (inviteUpdateError || !claimedInvite) {
        if (existingMembership) {
          await supabaseAdmin.from('skill_team_memberships').upsert(
            {
              team_id: existingMembership.team_id,
              user_id: existingMembership.user_id,
              role: existingMembership.role,
              status: existingMembership.status,
              joined_at: existingMembership.joined_at,
            },
            { onConflict: 'team_id,user_id' }
          );
        } else {
          await supabaseAdmin
            .from('skill_team_memberships')
            .delete()
            .eq('team_id', invite.team_id)
            .eq('user_id', req.authenticatedUser.id);
        }

        throw new Error(inviteUpdateError?.message || 'This invite was just used by someone else. Try again.');
      }

      const { data: team, error: teamError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, name, slug, description, use_case, seat_limit')
        .eq('id', invite.team_id)
        .single();

      if (teamError || !team) {
        throw new Error(teamError?.message || 'Joined team, but could not load team summary.');
      }

      return res.status(201).json({
        status: 'joined',
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description,
          useCase: team.use_case,
          seatLimit: team.seat_limit,
          joinMode: team.join_mode || 'open_code',
          allowedEmailDomain: normalizeEmailDomain(team.allowed_email_domain),
          currentUserRole: invite.role,
          isPublic: Boolean(team.is_public),
          shareToken: team.public_token || null,
          publicSharedAt: team.public_shared_at || null,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not join team.' });
    }
  });

  router.patch('/:teamId/join-requests/:requestId', requireAuth, async (req, res) => {
    try {
      const { teamId, requestId } = TeamJoinRequestRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin']);
      const parsed = ReviewJoinRequestSchema.parse(req.body || {});

      const { data: joinRequest, error: joinRequestError } = await supabaseAdmin
        .from('skill_team_join_requests')
        .select('*')
        .eq('team_id', teamId)
        .eq('id', requestId)
        .maybeSingle();

      if (joinRequestError || !joinRequest) {
        throw new Error(joinRequestError?.message || 'Could not load that join request.');
      }

      if (joinRequest.status !== 'pending') {
        throw new Error('Only pending join requests can be reviewed.');
      }

      if (parsed.status === 'approved') {
        const [{ data: teamSummary, error: teamSummaryError }, { data: requesterProfile, error: requesterProfileError }] =
          await Promise.all([
            supabaseAdmin.from('skill_teams').select('id, seat_limit').eq('id', teamId).single(),
            supabaseAdmin.from('user_profiles').select('id, email').eq('id', joinRequest.user_id).maybeSingle(),
          ]);

        if (teamSummaryError || !teamSummary) {
          throw new Error(teamSummaryError?.message || 'Could not load team limits for this request.');
        }

        if (requesterProfileError) {
          throw new Error(requesterProfileError.message || 'Could not validate the requester profile.');
        }

        let invite = null;
        if (joinRequest.invite_id) {
          const { data: requestInvite, error: requestInviteError } = await supabaseAdmin
            .from('skill_team_invites')
            .select('*')
            .eq('id', joinRequest.invite_id)
            .maybeSingle();

          if (requestInviteError || !requestInvite) {
            throw new Error(requestInviteError?.message || 'Could not load the request invite.');
          }

          if (requestInvite.status !== 'active') {
            throw new Error('The invite tied to this request is no longer active.');
          }

          if (requestInvite.expires_at && new Date(requestInvite.expires_at).getTime() <= Date.now()) {
            throw new Error('The invite tied to this request has expired.');
          }

          if (Number(requestInvite.use_count || 0) >= Number(requestInvite.max_uses || 0)) {
            throw new Error('The invite tied to this request has reached its usage limit.');
          }

          const requesterEmail = String(requesterProfile?.email || '').trim().toLowerCase();
          const inviteEmail = String(requestInvite.email || '').trim().toLowerCase();
          if (inviteEmail && (!requesterEmail || requesterEmail !== inviteEmail)) {
            throw new Error('This request no longer matches the invite email restriction.');
          }

          invite = requestInvite;
        }

        const existingMembership = await loadMembership(supabaseAdmin, teamId, joinRequest.user_id);
        const shouldActivateMembership = existingMembership?.status !== 'active';

        if (shouldActivateMembership) {
          await ensureMembershipLimitAvailable({
            supabaseAdmin,
            userId: joinRequest.user_id,
            nextRole: joinRequest.requested_role,
            teamPolicy: getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit),
            teamId,
          });

          await ensureTeamCapacityAvailable(supabaseAdmin, teamId);

          const { error: membershipError } = await supabaseAdmin.from('skill_team_memberships').upsert(
            {
              team_id: teamId,
              user_id: joinRequest.user_id,
              role: joinRequest.requested_role,
              status: 'active',
              joined_at: existingMembership?.joined_at || new Date().toISOString(),
            },
            { onConflict: 'team_id,user_id' }
          );

          if (membershipError) {
            throw new Error(membershipError.message || 'Could not approve this join request.');
          }

          if (invite) {
            const nextUseCount = Number(invite.use_count || 0) + 1;
            const nextStatus = nextUseCount >= Number(invite.max_uses || 0) ? 'expired' : invite.status;

            const { data: claimedInvite, error: inviteUpdateError } = await supabaseAdmin
              .from('skill_team_invites')
              .update({
                use_count: nextUseCount,
                status: nextStatus,
                last_used_at: new Date().toISOString(),
              })
              .eq('id', invite.id)
              .eq('status', 'active')
              .eq('use_count', Number(invite.use_count || 0))
              .select('id')
              .maybeSingle();

            if (inviteUpdateError || !claimedInvite) {
              if (existingMembership) {
                await supabaseAdmin.from('skill_team_memberships').upsert(
                  {
                    team_id: existingMembership.team_id,
                    user_id: existingMembership.user_id,
                    role: existingMembership.role,
                    status: existingMembership.status,
                    joined_at: existingMembership.joined_at,
                  },
                  { onConflict: 'team_id,user_id' }
                );
              } else {
                await supabaseAdmin
                  .from('skill_team_memberships')
                  .delete()
                  .eq('team_id', teamId)
                  .eq('user_id', joinRequest.user_id);
              }

              throw new Error(inviteUpdateError?.message || 'This invite was just used by someone else. Try again.');
            }
          }
        }
      }

      const { data: reviewedRequest, error: reviewError } = await supabaseAdmin
        .from('skill_team_join_requests')
        .update({
          status: parsed.status,
          note: parsed.note || '',
          reviewed_by_user_id: req.authenticatedUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .select('*')
        .single();

      if (reviewError || !reviewedRequest) {
        throw new Error(reviewError?.message || 'Could not update the join request.');
      }

      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const detail = buildTeamDetail(resources);
      const serializedRequest = detail.joinRequests.find((entry) => entry.id === reviewedRequest.id);

      return res.json({
        joinRequest:
          serializedRequest ||
          serializeJoinRequest(
            reviewedRequest,
            new Map(),
            new Map((resources.invites || []).map((invite) => [invite.id, invite]))
          ),
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not review that join request.' });
    }
  });

  router.post('/:teamId/assignments', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const parsed = CreateAssignmentSchema.parse(req.body || {});
      ensureAssignmentPayloadIsValid(parsed);
      const { data: teamSummary, error: teamSummaryError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, seat_limit, join_mode')
        .eq('id', teamId)
        .single();

      if (teamSummaryError || !teamSummary) {
        throw new Error(teamSummaryError?.message || 'Could not load team plan limits.');
      }

      const teamPolicy = getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit);
      const { count: assignmentCount, error: assignmentCountError } = await supabaseAdmin
        .from('skill_team_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (assignmentCountError) {
        throw new Error(assignmentCountError.message || 'Could not validate assignment limits.');
      }

      if (Number(assignmentCount || 0) >= teamPolicy.assignmentLimit) {
        throw new Error(
          `${teamPolicy.label} includes up to ${teamPolicy.assignmentLimit} active assignments per team.`
        );
      }

      const { data, error } = await supabaseAdmin
        .from('skill_team_assignments')
        .insert({
          team_id: teamId,
          title: parsed.title,
          description: parsed.description,
          assignment_type: parsed.assignmentType,
          benchmark_language: parsed.benchmarkLanguage,
          track_id: parsed.trackId,
          due_at: parsed.dueAt,
          created_by: req.authenticatedUser.id,
          metadata: { seeded: false },
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not create assignment.');
      }

      return res.status(201).json({
        assignment: {
          id: data.id,
          title: data.title,
          description: data.description,
          assignmentType: data.assignment_type,
          benchmarkLanguage: data.benchmark_language,
          trackId: data.track_id,
          dueAt: data.due_at,
          createdAt: data.created_at,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not create assignment.' });
    }
  });

  router.patch('/:teamId/assignments/:assignmentId', requireAuth, async (req, res) => {
    try {
      const { teamId, assignmentId } = TeamAssignmentRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const parsed = UpdateAssignmentSchema.parse(req.body || {});
      const existingAssignment = await loadTeamAssignment(supabaseAdmin, teamId, assignmentId);

      if (!existingAssignment) {
        throw new Error('Could not find that assignment.');
      }

      ensureAssignmentPayloadIsValid({
        assignmentType: parsed.assignmentType ?? existingAssignment.assignment_type,
        benchmarkLanguage:
          parsed.benchmarkLanguage !== undefined ? parsed.benchmarkLanguage : existingAssignment.benchmark_language,
        trackId: parsed.trackId !== undefined ? parsed.trackId : existingAssignment.track_id,
        dueAt: parsed.dueAt !== undefined ? parsed.dueAt : existingAssignment.due_at,
      });

      const updatePayload = {};
      if (parsed.title !== undefined) updatePayload.title = parsed.title;
      if (parsed.description !== undefined) updatePayload.description = parsed.description;
      if (parsed.assignmentType !== undefined) updatePayload.assignment_type = parsed.assignmentType;
      if (parsed.benchmarkLanguage !== undefined) updatePayload.benchmark_language = parsed.benchmarkLanguage;
      if (parsed.trackId !== undefined) updatePayload.track_id = parsed.trackId;
      if (parsed.dueAt !== undefined) updatePayload.due_at = parsed.dueAt;

      const { data, error } = await supabaseAdmin
        .from('skill_team_assignments')
        .update(updatePayload)
        .eq('id', assignmentId)
        .eq('team_id', teamId)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not update assignment.');
      }

      return res.json({
        assignment: {
          id: data.id,
          title: data.title,
          description: data.description,
          assignmentType: data.assignment_type,
          benchmarkLanguage: data.benchmark_language,
          trackId: data.track_id,
          dueAt: data.due_at,
          createdAt: data.created_at,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not update assignment.' });
    }
  });

  router.delete('/:teamId/assignments/:assignmentId', requireAuth, async (req, res) => {
    try {
      const { teamId, assignmentId } = TeamAssignmentRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);

      const { error } = await supabaseAdmin
        .from('skill_team_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('team_id', teamId);

      if (error) {
        throw new Error(error.message || 'Could not delete assignment.');
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not delete assignment.' });
    }
  });

  router.patch('/:teamId/invites/:inviteId', requireAuth, async (req, res) => {
    try {
      const { teamId, inviteId } = TeamInviteRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const parsed = UpdateInviteSchema.parse(req.body || {});
      const { data: existingInvite, error: existingInviteError } = await supabaseAdmin
        .from('skill_team_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existingInviteError) {
        throw new Error(existingInviteError.message || 'Could not load that invite.');
      }

      if (!existingInvite) {
        throw new Error('Could not find that invite.');
      }

      ensureInviteRoleAllowed(parsed.role);
      const { data: teamSummary, error: teamSummaryError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, seat_limit')
        .eq('id', teamId)
        .single();

      if (teamSummaryError || !teamSummary) {
        throw new Error(teamSummaryError?.message || 'Could not load team limits for invite updates.');
      }

      const nextInviteEmail = parsed.email !== undefined ? parsed.email : existingInvite.email;
      if ((teamSummary.join_mode || 'open_code') === 'invite_only' && !nextInviteEmail) {
        throw new Error('Invite-only teams require a direct email on every invite.');
      }

      const inviteMaxUsesCap = getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit).inviteMaxUses;

      const updatePayload = {};
      if (parsed.label !== undefined) updatePayload.label = parsed.label;
      if (parsed.email !== undefined) updatePayload.email = parsed.email;
      if (parsed.role !== undefined) updatePayload.role = parsed.role;
      if (parsed.maxUses !== undefined) updatePayload.max_uses = Math.min(parsed.maxUses, inviteMaxUsesCap);
      if (parsed.status !== undefined) updatePayload.status = parsed.status;
      if (parsed.expiresInDays !== undefined) {
        updatePayload.expires_at = new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from('skill_team_invites')
        .update(updatePayload)
        .eq('id', inviteId)
        .eq('team_id', teamId)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not update invite.');
      }

      return res.json({
        invite: {
          id: data.id,
          code: data.code,
          label: data.label,
          email: data.email,
          role: data.role,
          maxUses: data.max_uses,
          useCount: data.use_count,
          expiresAt: data.expires_at,
          status: data.status,
          createdAt: data.created_at,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not update invite.' });
    }
  });

  router.delete('/:teamId/invites/:inviteId', requireAuth, async (req, res) => {
    try {
      const { teamId, inviteId } = TeamInviteRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const { data: existingInvite, error: existingInviteError } = await supabaseAdmin
        .from('skill_team_invites')
        .select('id, role')
        .eq('id', inviteId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existingInviteError) {
        throw new Error(existingInviteError.message || 'Could not load that invite.');
      }

      if (!existingInvite) {
        throw new Error('Could not find that invite.');
      }

      ensureInviteRoleAllowed(membership, existingInvite.role, existingInvite);

      const { error } = await supabaseAdmin
        .from('skill_team_invites')
        .delete()
        .eq('id', inviteId)
        .eq('team_id', teamId);

      if (error) {
        throw new Error(error.message || 'Could not delete invite.');
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not delete invite.' });
    }
  });

  router.patch('/:teamId/members/:userId', requireAuth, async (req, res) => {
    try {
      const { teamId, userId } = TeamMemberRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin']);
      const parsed = UpdateMembershipSchema.parse(req.body || {});
      const targetMembership = await loadMembership(supabaseAdmin, teamId, userId);

      if (!targetMembership) {
        throw new Error('Could not find that team member.');
      }

      await ensureOwnerStateChangeAllowed(supabaseAdmin, teamId, membership, targetMembership, parsed);

      const { data: teamSummary, error: teamSummaryError } = await supabaseAdmin
        .from('skill_teams')
        .select('id, seat_limit')
        .eq('id', teamId)
        .single();

      if (teamSummaryError || !teamSummary) {
        throw new Error(teamSummaryError?.message || 'Could not load team limits.');
      }

      const nextRole = parsed.role ?? targetMembership.role;
      const nextStatus = parsed.status ?? targetMembership.status;

      ensureRoleTransitionAllowed(membership, targetMembership, nextRole);

      if (nextStatus === 'active') {
        await ensureMembershipLimitAvailable({
          supabaseAdmin,
          userId,
          nextRole,
          teamPolicy: getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit),
          teamId,
        });
      }

      if (parsed.status === 'active' && targetMembership.status !== 'active') {
        await ensureTeamCapacityAvailable(supabaseAdmin, teamId);
      }

      const { data, error } = await supabaseAdmin
        .from('skill_team_memberships')
        .update(parsed)
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not update team member.');
      }

      return res.json({ membership: data });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not update team member.' });
    }
  });

  router.delete('/:teamId/members/:userId', requireAuth, async (req, res) => {
    try {
      const { teamId, userId } = TeamMemberRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin']);
      const targetMembership = await loadMembership(supabaseAdmin, teamId, userId);

      if (!targetMembership) {
        throw new Error('Could not find that team member.');
      }

      if (membership.role === 'admin' && (targetMembership.role === 'owner' || targetMembership.role === 'admin')) {
        throw new Error('Admins can only remove coaches and learners.');
      }

      if (targetMembership.role === 'owner') {
        const { data: owners, error: ownerError } = await supabaseAdmin
          .from('skill_team_memberships')
          .select('user_id')
          .eq('team_id', teamId)
          .eq('role', 'owner')
          .eq('status', 'active');

        if (ownerError) {
          throw new Error(ownerError.message || 'Could not validate team ownership.');
        }

        if ((owners || []).length <= 1) {
          throw new Error('The last owner cannot be removed.');
        }
      }

      const { error } = await supabaseAdmin
        .from('skill_team_memberships')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message || 'Could not remove team member.');
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not remove team member.' });
    }
  });

  router.get('/:teamId/feedback', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const detail = buildTeamDetail(resources);
      return res.json({ feedback: detail.feedback });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load team feedback.' });
    }
  });

  router.post('/:teamId/feedback', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const parsed = CreateFeedbackSchema.parse(req.body || {});
      await ensureFeedbackTargetsAreValid(supabaseAdmin, teamId, parsed.memberUserId, parsed.assignmentId);

      const { data, error } = await supabaseAdmin
        .from('skill_team_feedback')
        .insert({
          team_id: teamId,
          member_user_id: parsed.memberUserId,
          assignment_id: parsed.assignmentId,
          author_user_id: req.authenticatedUser.id,
          rubric_score: parsed.rubricScore,
          status: parsed.status,
          summary: parsed.summary,
          strengths: parsed.strengths,
          focus_areas: parsed.focusAreas,
          coach_notes: parsed.coachNotes,
          shared_with_member: parsed.sharedWithMember,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not create feedback entry.');
      }

      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const detail = buildTeamDetail(resources);
      const feedbackEntry = detail.feedback.find((entry) => entry.id === data.id);
      return res.status(201).json({ feedback: feedbackEntry });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not create feedback entry.' });
    }
  });

  router.patch('/:teamId/feedback/:feedbackId', requireAuth, async (req, res) => {
    try {
      const { teamId, feedbackId } = TeamFeedbackRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const parsed = UpdateFeedbackSchema.parse(req.body || {});
      const { data: existingFeedback, error: existingFeedbackError } = await supabaseAdmin
        .from('skill_team_feedback')
        .select('id, member_user_id, assignment_id')
        .eq('id', feedbackId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existingFeedbackError) {
        throw new Error(existingFeedbackError.message || 'Could not load that feedback entry.');
      }

      if (!existingFeedback) {
        throw new Error('Could not find that feedback entry.');
      }

      await ensureFeedbackTargetsAreValid(
        supabaseAdmin,
        teamId,
        existingFeedback.member_user_id,
        parsed.assignmentId !== undefined ? parsed.assignmentId : existingFeedback.assignment_id
      );

      const updatePayload = {};
      if (parsed.assignmentId !== undefined) updatePayload.assignment_id = parsed.assignmentId;
      if (parsed.rubricScore !== undefined) updatePayload.rubric_score = parsed.rubricScore;
      if (parsed.status !== undefined) updatePayload.status = parsed.status;
      if (parsed.summary !== undefined) updatePayload.summary = parsed.summary;
      if (parsed.strengths !== undefined) updatePayload.strengths = parsed.strengths;
      if (parsed.focusAreas !== undefined) updatePayload.focus_areas = parsed.focusAreas;
      if (parsed.coachNotes !== undefined) updatePayload.coach_notes = parsed.coachNotes;
      if (parsed.sharedWithMember !== undefined) updatePayload.shared_with_member = parsed.sharedWithMember;

      const { data, error } = await supabaseAdmin
        .from('skill_team_feedback')
        .update(updatePayload)
        .eq('id', feedbackId)
        .eq('team_id', teamId)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not update feedback entry.');
      }

      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const detail = buildTeamDetail(resources);
      const feedbackEntry = detail.feedback.find((entry) => entry.id === data.id);
      return res.json({ feedback: feedbackEntry });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not update feedback entry.' });
    }
  });

  router.delete('/:teamId/feedback/:feedbackId', requireAuth, async (req, res) => {
    try {
      const { teamId, feedbackId } = TeamFeedbackRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);

      const { error } = await supabaseAdmin
        .from('skill_team_feedback')
        .delete()
        .eq('id', feedbackId)
        .eq('team_id', teamId);

      if (error) {
        throw new Error(error.message || 'Could not delete feedback entry.');
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not delete feedback entry.' });
    }
  });

  router.get('/:teamId/analytics', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const teamPolicy = getTeamPlanPolicyFromSeatLimit(resources.team?.seat_limit);
      if (!teamPolicy.supportsAdvancedAnalytics) {
        throw new Error('Expanded analytics unlock with Teams Growth or Custom.');
      }
      const detail = buildTeamDetail(resources);
      const analytics = buildTeamAnalytics({ detail });
      return res.json({ analytics });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load team analytics.' });
    }
  });

  router.get('/:teamId/export', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const { format } = TeamExportQuerySchema.parse(req.query || {});
      const membership = await getActorMembership(teamId, req);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const resources = await loadTeamWorkspaceResources(supabaseAdmin, teamId);
      const teamPolicy = getTeamPlanPolicyFromSeatLimit(resources.team?.seat_limit);
      if (format === 'csv' && !teamPolicy.supportsCsvExport) {
        throw new Error('CSV export unlocks with Teams Growth or Custom.');
      }
      const detail = buildTeamDetail(resources);
      const analytics = buildTeamAnalytics({ detail });

      if (format === 'csv') {
        const csv = buildTeamCsvExport({ detail, analytics });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${detail.team.slug || detail.team.id}-team-report.csv"`);
        return res.status(200).send(csv);
      }

      return res.json(buildTeamExportPayload({ detail, analytics }));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not export team report.' });
    }
  });

  return router;
};
