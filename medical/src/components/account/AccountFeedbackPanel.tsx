import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import {
  buildFeedbackDraftKey,
  buildFeedbackSubmissionFingerprint,
  collectFeedbackMetadata,
  feedbackConfig,
  fetchFeedbackEntries,
  serializeFeedbackFiles,
  submitFeedbackEntry,
  validateFeedbackDraft,
  validateFeedbackFile,
  type FeedbackHistoryEntry,
  type FeedbackSubmissionPayload,
  type FeedbackType,
} from '../../lib/feedback';

const FEEDBACK_TYPE_OPTIONS: Array<{ value: FeedbackType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  {
    value: 'bug_report',
    label: 'Bug report',
    description: 'Something is broken, incorrect, or behaving unexpectedly.',
    icon: Bug,
  },
  {
    value: 'feature_request',
    label: 'Feature request',
    description: 'Suggest a new capability or workflow improvement.',
    icon: Sparkles,
  },
  {
    value: 'general_feedback',
    label: 'General feedback',
    description: 'Share broader product feedback, usability notes, or praise.',
    icon: MessageSquareText,
  },
];

const STATUS_STYLES: Record<string, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  in_review: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const LABEL_BY_TYPE: Record<FeedbackType, string> = {
  bug_report: 'Bug report',
  feature_request: 'Feature request',
  general_feedback: 'General feedback',
};

const DRAFT_AUTOSAVE_MS = 400;
const DUPLICATE_SUBMISSION_WINDOW_MS = 2 * 60 * 1000;

type DraftState = {
  type: FeedbackType;
  subject: string;
  message: string;
  includeMetadata: boolean;
};

