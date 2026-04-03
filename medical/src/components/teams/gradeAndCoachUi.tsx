import React from 'react';
import { ArrowRight, Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { TeamAssignment, TeamFeedback, TeamFeedbackStatus, TeamMember } from '../../lib/teams';
import {
  COACHING_STARTERS,
  EmptyState,
  ModalShell,
  ReviewField,
  ReviewStatePill,
  RubricScoreControl,
  type CoachingStarter,
  type ReviewTone,
} from './reviewUi';

type FeedbackStateMeta = {
  label: string;
  tone: ReviewTone;
};

type FeedbackDraftValue = {
  id: string | null;
  memberUserId: string;
  assignmentId: string;
  status: TeamFeedbackStatus;
  summary: string;
  strengths: string;
  focusAreas: string;
  coachNotes: string;
  sharedWithMember: boolean;
};

type FeedbackRubricDraftValue = {
  correctness: string;
  codeQuality: string;
  problemSolving: string;
  communication: string;
};

type WorkflowOption = {
  value: 'draft' | 'shared' | 'resolved';
  label: string;
  helper: string;
};

type RubricField = {
  field: keyof FeedbackRubricDraftValue;
  label: string;
  helper: string;
};

interface GradeAndCoachReviewSidebarProps {
  feedbackComposerOpen: boolean;
  activeReviewState: FeedbackStateMeta | null;
  composerModeTitle: string;
  activeReviewTitle: string;
  composerModeHelper: string;
  reviewTypeLabel: string;
  evidenceStatusLabel: string;
  hasAnchoredEvidence: boolean;
  manualReviewWarning?: string | null;
  composerRubricHeading: string;
  composerRubricHelper: string;
  composerQueueLabel: string;
  composerLastActiveLabel: string | null;
  composerRubricPercent: number | null;
  composerRubricTotal: number;
  composerHistoryEntries: TeamFeedback[];
  feedbackHistoryCount: number;
  selectedReviewFeedbackId: string | null;
  getFeedbackStateMeta: (entry: TeamFeedback) => FeedbackStateMeta;
  onSelectComposerHistoryEntry: (entry: TeamFeedback) => void;
  hiddenComposerHistoryCount: number;
  onShowAllComposerHistory: () => void;
  onShowLessComposerHistory: () => void;
  isEditingFeedback: boolean;
  feedbackDraft: FeedbackDraftValue;
  setFeedbackDraft: React.Dispatch<React.SetStateAction<FeedbackDraftValue>>;
  learnerMembers: TeamMember[];
  assignmentOptions: TeamAssignment[];
  rubricFields: RubricField[];
  feedbackRubricDraft: FeedbackRubricDraftValue;
  setFeedbackRubricDraft: React.Dispatch<React.SetStateAction<FeedbackRubricDraftValue>>;
  coachingStarters?: CoachingStarter[];
  onApplyFeedbackSnippet: (snippetId: string) => void;
  workflowOptions: WorkflowOption[];
  onSetFeedbackWorkflowState: (value: WorkflowOption['value']) => void;
  onSaveFeedback: () => void;
  canManageWorkspace: boolean;
  submittingKey: string | null;
  onCancelComposer: () => void;
  selectedReviewFeedback: TeamFeedback | null;
  selectedFeedbackState: FeedbackStateMeta | null;
  noteSections: Array<{ label: string; value: string }>;
  formatRelativeActivityLabel: (value: string | null | undefined) => string;
  onStartFeedbackEdit: (entry: TeamFeedback) => void;
  onRequestDeleteFeedback: (entry: TeamFeedback) => void;
  hasSelectedReviewItem: boolean;
  onStartReviewForSelectedItem: () => void;
  onOpenManualFeedbackComposer: () => void;
  composerContextPanel?: React.ReactNode;
}

export function GradeAndCoachReviewSidebar({
  feedbackComposerOpen,
  activeReviewState,
  composerModeTitle,
  activeReviewTitle,
  composerModeHelper,
  reviewTypeLabel,
  evidenceStatusLabel,
  hasAnchoredEvidence,
  manualReviewWarning,
  composerRubricHeading,
  composerRubricHelper,
  composerQueueLabel,
  composerLastActiveLabel,
  composerRubricPercent,
  composerRubricTotal,
  composerHistoryEntries,
  feedbackHistoryCount,
  selectedReviewFeedbackId,
  getFeedbackStateMeta,
  onSelectComposerHistoryEntry,
  hiddenComposerHistoryCount,
  onShowAllComposerHistory,
  onShowLessComposerHistory,
  isEditingFeedback,
  feedbackDraft,
  setFeedbackDraft,
  learnerMembers,
  assignmentOptions,
  rubricFields,
  feedbackRubricDraft,
  setFeedbackRubricDraft,
  coachingStarters = COACHING_STARTERS,
  onApplyFeedbackSnippet,
  workflowOptions,
  onSetFeedbackWorkflowState,
  onSaveFeedback,
  canManageWorkspace,
  submittingKey,
  onCancelComposer,
  selectedReviewFeedback,
  selectedFeedbackState,
  noteSections,
  formatRelativeActivityLabel,
  onStartFeedbackEdit,
  onRequestDeleteFeedback,
  hasSelectedReviewItem,
  onStartReviewForSelectedItem,
  onOpenManualFeedbackComposer,
  composerContextPanel,
}: GradeAndCoachReviewSidebarProps) {
  const saveBusy = submittingKey === 'save-feedback';
  const deleteBusy = selectedReviewFeedback ? submittingKey === `delete-feedback-${selectedReviewFeedback.id}` : false;
  const currentOutcomeLabel =
    feedbackDraft.status === 'resolved'
      ? 'Mark resolved'
      : feedbackDraft.sharedWithMember
      ? 'Share to learner'
      : 'Save draft';
  const primarySaveLabel =
    feedbackDraft.status === 'resolved'
      ? 'Resolve review'
      : feedbackDraft.sharedWithMember
      ? 'Share to learner'
      : feedbackDraft.id
      ? 'Save draft'
      : 'Save review';

  return (
    <div className="2xl:sticky 2xl:top-0 self-start">
      <div className="rounded-[1.75rem] border border-border/60 bg-background/70 p-5">
        {feedbackComposerOpen ? (
          <div className="mx-auto max-w-[1120px] space-y-4">
            <div className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeReviewState ? <ReviewStatePill label={activeReviewState.label} tone={activeReviewState.tone} /> : null}
                    <ReviewStatePill label={reviewTypeLabel} tone={hasAnchoredEvidence ? 'success' : 'warn'} />
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {evidenceStatusLabel}
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">{composerModeTitle}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{composerModeHelper}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-background px-3 py-1">{activeReviewTitle}</span>
                    <span className="rounded-full bg-background px-3 py-1">{composerQueueLabel}</span>
                    {composerLastActiveLabel ? (
                      <span className="rounded-full bg-background px-3 py-1">Last active {composerLastActiveLabel}</span>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-[170px] rounded-[1.1rem] border border-border bg-background px-4 py-3 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Progress</div>
                  <div className="mt-2 text-2xl font-semibold leading-none text-foreground">
                    {composerRubricPercent !== null ? `${composerRubricPercent}%` : '--'}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {composerRubricPercent !== null ? `${composerRubricTotal}/40 rubric total` : 'Not scored yet'}
                  </div>
                </div>
              </div>

              {manualReviewWarning ? (
                <div className="mt-4 rounded-[1.1rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  {manualReviewWarning}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-foreground">1. Scope and evidence</div>
                <div className="text-sm text-muted-foreground">
                  {isEditingFeedback
                    ? 'Confirm the original learner and evidence, then tighten the note instead of repointing it.'
                    : 'Pick the learner, keep the assignment optional, and decide whether this note needs real evidence attached.'}
                </div>
              </div>

              <div className={`mt-4 grid gap-4 ${composerContextPanel ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReviewField label="Learner" helper={isEditingFeedback ? 'Locked while editing this review.' : undefined}>
                      <select
                        value={feedbackDraft.memberUserId}
                        onChange={(event) => setFeedbackDraft((current) => ({ ...current, memberUserId: event.target.value }))}
                        disabled={isEditingFeedback}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40 disabled:opacity-60"
                      >
                        <option value="">Select learner</option>
                        {learnerMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </ReviewField>

                    <ReviewField label="Assignment" helper={isEditingFeedback ? 'Locked while editing this review.' : 'Optional'}>
                      <select
                        value={feedbackDraft.assignmentId}
                        onChange={(event) => setFeedbackDraft((current) => ({ ...current, assignmentId: event.target.value }))}
                        disabled={isEditingFeedback}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary/40 disabled:opacity-60"
                      >
                        <option value="">General coaching note</option>
                        {assignmentOptions.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </option>
                        ))}
                      </select>
                    </ReviewField>
                  </div>

                  {composerHistoryEntries.length > 0 ? (
                    <details open={isEditingFeedback} className="rounded-[1.2rem] border border-border bg-background/80">
                      <summary className="cursor-pointer list-none px-4 py-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">Earlier coaching context</div>
                            <div className="text-sm text-muted-foreground">
                              Reuse the last coaching direction instead of repeating it.
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {feedbackHistoryCount} earlier {feedbackHistoryCount === 1 ? 'note' : 'notes'}
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-border px-4 py-4">
                        <div className="grid gap-3 lg:grid-cols-2">
                          {composerHistoryEntries.map((entry) => {
                            const feedbackState = getFeedbackStateMeta(entry);
                            const isSourceNote = selectedReviewFeedbackId === entry.id;

                            return (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => onSelectComposerHistoryEntry(entry)}
                                className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                                  isSourceNote ? 'border-primary/30 bg-primary/10' : 'border-border bg-card hover:bg-secondary'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="truncate text-sm font-semibold text-foreground">
                                        {entry.assignmentTitle || 'General coaching note'}
                                      </div>
                                      <ReviewStatePill label={feedbackState.label} tone={feedbackState.tone} />
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {entry.authorName} | {formatRelativeActivityLabel(entry.updatedAt)}
                                    </div>
                                  </div>
                                  <div className="text-right text-sm font-semibold text-foreground">
                                    {entry.rubricScore !== null ? entry.rubricScore : '--'}
                                  </div>
                                </div>
                                <div className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                  {entry.summary || entry.focusAreas || entry.strengths || 'Open coaching note'}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {hiddenComposerHistoryCount > 0 ? (
                          <button
                            type="button"
                            onClick={onShowAllComposerHistory}
                            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                          >
                            Show {hiddenComposerHistoryCount} more earlier note{hiddenComposerHistoryCount === 1 ? '' : 's'}
                          </button>
                        ) : feedbackHistoryCount > 2 ? (
                          <button
                            type="button"
                            onClick={onShowLessComposerHistory}
                            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                          >
                            Show fewer earlier notes
                          </button>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>

                {composerContextPanel ? <div className="min-w-0">{composerContextPanel}</div> : null}
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">2. Evaluation</div>
                  <div className="text-sm text-muted-foreground">{composerRubricHelper}</div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">{composerRubricHeading}</div>
              </div>
              <div className="mt-4 space-y-3">
                {rubricFields.map(({ field, label, helper }) => (
                  <RubricScoreControl
                    key={field}
                    label={label}
                    helper={helper}
                    value={feedbackRubricDraft[field]}
                    onChange={(nextValue) =>
                      setFeedbackRubricDraft((current) => ({
                        ...current,
                        [field]: nextValue,
                      }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-foreground">3. Learner-facing feedback</div>
                <div className="text-sm text-muted-foreground">
                  Write one calm summary, call out what is already working, and give one concrete next step.
                </div>
              </div>

              <div className="mt-4 rounded-[1.1rem] border border-border bg-background/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Quick starter</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Click a starter only to seed blank fields. It will not overwrite text you already wrote.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {coachingStarters.map((snippet) => (
                    <button
                      key={snippet.id}
                      type="button"
                      title={snippet.useCase}
                      onClick={() => onApplyFeedbackSnippet(snippet.id)}
                      className="inline-flex items-center rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                    >
                      {snippet.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <ReviewField label="Summary" helper="What happened overall, in one or two sentences.">
                  <textarea
                    value={feedbackDraft.summary}
                    onChange={(event) => setFeedbackDraft((current) => ({ ...current, summary: event.target.value }))}
                    rows={3}
                    placeholder="Strong baseline on syntax and iteration."
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                </ReviewField>

                <div className="grid gap-3 xl:grid-cols-2">
                  <ReviewField label="Strengths" helper="What the learner should keep doing.">
                    <textarea
                      value={feedbackDraft.strengths}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, strengths: event.target.value }))}
                      rows={4}
                      placeholder="Clear control flow and readable variable names."
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </ReviewField>

                  <ReviewField label="Next focus" helper="The single most valuable fix or next habit to build.">
                    <textarea
                      value={feedbackDraft.focusAreas}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, focusAreas: event.target.value }))}
                      rows={4}
                      placeholder="Edge cases and output formatting need more consistency."
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                    />
                  </ReviewField>
                </div>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
              <div className="text-sm font-semibold text-foreground">4. Internal note</div>
              <div className="mt-1 text-sm text-muted-foreground">Keep this private. Use it for coach-only follow-up, not learner copy.</div>
              <div className="mt-4">
                <ReviewField label="Coach-only note" helper="Never shown to the learner.">
                  <textarea
                    value={feedbackDraft.coachNotes}
                    onChange={(event) => setFeedbackDraft((current) => ({ ...current, coachNotes: event.target.value }))}
                    rows={4}
                    placeholder="Use the next session to walk through debugging strategy."
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                  />
                </ReviewField>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
              <div className="text-sm font-semibold text-foreground">5. Outcome</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pick the review state first, then run the single save action below.
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {workflowOptions.map((option) => {
                  const active =
                    option.value === 'draft'
                      ? feedbackDraft.status === 'draft' && !feedbackDraft.sharedWithMember
                      : option.value === 'shared'
                      ? feedbackDraft.status === 'shared' && feedbackDraft.sharedWithMember
                      : feedbackDraft.status === 'resolved';

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSetFeedbackWorkflowState(option.value)}
                      className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                        active
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-card'
                      }`}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">{option.helper}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[1rem] bg-background px-4 py-3 text-sm">
                  <div className="font-semibold text-foreground">Learner sees</div>
                  <div className="mt-2 leading-6 text-muted-foreground">
                    {feedbackDraft.sharedWithMember
                      ? 'Summary, strengths, and next focus as soon as you save.'
                      : 'Nothing yet. The learner note stays private until you choose a shared state.'}
                  </div>
                </div>
                <div className="rounded-[1rem] bg-background px-4 py-3 text-sm">
                  <div className="font-semibold text-foreground">Coach-only stays private</div>
                  <div className="mt-2 leading-6 text-muted-foreground">
                    Internal notes never leave the coach view, even when you share or resolve the review.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="text-sm text-muted-foreground">
                  Current outcome: <span className="font-semibold text-foreground">{currentOutcomeLabel}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onCancelComposer}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveFeedback}
                    disabled={!canManageWorkspace || saveBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {primarySaveLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : selectedReviewFeedback ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <ReviewStatePill label={selectedFeedbackState?.label || 'Draft'} tone={selectedFeedbackState?.tone || 'default'} />
                <div className="mt-3 text-lg font-semibold text-foreground">Latest coaching note</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {selectedReviewFeedback.authorName} | {formatRelativeActivityLabel(selectedReviewFeedback.updatedAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold leading-none text-foreground">
                  {selectedReviewFeedback.rubricScore !== null ? `${selectedReviewFeedback.rubricScore}` : '--'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Rubric score</div>
              </div>
            </div>

            {selectedReviewFeedback.rubricBreakdown ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {rubricFields.map(({ field, label }) => (
                  <div key={field} className="rounded-2xl bg-card/80 px-4 py-4">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {selectedReviewFeedback.rubricBreakdown?.[field] !== null &&
                      selectedReviewFeedback.rubricBreakdown?.[field] !== undefined
                        ? `${selectedReviewFeedback.rubricBreakdown[field]}/10`
                        : '--'}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {noteSections.length > 0 ? (
              <div className="space-y-4">
                {noteSections.map((section) => (
                  <div key={section.label} className="rounded-2xl bg-card/80 px-4 py-4 text-sm text-muted-foreground">
                    <div className="font-semibold text-foreground">{section.label}</div>
                    <div className="mt-2 whitespace-pre-wrap leading-7">{section.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="This note is still thin"
                helper="The review has state and score data, but the written coaching note still needs substance."
              />
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onStartFeedbackEdit(selectedReviewFeedback)}
                disabled={!canManageWorkspace}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                <Pencil className="h-4 w-4" />
                Edit review
              </button>
              <button
                type="button"
                onClick={() => onRequestDeleteFeedback(selectedReviewFeedback)}
                disabled={!canManageWorkspace || deleteBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
              >
                {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        ) : hasSelectedReviewItem ? (
          <div className="space-y-5">
            <div>
              <div className="text-lg font-semibold text-foreground">Finish this review</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This learner is in the queue but does not have a coaching note yet.
              </div>
            </div>

            <div className="space-y-3">
              {[
                'Score the work with the rubric instead of jumping straight to comments.',
                'Write one concrete summary and one concrete next step.',
                'Decide whether the note stays private, gets shared, or closes the loop.',
              ].map((step, index) => (
                <div key={step} className="rounded-2xl bg-card/80 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  <span className="font-semibold text-foreground">{index + 1}.</span> {step}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onStartReviewForSelectedItem}
                disabled={!canManageWorkspace}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Start review
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Choose the next learner"
            helper="Select a row from the queue, or start a manual review if you need to coach outside the queue."
            action={
              canManageWorkspace ? (
                <button
                  type="button"
                  onClick={onOpenManualFeedbackComposer}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Start manual review
                </button>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}

interface GradeAndCoachModalProps {
  feedbackComposerOpen: boolean;
  onClose: () => void;
  reviewSidebar: React.ReactNode;
  workContextPane: React.ReactNode;
  queuePane: React.ReactNode;
  hasSelectedReviewItem: boolean;
  canManageWorkspace: boolean;
  onOpenManualFeedbackComposer: () => void;
  onStartOrEditReview: () => void;
  onMoveToNextReviewItem: () => void;
  hasNextReviewItem: boolean;
  hasSelectedReviewFeedback: boolean;
  activeReviewState: FeedbackStateMeta | null;
  activeReviewHeading: string;
  activeReviewTitle: string;
  activeSubmissionLabel: string;
  lastActiveLabel: string | null;
  queueUpdatedLabel: string | null;
  latestBenchmarkLabel: string | null;
}

export function GradeAndCoachModal({
  feedbackComposerOpen,
  onClose,
  reviewSidebar,
  workContextPane,
  queuePane,
  hasSelectedReviewItem,
  canManageWorkspace,
  onOpenManualFeedbackComposer,
  onStartOrEditReview,
  onMoveToNextReviewItem,
  hasNextReviewItem,
  hasSelectedReviewFeedback,
  activeReviewState,
  activeReviewHeading,
  activeReviewTitle,
  activeSubmissionLabel,
  lastActiveLabel,
  queueUpdatedLabel,
  latestBenchmarkLabel,
}: GradeAndCoachModalProps) {
  return (
    <ModalShell
      title="Grade and coach"
      subtitle={
        feedbackComposerOpen
          ? 'Focus on one note. The queue stays muted until you finish or exit the composer.'
          : 'Work the queue, finish one review cleanly, then move on.'
      }
      onClose={onClose}
    >
      {feedbackComposerOpen ? (
        <div className="mx-auto max-w-[1200px]">{reviewSidebar}</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          {queuePane}

          <section className="min-w-0 space-y-5">
            {hasSelectedReviewItem ? (
              <>
                <div className="rounded-[1.9rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(8,19,33,0.98),rgba(12,28,48,0.92))] px-6 py-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      {activeReviewState ? <ReviewStatePill label={activeReviewState.label} tone={activeReviewState.tone} /> : null}
                      <div className="mt-3 text-2xl font-semibold text-foreground">{activeReviewHeading}</div>
                      <div className="mt-2 text-base text-muted-foreground">{activeReviewTitle}</div>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span>{activeSubmissionLabel}</span>
                        {lastActiveLabel ? <span>Last active {lastActiveLabel}</span> : null}
                        {queueUpdatedLabel ? <span>Queue updated {queueUpdatedLabel}</span> : null}
                        {latestBenchmarkLabel ? <span>Latest benchmark {latestBenchmarkLabel}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={onStartOrEditReview}
                        disabled={!canManageWorkspace}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      >
                        {hasSelectedReviewFeedback ? <Pencil className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        {hasSelectedReviewFeedback ? 'Edit review' : 'Start review'}
                      </button>

                      <button
                        type="button"
                        onClick={onMoveToNextReviewItem}
                        disabled={!hasNextReviewItem}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Next learner
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.05fr)_390px]">
                  {workContextPane}
                  {reviewSidebar}
                </div>
              </>
            ) : (
              <div className="rounded-[1.75rem] border border-border/60 bg-background/70 p-5">
                <EmptyState
                  title="Choose the next learner"
                  helper="Open a queue item on the left to inspect work and finish the coaching note here."
                  action={
                    canManageWorkspace ? (
                      <button
                        type="button"
                        onClick={onOpenManualFeedbackComposer}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4" />
                        Start manual review
                      </button>
                    ) : null
                  }
                />
              </div>
            )}
          </section>
        </div>
      )}
    </ModalShell>
  );
}
