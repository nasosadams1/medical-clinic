import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Copy, Loader2, Mail, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlanAccess } from '../../hooks/usePlanAccess';
import { interviewTracks, publicProductMetrics, teamUseCases } from '../../data/siteContent';
import { trackEvent } from '../../lib/analytics';
import {
  type BenchmarkLanguage,
  createTeam,
  createTeamAssignment,
  createTeamInvite,
  getTeamWorkspace,
  joinTeamByCode,
  listTeams,
  shareTeamWorkspace,
  type TeamAssignmentType,
  type TeamRole,
  type TeamSummary,
  type TeamUseCase,
  type TeamWorkspaceDetail,
  unshareTeamWorkspace,
} from '../../lib/teams';

interface TeamsWorkspaceProps {
  mode?: 'public' | 'app';
}

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@codhakmailserver.online';

const teamUseCaseOptions: Array<{ value: TeamUseCase; label: string }> = [
  { value: 'bootcamps', label: 'Bootcamp cohort' },
  { value: 'universities', label: 'University / class' },
  { value: 'coding-clubs', label: 'Coding club' },
  { value: 'upskilling', label: 'Upskilling team' },
  { value: 'general', label: 'General pilot' },
];

const assignmentTypeOptions: Array<{ value: TeamAssignmentType; label: string }> = [
  { value: 'benchmark', label: 'Benchmark' },
  { value: 'challenge_pack', label: 'Challenge pack' },
  { value: 'roadmap', label: 'Roadmap' },
];

const benchmarkLanguageOptions: Array<{ value: BenchmarkLanguage; label: string }> = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

const inviteRoleOptions: Array<{ value: Exclude<TeamRole, 'owner'>; label: string }> = [
  { value: 'learner', label: 'Learner' },
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Admin' },
];

const formatDueLabel = (value: string | null | undefined) => {
  if (!value) return 'Active';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
};

const workspaceShellClass = 'min-w-0 rounded-[1.5rem] border border-border bg-card p-6 shadow-card sm:p-8';
const workspacePanelClass = 'min-w-0 rounded-[1.35rem] border border-border bg-background/70 p-5';
const workspaceMetricClass = 'rounded-[1.2rem] border border-border bg-background/70 px-4 py-4';
const workspaceInputClass =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground';
const workspacePrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-primary/90';
const workspaceSecondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-card';

const copyTextToClipboard = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Clipboard is not available.');
  }
};

