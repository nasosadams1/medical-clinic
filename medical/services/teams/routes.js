import express from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createAuthenticatedUserMiddleware } from '../auth-utils.js';

const TEAM_USE_CASES = ['bootcamps', 'universities', 'coding-clubs', 'upskilling', 'general'];
const ASSIGNMENT_TYPES = ['benchmark', 'challenge_pack', 'roadmap'];
const BENCHMARK_LANGUAGES = ['python', 'javascript', 'java', 'cpp'];

const CreateTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(''),
  useCase: z.enum(TEAM_USE_CASES).optional().default('bootcamps'),
  seatLimit: z.number().int().min(1).max(1000).optional().default(25),
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

const CreateAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(''),
  assignmentType: z.enum(ASSIGNMENT_TYPES),
  benchmarkLanguage: z.union([z.enum(BENCHMARK_LANGUAGES), z.null()]).optional().default(null),
  trackId: z.union([z.string().trim().min(1).max(120), z.null()]).optional().default(null),
  dueAt: z.union([z.string().trim().min(1).max(80), z.null()]).optional().default(null),
});

const TeamRouteParamsSchema = z.object({
  teamId: z.string().uuid(),
});

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'team';

const buildInviteCode = () => `CODH-${randomBytes(3).toString('hex').toUpperCase()}`;

const getMedian = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
  }
  return sorted[midpoint];
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

const ensureTeamAccess = async (supabaseAdmin, teamId, userId) => {
  const membership = await loadMembership(supabaseAdmin, teamId, userId);
  if (!membership || membership.status !== 'active') {
    throw new Error('You do not have access to this team.');
  }
  return membership;
};

const ensureTeamRole = (membership, allowedRoles) => {
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error('You do not have permission to manage this team.');
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

const buildTeamDetail = ({ team, memberships, profiles, assignments, invites, reports }) => {
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
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

    return {
      userId: membership.user_id,
      name: profile?.name || profile?.email || 'Codhak learner',
      email: profile?.email || null,
      avatar: profile?.current_avatar || 'default',
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joined_at,
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
      memberCount: members.length,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
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
  };
};

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

export const createTeamsRouter = ({ supabaseAdmin }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Teams API');

  router.get('/', requireAuth, async (req, res) => {
    try {
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
      const slug = await createUniqueTeamSlug(supabaseAdmin, parsed.name);

      const { data: team, error: teamError } = await supabaseAdmin
        .from('skill_teams')
        .insert({
          name: parsed.name,
          slug,
          description: parsed.description,
          use_case: parsed.useCase,
          seat_limit: parsed.seatLimit,
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
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not create team.' });
    }
  });

  router.get('/:teamId', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await ensureTeamAccess(supabaseAdmin, teamId, req.authenticatedUser.id);
      const [
        { data: team, error: teamError },
        { data: memberships, error: membershipsError },
        { data: assignments, error: assignmentsError },
        { data: invites, error: invitesError },
      ] = await Promise.all([
        supabaseAdmin.from('skill_teams').select('*').eq('id', teamId).single(),
        supabaseAdmin.from('skill_team_memberships').select('*').eq('team_id', teamId).order('joined_at', { ascending: true }),
        supabaseAdmin.from('skill_team_assignments').select('*').eq('team_id', teamId).order('created_at', { ascending: false }),
        supabaseAdmin.from('skill_team_invites').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(8),
      ]);

      const firstError = teamError || membershipsError || assignmentsError || invitesError;
      if (firstError || !team) {
        throw new Error(firstError?.message || 'Could not load team workspace.');
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
        throw new Error(profilesError?.message || reportsError?.message || 'Could not load team analytics.');
      }

      const detail = buildTeamDetail({
        team,
        memberships: memberships || [],
        profiles: profiles || [],
        assignments: assignments || [],
        invites: invites || [],
        reports: reports || [],
      });

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

  router.post('/:teamId/invites', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await ensureTeamAccess(supabaseAdmin, teamId, req.authenticatedUser.id);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);

      const parsed = CreateInviteSchema.parse(req.body || {});
      const code = buildInviteCode();
      const expiresAt = new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('skill_team_invites')
        .insert({
          team_id: teamId,
          code,
          label: parsed.label,
          email: parsed.email,
          role: parsed.role,
          max_uses: parsed.maxUses,
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

      const { error: inviteUpdateError } = await supabaseAdmin
        .from('skill_team_invites')
        .update({
          use_count: nextUseCount,
          status: nextStatus,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (inviteUpdateError) {
        throw new Error(inviteUpdateError.message || 'Could not update invite usage.');
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
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description,
          useCase: team.use_case,
          seatLimit: team.seat_limit,
          currentUserRole: invite.role,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not join team.' });
    }
  });

  router.post('/:teamId/assignments', requireAuth, async (req, res) => {
    try {
      const { teamId } = TeamRouteParamsSchema.parse(req.params || {});
      const membership = await ensureTeamAccess(supabaseAdmin, teamId, req.authenticatedUser.id);
      ensureTeamRole(membership, ['owner', 'admin', 'coach']);
      const parsed = CreateAssignmentSchema.parse(req.body || {});

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

  return router;
};
