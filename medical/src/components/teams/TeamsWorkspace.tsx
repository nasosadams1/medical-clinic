import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
  TeamFeedback,
  TeamFeedbackStatus,
  TeamInvite,
  TeamJoinMode,
  TeamJoinRequest,
  TeamMember,
  TeamRole,
  TeamSummary,
  TeamUseCase,
  TeamWorkspaceDetail,
  unshareTeamWorkspace,
  updateTeamAssignment,
  updateTeamFeedback,
  updateTeamInvite,
  updateTeamJoinSettings,
  updateTeamMember,
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
  rubricScore: string;
  status: TeamFeedbackStatus;
  summary: string;
  strengths: string;
  focusAreas: string;
  coachNotes: string;
  sharedWithMember: boolean;
}

interface JoinSettingsDraft {
  joinMode: TeamJoinMode;
  allowedEmailDomain: string;
}

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

const FEEDBACK_STATUS_OPTIONS: Array<{ value: TeamFeedbackStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'shared', label: 'Shared' },
  { value: 'resolved', label: 'Resolved' },
];

const TEAM_JOIN_MODE_OPTIONS: Array<{ value: TeamJoinMode; label: string; helper: string }> = [
  { value: 'open_code', label: 'Open by code', helper: 'Any active code joins instantly.' },
  { value: 'code_domain', label: 'Code + email domain', helper: 'Only signed-in users on one allowed domain can join.' },
  { value: 'code_approval', label: 'Code + admin approval', helper: 'Codes create requests that owners or admins approve.' },
  { value: 'invite_only', label: 'Invite-only', helper: 'Only direct email invites can be used.' },
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
  rubricScore: '',
  status: 'draft',
  summary: '',
  strengths: '',
  focusAreas: '',
  coachNotes: '',
  sharedWithMember: false,
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

const getMemberActivityIndicator = (lastActiveAt: string | null | undefined) => {
  if (!lastActiveAt) {
    return { className: 'border border-white/10 bg-black', label: 'No recent activity' };
  }

  const ageMs = Date.now() - new Date(lastActiveAt).getTime();
  if (Number.isNaN(ageMs)) {
    return { className: 'border border-white/10 bg-black', label: 'No recent activity' };
  }

  if (ageMs <= 15 * 60 * 1000) {
    return { className: 'bg-emerald-400', label: 'Active now' };
  }
  if (ageMs <= 12 * 60 * 60 * 1000) {
    return { className: 'bg-amber-200', label: 'Active within 12 hours' };
  }
  if (ageMs <= 24 * 60 * 60 * 1000) {
    return { className: 'bg-amber-400', label: 'Active within 24 hours' };
  }
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) {
    return { className: 'bg-rose-300', label: 'Active within 3 days' };
  }
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) {
    return { className: 'bg-rose-500', label: 'Active within 7 days' };
  }

  return { className: 'border border-white/10 bg-black', label: 'Inactive for over 7 days' };
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

