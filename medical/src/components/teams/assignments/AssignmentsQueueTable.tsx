import React from 'react';
import { TeamAssignment, TeamWorkspaceDetail } from '../../../lib/teams';
import { getAssignmentOperationalSignal, getTeamAssignmentTypeLabel } from '../../../../shared/team-assignments.js';
import { StatusPill } from '../reviewUi';
import { AssignmentProgressBar } from './AssignmentProgressBar';
import {
  ASSIGNMENT_QUEUE_TABLE_COLUMNS,
  AssignmentOperationalMeta,
  getAssignmentDisplayTitle,
  getAssignmentRowSupportLabel,
} from './model';
import { getAssignmentStateTone } from './presentation';

interface AssignmentsQueueTableProps {
  assignments: TeamAssignment[];
  selectedAssignmentId: string | null;
  selectedAssignmentIds: string[];
  allFilteredAssignmentsSelected: boolean;
  assignmentOperationalMeta: Map<string, AssignmentOperationalMeta>;
  reviewSubmissionByAssignmentId: Map<string, TeamWorkspaceDetail['submissions'][number] | null>;
  canManageWorkspace: boolean;
  submittingKey: string | null;
  onSelectAssignment: (assignmentId: string) => void;
  onToggleAssignmentSelection: (assignmentId: string) => void;
  onToggleAllFilteredAssignments: () => void;
  onRestoreAssignment: (assignment: TeamAssignment) => void;
  onReviewAssignment: (assignmentId: string, submission: TeamWorkspaceDetail['submissions'][number]) => void;
  formatDateLabel: (value: string | null | undefined) => string;
  formatRelativeActivityLabel: (value: string | null | undefined) => string;
}

export function AssignmentsQueueTable({
  assignments,
  selectedAssignmentId,
  selectedAssignmentIds,
  allFilteredAssignmentsSelected,
  assignmentOperationalMeta,
  reviewSubmissionByAssignmentId,
  canManageWorkspace,
  submittingKey,
  onSelectAssignment,
  onToggleAssignmentSelection,
  onToggleAllFilteredAssignments,
  onRestoreAssignment,
  onReviewAssignment,
  formatDateLabel,
  formatRelativeActivityLabel,
}: AssignmentsQueueTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto" role="region" aria-label="Assignments queue">
      <table
        id="assignments-queue-table"
        className="min-w-full table-fixed border-separate border-spacing-0 align-top"
        aria-label="Assignments queue"
      >
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-border text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
            <th scope="col" className="w-10 px-3 py-2">
              <input
                type="checkbox"
                aria-label="Select all assignments in this view"
                checked={allFilteredAssignmentsSelected}
                onChange={onToggleAllFilteredAssignments}
                className="h-4 w-4 rounded border-border bg-background"
              />
            </th>
            {ASSIGNMENT_QUEUE_TABLE_COLUMNS.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`px-3 py-2 ${index === ASSIGNMENT_QUEUE_TABLE_COLUMNS.length - 1 ? 'text-right' : ''}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => {
            const displayTitle = getAssignmentDisplayTitle(assignment.title);
            const isSelected = selectedAssignmentId === assignment.id;
            const isArchived = assignment.lifecycleState === 'archived';
            const operationalMeta = assignmentOperationalMeta.get(assignment.id);
            const signal = getAssignmentOperationalSignal({
              lifecycleState: assignment.lifecycleState,
              dueAt: assignment.dueAt,
              completionRate: assignment.completionRate,
              needsReviewCount: operationalMeta?.needsReviewCount || 0,
              lastActivityAt: operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt,
            });
            const reviewSubmission = reviewSubmissionByAssignmentId.get(assignment.id) || null;
            const canReviewProgress = Boolean(
              reviewSubmission &&
                (operationalMeta?.needsReviewCount || 0) > 0 &&
                reviewSubmission.memberUserId
            );
            const secondaryStatus = getAssignmentRowSupportLabel({
              isArchived,
              signalLabel: signal.label,
              needsReviewCount: operationalMeta?.needsReviewCount || 0,
              lastActivityLabel: formatRelativeActivityLabel(operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt),
            });
            const primaryActionLabel = isArchived ? 'Restore' : canReviewProgress ? 'Review progress' : 'Open details';
            const audienceSupportLabel =
              assignment.eligibleLearnerCount === 1 ? '1 active learner' : `${assignment.eligibleLearnerCount} active learners`;

            return (
              <tr
                key={assignment.id}
                data-assignment-row-state={signal.key}
                data-assignment-archived={isArchived ? 'true' : 'false'}
                data-assignment-primary-action={primaryActionLabel.toLowerCase().replace(/\s+/g, '_')}
                className={`border-b border-border/70 align-top transition ${
                  isSelected ? (isArchived ? 'bg-background/70' : 'bg-primary/8') : isArchived ? 'bg-background/30' : 'hover:bg-card/60'
                }`}
              >
                <td className="px-3 py-1.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${displayTitle}`}
                    checked={selectedAssignmentIds.includes(assignment.id)}
                    onChange={() => onToggleAssignmentSelection(assignment.id)}
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                </td>

                <td className="px-3 py-1.5">
                  <button type="button" onClick={() => onSelectAssignment(assignment.id)} className="min-w-0 max-w-full text-left">
                    <div
                      title={assignment.title}
                      className={`truncate text-sm font-semibold leading-5 ${isArchived ? 'text-foreground/72' : 'text-foreground'}`}
                    >
                      {displayTitle}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {getTeamAssignmentTypeLabel(assignment.assignmentType)} | {assignment.scopeLabel}
                    </div>
                  </button>
                </td>

                <td className="px-3 py-1.5">
                  <div className={`text-sm font-medium leading-5 ${isArchived ? 'text-foreground/72' : 'text-foreground'}`}>
                    {assignment.audienceLabel}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{audienceSupportLabel}</div>
                </td>

                <td className="px-3 py-1.5">
                  <div className={`text-sm font-medium leading-5 ${isArchived ? 'text-foreground/72' : 'text-foreground'}`}>
                    {assignment.dueAt ? formatDateLabel(assignment.dueAt) : 'No due date'}
                  </div>
                </td>

                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={getAssignmentStateTone(signal.label)}>{signal.label}</StatusPill>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{secondaryStatus}</div>
                </td>

                <td className="px-3 py-1.5">
                  <div className="text-sm font-semibold leading-5 text-foreground">
                    {assignment.completedLearnerCount} / {assignment.eligibleLearnerCount} complete {assignment.completionRate}%
                  </div>
                  <div className="mt-0.5">
                    <AssignmentProgressBar
                      completed={assignment.completedLearnerCount}
                      inProgress={assignment.inProgressLearnerCount}
                      notStarted={assignment.notStartedLearnerCount}
                    />
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted-foreground/85">
                    {assignment.inProgressLearnerCount} in progress | {assignment.notStartedLearnerCount} not started
                  </div>
                </td>

                <td className="px-3 py-1.5 text-right">
                  {isArchived ? (
                    <button
                      type="button"
                      onClick={() => onRestoreAssignment(assignment)}
                      disabled={!canManageWorkspace || submittingKey === `restore-assignment-${assignment.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                    >
                      Restore
                    </button>
                  ) : canReviewProgress && reviewSubmission ? (
                    <button
                      type="button"
                      onClick={() => onReviewAssignment(assignment.id, reviewSubmission)}
                      disabled={!canManageWorkspace}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      Review progress
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectAssignment(assignment.id)}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      Open details
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
