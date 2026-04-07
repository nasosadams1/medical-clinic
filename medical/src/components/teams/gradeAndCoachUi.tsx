import React from 'react';
import { ArrowRight, Check, Loader2, Pencil, Trash2 } from 'lucide-react';
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

type QueueSnapshot = {
  needsReview: number;
  drafted: number;
  resolved: number;
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
  activeFeedbackStarterId: string | null;
  onApplyFeedbackSnippet: (snippetId: string) => void;
  onUpdateFeedbackNoteField: (field: 'summary' | 'strengths' | 'focusAreas', value: string) => void;
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
  composerContextPanel?: React.ReactNode;
  queueSnapshot: QueueSnapshot;
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
  activeFeedbackStarterId,
  onApplyFeedbackSnippet,
  onUpdateFeedbackNoteField,
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
  composerContextPanel,
  queueSnapshot,
}: GradeAndCoachReviewSidebarProps) {
  const saveBusy = submittingKey === 'save-feedback';
  const deleteBusy = selectedReviewFeedback ? submittingKey === `delete-feedback-${selectedReviewFeedback.id}` : false;
  const currentOutcomeLabel =
    feedbackDraft.status === 'resolved'
      ? 'Mark resolved'
      : feedbackDraft.sharedWithMember
      ? 'Share to learner'
      : 'Save draft';
  const queueNextAction =
    queueSnapshot.needsReview > 0
      ? 'Open the next waiting learner from the queue on the left.'
      : queueSnapshot.drafted > 0
      ? 'Reopen a draft and either share it or resolve it.'
      : 'Use New review only when you are coaching outside the submission queue.';
  const primarySaveLabel = currentOutcomeLabel;
  const showEvidenceDetails = Boolean(composerContextPanel);
  const outcomeSummary =
    feedbackDraft.status === 'resolved'
      ? 'The learner sees the note after save, and this coaching pass closes.'
      : feedbackDraft.sharedWithMember
      ? 'The learner sees the note after save. Coach-only notes still stay private.'
      : 'The note stays private after save so you can tighten it before sharing.';

  return (
    <div className="2xl:sticky 2xl:top-0 self-start">
      <div className="space-y-4">
        {feedbackComposerOpen ? (
          <div className="mx-auto max-w-[1120px] space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {activeReviewState ? <ReviewStatePill label={activeReviewState.label} tone={activeReviewState.tone} /> : null}
                </div>
                <div className="mt-3 text-2xl font-semibold text-foreground">{composerModeTitle}</div>
                <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{composerModeHelper}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{activeReviewTitle}</span>
                  <span>{reviewTypeLabel}</span>
                  <span>{evidenceStatusLabel}</span>
                  <span>{composerQueueLabel}</span>
                  {composerLastActiveLabel ? (
                    <span>Last active {composerLastActiveLabel}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[1rem] border border-border/60 bg-background/70 px-4 py-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Rubric</span>{' '}
                  <span className="font-semibold text-foreground">
                    {composerRubricPercent !== null ? `${composerRubricTotal}/40` : 'Not scored'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Outcome</span>{' '}
                  <span className="font-semibold text-foreground">{currentOutcomeLabel}</span>
                </div>
                <div className="text-muted-foreground">
                  {feedbackDraft.sharedWithMember ? 'Learner-facing on save' : 'Private until shared'}
                </div>
              </div>
            </div>

            {manualReviewWarning ? (
              <div className="rounded-[1.05rem] border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm leading-6 text-amber-100">
                {manualReviewWarning}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.86fr)_minmax(0,1.14fr)]">
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-border/60 bg-card/65 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">1. Scope</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {hasAnchoredEvidence
                          ? 'Keep the learner and evidence aligned.'
                          : 'Pick the learner first. Attach evidence only if it changes the review.'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{hasAnchoredEvidence ? 'Evidence attached' : 'Manual note'}</div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

                  {showEvidenceDetails ? (
                    <details className="mt-4 rounded-[1rem] border border-border bg-background/80">
                      <summary className="cursor-pointer list-none px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {hasAnchoredEvidence ? 'Evidence source' : 'Attach evidence only if needed'}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {hasAnchoredEvidence
                                ? 'Review or change the attached attempt only if another source should drive the note.'
                                : 'Keep this manual unless an attempt should drive the score.'}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">Advanced</span>
                        </div>
                      </summary>
                      <div className="border-t border-border px-4 py-4">{composerContextPanel}</div>
                    </details>
                  ) : null}

                  {composerHistoryEntries.length > 0 ? (
                    <details className="mt-4 rounded-[1rem] border border-border bg-background/80">
                      <summary className="cursor-pointer list-none px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">Previous coaching context</div>
                            <div className="mt-1 text-sm text-muted-foreground">Use the last useful note instead of repeating it.</div>
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

                <div className="rounded-[1.25rem] border border-border/60 bg-card/65 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">2. Evaluation</div>
                      <div className="mt-1 text-sm text-muted-foreground">{composerRubricHelper}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{composerRubricHeading}</div>
                  </div>
                  <div className="mt-4 space-y-2.5">
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

              </div>

              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-primary/15 bg-card/75 p-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-foreground">3. Feedback note</div>
                    <div className="text-sm text-muted-foreground">Write the learner note first. Keep it short and concrete.</div>
                  </div>

                  <div className="mt-3 space-y-3">
                    <ReviewField label="Summary" helper="What happened overall, in one or two sentences.">
                      <textarea
                        value={feedbackDraft.summary}
                        onChange={(event) => onUpdateFeedbackNoteField('summary', event.target.value)}
                        rows={2}
                        placeholder="Strong baseline on syntax and iteration."
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                      />
                    </ReviewField>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <ReviewField label="Strengths" helper="What the learner should keep doing.">
                        <textarea
                          value={feedbackDraft.strengths}
                          onChange={(event) => onUpdateFeedbackNoteField('strengths', event.target.value)}
                          rows={3}
                          placeholder="Clear control flow and readable variable names."
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                        />
                      </ReviewField>

                      <ReviewField label="Next focus" helper="The single most valuable fix or next habit to build.">
                        <textarea
                          value={feedbackDraft.focusAreas}
                          onChange={(event) => onUpdateFeedbackNoteField('focusAreas', event.target.value)}
                          rows={3}
                          placeholder="Edge cases and output formatting need more consistency."
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                        />
                      </ReviewField>
                    </div>

                    <details className="rounded-[1rem] border border-border bg-background/80">
                      <summary className="cursor-pointer list-none px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">Need a starter?</div>
                            <div className="mt-1 text-sm text-muted-foreground">Click one to replace the learner-note fields.</div>
                          </div>
                          <span className="text-xs text-muted-foreground">{activeFeedbackStarterId ? 'Active preset' : 'Optional'}</span>
                        </div>
                      </summary>
                      <div className="border-t border-border px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {coachingStarters.map((snippet) => {
                            const active = activeFeedbackStarterId === snippet.id;
                            return (
                            <button
                              key={snippet.id}
                              type="button"
                              title={snippet.useCase}
                              aria-pressed={active}
                              onClick={() => onApplyFeedbackSnippet(snippet.id)}
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                                active
                                  ? 'border-primary/30 bg-primary text-primary-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                              }`}
                            >
                              {snippet.label}
                            </button>
                            );
                          })}
                        </div>
                      </div>
                    </details>

                    <details className="rounded-[1rem] border border-border bg-background/80">
                      <summary className="cursor-pointer list-none px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">Coach-only note</div>
                            <div className="mt-1 text-sm text-muted-foreground">Optional private follow-up.</div>
                          </div>
                          <span className="text-xs text-muted-foreground">{feedbackDraft.coachNotes.trim() ? 'Added' : 'Optional'}</span>
                        </div>
                      </summary>
                      <div className="border-t border-border px-4 py-4">
                        <textarea
                          value={feedbackDraft.coachNotes}
                          onChange={(event) => setFeedbackDraft((current) => ({ ...current, coachNotes: event.target.value }))}
                          rows={2}
                          placeholder="Use the next session to walk through debugging strategy."
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
                        />
                      </div>
                    </details>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/60 bg-card/65 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">4. Outcome</div>
                      <div className="mt-1 text-sm text-muted-foreground">Pick the state, then run one save action.</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Current: {currentOutcomeLabel}</div>
                  </div>

                  <div className="mt-4 grid gap-2 lg:grid-cols-3">
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

                  <div className="mt-3 rounded-[1rem] bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {outcomeSummary}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="text-sm text-muted-foreground">Coach notes stay private.</div>
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
            </div>
          </div>
        ) : selectedReviewFeedback ? (
          <div className="rounded-[1.45rem] border border-border/60 bg-background/70 p-5 space-y-5">
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
          <div className="rounded-[1.45rem] border border-border/60 bg-background/70 p-5 space-y-5">
            <div>
              <div className="text-lg font-semibold text-foreground">Ready to review</div>
              <div className="mt-1 text-sm text-muted-foreground">No coaching note is attached yet.</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-card/80 px-4 py-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Evidence</div>
                <div className="mt-2 font-semibold text-foreground">{evidenceStatusLabel}</div>
                <div className="mt-1 text-muted-foreground">{activeReviewTitle}</div>
              </div>
              <div className="rounded-2xl bg-card/80 px-4 py-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Next move</div>
                <div className="mt-2 font-semibold text-foreground">Score first, then write one concrete learner note.</div>
                <div className="mt-1 text-muted-foreground">Choose the final state only after the note is ready.</div>
              </div>
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
          <div className="rounded-[1.45rem] border border-border/60 bg-background/70 p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_280px]">
              <div className="rounded-[1.1rem] border border-border bg-card/70 px-4 py-4 xl:col-span-2">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 xl:max-w-[64%]">
                    <div className="text-base font-semibold text-foreground">
                      {queueSnapshot.needsReview > 0 ? 'Queue ready' : queueSnapshot.drafted > 0 ? 'Drafts waiting' : 'No review open'}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">{queueNextAction}</div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">J / K</span> move through the queue.
                    </div>
                  </div>

                  <div className="grid min-w-[260px] gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{queueSnapshot.needsReview}</span> waiting
                    </div>
                    <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{queueSnapshot.drafted}</span> drafts
                    </div>
                    <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{queueSnapshot.resolved}</span> resolved
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
  queueSnapshot: QueueSnapshot;
}

export function GradeAndCoachModal({
  feedbackComposerOpen,
  onClose,
  reviewSidebar,
  workContextPane,
  queuePane,
  hasSelectedReviewItem,
  canManageWorkspace,
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
  queueSnapshot,
}: GradeAndCoachModalProps) {
  const queueNextAction =
    queueSnapshot.needsReview > 0
      ? 'Open the next waiting learner from the queue on the left.'
      : queueSnapshot.drafted > 0
      ? 'Reopen a draft and either share it or resolve it.'
      : 'Use New review only when you are coaching outside the submission queue.';

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
                <div className="rounded-[1.1rem] border border-border bg-card/70 px-4 py-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 xl:max-w-[64%]">
                      <div className="text-base font-semibold text-foreground">
                        {queueSnapshot.needsReview > 0 ? 'Queue ready' : queueSnapshot.drafted > 0 ? 'Drafts waiting' : 'No review open'}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">{queueNextAction}</div>
                      <div className="mt-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">J / K</span> move through the queue.
                      </div>
                    </div>

                    <div className="grid min-w-[260px] gap-2 sm:grid-cols-3 xl:grid-cols-1">
                      <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{queueSnapshot.needsReview}</span> waiting
                      </div>
                      <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{queueSnapshot.drafted}</span> drafts
                      </div>
                      <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{queueSnapshot.resolved}</span> resolved
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </ModalShell>
  );
}
