import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Copy, Crown, Loader2, Mail, Plus, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { teamUseCases } from '../../data/siteContent';
import {
  createTeam,
  createTeamAssignment,
  createTeamInvite,
  getTeamWorkspace,
  joinTeamByCode,
  listTeams,
  type TeamSummary,
  type TeamUseCase,
  type TeamWorkspaceDetail,
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

const renderProgressBars = (entries: Array<{ label: string; value: number | null }>) => (
  <div className="mt-4 space-y-3">
    {entries.map((entry) => {
      const value = entry.value ?? 0;
      return (
        <div key={entry.label}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>{entry.label}</span>
            <span>{entry.value ?? '--'}/100</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${value}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

const PublicTeamsWorkspace = ({ mode }: { mode: 'public' | 'app' }) => (
  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            {mode === 'public' ? 'Demo cohort workspace' : 'Pilot cohort workspace'}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Benchmark a cohort. Track proof of progress.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Use Codhak to benchmark learners quickly, assign practice paths, run competitions, and keep one shared view of improvement over time.
          </p>
        </div>
        <div className="grid gap-3 sm:min-w-[220px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Active learners</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">24</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Median score</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">71/100</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><Users className="h-4 w-4 text-sky-600" />Benchmark completion</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">83%</div>
          <p className="mt-1 text-sm text-slate-500">20 of 24 learners have completed the benchmark.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><TrendingUp className="h-4 w-4 text-emerald-600" />Avg. improvement</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">+12 pts</div>
          <p className="mt-1 text-sm text-slate-500">Tracked across current practice paths.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><Crown className="h-4 w-4 text-violet-600" />Top performer</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">Maya P.</div>
          <p className="mt-1 text-sm text-slate-500">82/100 score with a 7-day practice streak.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><BarChart3 className="h-4 w-4 text-sky-600" />Members</div>
          <ul className="mt-4 space-y-3">
            {demoMembers.map((member) => (
              <li key={member.name} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{member.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{member.score}/100</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{member.streak}d streak</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><CalendarDays className="h-4 w-4 text-amber-600" />Assignment packs</div>
            <ul className="mt-4 space-y-3">
              {demoAssignments.map((assignment) => (
                <li key={assignment.title} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{assignment.title}</div>
                  <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
                    <span>{assignment.type}</span>
                    <span>{assignment.due}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Invite and join flow</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">This public view is intentionally a pilot preview. The signed-in workspace now supports real team creation, invites, assignments, and benchmark-derived analytics.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><Mail className="h-4 w-4" />Request pilot walkthrough</button>
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><Users className="h-4 w-4" />See signed-in workflow</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside className="grid gap-4">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Progress over time</div>
        {renderProgressBars(demoTimeline)}
      </div>
      {teamUseCases.map((useCase) => (
        <div key={useCase.slug} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{useCase.title}</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{useCase.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {useCase.outcomes.map((outcome) => (
              <li key={outcome} className="rounded-2xl bg-slate-50 px-4 py-3">{outcome}</li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  </div>
);

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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Live team workspace</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Benchmark a cohort. Track proof of progress.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Create a pilot team, assign benchmark-first practice, and use benchmark history to see who is improving.</p>
            </div>
            <div className="grid gap-2 sm:min-w-[260px]">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current team</label>
              <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {teams.length === 0 ? <option value="">No teams yet</option> : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{errorMessage}</div> : null}
        </div>

        {loadingTeams || loadingDetail ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading team workspace...
          </div>
        ) : !teamDetail ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Create a team</div>
              <div className="mt-4 space-y-3">
                <input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Athens bootcamp cohort" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
                <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Short description for this pilot." rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={createForm.useCase} onChange={(event) => setCreateForm((current) => ({ ...current, useCase: event.target.value as TeamUseCase }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    {teamUseCaseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input type="number" min={1} max={1000} value={createForm.seatLimit} onChange={(event) => setCreateForm((current) => ({ ...current, seatLimit: Number(event.target.value) || 25 }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
                </div>
                <button type="button" onClick={handleCreateTeam} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">
                  <Plus className="h-4 w-4" />
                  Create team workspace
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Join with invite code</div>
              <div className="mt-4 space-y-3">
                <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="CODH-ABC123" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
                <button type="button" onClick={handleJoinTeam} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <Users className="h-4 w-4" />
                  Join team
                </button>
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Create one pilot team or join an existing cohort to unlock assignments, invite codes, and benchmark-derived analytics.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Active learners</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{teamDetail.metrics.activeLearners}</div>
                <p className="mt-1 text-sm text-slate-500">{teamDetail.team.memberCount} members in this cohort.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Benchmark completion</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{teamDetail.metrics.benchmarkCompletionRate}%</div>
                <p className="mt-1 text-sm text-slate-500">{teamDetail.metrics.benchmarkCompletionCount} learners have a recorded benchmark.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Median score</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{teamDetail.metrics.medianScore ?? '--'}/100</div>
                <p className="mt-1 text-sm text-slate-500">Based on each learner's latest benchmark.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><BarChart3 className="h-4 w-4 text-sky-600" />Members</div>
                <ul className="mt-4 space-y-3">
                  {teamDetail.members.map((member) => (
                    <li key={member.userId} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{member.latestBenchmarkStatus} - {member.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">{member.latestBenchmarkScore ?? '--'}/100</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{member.currentStreak}d streak</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.75rem] border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><CalendarDays className="h-4 w-4 text-amber-600" />Assignments</div>
                  <ul className="mt-4 space-y-3">
                    {teamDetail.assignments.map((assignment) => (
                      <li key={assignment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">{assignment.title}</div>
                        <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
                          <span>{assignment.assignmentType.replace('_', ' ')}</span>
                          <span>{formatDueLabel(assignment.dueAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {canManageTeam ? (
                    <div className="mt-4 flex gap-3">
                      <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Add a benchmark assignment" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
                      <button type="button" onClick={handleCreateAssignment} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><Plus className="h-4 w-4" />Add</button>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Invite codes</div>
                  <div className="mt-4 space-y-3">
                    {teamDetail.invites.slice(0, 3).map((invite) => (
                      <div key={invite.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{invite.label}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{invite.code}</div>
                          </div>
                          <div className="text-xs text-slate-500">{invite.useCount}/{invite.maxUses} used</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManageTeam ? (
                    <div className="mt-4 flex gap-3">
                      <input value={inviteLabel} onChange={(event) => setInviteLabel(event.target.value)} placeholder="Invite label" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
                      <button type="button" onClick={handleCreateInvite} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><Copy className="h-4 w-4" />Create</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="grid gap-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Progress over time</div>
          {renderProgressBars(teamDetail?.metrics.progressTimeline || demoTimeline)}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Performance snapshot</div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              Avg. improvement: <span className="font-semibold text-slate-900">{teamDetail?.metrics.averageImprovement ?? '--'} pts</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              Top performer: <span className="font-semibold text-slate-900">{teamDetail?.metrics.topPerformer?.name ?? 'No benchmark yet'}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              Use case: <span className="font-semibold text-slate-900">{teams.find((team) => team.id === selectedTeamId)?.useCase ?? 'general'}</span>
            </div>
          </div>
        </div>

        {teamUseCases.map((useCase) => (
          <div key={useCase.slug} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{useCase.title}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{useCase.description}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
