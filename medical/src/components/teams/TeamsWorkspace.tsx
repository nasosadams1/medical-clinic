import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Copy, Crown, Loader2, Mail, Plus, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { teamUseCases } from '../../data/siteContent';
import { trackEvent } from '../../lib/analytics';
import {
  createTeam,
  createTeamAssignment,
  createTeamInvite,
  getTeamWorkspace,
  joinTeamByCode,
  listTeams,
  shareTeamWorkspace,
  type TeamSummary,
  type TeamUseCase,
  type TeamWorkspaceDetail,
  unshareTeamWorkspace,
} from '../../lib/teams';

interface TeamsWorkspaceProps {
  mode?: 'public' | 'app';
}

const demoMembers = [
  { name: 'Maya P.', score: 82, status: 'Benchmarked', streak: 7 },
  { name: 'Jon A.', score: 74, status: 'Practice path active', streak: 5 },
  { name: 'Priya S.', score: 68, status: 'Needs roadmap review', streak: 3 },
  { name: 'Noah T.', score: 61, status: 'Benchmark pending follow-up', streak: 2 },
];

const demoAssignments = [
  { title: 'Python Fundamentals Benchmark', due: 'This week', type: 'Benchmark' },
  { title: 'Junior Screening Challenge Pack', due: 'Next week', type: 'Challenge pack' },
  { title: 'Practice path: Arrays & control flow', due: 'Active', type: 'Roadmap' },
];

const demoTimeline = [
  { label: 'Week 1', value: 58 },
  { label: 'Week 2', value: 63 },
  { label: 'Week 3', value: 68 },
  { label: 'Week 4', value: 71 },
];

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@codhakmailserver.online';

const teamUseCaseOptions: Array<{ value: TeamUseCase; label: string }> = [
  { value: 'bootcamps', label: 'Bootcamp cohort' },
  { value: 'universities', label: 'University / class' },
  { value: 'coding-clubs', label: 'Coding club' },
  { value: 'upskilling', label: 'Upskilling team' },
  { value: 'general', label: 'General pilot' },
];

const formatDueLabel = (value: string | null | undefined) => {
  if (!value) return 'Active';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
};

const workspaceShellClass = 'rounded-[1.5rem] border border-border bg-card p-6 shadow-card sm:p-8';
const workspacePanelClass = 'rounded-[1.35rem] border border-border bg-background/70 p-5';
const workspaceMetricClass = 'rounded-[1.2rem] border border-border bg-background/70 px-4 py-4';
const workspaceInputClass =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground';
const workspacePrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-primary/90';
const workspaceSecondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-card';

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

