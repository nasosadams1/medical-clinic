import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  MessageSquareWarning,
  Paperclip,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import {
  fetchAdminFeedbackEntries,
  fetchFeedbackAdminCapabilities,
  type FeedbackAdminEntry,
  type FeedbackStatus,
  type FeedbackType,
  updateFeedbackEntryStatus,
} from '../../lib/feedback';

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  in_review: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  in_review: 'In review',
  resolved: 'Resolved',
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug_report: 'Bug report',
  feature_request: 'Feature request',
  general_feedback: 'General feedback',
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const AccountFeedbackAdminPanel: React.FC = () => {
  const { session } = useAuth();
  const { addNotification } = useUser();
  const [entries, setEntries] = useState<FeedbackAdminEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string>('');

  const loadEntries = async (refresh = false) => {
    if (!session?.access_token) {
      setEntries([]);
      setCanReview(false);
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
      const capability = await fetchFeedbackAdminCapabilities(session.access_token, { force: refresh });
      setCanReview(capability.canReview);

      if (!capability.canReview) {
        setEntries([]);
        setError('');
        return;
      }
    } catch {
      setEntries([]);
      setCanReview(false);
      setError('');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const nextEntries = await fetchAdminFeedbackEntries(session.access_token, {
        status: statusFilter,
        type: typeFilter,
        limit: 50,
      }, { force: refresh });
      setEntries(nextEntries);
    } catch (nextError: any) {
      setError(nextError?.message || 'Could not load the feedback review queue.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [session?.access_token, statusFilter, typeFilter]);

  const counts = useMemo(() => ({
    total: entries.length,
    new: entries.filter((entry) => entry.status === 'new').length,
    in_review: entries.filter((entry) => entry.status === 'in_review').length,
    resolved: entries.filter((entry) => entry.status === 'resolved').length,
  }), [entries]);

  const handleStatusUpdate = async (feedbackId: string, status: FeedbackStatus) => {
    if (!session?.access_token || updatingId) return;

    setUpdatingId(feedbackId);
    try {
      const payload = await updateFeedbackEntryStatus(session.access_token, feedbackId, { status });
      const updatedEntry = payload.entry as FeedbackAdminEntry;
      setEntries((current) => current.map((entry) => (entry.id === feedbackId ? { ...entry, ...updatedEntry } : entry)));
      addNotification({
        message: `Feedback marked as ${STATUS_LABELS[status].toLowerCase()}.`,
        type: 'success',
        icon: '\u{2705}',
      });
    } catch (nextError: any) {
      addNotification({
        message: nextError?.message || 'Could not update feedback status.',
        type: 'error',
        icon: '\u{26A0}',
      });
    } finally {
      setUpdatingId('');
    }
  };

  if (canReview !== true) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            <MessageSquareWarning className="h-4 w-4" />
            Feedback review
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">Support queue</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Review incoming feedback, update its status, and keep the support queue moving without leaving the account area.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadEntries(true)}
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
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-blue-400">New</div>
          <div className="mt-1 text-sm font-semibold text-blue-700">{counts.new}</div>
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

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as FeedbackType | 'all')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="all">All feedback types</option>
            <option value="bug_report">Bug report</option>
            <option value="feature_request">Feature request</option>
            <option value="general_feedback">General feedback</option>
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading support queue...</div>
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No feedback matches the current filters.</div>
        )}

        {!isLoading && !error && entries.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[entry.status]}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {TYPE_LABELS[entry.type]}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold text-slate-900">{entry.subject}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.message}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                    <UserRound className="h-3.5 w-3.5" />
                    {entry.user_profile?.name || entry.user_profile?.email || entry.user_id}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                    Submitted {formatTimestamp(entry.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                    {entry.attachments_count} attachment{entry.attachments_count === 1 ? '' : 's'}
                  </span>
                  {entry.metadata?.environment && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                      {String(entry.metadata.environment)}
                    </span>
                  )}
                </div>

                {entry.attachments?.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {entry.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        {attachment.signed_url ? (
                          <a
                            href={attachment.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                          >
                            <Paperclip className="h-4 w-4" />
                            {attachment.original_name}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400">
                            <Paperclip className="h-4 w-4" />
                            {attachment.original_name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 lg:w-72">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Update status</div>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(entry.id, 'new')}
                    disabled={updatingId === entry.id || entry.status === 'new'}
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark as new
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(entry.id, 'in_review')}
                    disabled={updatingId === entry.id || entry.status === 'in_review'}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark in review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(entry.id, 'resolved')}
                    disabled={updatingId === entry.id || entry.status === 'resolved'}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingId === entry.id ? 'Updating...' : 'Mark resolved'}
                  </button>
                </div>

                {entry.resolved_at && (
                  <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Resolved {formatTimestamp(entry.resolved_at)}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AccountFeedbackAdminPanel;






