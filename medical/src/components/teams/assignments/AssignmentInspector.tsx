import React from 'react';
import { Archive, Copy, Loader2, Pencil, RotateCcw } from 'lucide-react';
import { TeamAssignment, TeamFeedback, TeamWorkspaceDetail } from '../../../lib/teams';
import { getAssignmentAuditSummary, getAssignmentOperationalSignal, getTeamAssignmentTypeLabel } from '../../../../shared/team-assignments.js';
import { StatusPill } from '../reviewUi';
import { AssignmentProgressBar } from './AssignmentProgressBar';
import { AssignmentOperationalMeta, getAssignmentDisplayTitle } from './model';
import { getAssignmentStateTone } from './presentation';

interface AssignmentInspectorProps {
  assignment: TeamAssignment;
  operationalMeta: AssignmentOperationalMeta | null;
  submissions: TeamWorkspaceDetail['submissions'];
  feedbackEntries: TeamFeedback[];
  hasReviewBacklog: boolean;
  canManageWorkspace: boolean;
  submittingKey: string | null;
  layout?: 'side' | 'bottom';
  onRestore: (assignment: TeamAssignment) => void;
  onEdit: (assignment: TeamAssignment) => void;
  onDuplicate: (assignment: TeamAssignment) => void;
  onArchive: (assignment: TeamAssignment) => void;
  onReviewProgress: () => void;
  onReviewSubmission: (submission: TeamWorkspaceDetail['submissions'][number]) => void;
  onOpenFeedbackEntry: (entryId: string) => void;
  formatDateLabel: (value: string | null | undefined) => string;
  formatRelativeActivityLabel: (value: string | null | undefined) => string;
  formatSubmissionStatusLabel: (status: TeamWorkspaceDetail['submissions'][number]['status']) => string;
  formatSubmissionTypeLabel: (status: TeamWorkspaceDetail['submissions'][number]['submissionType']) => string;
}