const PublicTeamsWorkspace = ({ mode }: { mode: 'public' | 'app' }) => {
  const navigate = useNavigate();

  return (
  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
    <section className={workspaceShellClass}>
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {mode === 'public' ? 'Demo cohort workspace' : 'Pilot cohort workspace'}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">Benchmark a cohort. Track proof of progress.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Use Codhak to benchmark learners quickly, assign practice paths, run competitions, and keep one shared view of improvement over time.
          </p>
        </div>
        <div className="grid gap-3 sm:min-w-[220px]">
          <div className={workspaceMetricClass}>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active learners</div>
            <div className="mt-1 text-lg font-semibold text-foreground">24</div>
          </div>
          <div className={workspaceMetricClass}>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Median score</div>
            <div className="mt-1 text-lg font-semibold text-foreground">71/100</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={workspaceMetricClass}>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><Users className="h-4 w-4 text-primary" />Benchmark completion</div>
          <div className="mt-3 text-3xl font-semibold text-foreground">83%</div>
          <p className="mt-1 text-sm text-muted-foreground">20 of 24 learners have completed the benchmark.</p>
        </div>
        <div className={workspaceMetricClass}>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><TrendingUp className="h-4 w-4 text-xp" />Avg. improvement</div>
          <div className="mt-3 text-3xl font-semibold text-foreground">+12 pts</div>
          <p className="mt-1 text-sm text-muted-foreground">Tracked across current practice paths.</p>
        </div>
        <div className={workspaceMetricClass}>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><Crown className="h-4 w-4 text-primary" />Top performer</div>
          <div className="mt-3 text-3xl font-semibold text-foreground">Maya P.</div>
          <p className="mt-1 text-sm text-muted-foreground">82/100 score with a 7-day practice streak.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className={workspacePanelClass}>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><BarChart3 className="h-4 w-4 text-primary" />Members</div>
          <ul className="mt-4 space-y-3">
            {demoMembers.map((member) => (
              <li key={member.name} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{member.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{member.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">{member.score}/100</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{member.streak}d streak</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4">
          <div className={workspacePanelClass}>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Assignment packs</div>
            <ul className="mt-4 space-y-3">
              {demoAssignments.map((assignment) => (
                <li key={assignment.title} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">{assignment.title}</div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{assignment.type}</span>
                    <span>{assignment.due}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className={workspacePanelClass}>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Invite and join flow</div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">This public view is intentionally a pilot preview. The signed-in workspace now supports real team creation, invites, assignments, and benchmark-derived analytics.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent('Codhak pilot walkthrough request')}`}
                className={workspaceSecondaryButtonClass}
              >
                <Mail className="h-4 w-4" />
                Request pilot walkthrough
              </a>
              <button
                type="button"
                onClick={() => navigate('/benchmark')}
                className={workspaceSecondaryButtonClass}
              >
                <Users className="h-4 w-4" />
                Start with benchmark
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside className="grid gap-4">
      <div className={workspacePanelClass}>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progress over time</div>
        {renderProgressBars(demoTimeline)}
      </div>
      {teamUseCases.map((useCase) => (
        <div key={useCase.slug} className={workspacePanelClass}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{useCase.title}</div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{useCase.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            {useCase.outcomes.map((outcome) => (
              <li key={outcome} className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground">{outcome}</li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  </div>
  );
};

export default function TeamsWorkspace({ mode = 'public' }: TeamsWorkspaceProps) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamDetail, setTeamDetail] = useState<TeamWorkspaceDetail | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '', useCase: 'bootcamps' as TeamUseCase, seatLimit: 25 });
  const [joinCode, setJoinCode] = useState('');
  const [inviteLabel, setInviteLabel] = useState('General learner access');
  const [assignmentTitle, setAssignmentTitle] = useState('');

  const canManageTeam = useMemo(() => ['owner', 'admin', 'coach'].includes(teamDetail?.team.currentUserRole || ''), [teamDetail?.team.currentUserRole]);
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
    return <PublicTeamsWorkspace mode={mode} />;
  }

  const refreshTeamsAndSelect = async (preferredTeamId?: string) => {
    const nextTeams = await listTeams();
    setTeams(nextTeams);
    const nextSelectedTeamId = preferredTeamId && nextTeams.some((team) => team.id === preferredTeamId)
      ? preferredTeamId
      : nextTeams[0]?.id || '';
    setSelectedTeamId(nextSelectedTeamId);
    if (nextSelectedTeamId) {
      setTeamDetail(await getTeamWorkspace(nextSelectedTeamId));
    } else {
      setTeamDetail(null);
    }
  };

  const handleCreateTeam = async () => {
    if (!createForm.name.trim()) {
      toast.error('Team name is required.');
      return;
    }

    try {
      setLoadingTeams(true);
      const team = await createTeam(createForm);
      setCreateForm({ name: '', description: '', useCase: createForm.useCase, seatLimit: createForm.seatLimit });
      await refreshTeamsAndSelect(team.id);
      toast.success('Team workspace created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create team.');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      toast.error('Enter an invite code first.');
      return;
    }

    try {
      setLoadingTeams(true);
      const team = await joinTeamByCode(joinCode.trim().toUpperCase());
      setJoinCode('');
      await refreshTeamsAndSelect(team.id);
      toast.success(`Joined ${team.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not join team.');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!teamDetail) return;
    try {
      const invite = await createTeamInvite(teamDetail.team.id, { label: inviteLabel });
      setInviteLabel('General learner access');
      setTeamDetail((current) => current ? { ...current, invites: [invite, ...current.invites] } : current);
      await navigator.clipboard.writeText(invite.code);
      toast.success('Invite code created and copied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create invite.');
    }
  };

  const handleCreateAssignment = async () => {
    if (!teamDetail) return;
    if (!assignmentTitle.trim()) {
      toast.error('Assignment title is required.');
      return;
    }

    try {
      const assignment = await createTeamAssignment(teamDetail.team.id, {
        title: assignmentTitle,
        assignmentType: 'benchmark',
        benchmarkLanguage: 'python',
      });
      setAssignmentTitle('');
      setTeamDetail((current) => current ? { ...current, assignments: [assignment, ...current.assignments] } : current);
      toast.success('Assignment added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create assignment.');
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
      const nextTeam = await shareTeamWorkspace(teamDetail.team.id);
      mergeSharedTeamState(nextTeam);
      const nextUrl =
        typeof window !== 'undefined' && window.location?.origin && nextTeam.shareToken
          ? `${window.location.origin}/teams/proof/${nextTeam.shareToken}`
          : nextTeam.shareToken
          ? `/teams/proof/${nextTeam.shareToken}`
          : '';

      if (nextUrl) {
        await navigator.clipboard.writeText(nextUrl);
      }

      trackEvent('team_proof_shared', {
        teamId: teamDetail.team.id,
        useCase: teamDetail.team.useCase,
      });
      toast.success('Team proof page published and copied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish the team proof page.');
    }
  };

  const handleUnshareTeamProof = async () => {
    if (!teamDetail) return;

    try {
      const nextTeam = await unshareTeamWorkspace(teamDetail.team.id);
      mergeSharedTeamState(nextTeam);
      trackEvent('team_proof_unshared', {
        teamId: teamDetail.team.id,
        useCase: teamDetail.team.useCase,
      });
      toast.success('Team proof page disabled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disable the team proof page.');
    }
  };

  const handleCopyTeamProofLink = async () => {
    if (!sharedTeamProofUrl) return;

    try {
      await navigator.clipboard.writeText(sharedTeamProofUrl);
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
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className={workspaceShellClass}>
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
              <div className="mt-4 space-y-3">
                <input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Athens bootcamp cohort" className={workspaceInputClass} />
                <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Short description for this pilot." rows={3} className={workspaceInputClass} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={createForm.useCase} onChange={(event) => setCreateForm((current) => ({ ...current, useCase: event.target.value as TeamUseCase }))} className={workspaceInputClass}>
                    {teamUseCaseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input type="number" min={1} max={1000} value={createForm.seatLimit} onChange={(event) => setCreateForm((current) => ({ ...current, seatLimit: Number(event.target.value) || 25 }))} className={workspaceInputClass} />
                </div>
                <button type="button" onClick={handleCreateTeam} className={workspacePrimaryButtonClass}>
                  <Plus className="h-4 w-4" />
                  Create team workspace
                </button>
              </div>
            </div>

            <div className={workspacePanelClass}>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Join with invite code</div>
              <div className="mt-4 space-y-3">
                <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="CODH-ABC123" className={workspaceInputClass} />
                <button type="button" onClick={handleJoinTeam} className={workspaceSecondaryButtonClass}>
                  <Users className="h-4 w-4" />
                  Join team
                </button>
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-6 text-muted-foreground">Create one pilot team or join an existing cohort to unlock assignments, invite codes, and benchmark-derived analytics.</div>
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
              </div>

              <div className="grid gap-4">
                <div className={workspacePanelClass}>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Assignments</div>
                  <ul className="mt-4 space-y-3">
                    {teamDetail.assignments.map((assignment) => (
                      <li key={assignment.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="text-sm font-semibold text-foreground">{assignment.title}</div>
                        <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                          <span>{assignment.assignmentType.replace('_', ' ')}</span>
                          <span>{formatDueLabel(assignment.dueAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {canManageTeam ? (
                    <div className="mt-4 flex gap-3">
                      <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Add a benchmark assignment" className={`min-w-0 flex-1 ${workspaceInputClass}`} />
                      <button type="button" onClick={handleCreateAssignment} className={workspaceSecondaryButtonClass}><Plus className="h-4 w-4" />Add</button>
                    </div>
                  ) : null}
                </div>

                <div className={workspacePanelClass}>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Invite codes</div>
                  <div className="mt-4 space-y-3">
                    {teamDetail.invites.slice(0, 3).map((invite) => (
                      <div key={invite.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{invite.label}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{invite.code}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{invite.useCount}/{invite.maxUses} used</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManageTeam ? (
                    <div className="mt-4 flex gap-3">
                      <input value={inviteLabel} onChange={(event) => setInviteLabel(event.target.value)} placeholder="Invite label" className={`min-w-0 flex-1 ${workspaceInputClass}`} />
                      <button type="button" onClick={handleCreateInvite} className={workspaceSecondaryButtonClass}><Copy className="h-4 w-4" />Create</button>
                    </div>
                  ) : null}
                </div>

                <div className={workspacePanelClass}>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Public proof page</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Turn private cohort progress into a shareable proof page with benchmark completion, score movement, and current assignments.
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
                        Keep this private until you want a clean public proof surface for schools, bootcamps, or team buyers.
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
                          <button type="button" onClick={handleUnshareTeamProof} className={workspaceSecondaryButtonClass}>
                            Disable proof page
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={handleShareTeamProof} className={workspaceSecondaryButtonClass}>
                          <Copy className="h-4 w-4" />
                          Publish proof page
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

      <aside className="grid gap-4">
        <div className={workspacePanelClass}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progress over time</div>
          {renderProgressBars(teamDetail?.metrics.progressTimeline || demoTimeline)}
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
                Repeat benchmarks will populate cohort improvement leaders here.
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
                No immediate attention cases. This cohort is either benchmarked or above the current baseline.
              </div>
            )}
          </div>
        </div>

        <div className={workspacePanelClass}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Performance snapshot</div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              Avg. improvement: <span className="font-semibold text-foreground">{teamDetail?.metrics.averageImprovement ?? '--'} pts</span>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              Top performer: <span className="font-semibold text-foreground">{teamDetail?.metrics.topPerformer?.name ?? 'No benchmark yet'}</span>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              Use case: <span className="font-semibold text-foreground">{teams.find((team) => team.id === selectedTeamId)?.useCase ?? 'general'}</span>
            </div>
          </div>
        </div>

        {teamUseCases.map((useCase) => (
          <div key={useCase.slug} className={workspacePanelClass}>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{useCase.title}</div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{useCase.description}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