const defaultDraft: DraftState = {
  type: 'bug_report',
  subject: '',
  message: '',
  includeMetadata: true,
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const isMeaningfulDraft = (draft: DraftState) =>
  draft.type !== defaultDraft.type ||
  draft.includeMetadata !== defaultDraft.includeMetadata ||
  draft.subject.trim().length > 0 ||
  draft.message.trim().length > 0;

const AccountFeedbackPanel: React.FC = () => {
  const { session, user: authUser } = useAuth();
  const { addNotification } = useUser();
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<FeedbackHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const autosaveTimeoutRef = useRef<number | null>(null);

  const draftStorageKey = useMemo(() => buildFeedbackDraftKey(authUser?.id), [authUser?.id]);
  const lastSubmissionKey = useMemo(() => `codhak-feedback-last-submission:${authUser?.id || 'anonymous'}`, [authUser?.id]);

  const validateSubject = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Subject is required.';
    if (trimmed.length < feedbackConfig.minSubjectLength) return `Subject must be at least ${feedbackConfig.minSubjectLength} characters.`;
    if (trimmed.length > feedbackConfig.maxSubjectLength) return `Subject must be ${feedbackConfig.maxSubjectLength} characters or less.`;
    return '';
  };

  const validateMessage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Message is required.';
    if (trimmed.length < feedbackConfig.minMessageLength) return `Message must be at least ${feedbackConfig.minMessageLength} characters.`;
    if (trimmed.length > feedbackConfig.maxMessageLength) return `Message must be ${feedbackConfig.maxMessageLength} characters or less.`;
    return '';
  };

  const loadHistory = async () => {
    if (!session?.access_token) {
      setHistoryEntries([]);
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError('');

    try {
      const entries = await fetchFeedbackEntries(session.access_token);
      setHistoryEntries(entries);
    } catch (error: any) {
      setHistoryError(error?.message || 'Could not load feedback history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DraftState & { updatedAt?: string };
      setDraft({
        type: parsed.type || defaultDraft.type,
        subject: parsed.subject || '',
        message: parsed.message || '',
        includeMetadata: typeof parsed.includeMetadata === 'boolean' ? parsed.includeMetadata : true,
      });
      if (parsed.updatedAt) {
        setLastSavedAt(formatTimestamp(parsed.updatedAt));
      }
    } catch (error) {
      console.error('Could not restore feedback draft:', error);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    loadHistory();
  }, [session?.access_token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    if (!isMeaningfulDraft(draft)) {
      window.localStorage.removeItem(draftStorageKey);
      setLastSavedAt('');
      return;
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      const payload = {
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      setLastSavedAt(formatTimestamp(payload.updatedAt));
    }, DRAFT_AUTOSAVE_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [draft, draftStorageKey]);

  const attachmentSummary = useMemo(() => {
    if (attachments.length === 0) {
      return 'No files attached.';
    }

    return `${attachments.length} file${attachments.length === 1 ? '' : 's'} ready to upload.`;
  }, [attachments]);

  const handleDraftChange = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setSuccessMessage('');
    setDraft((current) => ({ ...current, [key]: value }));

    if (key === 'subject') {
      setSubjectError(validateSubject(String(value)));
    }

    if (key === 'message') {
      setMessageError(validateMessage(String(value)));
    }
  };

  const handleAttachmentSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    if (attachments.length + selectedFiles.length > feedbackConfig.maxAttachments) {
      addNotification({
        message: `You can attach up to ${feedbackConfig.maxAttachments} files per feedback item.`,
        type: 'warning',
        icon: '\u{1F4CE}',
      });
      return;
    }

    for (const file of selectedFiles) {
      const validationError = validateFeedbackFile(file);
      if (validationError) {
        addNotification({
          message: validationError,
          type: 'error',
          icon: '\u{26A0}',
        });
        return;
      }
    }

    setAttachments((current) => [...current, ...selectedFiles]);
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const clearDraft = () => {
    setDraft(defaultDraft);
    setAttachments([]);
    setSubjectError('');
    setMessageError('');
    setFormError('');
    setSuccessMessage('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftStorageKey);
    }
    setLastSavedAt('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!session?.access_token) {
      setFormError('Your session expired. Sign in again before sending feedback.');
      return;
    }

    const nextSubjectError = validateSubject(draft.subject);
    const nextMessageError = validateMessage(draft.message);
    setSubjectError(nextSubjectError);
    setMessageError(nextMessageError);

    if (nextSubjectError || nextMessageError) {
      setFormError(nextSubjectError || nextMessageError);
      return;
    }

    const fingerprint = buildFeedbackSubmissionFingerprint({
      type: draft.type,
      subject: draft.subject,
      message: draft.message,
    });

    if (typeof window !== 'undefined') {
      const previousRaw = window.localStorage.getItem(lastSubmissionKey);
      if (previousRaw) {
        try {
          const previous = JSON.parse(previousRaw) as { fingerprint: string; submittedAt: string };
          const submittedAt = new Date(previous.submittedAt).getTime();
          if (previous.fingerprint === fingerprint && Date.now() - submittedAt < DUPLICATE_SUBMISSION_WINDOW_MS) {
            setFormError('This feedback was already submitted very recently. Give the current request a moment before trying again.');
            return;
          }
        } catch (error) {
          console.error('Could not read previous feedback submission fingerprint:', error);
        }
      }
    }

    setFormError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const serializedAttachments = await serializeFeedbackFiles(attachments);
      const payload: FeedbackSubmissionPayload = {
        type: draft.type,
        subject: draft.subject.trim(),
        message: draft.message.trim(),
        includeMetadata: draft.includeMetadata,
        metadata: draft.includeMetadata ? collectFeedbackMetadata() : undefined,
        attachments: serializedAttachments,
      };

      const validation = validateFeedbackDraft(payload);
      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message || 'Feedback form is not valid.');
      }

      await submitFeedbackEntry(session.access_token, payload);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          lastSubmissionKey,
          JSON.stringify({ fingerprint, submittedAt: new Date().toISOString() })
        );
      }

      clearDraft();
      setSuccessMessage('Feedback submitted. We saved it to your account and queued it for review.');
      addNotification({
        message: 'Feedback submitted successfully.',
        type: 'success',
        icon: '\u{2705}',
      });
      await loadHistory();
    } catch (error: any) {
      const duplicate = error?.payload?.duplicate;
      setFormError(
        duplicate
          ? 'This feedback was already submitted recently. Review your history below before sending it again.'
          : error?.message || 'We could not submit feedback right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            <MessageSquareText className="h-4 w-4" />
            Feedback
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">Send product feedback</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Report bugs, request features, or send general feedback. Drafts save locally until you submit them.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[300px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Draft status</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{lastSavedAt ? `Saved ${lastSavedAt}` : 'Not saved yet'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Attachments</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{attachments.length}/{feedbackConfig.maxAttachments}</div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Feedback type</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {FEEDBACK_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = draft.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDraftChange('type', option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{option.label}</span>
                    </div>
                    <p className={`mt-3 text-xs leading-5 ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{option.description}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="feedback-subject" className="text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              id="feedback-subject"
              type="text"
              value={draft.subject}
              onChange={(event) => handleDraftChange('subject', event.target.value)}
              onBlur={() => setSubjectError(validateSubject(draft.subject))}
              maxLength={feedbackConfig.maxSubjectLength}
              className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition ${
                subjectError ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
              }`}
              aria-invalid={!!subjectError}
              aria-describedby="feedback-subject-hint"
              placeholder="Summarize the issue or idea"
            />
            <div className="flex items-center justify-between text-xs" id="feedback-subject-hint">
              <span className={subjectError ? 'text-red-600' : 'text-slate-500'}>
                {subjectError || `Use ${feedbackConfig.minSubjectLength}-${feedbackConfig.maxSubjectLength} characters.`}
              </span>
              <span className="text-slate-400">{draft.subject.length}/{feedbackConfig.maxSubjectLength}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="feedback-message" className="text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              id="feedback-message"
              value={draft.message}
              onChange={(event) => handleDraftChange('message', event.target.value)}
              onBlur={() => setMessageError(validateMessage(draft.message))}
              rows={8}
              maxLength={feedbackConfig.maxMessageLength}
              className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition ${
                messageError ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
              }`}
              aria-invalid={!!messageError}
              aria-describedby="feedback-message-hint"
              placeholder="Describe what happened, what you expected, and anything else that will help us reproduce or understand it."
            />
            <div className="flex items-center justify-between text-xs" id="feedback-message-hint">
              <span className={messageError ? 'text-red-600' : 'text-slate-500'}>
                {messageError || `Use at least ${feedbackConfig.minMessageLength} characters so support has enough context.`}
              </span>
              <span className="text-slate-400">{draft.message.length}/{feedbackConfig.maxMessageLength}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Technical details</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Include app version, page, environment, browser, and screen details. Useful for bug reports.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.includeMetadata}
                  onChange={(event) => handleDraftChange('includeMetadata', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Include metadata
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Attachments</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add screenshots or files. PNG, JPG, WEBP, GIF, PDF, or TXT up to {Math.floor(feedbackConfig.maxAttachmentBytes / (1024 * 1024))} MB each.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100">
                <ImagePlus className="h-4 w-4" />
                <span>Add files</span>
                <input
                  type="file"
                  multiple
                  accept={feedbackConfig.allowedAttachmentTypes.join(',')}
                  onChange={handleAttachmentSelection}
                  className="sr-only"
                />
              </label>
            </div>

            <p className="mt-3 text-xs text-slate-500">{attachmentSummary} Attachments are not saved in the local draft and need to be re-added after a refresh.</p>

            {attachments.length > 0 && (
              <ul className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <div className="flex min-w-0 items-center gap-3">
                      <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(formError || successMessage) && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                formError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {formError ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{formError || successMessage}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={clearDraft}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Clear draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{isSubmitting ? 'Submitting feedback...' : 'Submit feedback'}</span>
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent submissions</h3>
              <p className="mt-1 text-sm text-slate-500">Track what you already sent and its review status.</p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3" aria-live="polite">
            {isLoadingHistory && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                Loading feedback history...
              </div>
            )}

            {!isLoadingHistory && historyError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">{historyError}</div>
            )}

            {!isLoadingHistory && !historyError && historyEntries.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                You have not submitted any feedback yet.
              </div>
            )}

            {!isLoadingHistory && !historyError && historyEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[entry.status] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {LABEL_BY_TYPE[entry.type]}
                      </span>
                    </div>
                    <h4 className="mt-3 text-base font-semibold text-slate-900">{entry.subject}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{entry.message}</p>
                  </div>
                  <div className="shrink-0 text-xs text-slate-500">
                    <div>Submitted {formatTimestamp(entry.created_at)}</div>
                    <div className="mt-1">Updated {formatTimestamp(entry.updated_at)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                    <FileText className="h-3.5 w-3.5" />
                    {entry.attachments_count} attachment{entry.attachments_count === 1 ? '' : 's'}
                  </span>
                  {entry.metadata?.environment && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                      <Info className="h-3.5 w-3.5" />
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
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
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
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountFeedbackPanel;

