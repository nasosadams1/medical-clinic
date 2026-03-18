import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Loader2,
  Mail,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import {
  fetchAdminSalesLeads,
  fetchLeadAdminCapabilities,
  updateSalesLead,
  type LeadIntent,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
  type SalesLeadAdminEntry,
} from '../../lib/leads';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  contacted: 'border-amber-200 bg-amber-50 text-amber-700',
  qualified: 'border-violet-200 bg-violet-50 text-violet-700',
  won: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  lost: 'border-rose-200 bg-rose-50 text-rose-700',
};

const PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
};

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  high: 'border-rose-200 bg-rose-50 text-rose-700',
};

const INTENT_LABELS: Record<LeadIntent, string> = {
  team_demo: 'Team demo',
  teams_growth: 'Teams Growth',
  custom_plan: 'Custom plan',
  interview_sprint: 'Interview Sprint',
  pro_upgrade: 'Pro upgrade',
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  teams_page: 'Teams page',
  pricing_page: 'Pricing page',
  benchmark_report: 'Benchmark report',
  general: 'General',
};

type DraftState = {
  status: LeadStatus;
  priority: LeadPriority;
  nextStep: string;
  qualificationNotes: string;
};

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildMailTo = (entry: SalesLeadAdminEntry) => {
  const subject = encodeURIComponent(`Codhak follow-up for ${entry.company}`);
  const body = encodeURIComponent(
    `Hi ${entry.name},\n\nThanks for your interest in Codhak.\n\nI saw your request about ${INTENT_LABELS[entry.intent].toLowerCase()} for ${entry.company}. ${entry.next_step ? `Next step: ${entry.next_step}\n\n` : ''}Happy to continue from here.\n`
  );
  return `mailto:${entry.email}?subject=${subject}&body=${body}`;
};