function StatusPill({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'success' | 'warn' }) {
  const toneClass =
    tone === 'success'
      ? 'border-xp/20 bg-xp/10 text-xp'
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
  const selectedTeamPlanPolicy = useMemo(
    () => getTeamPlanPolicyFromSeatLimit(selectedTeam?.seatLimit),
    [selectedTeam?.seatLimit]
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
      assignments: teamDetail?.assignments.length || 0,
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

  const refreshTeamList = async (preferredTeamId?: string) => {
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
  };

  const refreshSelectedTeam = async (teamId: string) => {
    if (!teamId || !isSignedIn) {
      setTeamDetail(null);
      setTeamAnalytics(null);
      return;
    }

    setLoadingDetail(true);
    setErrorMessage(null);

    try {
      const detail = await getTeamWorkspace(teamId);
      setTeamDetail(detail);
      hydrateMemberDrafts(detail.members);
      setJoinSettingsDraft({
        joinMode: detail.team.joinMode || 'open_code',
        allowedEmailDomain: detail.team.allowedEmailDomain || '',
      });
      if (!feedbackDraft.memberUserId && detail.members[0]) {
        setFeedbackDraft((current) => ({ ...current, memberUserId: detail.members[0].userId }));
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load the selected team.');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void refreshTeamList();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === TEAM_WORKSPACE_OVERVIEW_VALUE) {
      setTeamDetail(null);
      setTeamAnalytics(null);
      return;
    }

    void refreshSelectedTeam(selectedTeamId);
  }, [selectedTeamId]);

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

  const resetInviteDraft = () => setInviteDraft(emptyInviteDraft());
  const resetAssignmentDraft = () => setAssignmentDraft(emptyAssignmentDraft());
  const resetFeedbackEditor = () =>
    setFeedbackDraft((current) => ({
      ...emptyFeedbackDraft(),
      memberUserId: teamDetail?.members[0]?.userId || current.memberUserId || '',
    }));

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
      const payload = {
        title: assignmentDraft.title.trim(),
        description: assignmentDraft.description.trim(),
        assignmentType: assignmentDraft.assignmentType,
        benchmarkLanguage:
          assignmentDraft.assignmentType === 'roadmap' ? null : assignmentDraft.benchmarkLanguage || null,
        trackId: assignmentDraft.assignmentType === 'roadmap' ? assignmentDraft.trackId || null : null,
        dueAt: toIsoOrNull(assignmentDraft.dueAt),
      };

      if (assignmentDraft.id) {
        await updateTeamAssignment(selectedTeamId, assignmentDraft.id, payload);
        toast.success('Assignment updated.');
      } else {
        await createTeamAssignment(selectedTeamId, payload);
        toast.success('Assignment created.');
      }

      resetAssignmentDraft();
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
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!selectedTeamId) return;
    if (!window.confirm('Delete this assignment?')) return;

    setSubmittingKey(`delete-assignment-${assignmentId}`);
    try {
      await deleteTeamAssignment(selectedTeamId, assignmentId);
      toast.success('Assignment deleted.');
      if (assignmentDraft.id === assignmentId) resetAssignmentDraft();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete assignment.');
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

    setSubmittingKey('save-feedback');
    try {
      const payload = {
        memberUserId: feedbackDraft.memberUserId,
        assignmentId: feedbackDraft.assignmentId || null,
        rubricScore: feedbackDraft.rubricScore ? Number(feedbackDraft.rubricScore) : null,
        status: feedbackDraft.status,
        summary: feedbackDraft.summary.trim(),
        strengths: feedbackDraft.strengths.trim(),
        focusAreas: feedbackDraft.focusAreas.trim(),
        coachNotes: feedbackDraft.coachNotes.trim(),
        sharedWithMember: feedbackDraft.sharedWithMember,
      };

      if (feedbackDraft.id) {
        await updateTeamFeedback(selectedTeamId, feedbackDraft.id, payload);
        toast.success('Feedback updated.');
      } else {
        await createTeamFeedback(selectedTeamId, payload);
        toast.success('Feedback saved.');
      }

      resetFeedbackEditor();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save feedback.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const startFeedbackEdit = (entry: TeamFeedback) => {
    setFeedbackDraft({
      id: entry.id,
      memberUserId: entry.memberUserId,
      assignmentId: entry.assignmentId || '',
      rubricScore: entry.rubricScore === null ? '' : String(entry.rubricScore),
      status: entry.status,
      summary: entry.summary,
      strengths: entry.strengths,
      focusAreas: entry.focusAreas,
      coachNotes: entry.coachNotes,
      sharedWithMember: entry.sharedWithMember,
    });
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!selectedTeamId) return;
    if (!window.confirm('Delete this feedback entry?')) return;

    setSubmittingKey(`delete-feedback-${feedbackId}`);
    try {
      await deleteTeamFeedback(selectedTeamId, feedbackId);
      toast.success('Feedback deleted.');
      if (feedbackDraft.id === feedbackId) resetFeedbackEditor();
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete feedback.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleSaveMember = async (member: TeamMember) => {
    if (!selectedTeamId) return;
    const draft = memberDrafts[member.userId];
    if (!draft) return;

    setSubmittingKey(`save-member-${member.userId}`);
    try {
      await updateTeamMember(selectedTeamId, member.userId, {
        role: draft.role === 'owner' ? undefined : draft.role,
      });
      toast.success(`${member.name} updated.`);
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update member.');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedTeamId) return;
    if (!window.confirm(`Remove ${member.name} from the team?`)) return;

    setSubmittingKey(`remove-member-${member.userId}`);
    try {
      await removeTeamMember(selectedTeamId, member.userId);
      toast.success(`${member.name} removed.`);
      await refreshSelectedTeam(selectedTeamId);
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove member.');
    } finally {
      setSubmittingKey(null);
    }
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
          subtitle="Manage roles and direct access. Activity is shown automatically."
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-4">
            {teamDetail.members.length === 0 ? (
              <EmptyState title="No members yet" helper="Invite learners first, then promote members if needed." />
            ) : (
              teamDetail.members.map((member) => {
                const draft = memberDrafts[member.userId] || { role: member.role };
                const saveKey = `save-member-${member.userId}`;
                const removeKey = `remove-member-${member.userId}`;
                const isOwner = member.role === 'owner';
                const canEditThisMember =
                  canManageMembers && !isOwner && (currentRole === 'owner' || member.role !== 'admin');
                const activityIndicator = getMemberActivityIndicator(member.lastActiveAt);
                const memberRoleOptions =
                  currentRole === 'owner'
                    ? TEAM_ROLE_OPTIONS
                    : TEAM_ROLE_OPTIONS.filter((option) => option.value !== 'admin');

                return (
                  <div key={member.userId} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">{member.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{member.email || 'No email saved'}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusPill>{member.latestBenchmarkScore ?? '--'} latest</StatusPill>
                          <StatusPill>{member.currentStreak} streak</StatusPill>
                          <StatusPill>{member.recommendedAction}</StatusPill>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px] lg:grid-cols-[1fr_auto_auto]">
                        <select
                          value={draft.role}
                          onChange={(event) =>
                            setMemberDrafts((current) => ({
                              ...current,
                              [member.userId]: {
                                ...draft,
                                role: event.target.value as MemberDraft['role'],
                              },
                            }))
                          }
                          disabled={!canEditThisMember}
                          className="h-11 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40 disabled:opacity-60"
                        >
                          {isOwner ? <option value="owner">Owner</option> : null}
                          {memberRoleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div
                          title={activityIndicator.label}
                          className="flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4"
                        >
                          <span className={`h-3.5 w-3.5 rounded-full ${activityIndicator.className}`} />
                          <span className="sr-only">{activityIndicator.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveMember(member)}
                          disabled={!canEditThisMember || submittingKey === saveKey}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                        >
                          {submittingKey === saveKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          disabled={!canEditThisMember || submittingKey === removeKey}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                        >
                          {submittingKey === removeKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ModalShell>
      ) : null}

      {activeModal === 'assignments' && teamDetail ? (
        <ModalShell
          title="Assignments"
          subtitle="Create, update, and retire practice or benchmark work."
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">{assignmentDraft.id ? 'Edit assignment' : 'New assignment'}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {workspaceCounts.assignments}/{selectedTeamPlanPolicy.assignmentLimit} active assignments on this plan.
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={assignmentDraft.title}
                  onChange={(event) => setAssignmentDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Assignment title"
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <select
                  value={assignmentDraft.assignmentType}
                  onChange={(event) =>
                    setAssignmentDraft((current) => ({
                      ...current,
                      assignmentType: event.target.value as TeamAssignmentType,
                      trackId: event.target.value === 'roadmap' ? current.trackId : '',
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                >
                  <option value="benchmark">Benchmark</option>
                  <option value="challenge_pack">Challenge pack</option>
                  <option value="roadmap">Roadmap</option>
                </select>
                {assignmentDraft.assignmentType === 'roadmap' ? (
                  <select
                    value={assignmentDraft.trackId}
                    onChange={(event) => setAssignmentDraft((current) => ({ ...current, trackId: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  >
                    <option value="">Select a track</option>
                    {interviewTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                ) : (
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
                )}
                <input
                  type="datetime-local"
                  value={assignmentDraft.dueAt}
                  onChange={(event) => setAssignmentDraft((current) => ({ ...current, dueAt: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <textarea
                  value={assignmentDraft.description}
                  onChange={(event) => setAssignmentDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Short assignment brief"
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveAssignment}
                    disabled={!canManageWorkspace || submittingKey === 'save-assignment'}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submittingKey === 'save-assignment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {assignmentDraft.id ? 'Save changes' : 'Create assignment'}
                  </button>
                  {assignmentDraft.id ? (
                    <button
                      type="button"
                      onClick={resetAssignmentDraft}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {teamDetail.assignments.length === 0 ? (
                <EmptyState title="No assignments yet" helper="Create benchmark, roadmap, or challenge work here." />
              ) : (
                teamDetail.assignments.map((assignment) => {
                  const deleteKey = `delete-assignment-${assignment.id}`;
                  return (
                    <div key={assignment.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{assignment.title}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{assignment.description || 'No description'}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusPill>{assignment.assignmentType.replace('_', ' ')}</StatusPill>
                            {assignment.benchmarkLanguage ? <StatusPill>{assignment.benchmarkLanguage}</StatusPill> : null}
                            {assignment.trackId ? <StatusPill>{assignment.trackId}</StatusPill> : null}
                            <StatusPill>{formatDateLabel(assignment.dueAt)}</StatusPill>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startAssignmentEdit(assignment)}
                            disabled={!canManageWorkspace}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            disabled={!canManageWorkspace || submittingKey === deleteKey}
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
        </ModalShell>
      ) : null}

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

      {activeModal === 'feedback' && teamDetail ? (
        <ModalShell
          title="Instructor feedback"
          subtitle="Grade work, leave coaching notes, and share actionable next steps."
          onClose={() => setActiveModal(null)}
        >
          <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">{feedbackDraft.id ? 'Edit feedback' : 'New feedback'}</div>
              <div className="mt-4 space-y-3">
                <select
                  value={feedbackDraft.memberUserId}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, memberUserId: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                >
                  <option value="">Select learner</option>
                  {teamDetail.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <select
                  value={feedbackDraft.assignmentId}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, assignmentId: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                >
                  <option value="">No assignment link</option>
                  {teamDetail.assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={feedbackDraft.rubricScore}
                    onChange={(event) => setFeedbackDraft((current) => ({ ...current, rubricScore: event.target.value }))}
                    placeholder="Rubric score"
                    className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                  <select
                    value={feedbackDraft.status}
                    onChange={(event) =>
                      setFeedbackDraft((current) => ({ ...current, status: event.target.value as TeamFeedbackStatus }))
                    }
                    className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                  >
                    {FEEDBACK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={feedbackDraft.summary}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Summary"
                  className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <textarea
                  value={feedbackDraft.strengths}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, strengths: event.target.value }))}
                  placeholder="Strengths"
                  rows={3}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <textarea
                  value={feedbackDraft.focusAreas}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, focusAreas: event.target.value }))}
                  placeholder="Focus areas"
                  rows={3}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <textarea
                  value={feedbackDraft.coachNotes}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, coachNotes: event.target.value }))}
                  placeholder="Coach notes"
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                />
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={feedbackDraft.sharedWithMember}
                    onChange={(event) => setFeedbackDraft((current) => ({ ...current, sharedWithMember: event.target.checked }))}
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  Shared with learner
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    disabled={!canManageWorkspace || submittingKey === 'save-feedback'}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submittingKey === 'save-feedback' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {feedbackDraft.id ? 'Save feedback' : 'Create feedback'}
                  </button>
                  {feedbackDraft.id ? (
                    <button
                      type="button"
                      onClick={resetFeedbackEditor}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {teamDetail.feedback.length === 0 ? (
                <EmptyState title="No feedback yet" helper="Use this to run a real grading and instructor feedback workflow." />
              ) : (
                teamDetail.feedback.map((entry) => {
                  const deleteKey = `delete-feedback-${entry.id}`;
                  return (
                    <div key={entry.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{entry.memberName}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{entry.assignmentTitle || 'General coaching note'} • {entry.authorName}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusPill>{entry.status}</StatusPill>
                            <StatusPill>{entry.rubricScore ?? '--'} / 100</StatusPill>
                            {entry.sharedWithMember ? <StatusPill tone="success">Shared</StatusPill> : <StatusPill tone="warn">Private</StatusPill>}
                          </div>
                          <div className="mt-3 text-sm leading-7 text-muted-foreground">
                            {entry.summary || entry.focusAreas || entry.strengths || 'No written summary yet.'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startFeedbackEdit(entry)}
                            disabled={!canManageWorkspace}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFeedback(entry.id)}
                            disabled={!canManageWorkspace || submittingKey === deleteKey}
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
        </ModalShell>
      ) : null}

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
                    <div className="mt-2 text-sm text-foreground">{teamAnalytics.assignmentStats.total} total • {teamAnalytics.assignmentStats.dueSoon} due soon</div>
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
    </div>
  );
};

export default TeamsWorkspace;