function InspectorField({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium tracking-[0.01em] text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
      {detail ? <div className="text-[12px] text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function InspectorPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/15 p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function AssignmentInspector({
  assignment,
  operationalMeta,
  submissions,
  feedbackEntries,
  hasReviewBacklog,
  canManageWorkspace,
  submittingKey,
  layout = 'side',
  onRestore,
  onEdit,
  onDuplicate,
  onArchive,
  onReviewProgress,
  onReviewSubmission,
  onOpenFeedbackEntry,
  formatDateLabel,
  formatRelativeActivityLabel,
  formatSubmissionStatusLabel,
  formatSubmissionTypeLabel,
}: AssignmentInspectorProps) {
  const displayTitle = getAssignmentDisplayTitle(assignment.title);
  const signal = getAssignmentOperationalSignal({
    lifecycleState: assignment.lifecycleState,
    dueAt: assignment.dueAt,
    completionRate: assignment.completionRate,
    needsReviewCount: operationalMeta?.needsReviewCount || 0,
    lastActivityAt: operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt,
  });
  const lastActivityAt = operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt;
  const attentionCount = Math.max(assignment.eligibleLearnerCount - assignment.completedLearnerCount, 0);
  const needsReviewCount = operationalMeta?.needsReviewCount || 0;
  const isArchived = assignment.lifecycleState === 'archived';
  const targetUnit =
    assignment.requiredCompletionCount === 1 && assignment.progressUnitLabel.endsWith('s')
      ? assignment.progressUnitLabel.slice(0, -1)
      : assignment.progressUnitLabel;
  const recentActivityRows = [
    ...submissions.slice(0, 2).map((submission) => ({
      id: `submission-${submission.id}`,
      kind: 'Submission',
      title: submission.memberName,
      meta: `Attempt ${submission.attemptNumber} | ${formatSubmissionStatusLabel(submission.status)}`,
      subline: `${submission.title} | ${formatSubmissionTypeLabel(submission.submissionType)}`,
      preview: submission.preview,
      onClick: () => onReviewSubmission(submission),
    })),
    ...feedbackEntries.slice(0, 2).map((entry) => ({
      id: `feedback-${entry.id}`,
      kind: 'Coaching note',
      title: entry.memberName,
      meta: entry.status === 'draft' ? 'Needs review' : entry.status,
      subline: 'Feedback entry',
      preview: entry.summary || 'Open coaching note',
      onClick: () => onOpenFeedbackEntry(entry.id),
    })),
  ];
  const currentPriorityDetail =
    signal.nextAction ||
    (isArchived ? 'Restore if this assignment should return to the active queue.' : 'No immediate intervention needed.');
  const wrapperClassName =
    layout === 'side'
      ? 'flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-background/95'
      : 'max-h-[460px] overflow-hidden rounded-2xl border border-border bg-background/95';

  const renderActionButtons = () => (
    <div className="mt-4 flex flex-wrap gap-2">
      {isArchived ? (
        <button
          type="button"
          onClick={() => onRestore(assignment)}
          disabled={!canManageWorkspace || submittingKey === `restore-assignment-${assignment.id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {submittingKey === `restore-assignment-${assignment.id}` ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Restore
        </button>
      ) : hasReviewBacklog ? (
        <button
          type="button"
          onClick={onReviewProgress}
          disabled={!canManageWorkspace}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          Review progress
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(assignment)}
          disabled={!canManageWorkspace}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      )}

      {(isArchived || hasReviewBacklog) ? (
        <button
          type="button"
          onClick={() => onEdit(assignment)}
          disabled={!canManageWorkspace}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onDuplicate(assignment)}
        disabled={!canManageWorkspace || submittingKey === `duplicate-assignment-${assignment.id}`}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
      >
        {submittingKey === `duplicate-assignment-${assignment.id}` ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        Duplicate
      </button>

      {isArchived ? null : (
      <button
        type="button"
        onClick={() => onArchive(assignment)}
        disabled={!canManageWorkspace || submittingKey === `archive-assignment-${assignment.id}`}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
      >
        {submittingKey === `archive-assignment-${assignment.id}` ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
        Archive
        </button>
      )}
    </div>
  );

  const renderRecentActivity = () =>
    recentActivityRows.length > 0 ? (
      <div className="space-y-2">
        {recentActivityRows.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            className={`w-full rounded-lg px-0 py-2 text-left transition hover:bg-secondary/20 ${
              index > 0 ? 'border-t border-border/50' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{row.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {row.kind} | {row.subline}
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-muted-foreground">{row.meta}</div>
            </div>
            <div className="mt-1 line-clamp-2 px-0.5 text-[12px] text-muted-foreground">{row.preview}</div>
          </button>
        ))}
      </div>
    ) : (
      <div className="text-[12px] text-muted-foreground">No recent submissions or coaching notes yet.</div>
    );

  const renderHeader = () => (
    <section className={layout === 'side' ? 'border-b border-border pb-5' : 'border-b border-border pb-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-semibold text-foreground" title={assignment.title}>
              {displayTitle}
            </h3>
            <StatusPill tone={getAssignmentStateTone(signal.label)}>{signal.label}</StatusPill>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{getTeamAssignmentTypeLabel(assignment.assignmentType)}</span>
            <span>|</span>
            <span>{assignment.scopeLabel}</span>
            <span>|</span>
            <span>{assignment.audienceLabel}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground">{assignment.completionRate}%</div>
          <div className="text-xs text-muted-foreground">complete</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-foreground">Current priority</span>
        <span className="text-muted-foreground">{currentPriorityDetail}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
        <span>
          Due {assignment.dueAt ? formatDateLabel(assignment.dueAt) : 'whenever needed'}
        </span>
        <span>{attentionCount} needing attention</span>
        <span>{needsReviewCount} waiting on review</span>
        <span>Last active {formatRelativeActivityLabel(lastActivityAt)}</span>
      </div>

      {renderActionButtons()}
    </section>
  );

  const renderDefinitionContent = () => (
    <>
      <InspectorField label="Completion rule" value={assignment.completionRuleSummary} />
      <InspectorField
        label="Audience"
        value={`${assignment.audienceLabel} (${assignment.eligibleLearnerCount} active learners)`}
      />
      <InspectorField
        label="Target"
        value={`${assignment.requiredCompletionCount} ${targetUnit ? `${targetUnit} per learner` : 'completion target'}`}
      />
      {assignment.description ? <InspectorField label="Brief" value={assignment.description} /> : null}
    </>
  );

  const renderOperationalContent = () => (
    <>
      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-foreground">
            {assignment.completedLearnerCount} / {assignment.eligibleLearnerCount} complete
          </span>
          <span className="text-muted-foreground">{assignment.completionRate}%</span>
        </div>
        <div className="mt-2">
          <AssignmentProgressBar
            completed={assignment.completedLearnerCount}
            inProgress={assignment.inProgressLearnerCount}
            notStarted={assignment.notStartedLearnerCount}
          />
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {assignment.inProgressLearnerCount} in progress | {assignment.notStartedLearnerCount} not started
        </div>
      </div>
      <InspectorField
        label="Next action"
        value={<span className="font-semibold text-foreground">{signal.label}</span>}
        detail={signal.nextAction || 'No immediate intervention needed.'}
      />
      <InspectorField
        label="Needs attention"
        value={<span className="font-semibold text-foreground">{attentionCount}</span>}
        detail={
          needsReviewCount > 0
            ? `${needsReviewCount} submission${needsReviewCount === 1 ? '' : 's'} waiting on review`
            : 'No review backlog right now'
        }
      />
    </>
  );

  const renderAuditContent = () => (
    <>
      <InspectorField label="Created" value={formatDateLabel(assignment.createdAt)} />
      <InspectorField label="Updated" value={formatRelativeActivityLabel(assignment.updatedAt || assignment.createdAt)} />
      <InspectorField label="Snapshot" value={getAssignmentAuditSummary(assignment.definitionSnapshot)} />
      {isArchived ? (
        <InspectorField
          label="Archive state"
          value="Archived"
          detail="Restore if this assignment should return to the active queue."
        />
      ) : null}
    </>
  );

  return (
    <aside className={wrapperClassName} aria-label="Assignment inspector" data-inspector-layout={layout}>
      <div className={layout === 'side' ? 'flex-1 overflow-y-auto p-5' : 'overflow-y-auto p-5 md:p-6'}>
        {layout === 'side' ? (
          <div className="space-y-5">
            {renderHeader()}

            <section className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold text-foreground">Assignment definition</h4>
              <div className="mt-3 space-y-3">{renderDefinitionContent()}</div>
            </section>

            <section className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold text-foreground">Operational status</h4>
              <div className="mt-3 space-y-3">{renderOperationalContent()}</div>
            </section>

            <section className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold text-foreground">Audit trail</h4>
              <div className="mt-3 space-y-3">{renderAuditContent()}</div>
            </section>

            <section>
              <h4 className="text-sm font-semibold text-foreground">Recent activity</h4>
              <div className="mt-3">{renderRecentActivity()}</div>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            {renderHeader()}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)_minmax(0,1fr)]">
              <InspectorPanel title="Definition and scope">{renderDefinitionContent()}</InspectorPanel>
              <InspectorPanel title="Operational status">{renderOperationalContent()}</InspectorPanel>
              <div className="space-y-4">
                <InspectorPanel title="Audit and snapshot">{renderAuditContent()}</InspectorPanel>
                <InspectorPanel title="Recent activity">{renderRecentActivity()}</InspectorPanel>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