const renderProgressBars = (entries: Array<{ label: string; value: number | null }>) => (
  <div className="mt-4 space-y-3">
    {entries.map((entry) => {
      const value = entry.value ?? 0;
      return (
        <div key={entry.label}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{entry.label}</span>
            <span>{entry.value ?? '--'}/100</span>
          </div>
          <div className="h-2 rounded-full bg-background">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

const PublicTeamsWorkspace = ({ mode, inviteCode }: { mode: 'public' | 'app'; inviteCode?: string | null }) => {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
      <section className={workspaceShellClass}>
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {mode === 'public' ? 'Team workflow overview' : 'Team workflow'}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">Benchmark a cohort. Assign the next path. Prove improvement.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Benchmark, assign, and track progress.
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[260px]">
            <button
              type="button"
              onClick={() => navigate('/skill-check')}
              className={workspacePrimaryButtonClass}
            >
              <Users className="h-4 w-4" />
              Start with skill check
            </button>
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent('Codhak pilot walkthrough request')}`}
              className={workspaceSecondaryButtonClass}
            >
              <Mail className="h-4 w-4" />
              Request pilot walkthrough
            </a>
          </div>
        </div>

        {inviteCode ? (
          <div className="mt-6 rounded-[1.35rem] border border-primary/20 bg-primary/10 px-5 py-4 text-sm leading-6 text-primary">
            Invite code detected: <span className="font-semibold text-primary-foreground">{inviteCode}</span>. Sign in to join.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {publicProductMetrics.map((metric) => (
            <div key={metric.label} className={workspaceMetricClass}>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</div>
              <p className="mt-1 text-sm text-muted-foreground">{metric.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className={workspacePanelClass}>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              What teams get
            </div>
            <div className="mt-4 space-y-3">
              {[
                'Completion tracking',
                'Assignments',
                'Invite codes',
                'Improvement view',
                'Public proof pages',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className={workspacePanelClass}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Team workflow
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['1. Benchmark first', 'Set the baseline.'],
                  ['2. Assign follow-up work', 'Send the next task.'],
                  ['3. Review proof of progress', 'Track score movement.'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="text-sm font-semibold text-foreground">{title}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Common team use cases</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {teamUseCases.map((useCase) => (
                  <button
                    key={useCase.slug}
                    type="button"
                    onClick={() => navigate(`/teams/${useCase.slug}`)}
                    className="rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:border-primary/30 hover:bg-background"
                  >
                    <div className="text-sm font-semibold text-foreground">{useCase.title}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{useCase.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="min-w-0 grid gap-4">
        <div className={workspacePanelClass}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preview what teams unlock</div>
          <div className="mt-4 space-y-3">
            {interviewTracks.slice(0, 4).map((track) => (
              <div key={track.id} className="rounded-2xl border border-border bg-card px-4 py-4">
                <div className="text-sm font-semibold text-foreground">{track.title}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {track.language === 'multi' ? 'Multi-language' : track.language.toUpperCase()}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{track.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={workspacePanelClass}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Before launch</div>
          <div className="mt-4 space-y-3">
            {[
              'Create one workspace per cohort or program.',
              'Use invite codes for coaches and learners.',
              'Start with a benchmark assignment.',
              'Share the proof page only after real results.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default function TeamsWorkspace({ mode = 'public' }: TeamsWorkspaceProps) {
  const { user } = useAuth();
  const { activeTeamEntitlement, hasAnyTeamPlan } = usePlanAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCodeFromQuery = searchParams.get('invite');
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamDetail, setTeamDetail] = useState<TeamWorkspaceDetail | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [sharingTeamProof, setSharingTeamProof] = useState(false);
  const [unsharingTeamProof, setUnsharingTeamProof] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', useCase: 'bootcamps' as TeamUseCase, seatLimit: 25 });
  const [joinCode, setJoinCode] = useState('');
  const [inviteForm, setInviteForm] = useState({
    label: 'General learner access',
    email: '',
    role: 'learner' as Exclude<TeamRole, 'owner'>,
    maxUses: 25,
    expiresInDays: 14,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    assignmentType: 'benchmark' as TeamAssignmentType,
    benchmarkLanguage: 'python' as BenchmarkLanguage,
    trackId: interviewTracks[0]?.id || '',
    dueAt: '',
  });

  const canManageTeam = useMemo(() => ['owner', 'admin', 'coach'].includes(teamDetail?.team.currentUserRole || ''), [teamDetail?.team.currentUserRole]);
  const canCreateTeams = hasAnyTeamPlan;
  const improvementLeaders = useMemo(
    () =>
      [...(teamDetail?.members || [])]
        .filter((member) => member.improvementDelta !== null)
        .sort((left, right) => Number(right.improvementDelta || 0) - Number(left.improvementDelta || 0))
        .slice(0, 4),
    [teamDetail?.members]
  );
  const attentionQueue = useMemo(
    () =>
      [...(teamDetail?.members || [])]
        .filter((member) => member.latestBenchmarkScore === null || Number(member.latestBenchmarkScore || 0) < 55)
        .slice(0, 4),
    [teamDetail?.members]
  );
  const sharedTeamProofUrl = useMemo(() => {
    if (!teamDetail?.team.isPublic || !teamDetail.team.shareToken) return null;
    if (typeof window === 'undefined' || !window.location?.origin) {
      return `/teams/proof/${teamDetail.team.shareToken}`;
    }

    return `${window.location.origin}/teams/proof/${teamDetail.team.shareToken}`;
  }, [teamDetail?.team.isPublic, teamDetail?.team.shareToken]);
  const availableTrackOptions = useMemo(
    () =>
      interviewTracks.map((track) => ({
        value: track.id,
        label: track.title,
      })),
    []
  );

  useEffect(() => {
    if (mode !== 'app' || !user) return;
    let cancelled = false;

    const loadTeamList = async () => {
      setLoadingTeams(true);
      try {
        const nextTeams = await listTeams();
        if (cancelled) return;
        setTeams(nextTeams);
        setSelectedTeamId((current) => (current && nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id || ''));
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load teams.');
        }
      } finally {
        if (!cancelled) {
          setLoadingTeams(false);
        }
      }
    };

    void loadTeamList();
    return () => {
      cancelled = true;
    };
  }, [mode, user?.id]);

  useEffect(() => {
    const inviteFromQuery = searchParams.get('invite');
    if (!inviteFromQuery) return;
    setJoinCode(inviteFromQuery.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    if (mode !== 'app' || !user || !selectedTeamId) {
      setTeamDetail(null);
      return;
    }

    let cancelled = false;

    const loadTeamDetail = async () => {
      setLoadingDetail(true);
      try {
        const detail = await getTeamWorkspace(selectedTeamId);
        if (cancelled) return;
        setTeamDetail(detail);
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load the team workspace.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    void loadTeamDetail();
    return () => {
      cancelled = true;
    };
  }, [mode, selectedTeamId, user?.id]);

  if (mode !== 'app' || !user) {
    return <PublicTeamsWorkspace mode={mode} inviteCode={inviteCodeFromQuery} />;
  }

  const refreshTeamsAndSelect = async (preferredTeamId?: string) => {
    setLoadingTeams(true);
    try {
      const nextTeams = await listTeams();
      setTeams(nextTeams);
      const nextSelectedTeamId = preferredTeamId && nextTeams.some((team) => team.id === preferredTeamId)
        ? preferredTeamId
        : nextTeams[0]?.id || '';
      setSelectedTeamId(nextSelectedTeamId);
      if (nextSelectedTeamId) {
        setLoadingDetail(true);
        try {
          setTeamDetail(await getTeamWorkspace(nextSelectedTeamId));
        } finally {
          setLoadingDetail(false);
        }
      } else {
        setTeamDetail(null);
      }
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!canCreateTeams) {
      toast.error('A Teams plan is required to create a workspace.');
      return;
    }

    if (!createForm.name.trim()) {
      toast.error('Team name is required.');
      return;
    }

    try {
      setCreatingTeam(true);
      const team = await createTeam(createForm);
      setCreateForm({ name: '', description: '', useCase: createForm.useCase, seatLimit: createForm.seatLimit });
      await refreshTeamsAndSelect(team.id);
      toast.success('Team workspace created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create team.');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      toast.error('Enter an invite code first.');
      return;
    }

    try {
      setJoiningTeam(true);
      const team = await joinTeamByCode(joinCode.trim().toUpperCase());
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('invite');
      setSearchParams(nextParams, { replace: true });
      setJoinCode('');
      await refreshTeamsAndSelect(team.id);
      toast.success(`Joined ${team.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not join team.');
    } finally {
      setJoiningTeam(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!teamDetail) return;
    try {
      setCreatingInvite(true);
      const invite = await createTeamInvite(teamDetail.team.id, {
        label: inviteForm.label,
        email: inviteForm.email,
        role: inviteForm.role,
        maxUses: inviteForm.maxUses,
        expiresInDays: inviteForm.expiresInDays,
      });
      setInviteForm({
        label: 'General learner access',
        email: '',
        role: 'learner',
        maxUses: 25,
        expiresInDays: 14,
      });
      setTeamDetail((current) => current ? { ...current, invites: [invite, ...current.invites] } : current);
      await copyTextToClipboard(invite.code);
      toast.success(
        invite.emailDelivery === 'sent'
          ? 'Invite created, emailed, and copied.'
          : invite.emailDelivery === 'failed'
          ? 'Invite created and copied, but email delivery failed.'
          : invite.email
          ? 'Invite created and copied. Email delivery is not configured yet.'
          : 'Invite code created and copied.'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create invite.');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!teamDetail) return;
    if (!assignmentForm.title.trim()) {
      toast.error('Assignment title is required.');
      return;
    }

    try {
      setCreatingAssignment(true);
      const assignment = await createTeamAssignment(teamDetail.team.id, {
        title: assignmentForm.title,
        description: assignmentForm.description,
        assignmentType: assignmentForm.assignmentType,
        benchmarkLanguage: assignmentForm.assignmentType === 'benchmark' ? assignmentForm.benchmarkLanguage : null,
        trackId: assignmentForm.assignmentType === 'roadmap' ? assignmentForm.trackId || null : null,
        dueAt: assignmentForm.dueAt ? new Date(assignmentForm.dueAt).toISOString() : null,
      });
      setAssignmentForm((current) => ({
        ...current,
        title: '',
        description: '',
        dueAt: '',
      }));
      setTeamDetail((current) => current ? { ...current, assignments: [assignment, ...current.assignments] } : current);
      toast.success('Assignment added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create assignment.');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const mergeSharedTeamState = (nextTeam: TeamWorkspaceDetail['team']) => {
    setTeamDetail((current) =>
      current
        ? {
            ...current,
            team: {
              ...current.team,
              isPublic: nextTeam.isPublic,
              shareToken: nextTeam.shareToken,
              publicSharedAt: nextTeam.publicSharedAt,
            },
          }
        : current
    );
    setTeams((current) =>
      current.map((team) =>
        team.id === nextTeam.id
          ? {
              ...team,
              isPublic: nextTeam.isPublic,
              shareToken: nextTeam.shareToken,
              publicSharedAt: nextTeam.publicSharedAt,
            }
          : team
      )
    );
  };

  const handleShareTeamProof = async () => {
    if (!teamDetail) return;

    try {
      setSharingTeamProof(true);
      const nextTeam = await shareTeamWorkspace(teamDetail.team.id);
      mergeSharedTeamState(nextTeam);
      const nextUrl =
        typeof window !== 'undefined' && window.location?.origin && nextTeam.shareToken
          ? `${window.location.origin}/teams/proof/${nextTeam.shareToken}`
          : nextTeam.shareToken
          ? `/teams/proof/${nextTeam.shareToken}`
          : '';

      if (nextUrl) {
        await copyTextToClipboard(nextUrl);
      }

      trackEvent('team_proof_shared', {
        teamId: teamDetail.team.id,
        useCase: teamDetail.team.useCase,
      });
      toast.success('Team proof page published and copied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish the team proof page.');
    } finally {
      setSharingTeamProof(false);
    }
  };

  const handleUnshareTeamProof = async () => {
    if (!teamDetail) return;

    try {
      setUnsharingTeamProof(true);
      const nextTeam = await unshareTeamWorkspace(teamDetail.team.id);
      mergeSharedTeamState(nextTeam);
      trackEvent('team_proof_unshared', {
        teamId: teamDetail.team.id,
        useCase: teamDetail.team.useCase,
      });
      toast.success('Team proof page disabled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disable the team proof page.');
    } finally {
      setUnsharingTeamProof(false);
    }
  };

  const handleCopyTeamProofLink = async () => {
    if (!sharedTeamProofUrl) return;

    try {
      await copyTextToClipboard(sharedTeamProofUrl);
      trackEvent('team_proof_link_copied', {
        teamId: teamDetail?.team.id,
        useCase: teamDetail?.team.useCase,
      });
      toast.success('Team proof link copied.');
    } catch {
      toast.error('Could not copy the team proof link.');
    }
  };

  return (
    <div className={mode === 'app' ? 'flex min-h-full flex-col px-2 py-2 sm:px-3 lg:px-4 xl:px-5 lg:py-3 xl:py-4' : ''}>
      <div className="grid flex-1 gap-4 xl:grid-cols-[0.95fr_1.05fr] xl:grid-rows-1">
      <section className={`${workspaceShellClass} ${mode === 'app' ? 'h-full' : ''}`}>
        <div className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-xp/20 bg-xp/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-xp">Live team workspace</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">Benchmark a cohort. Track proof of progress.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Create a pilot team, assign benchmark-first practice, and use benchmark history to see who is improving.</p>
            </div>
            <div className="grid gap-2 sm:min-w-[260px]">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current team</label>
              <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} className={workspaceInputClass}>
                {teams.length === 0 ? <option value="">No teams yet</option> : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage ? <div className="rounded-2xl border border-coins/20 bg-coins/10 px-4 py-3 text-sm text-coins">{errorMessage}</div> : null}
        </div>

        {loadingTeams || loadingDetail ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            Loading team workspace...
          </div>
        ) : !teamDetail ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Create a team</div>
              {canCreateTeams ? (
                <div className="mt-4 space-y-3">
                  <input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Athens bootcamp cohort" className={workspaceInputClass} />
                  <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Short description for this pilot." rows={3} className={workspaceInputClass} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select value={createForm.useCase} onChange={(event) => setCreateForm((current) => ({ ...current, useCase: event.target.value as TeamUseCase }))} className={workspaceInputClass}>
                      {teamUseCaseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input type="number" min={1} max={1000} value={createForm.seatLimit} onChange={(event) => setCreateForm((current) => ({ ...current, seatLimit: Number(event.target.value) || 25 }))} className={workspaceInputClass} />
                  </div>
                  <button type="button" onClick={handleCreateTeam} disabled={creatingTeam} className={workspacePrimaryButtonClass}>
                    {creatingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {creatingTeam ? 'Creating team...' : 'Create team workspace'}
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
                  <div className="font-semibold text-primary">Teams plan required</div>
                  <div className="mt-1">
                    Create workspaces with Teams, Teams Growth, or Custom.
                    {activeTeamEntitlement?.currentPeriodEnd ? ` Active until ${formatDueLabel(activeTeamEntitlement.currentPeriodEnd)}.` : ''}
                  </div>
                </div>
              )}
            </div>

            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Join with invite code</div>
              <div className="mt-4 space-y-3">
                <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="CODH-ABC123" className={workspaceInputClass} />
                <button type="button" onClick={handleJoinTeam} disabled={joiningTeam} className={workspaceSecondaryButtonClass}>
                  {joiningTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  {joiningTeam ? 'Joining...' : 'Join team'}
                </button>
              </div>
              {searchParams.get('invite') ? (
                <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-6 text-primary">
                  Invite code detected from your link. Sign in if needed, then join the team directly from here.
                </div>
              ) : null}
              <div className="mt-6 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">Create or join a team to unlock analytics.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className={workspaceMetricClass}>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active learners</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{teamDetail.metrics.activeLearners}</div>
                <p className="mt-1 text-sm text-muted-foreground">{teamDetail.team.memberCount} members in this cohort.</p>
              </div>
              <div className={workspaceMetricClass}>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Benchmark completion</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{teamDetail.metrics.benchmarkCompletionRate}%</div>
                <p className="mt-1 text-sm text-muted-foreground">{teamDetail.metrics.benchmarkCompletionCount} learners have a recorded benchmark.</p>
              </div>
              <div className={workspaceMetricClass}>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Median score</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{teamDetail.metrics.medianScore ?? '--'}/100</div>
                <p className="mt-1 text-sm text-muted-foreground">Based on each learner's latest benchmark.</p>
              </div>
              <div className={workspaceMetricClass}>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Retake ready</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{teamDetail.metrics.retakeReadyCount}</div>
                <p className="mt-1 text-sm text-muted-foreground">Learners with enough signal for another benchmark pass.</p>
              </div>
              <div className={workspaceMetricClass}>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Needs attention</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{teamDetail.metrics.needsAttentionCount}</div>
                <p className="mt-1 text-sm text-muted-foreground">Learners still below baseline or missing a first benchmark.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className={workspacePanelClass}>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><BarChart3 className="h-4 w-4 text-primary" />Members</div>
                {teamDetail.members.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {teamDetail.members.map((member) => (
                      <li key={member.userId} className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{member.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {member.latestBenchmarkStatus} - {member.role}
                            </div>
                            <div className="mt-2 inline-flex rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {member.recommendedAction}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">{member.latestBenchmarkScore ?? '--'}/100</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {member.improvementDelta !== null
                                ? `${member.improvementDelta > 0 ? '+' : ''}${member.improvementDelta} pts`
                                : `${member.currentStreak}d streak`}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                    No members yet. Create an invite.
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <div className={workspacePanelClass}>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Assignments</div>
                  {teamDetail.assignments.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {teamDetail.assignments.map((assignment) => (
                        <li key={assignment.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                          <div className="text-sm font-semibold text-foreground">{assignment.title}</div>
                          {assignment.description ? (
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">{assignment.description}</div>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                            <span>{assignment.assignmentType.replace('_', ' ')}</span>
                            <span>{formatDueLabel(assignment.dueAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                      No assignments yet. Add one to begin.
                    </div>
                  )}
                  {canManageTeam ? (
                    <div className="mt-4 space-y-3">
                      <input
                        value={assignmentForm.title}
                        onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Python fundamentals benchmark"
                        className={workspaceInputClass}
                      />
                      <textarea
                        value={assignmentForm.description}
                        onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Add context for learners or instructors."
                        rows={3}
                        className={workspaceInputClass}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={assignmentForm.assignmentType}
                          onChange={(event) => setAssignmentForm((current) => ({ ...current, assignmentType: event.target.value as TeamAssignmentType }))}
                          className={workspaceInputClass}
                        >
                          {assignmentTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={assignmentForm.dueAt}
                          onChange={(event) => setAssignmentForm((current) => ({ ...current, dueAt: event.target.value }))}
                          className={workspaceInputClass}
                        />
                      </div>
                      {assignmentForm.assignmentType === 'benchmark' ? (
                        <select
                          value={assignmentForm.benchmarkLanguage}
                          onChange={(event) => setAssignmentForm((current) => ({ ...current, benchmarkLanguage: event.target.value as BenchmarkLanguage }))}
                          className={workspaceInputClass}
                        >
                          {benchmarkLanguageOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : null}
                      {assignmentForm.assignmentType === 'roadmap' ? (
                        <select
                          value={assignmentForm.trackId}
                          onChange={(event) => setAssignmentForm((current) => ({ ...current, trackId: event.target.value }))}
                          className={workspaceInputClass}
                        >
                          {availableTrackOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : null}
                      <button type="button" onClick={handleCreateAssignment} disabled={creatingAssignment} className={workspaceSecondaryButtonClass}>
                        {creatingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {creatingAssignment ? 'Adding assignment...' : 'Add assignment'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className={workspacePanelClass}>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Invite codes</div>
                  <div className="mt-4 space-y-3">
                    {teamDetail.invites.length > 0 ? (
                      teamDetail.invites.slice(0, 5).map((invite) => (
                        <div key={invite.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground">{invite.label}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{invite.code}</div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {invite.role} • expires {formatDueLabel(invite.expiresAt)}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">{invite.useCount}/{invite.maxUses} used</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">
                        No invite codes yet. Create one to start.
                      </div>
                    )}
                  </div>
                  {canManageTeam ? (
                    <div className="mt-4 space-y-3">
                      <input
                        value={inviteForm.label}
                        onChange={(event) => setInviteForm((current) => ({ ...current, label: event.target.value }))}
                        placeholder="Invite label"
                        className={workspaceInputClass}
                      />
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="Optional email restriction"
                        className={workspaceInputClass}
                      />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <select
                          value={inviteForm.role}
                          onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as Exclude<TeamRole, 'owner'> }))}
                          className={workspaceInputClass}
                        >
                          {inviteRoleOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={inviteForm.maxUses}
                          onChange={(event) => setInviteForm((current) => ({ ...current, maxUses: Number(event.target.value) || 25 }))}
                          className={workspaceInputClass}
                        />
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={inviteForm.expiresInDays}
                          onChange={(event) => setInviteForm((current) => ({ ...current, expiresInDays: Number(event.target.value) || 14 }))}
                          className={workspaceInputClass}
                        />
                      </div>
                      <button type="button" onClick={handleCreateInvite} disabled={creatingInvite} className={workspaceSecondaryButtonClass}>
                        {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                        {creatingInvite ? 'Creating invite...' : 'Create invite'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className={workspacePanelClass}>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Public proof page</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Share cohort progress with one public page.
                  </p>
                  <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                    {teamDetail.team.isPublic && sharedTeamProofUrl ? (
                      <div className="space-y-3">
                        <div className="font-semibold text-foreground">Live now</div>
                        <div className="break-all text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {sharedTeamProofUrl}
                        </div>
                        {teamDetail.team.publicSharedAt ? (
                          <div>
                            Shared {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(teamDetail.team.publicSharedAt))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        Keep this private until you want to share it.
                      </div>
                    )}
                  </div>
                  {canManageTeam ? (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      {teamDetail.team.isPublic ? (
                        <>
                          <button type="button" onClick={handleCopyTeamProofLink} className={workspaceSecondaryButtonClass}>
                            <Copy className="h-4 w-4" />
                            Copy proof link
                          </button>
                          <button type="button" onClick={handleUnshareTeamProof} disabled={unsharingTeamProof} className={workspaceSecondaryButtonClass}>
                            {unsharingTeamProof ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {unsharingTeamProof ? 'Disabling...' : 'Disable proof page'}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={handleShareTeamProof} disabled={sharingTeamProof} className={workspaceSecondaryButtonClass}>
                          {sharingTeamProof ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                          {sharingTeamProof ? 'Publishing...' : 'Publish proof page'}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="min-w-0 grid gap-4">
        {teamDetail ? (
          <>
            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progress over time</div>
              {renderProgressBars(teamDetail.metrics.progressTimeline)}
            </div>

            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Improvement leaders</div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {improvementLeaders.length > 0 ? (
                  improvementLeaders.map((member) => (
                    <div key={member.userId} className="rounded-2xl border border-border bg-card px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">{member.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {member.benchmarkCount} benchmark{member.benchmarkCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="text-right font-semibold text-foreground">
                          {member.improvementDelta !== null ? `${member.improvementDelta > 0 ? '+' : ''}${member.improvementDelta} pts` : '--'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    Improvement leaders appear after retakes.
                  </div>
                )}
              </div>
            </div>

            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attention queue</div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {attentionQueue.length > 0 ? (
                  attentionQueue.map((member) => (
                    <div key={member.userId} className="rounded-2xl border border-border bg-card px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">{member.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {member.recommendedAction}
                          </div>
                        </div>
                        <div className="text-right font-semibold text-foreground">
                          {member.latestBenchmarkScore ?? '--'}/100
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    No learners need attention right now.
                  </div>
                )}
              </div>
            </div>

            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Performance snapshot</div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  Avg. improvement: <span className="font-semibold text-foreground">{teamDetail.metrics.averageImprovement ?? '--'} pts</span>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  Top performer: <span className="font-semibold text-foreground">{teamDetail.metrics.topPerformer?.name ?? 'No benchmark yet'}</span>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  Use case: <span className="font-semibold text-foreground">{teams.find((team) => team.id === selectedTeamId)?.useCase ?? 'general'}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Before launch</div>
              <div className="mt-4 space-y-3">
                {[
                  'Create one team per cohort or program.',
                  'Use invite codes.',
                  'Start with a benchmark assignment.',
                  'Publish proof after real results.',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {teamUseCases.map((useCase) => (
              <div key={useCase.slug} className={workspacePanelClass}>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{useCase.title}</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{useCase.description}</p>
              </div>
            ))}
          </>
        )}
      </aside>
      </div>
    </div>
  );
}
