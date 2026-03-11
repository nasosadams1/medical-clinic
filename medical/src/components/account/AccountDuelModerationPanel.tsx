import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import {
  fetchDuelAdminCapabilities,
  fetchDuelAntiCheatCases,
  fetchDuelReplay,
  invalidateDuelMatch,
  issueDuelSanction,
  rollbackDuelRatings,
  type DuelAdminCase,
  type DuelCaseStatus,
  type DuelReplayPayload,
  type DuelSanctionAction,
  type DuelSanctionScope,
  type DuelSanctionTarget,
  updateDuelAntiCheatCaseStatus,
} from '../../lib/duelAdmin';

const STATUS_LABELS: Record<DuelCaseStatus, string> = {
  new: 'New',
  in_review: 'In review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const STATUS_STYLES: Record<DuelCaseStatus, string> = {
  new: 'border-red-200 bg-red-50 text-red-700',
  in_review: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  dismissed: 'border-slate-200 bg-slate-100 text-slate-600',
};

const INTEGRITY_STYLES: Record<string, string> = {
  invalidated: 'border-red-200 bg-red-50 text-red-700',
  clean: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const prettyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);
const trimOrUndefined = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const AccountDuelModerationPanel: React.FC = () => {
  const { session } = useAuth();
  const { addNotification } = useUser();
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<DuelCaseStatus | 'all'>('all');
  const [cases, setCases] = useState<DuelAdminCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedReplay, setSelectedReplay] = useState<DuelReplayPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingReplay, setIsLoadingReplay] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const [moderationNote, setModerationNote] = useState('');
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionScope, setSanctionScope] = useState<DuelSanctionScope>('duels');
  const [sanctionAction, setSanctionAction] = useState<DuelSanctionAction>('suspend');
  const [sanctionTarget, setSanctionTarget] = useState<DuelSanctionTarget | ''>('');
  const [sanctionDurationHours, setSanctionDurationHours] = useState('168');

  const selectedCase = useMemo(
    () => cases.find((entry) => entry.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const counts = useMemo(() => ({
    total: cases.length,
    new: cases.filter((entry) => entry.status === 'new').length,
    in_review: cases.filter((entry) => entry.status === 'in_review').length,
    resolved: cases.filter((entry) => entry.status === 'resolved').length,
  }), [cases]);

  const loadReplay = async (matchId: string) => {
    if (!session?.access_token) {
      setSelectedReplay(null);
      return;
    }

    setIsLoadingReplay(true);
    try {
      const payload = await fetchDuelReplay(session.access_token, matchId);
      setSelectedReplay(payload);
    } catch (nextError: any) {
      setSelectedReplay(null);
      setError(nextError?.message || 'Could not load duel replay.');
    } finally {
      setIsLoadingReplay(false);
    }
  };

  const loadCases = async (refresh = false, preferredCaseId?: string) => {
    if (!session?.access_token) {
      setCanReview(false);
      setCases([]);
      setSelectedCaseId('');
      setSelectedReplay(null);
      setIsLoading(false);
      return;
    }

    setError('');
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const capability = await fetchDuelAdminCapabilities(session.access_token);
      setCanReview(capability.canReview);

      if (!capability.canReview) {
        setCases([]);
        setSelectedCaseId('');
        setSelectedReplay(null);
        return;
      }

      const entries = await fetchDuelAntiCheatCases(session.access_token, {
        status: statusFilter,
        limit: 50,
      });
      setCases(entries);

      if (entries.length === 0) {
        setSelectedCaseId('');
        setSelectedReplay(null);
        return;
      }

      const nextSelectedCaseId =
        preferredCaseId && entries.some((entry) => entry.id === preferredCaseId)
          ? preferredCaseId
          : entries.some((entry) => entry.id === selectedCaseId)
            ? selectedCaseId
            : entries[0].id;

      setSelectedCaseId(nextSelectedCaseId);
    } catch (nextError: any) {
      setError(nextError?.message || 'Could not load duel moderation cases.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [session?.access_token, statusFilter]);

  useEffect(() => {
    if (!selectedCase?.match_id) {
      setSelectedReplay(null);
      return;
    }

    void loadReplay(selectedCase.match_id);
  }, [selectedCase?.match_id, session?.access_token]);

  useEffect(() => {
    if (!selectedCase) {
      setModerationNote('');
      setSanctionTarget('');
      return;
    }

    setModerationNote(selectedCase.resolution_note || selectedCase.match?.moderation_note || '');
    setSanctionTarget('');
  }, [selectedCase?.id]);

  const syncUpdatedCase = async (updatedEntry: DuelAdminCase, successMessage: string) => {
    setCases((current) => current.map((candidate) => (candidate.id === updatedEntry.id ? updatedEntry : candidate)));
    setSelectedCaseId(updatedEntry.id);
    await loadReplay(updatedEntry.match_id);
    addNotification({
      message: successMessage,
      type: 'success',
      icon: '\u2705',
    });
  };

  const handleStatusUpdate = async (entry: DuelAdminCase, status: DuelCaseStatus) => {
    if (!session?.access_token || pendingAction) return;

    setPendingAction(`status:${entry.id}:${status}`);
    try {
      const payload = await updateDuelAntiCheatCaseStatus(session.access_token, entry.id, {
        status,
        note: trimOrUndefined(moderationNote),
      });
      await syncUpdatedCase(payload.entry, `Duel case marked as ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (nextError: any) {
      addNotification({
        message: nextError?.message || 'Could not update the duel case status.',
        type: 'error',
        icon: '\u26A0',
      });
    } finally {
      setPendingAction('');
    }
  };

  const handleInvalidateMatch = async () => {
    if (!session?.access_token || !selectedCase || pendingAction) return;

    setPendingAction(`invalidate:${selectedCase.id}`);
    try {
      const payload = await invalidateDuelMatch(session.access_token, selectedCase.id, {
        note: trimOrUndefined(moderationNote),
        reason: trimOrUndefined(moderationNote),
        rollbackRatings: true,
      });
      await syncUpdatedCase(payload.entry, 'Match invalidated and moderation record updated.');
    } catch (nextError: any) {
      addNotification({
        message: nextError?.message || 'Could not invalidate the duel match.',
        type: 'error',
        icon: '\u26A0',
      });
    } finally {
      setPendingAction('');
    }
  };

  const handleRollbackRatings = async () => {
    if (!session?.access_token || !selectedCase || pendingAction) return;

    setPendingAction(`rollback:${selectedCase.id}`);
    try {
      const payload = await rollbackDuelRatings(session.access_token, selectedCase.id, {
        note: trimOrUndefined(moderationNote),
      });
      await syncUpdatedCase(payload.entry, 'Duel ratings rolled back for the case.');
    } catch (nextError: any) {
      addNotification({
        message: nextError?.message || 'Could not rollback duel ratings.',
        type: 'error',
        icon: '\u26A0',
      });
    } finally {
      setPendingAction('');
    }
  };

  const handleIssueSanction = async () => {
    if (!session?.access_token || !selectedCase || pendingAction) return;
    if (!sanctionTarget) {
      addNotification({
        message: 'Choose which player should receive the sanction.',
        type: 'warning',
        icon: '\u26A0',
      });
      return;
    }
    if (sanctionReason.trim().length < 3) {
      addNotification({
        message: 'A sanction reason is required.',
        type: 'warning',
        icon: '\u26A0',
      });
      return;
    }

    const parsedDuration = sanctionDurationHours.trim() ? Number(sanctionDurationHours) : undefined;
    setPendingAction(`sanction:${selectedCase.id}`);
    try {
      const payload = await issueDuelSanction(session.access_token, selectedCase.id, {
        action: sanctionAction,
        scope: sanctionScope,
        target: sanctionTarget,
        reason: sanctionReason.trim(),
        note: trimOrUndefined(moderationNote),
        durationHours: Number.isFinite(parsedDuration) && parsedDuration && parsedDuration > 0 ? parsedDuration : undefined,
      });
      setSanctionReason('');
      setSanctionTarget('');
      await syncUpdatedCase(payload.entry, 'Sanction issued for the selected case.');
    } catch (nextError: any) {
      addNotification({
        message: nextError?.message || 'Could not issue the sanction.',
        type: 'error',
        icon: '\u26A0',
      });
    } finally {
      setPendingAction('');
    }
  };

  if (canReview === false && !isLoading) {
    return null;
  }

  const integrityStatus = selectedCase?.match?.integrity_status || 'pending';
  const integrityClassName = INTEGRITY_STYLES[integrityStatus] || 'border-slate-200 bg-slate-100 text-slate-600';
  const relatedClusterCases = (selectedCase?.cluster?.related_cases || []).filter((entry) => entry.id !== selectedCase?.id);
  const playerALabel = selectedCase?.match?.player_a?.name || 'Player A';
  const playerBLabel = selectedCase?.match?.player_b?.name || 'Player B';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            <ShieldAlert className="h-4 w-4" />
            Duel moderation
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">Suspicious match queue</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Review AST-based anti-cheat cases, replay evidence, clustered investigations, and moderator remediation actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadCases(true, selectedCaseId)}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh queue
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Visible</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{counts.total}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-red-400">New</div>
          <div className="mt-1 text-sm font-semibold text-red-700">{counts.new}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-amber-400">In review</div>
          <div className="mt-1 text-sm font-semibold text-amber-700">{counts.in_review}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-400">Resolved</div>
          <div className="mt-1 text-sm font-semibold text-emerald-700">{counts.resolved}</div>
        </div>
      </div>

      <div className="mt-6">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as DuelCaseStatus | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading duel moderation queue...</div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && cases.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No duel cases match the current filter.</div>
        )}
      </div>

      {!isLoading && !error && cases.length > 0 && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1.65fr]">
          <div className="space-y-4">
            {cases.map((entry) => {
              const isSelected = entry.id === selectedCaseId;
              const integrityValue = entry.match?.integrity_status || 'pending';
              const integrityBadgeClass = INTEGRITY_STYLES[integrityValue] || 'border-slate-200 bg-slate-100 text-slate-600';

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedCaseId(entry.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${isSelected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Risk {Number(entry.risk_score ?? 0).toFixed(1)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${integrityBadgeClass}`}>
                      {integrityValue}
                    </span>
                    {entry.cluster?.case_count ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        Cluster {entry.cluster.case_count}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-sm font-semibold text-slate-900">
                    {entry.problem?.title || entry.match?.id || entry.match_id}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{entry.summary}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">Created {formatTimestamp(entry.created_at)}</span>
                    {entry.match?.player_a?.name && <span className="rounded-full bg-white px-2.5 py-1">A: {entry.match.player_a.name}</span>}
                    {entry.match?.player_b?.name && <span className="rounded-full bg-white px-2.5 py-1">B: {entry.match.player_b.name}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            {!selectedCase && <div className="text-sm text-slate-500">Select a duel case to inspect replay evidence.</div>}

            {selectedCase && (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[selectedCase.status]}`}>
                        {STATUS_LABELS[selectedCase.status]}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        Risk {Number(selectedCase.risk_score ?? 0).toFixed(1)}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${integrityClassName}`}>
                        {integrityStatus}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">{selectedCase.problem?.title || selectedCase.match_id}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedCase.summary}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['new', 'in_review', 'resolved', 'dismissed'] as DuelCaseStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusUpdate(selectedCase, status)}
                        disabled={!!pendingAction || selectedCase.status === status}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {status === 'resolved' ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : null}
                        {status === 'dismissed' ? <XCircle className="mr-1 inline h-4 w-4" /> : null}
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Players</div>
                    <div className="mt-2">A: {selectedCase.match?.player_a?.name || selectedCase.match?.player_a?.id || 'Unknown'}</div>
                    <div className="mt-1">B: {selectedCase.match?.player_b?.name || selectedCase.match?.player_b?.id || 'Unknown'}</div>
                    <div className="mt-3 text-xs text-slate-500">Created {formatTimestamp(selectedCase.created_at)}</div>
                    {selectedCase.reviewed_at && <div className="mt-1 text-xs text-slate-500">Reviewed {formatTimestamp(selectedCase.reviewed_at)}</div>}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Integrity</div>
                    <div className="mt-2 capitalize">{integrityStatus}</div>
                    <div className="mt-2 text-xs text-slate-500">Invalidated {formatTimestamp(selectedCase.match?.invalidated_at)}</div>
                    <div className="mt-1 text-xs text-slate-500">Rollback {formatTimestamp(selectedCase.match?.rating_reverted_at)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Flags</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selectedCase.evidence?.flags || []).length > 0 ? (selectedCase.evidence.flags as string[]).map((flag) => (
                        <span key={flag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{flag}</span>
                      )) : <span className="text-xs text-slate-500">No explicit flags captured.</span>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Link2 className="h-4 w-4" />
                      Case cluster
                    </div>
                    {selectedCase.cluster ? (
                      <div className="mt-3 space-y-3 text-sm text-slate-700">
                        <p>{selectedCase.cluster.summary || 'Cluster metadata is available for this case.'}</p>
                        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                          <div>Fingerprint: {selectedCase.cluster.fingerprint || 'Unavailable'}</div>
                          <div className="mt-1">Related cases: {selectedCase.cluster.case_count || 0}</div>
                        </div>
                        {relatedClusterCases.length > 0 && (
                          <div className="space-y-2">
                            {relatedClusterCases.slice(0, 4).map((entry) => (
                              <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                <div className="font-semibold text-slate-800">{entry.summary}</div>
                                <div className="mt-1">Risk {Number(entry.risk_score || 0).toFixed(1)} • {STATUS_LABELS[entry.status]}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-slate-500">No cluster has been assigned to this case yet.</div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Moderator note</div>
                    <textarea
                      value={moderationNote}
                      onChange={(event) => setModerationNote(event.target.value)}
                      rows={6}
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      placeholder="Resolution notes, rationale, or remediation summary..."
                    />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleInvalidateMatch}
                        disabled={!!pendingAction}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Ban className="h-4 w-4" />
                        Invalidate match
                      </button>
                      <button
                        type="button"
                        onClick={handleRollbackRatings}
                        disabled={!!pendingAction}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Rollback ratings
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Sanctions</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Scope</span>
                      <select
                        value={sanctionScope}
                        onChange={(event) => setSanctionScope(event.target.value as DuelSanctionScope)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      >
                        <option value="duels">Duels</option>
                        <option value="progression">Progression</option>
                        <option value="all">All</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Action</span>
                      <select
                        value={sanctionAction}
                        onChange={(event) => setSanctionAction(event.target.value as DuelSanctionAction)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      >
                        <option value="suspend">Suspend</option>
                        <option value="review_hold">Review hold</option>
                        <option value="watch">Watch</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Target</span>
                      <select
                        value={sanctionTarget}
                        onChange={(event) => setSanctionTarget(event.target.value as DuelSanctionTarget | '')}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      >
                        <option value="">Choose sanction target</option>
                        <option value="player_a">{playerALabel}</option>
                        <option value="player_b">{playerBLabel}</option>
                        <option value="both">Both players (use carefully)</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>Hours</span>
                      <input
                        type="number"
                        min="1"
                        value={sanctionDurationHours}
                        onChange={(event) => setSanctionDurationHours(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        placeholder="168"
                      />
                    </label>
                  </div>
                  <textarea
                    value={sanctionReason}
                    onChange={(event) => setSanctionReason(event.target.value)}
                    rows={3}
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                    placeholder="Reason for sanction..."
                  />
                  <button
                    type="button"
                    onClick={handleIssueSanction}
                    disabled={!!pendingAction}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingAction.startsWith('sanction:') ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    Issue sanction
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Eye className="h-4 w-4" />
                    Replay and evidence
                  </div>
                  {isLoadingReplay && <div className="mt-3 text-sm text-slate-500">Loading replay evidence...</div>}
                  {!isLoadingReplay && !selectedReplay && <div className="mt-3 text-sm text-slate-500">Replay data is not available for this case yet.</div>}
                  {!isLoadingReplay && selectedReplay && (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Replay summary</div>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(selectedReplay.replay?.replay_data || {})}</pre>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Stored events</div>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(selectedReplay.events)}</pre>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Submissions</div>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(selectedReplay.submissions)}</pre>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Case evidence</div>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(selectedCase.evidence)}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default AccountDuelModerationPanel;