const AccountLeadsAdminPanel: React.FC = () => {
  const { user: authUser } = useAuth();
  const { addNotification } = useUser();
  const [entries, setEntries] = useState<SalesLeadAdminEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [intentFilter, setIntentFilter] = useState<LeadIntent | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [savingLeadId, setSavingLeadId] = useState('');

  const hydrateDrafts = (leadEntries: SalesLeadAdminEntry[]) => {
    setDrafts((current) => {
      const nextDrafts = { ...current };
      leadEntries.forEach((entry) => {
        nextDrafts[entry.id] = {
          status: entry.status,
          priority: entry.priority || 'medium',
          nextStep: entry.next_step || '',
          qualificationNotes: entry.qualification_notes || '',
        };
      });
      return nextDrafts;
    });
  };

  const loadEntries = async (refresh = false) => {
    setError('');
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const capability = await fetchLeadAdminCapabilities();
      setCanReview(capability.canReview);

      if (!capability.canReview) {
        setEntries([]);
        return;
      }

      const nextEntries = await fetchAdminSalesLeads({
        status: statusFilter,
        intent: intentFilter,
        source: sourceFilter,
        priority: priorityFilter,
        limit: 60,
      });

      setEntries(nextEntries);
      hydrateDrafts(nextEntries);
    } catch (nextError: any) {
      if (!String(nextError?.message || '').toLowerCase().includes('signed in')) {
        setError(nextError?.message || 'Could not load the sales pipeline.');
      }
      setEntries([]);
      if (canReview === null) {
        setCanReview(false);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, [statusFilter, intentFilter, sourceFilter, priorityFilter]);

  const counts = useMemo(
    () => ({
      total: entries.length,
      new: entries.filter((entry) => entry.status === 'new').length,
      qualified: entries.filter((entry) => entry.status === 'qualified').length,
      won: entries.filter((entry) => entry.status === 'won').length,
    }),
    [entries]
  );

  const getDraft = (entry: SalesLeadAdminEntry): DraftState =>
    drafts[entry.id] || {
      status: entry.status,
      priority: entry.priority || 'medium',
      nextStep: entry.next_step || '',
      qualificationNotes: entry.qualification_notes || '',
    };

  const patchEntry = (leadId: string, updatedEntry: SalesLeadAdminEntry) => {
    setEntries((current) => current.map((entry) => (entry.id === leadId ? updatedEntry : entry)));
    hydrateDrafts([updatedEntry]);
  };

  const handleQuickUpdate = async (
    entry: SalesLeadAdminEntry,
    payload: Parameters<typeof updateSalesLead>[1],
    successMessage: string
  ) => {
    if (savingLeadId) return;

    setSavingLeadId(entry.id);
    try {
      const response = await updateSalesLead(entry.id, payload);
      patchEntry(entry.id, response.entry);
      addNotification({
        message: successMessage,
        type: 'success',
        icon: '\u2705',
      });
    } catch (nextError: any) {
      addNotification({
        message: nextError?.message || 'Could not update the lead.',
        type: 'error',
        icon: '\u26A0',
      });
    } finally {
      setSavingLeadId('');
    }
  };

  const handleSaveDraft = async (entry: SalesLeadAdminEntry) => {
    const draft = getDraft(entry);
    const payload: Parameters<typeof updateSalesLead>[1] = {};

    if (draft.status !== entry.status) {
      payload.status = draft.status;
    }
    if (draft.priority !== (entry.priority || 'medium')) {
      payload.priority = draft.priority;
    }
    if (draft.nextStep !== (entry.next_step || '')) {
      payload.nextStep = draft.nextStep.trim() || null;
    }
    if (draft.qualificationNotes !== (entry.qualification_notes || '')) {
      payload.qualificationNotes = draft.qualificationNotes.trim() || null;
    }

    if (Object.keys(payload).length === 0) {
      addNotification({
        message: 'No lead changes to save.',
        type: 'info',
        icon: '\u2139',
      });
      return;
    }

    await handleQuickUpdate(entry, payload, 'Lead notes updated.');
  };

  if (canReview !== true) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            <BadgeCheck className="h-4 w-4" />
            Sales pipeline
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">Lead queue</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Review incoming pilot and pricing interest, assign ownership, push leads through qualification, and capture the next step without leaving Codhak.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadEntries(true)}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh pipeline
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Visible</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{counts.total}</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-blue-400">New</div>
          <div className="mt-1 text-sm font-semibold text-blue-700">{counts.new}</div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-violet-400">Qualified</div>
          <div className="mt-1 text-sm font-semibold text-violet-700">{counts.qualified}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-400">Won</div>
          <div className="mt-1 text-sm font-semibold text-emerald-700">{counts.won}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-4">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeadStatus | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Intent</span>
          <select
            value={intentFilter}
            onChange={(event) => setIntentFilter(event.target.value as LeadIntent | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All intents</option>
            {Object.entries(INTENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Source</span>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as LeadSource | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Priority</span>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as LeadPriority | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading sales pipeline...</div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No leads match the current filters.</div>
        )}

        {!isLoading &&
          !error &&
          entries.map((entry) => {
            const draft = getDraft(entry);
            const ownedByCurrentAdmin = entry.owner_user_id && entry.owner_user_id === authUser?.id;

            return (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[entry.status]}`}>
                        {STATUS_LABELS[entry.status]}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${PRIORITY_STYLES[entry.priority || 'medium']}`}>
                        {PRIORITY_LABELS[entry.priority || 'medium']}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {INTENT_LABELS[entry.intent]}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {SOURCE_LABELS[entry.source]}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {entry.company}
                          <span className="ml-2 text-sm font-normal text-slate-500">for {entry.name}</span>
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.objective}</p>
                      </div>

                      <a
                        href={buildMailTo(entry)}
                        className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        <Mail className="h-4 w-4" />
                        Email lead
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {entry.email}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <Users className="h-3.5 w-3.5" />
                        Team size {entry.team_size}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <Target className="h-3.5 w-3.5" />
                        {entry.use_case}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        Submitted {formatTimestamp(entry.created_at)}
                      </span>
                      {entry.last_contacted_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                          Contacted {formatTimestamp(entry.last_contacted_at)}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        Owner: {entry.owner_profile?.name || (ownedByCurrentAdmin ? 'You' : entry.owner_user_id ? 'Assigned' : 'Unassigned')}
                      </span>
                    </div>

                    {entry.recent_events && entry.recent_events.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recent activity</div>
                        <div className="mt-3 space-y-2 text-xs text-slate-500">
                          {entry.recent_events.slice(0, 3).map((event) => (
                            <div key={event.id} className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {event.actor_profile?.name || (event.actor_user_id === authUser?.id ? 'You' : 'System')}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                {event.action.replace(/_/g, ' ')}
                              </span>
                              <span>{formatTimestamp(event.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 lg:w-[360px]">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pipeline controls</div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        <span>Status</span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: { ...draft, status: event.target.value as LeadStatus },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        <span>Priority</span>
                        <select
                          value={draft.priority}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: { ...draft, priority: event.target.value as LeadPriority },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        >
                          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 space-y-3">
                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        <span>Next step</span>
                        <input
                          type="text"
                          value={draft.nextStep}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: { ...draft, nextStep: event.target.value },
                            }))
                          }
                          placeholder="Book pilot call, send pricing deck, follow up Friday..."
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        <span>Qualification notes</span>
                        <textarea
                          value={draft.qualificationNotes}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: { ...draft, qualificationNotes: event.target.value },
                            }))
                          }
                          rows={4}
                          placeholder="Budget signal, urgency, team shape, or objections..."
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickUpdate(entry, { assignToSelf: true }, 'Lead assigned to you.')}
                        disabled={savingLeadId === entry.id || ownedByCurrentAdmin}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {ownedByCurrentAdmin ? 'Assigned to you' : 'Assign to me'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdate(entry, { unassignOwner: true }, 'Lead owner cleared.')}
                        disabled={savingLeadId === entry.id || !entry.owner_user_id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Unassign
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdate(entry, { status: 'contacted', markContactedNow: true }, 'Lead marked as contacted.')}
                        disabled={savingLeadId === entry.id || entry.status === 'contacted'}
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark contacted
                      </button>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => handleQuickUpdate(entry, { status: 'qualified', markContactedNow: true }, 'Lead marked as qualified.')}
                        disabled={savingLeadId === entry.id || entry.status === 'qualified'}
                        className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Qualify
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdate(entry, { status: 'won', markContactedNow: true }, 'Lead marked as won.')}
                        disabled={savingLeadId === entry.id || entry.status === 'won'}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark won
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdate(entry, { status: 'lost' }, 'Lead marked as lost.')}
                        disabled={savingLeadId === entry.id || entry.status === 'lost'}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark lost
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveDraft(entry)}
                      disabled={savingLeadId === entry.id}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {savingLeadId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                      Save lead notes
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
};

export default AccountLeadsAdminPanel;
