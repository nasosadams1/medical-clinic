import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TeamAssignment, TeamAssignmentType, TeamWorkspaceDetail } from '../../../lib/teams';
import { EmptyState } from '../reviewUi';
import { AssignmentDueDateInput } from './AssignmentDueDateInput';
import { AssignmentInspector } from './AssignmentInspector';
import { AssignmentsEditorPanel } from './AssignmentsEditorPanel';
import { AssignmentsQueueTable } from './AssignmentsQueueTable';
import { AssignmentsQueueToolbar } from './AssignmentsQueueToolbar';
import { AssignmentsSummaryStrip } from './AssignmentsSummaryStrip';
import { AssignmentDraft, AssignmentQueueFilter, AssignmentSortOption, getAssignmentInspectorLayout } from './model';
import {
  AssignmentDueInputState,
  EMPTY_ASSIGNMENT_DUE_INPUT_STATE,
} from './editorContract';
import { useAssignmentsQueueState } from './useAssignmentsQueueState';

interface AssignmentsWorkspaceProps {
  teamDetail: TeamWorkspaceDetail;
  canManageWorkspace: boolean;
  workspaceAssignmentCount: number;
  assignmentLimit: number;
  trackTitleById: Map<string, string>;
  assignmentDraft: AssignmentDraft;
  setAssignmentDraft: React.Dispatch<React.SetStateAction<AssignmentDraft>>;
  assignmentDueInputState: AssignmentDueInputState;
  onAssignmentDueInputStateChange: (state: AssignmentDueInputState) => void;
  assignmentEditorOpen: boolean;
  selectedAssignmentId: string | null;
  submittingKey: string | null;
  onSelectAssignmentId: (assignmentId: string | null) => void;
  onOpenNewAssignmentEditor: () => void;
  onCloseAssignmentEditor: () => void;
  onSaveAssignment: () => void;
  onStartAssignmentEdit: (assignment: TeamAssignment) => void;
  onApplyAssignmentTemplate: (templateId: string) => void;
  onDuplicateAssignment: (assignment: TeamAssignment) => void | Promise<void>;
  onRequestArchiveAssignment: (assignment: TeamAssignment) => void;
  onRequestDeleteAssignments: (assignments: Pick<TeamAssignment, 'id' | 'title'>[]) => void;
  onRestoreAssignment: (assignment: TeamAssignment) => void | Promise<void>;
  onBulkAssignmentAction: (
    action: 'archive' | 'restore' | 'set_due_date',
    assignmentIds: string[],
    dueAt: string
  ) => boolean | Promise<boolean>;
  onOpenReviewForSubmission: (submission: TeamWorkspaceDetail['submissions'][number]) => void;
  onOpenFeedbackEntry: (entryId: string) => void;
  formatDateLabel: (value: string | null | undefined) => string;
  formatDateTimeLabel: (value: string | null | undefined) => string;
  formatRelativeActivityLabel: (value: string | null | undefined) => string;
  formatSubmissionStatusLabel: (status: TeamWorkspaceDetail['submissions'][number]['status']) => string;
  formatSubmissionTypeLabel: (type: TeamWorkspaceDetail['submissions'][number]['submissionType']) => string;
}

export function AssignmentsWorkspace({
  teamDetail,
  canManageWorkspace,
  workspaceAssignmentCount,
  assignmentLimit,
  trackTitleById,
  assignmentDraft,
  setAssignmentDraft,
  assignmentDueInputState,
  onAssignmentDueInputStateChange,
  assignmentEditorOpen,
  selectedAssignmentId,
  submittingKey,
  onSelectAssignmentId,
  onOpenNewAssignmentEditor,
  onCloseAssignmentEditor,
  onSaveAssignment,
  onStartAssignmentEdit,
  onApplyAssignmentTemplate,
  onDuplicateAssignment,
  onRequestArchiveAssignment,
  onRequestDeleteAssignments,
  onRestoreAssignment,
  onBulkAssignmentAction,
  onOpenReviewForSubmission,
  onOpenFeedbackEntry,
  formatDateLabel,
  formatDateTimeLabel,
  formatRelativeActivityLabel,
  formatSubmissionStatusLabel,
  formatSubmissionTypeLabel,
}: AssignmentsWorkspaceProps) {
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<'all' | TeamAssignmentType>('all');
  const [assignmentQueueFilter, setAssignmentQueueFilter] = useState<AssignmentQueueFilter>('all');
  const [assignmentSort, setAssignmentSort] = useState<AssignmentSortOption>('priority');
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [assignmentBulkDueAt, setAssignmentBulkDueAt] = useState('');
  const [assignmentBulkDueInputState, setAssignmentBulkDueInputState] = useState<AssignmentDueInputState>(
    EMPTY_ASSIGNMENT_DUE_INPUT_STATE
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1600 : window.innerWidth
  );
  const [pendingAssignmentViewAction, setPendingAssignmentViewAction] = useState<
    null | { kind: 'details' | 'editor'; assignmentId: string }
  >(null);
  const queueSurfaceRef = useRef<HTMLDivElement | null>(null);
  const bottomInspectorRef = useRef<HTMLDivElement | null>(null);
  const wasAssignmentEditorOpenRef = useRef(assignmentEditorOpen);

  useEffect(() => {
    setAssignmentSearchQuery('');
    setAssignmentTypeFilter('all');
    setAssignmentQueueFilter('all');
    setAssignmentSort('priority');
    setSelectedAssignmentIds([]);
    setAssignmentBulkDueAt('');
    setAssignmentBulkDueInputState(EMPTY_ASSIGNMENT_DUE_INPUT_STATE);
  }, [teamDetail.team.id]);

  const {
    assignmentOperationalMeta,
    reviewSubmissionByAssignmentId,
    assignmentModalStats,
    filteredAssignments,
    selectedAssignment,
    selectedAssignments,
    allFilteredAssignmentsSelected,
    selectedAssignmentFeedback,
    selectedAssignmentSubmissions,
    selectedAssignmentOperationalMeta,
    selectedAssignmentHasReviewBacklog,
    selectedAssignmentReviewSubmission,
  } = useAssignmentsQueueState({
    teamDetail,
    assignmentSearchQuery,
    assignmentTypeFilter,
    assignmentQueueFilter,
    assignmentSort,
    selectedAssignmentId,
    selectedAssignmentIds,
    trackTitleById,
  });

  useEffect(() => {
    if (selectedAssignmentId && filteredAssignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      return;
    }

    const nextSelectedId = filteredAssignments[0]?.id || null;
    if (nextSelectedId !== selectedAssignmentId) {
      onSelectAssignmentId(nextSelectedId);
    }
  }, [filteredAssignments, onSelectAssignmentId, selectedAssignmentId]);

  useEffect(() => {
    setSelectedAssignmentIds((current) =>
      current.filter((assignmentId) => filteredAssignments.some((assignment) => assignment.id === assignmentId))
    );
  }, [filteredAssignments]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const queueCounts = useMemo<Record<AssignmentQueueFilter, number>>(
    () => ({
      all: assignmentModalStats.total,
      needs_action: assignmentModalStats.needsAction,
      awaiting_review: assignmentModalStats.awaitingReview,
      overdue: assignmentModalStats.overdue,
      due_this_week: assignmentModalStats.dueThisWeek,
      stalled: assignmentModalStats.stalled,
      active: assignmentModalStats.active,
      archived: assignmentModalStats.archived,
    }),
    [assignmentModalStats]
  );

  const assignmentCapacityRatio = assignmentLimit > 0 ? workspaceAssignmentCount / assignmentLimit : 0;
  const capacityNote = assignmentCapacityRatio >= 0.85 ? `${workspaceAssignmentCount} / ${assignmentLimit} active` : null;
  const selectedAssignmentContentWeight =
    selectedAssignmentSubmissions.length +
    selectedAssignmentFeedback.length +
    ((selectedAssignment?.description?.length || 0) > 140 ? 1 : 0);
  const inspectorLayout = getAssignmentInspectorLayout({
    viewportWidth,
    rowCount: filteredAssignments.length,
    detailContentWeight: selectedAssignment ? selectedAssignmentContentWeight : Number.POSITIVE_INFINITY,
  });
  const useSideInspector = !assignmentEditorOpen && Boolean(selectedAssignment) && inspectorLayout === 'side';
  const queueSurfaceMinHeightClass = assignmentEditorOpen ? '' : useSideInspector ? 'min-h-[560px]' : 'min-h-[420px]';

  useEffect(() => {
    const wasAssignmentEditorOpen = wasAssignmentEditorOpenRef.current;
    wasAssignmentEditorOpenRef.current = assignmentEditorOpen;

    if (!assignmentEditorOpen || wasAssignmentEditorOpen) return undefined;

    const rafId = window.requestAnimationFrame(() => {
      queueSurfaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (pendingAssignmentViewAction?.kind === 'editor') {
        setPendingAssignmentViewAction(null);
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [assignmentEditorOpen, pendingAssignmentViewAction]);

  useEffect(() => {
    if (!pendingAssignmentViewAction) return undefined;

    if (pendingAssignmentViewAction.kind === 'details') {
      if (!selectedAssignment || selectedAssignment.id !== pendingAssignmentViewAction.assignmentId) return undefined;

      if (useSideInspector) {
        setPendingAssignmentViewAction(null);
        return undefined;
      }

      const rafId = window.requestAnimationFrame(() => {
        bottomInspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPendingAssignmentViewAction(null);
      });

      return () => window.cancelAnimationFrame(rafId);
    }

    return undefined;
  }, [pendingAssignmentViewAction, selectedAssignment, useSideInspector]);

  const toggleAssignmentSelection = useCallback((assignmentId: string) => {
    setSelectedAssignmentIds((current) =>
      current.includes(assignmentId) ? current.filter((entry) => entry !== assignmentId) : [...current, assignmentId]
    );
  }, []);

  const toggleAllFilteredAssignments = useCallback(() => {
    setSelectedAssignmentIds((current) => {
      if (filteredAssignments.length === 0) return current;
      if (filteredAssignments.every((assignment) => current.includes(assignment.id))) {
        return current.filter((assignmentId) => !filteredAssignments.some((assignment) => assignment.id === assignmentId));
      }

      return Array.from(new Set([...current, ...filteredAssignments.map((assignment) => assignment.id)]));
    });
  }, [filteredAssignments]);

  const handleOpenAssignmentDetails = useCallback(
    (assignmentId: string) => {
      onSelectAssignmentId(assignmentId);
      setPendingAssignmentViewAction({ kind: 'details', assignmentId });
    },
    [onSelectAssignmentId]
  );

  const handleStartAssignmentEdit = useCallback(
    (assignment: TeamAssignment) => {
      onStartAssignmentEdit(assignment);
      setPendingAssignmentViewAction({ kind: 'editor', assignmentId: assignment.id });
    },
    [onStartAssignmentEdit]
  );

  const handlePrimaryReview = useCallback(() => {
    if (selectedAssignmentReviewSubmission) {
      if (selectedAssignment) {
        onSelectAssignmentId(selectedAssignment.id);
      }
      onOpenReviewForSubmission(selectedAssignmentReviewSubmission);
    }
  }, [onOpenReviewForSubmission, onSelectAssignmentId, selectedAssignment, selectedAssignmentReviewSubmission]);

  const handleOpenAssignmentReview = useCallback(
    (assignmentId: string, submission: TeamWorkspaceDetail['submissions'][number]) => {
      onSelectAssignmentId(assignmentId);
      onOpenReviewForSubmission(submission);
    },
    [onOpenReviewForSubmission, onSelectAssignmentId]
  );

  const handleBulkAction = useCallback(
    async (action: 'archive' | 'restore' | 'set_due_date') => {
      const didUpdate = await onBulkAssignmentAction(action, selectedAssignmentIds, assignmentBulkDueAt);
      if (!didUpdate) return;

      setSelectedAssignmentIds([]);
      if (action === 'set_due_date') {
        setAssignmentBulkDueAt('');
        setAssignmentBulkDueInputState(EMPTY_ASSIGNMENT_DUE_INPUT_STATE);
      }
    },
    [assignmentBulkDueAt, onBulkAssignmentAction, selectedAssignmentIds]
  );

  return (
    <div className="space-y-3.5" lang="en-US">
      {!assignmentEditorOpen ? (
        <>
          <AssignmentsQueueToolbar
            searchQuery={assignmentSearchQuery}
            onSearchQueryChange={setAssignmentSearchQuery}
            assignmentTypeFilter={assignmentTypeFilter}
            onAssignmentTypeFilterChange={setAssignmentTypeFilter}
            assignmentSort={assignmentSort}
            onAssignmentSortChange={setAssignmentSort}
            assignmentQueueFilter={assignmentQueueFilter}
            onAssignmentQueueFilterChange={setAssignmentQueueFilter}
            queueCounts={queueCounts}
            capacityNote={capacityNote}
          />

          <AssignmentsSummaryStrip counts={queueCounts} />

          {selectedAssignmentIds.length > 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{selectedAssignmentIds.length} selected</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Apply a bulk due date, archive, delete, or restore the current selection.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AssignmentDueDateInput
                    value={assignmentBulkDueAt}
                    onChange={setAssignmentBulkDueAt}
                    onStateChange={setAssignmentBulkDueInputState}
                    size="compact"
                    ariaLabel="Bulk assignment due date"
                    className="w-full xl:min-w-[520px]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleBulkAction('set_due_date')}
                    disabled={
                      submittingKey === 'bulk-assignment-set_due_date' || assignmentBulkDueInputState.hasPendingEdit
                    }
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                  >
                    Set due date
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAction('archive')}
                    disabled={submittingKey === 'bulk-assignment-archive' || selectedAssignments.every((assignment) => assignment.lifecycleState === 'archived')}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                  >
                    Archive selected
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onRequestDeleteAssignments(
                        selectedAssignments.map((assignment) => ({
                          id: assignment.id,
                          title: assignment.title,
                        }))
                      )
                    }
                    disabled={submittingKey === 'bulk-assignment-delete'}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-60"
                  >
                    Delete selected
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAction('restore')}
                    disabled={submittingKey === 'bulk-assignment-restore' || selectedAssignments.every((assignment) => assignment.lifecycleState !== 'archived')}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                  >
                    Restore selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignmentIds([])}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div
        className={`grid gap-5 xl:items-stretch ${
          assignmentEditorOpen
            ? 'grid-cols-1'
            : useSideInspector
            ? 'xl:min-h-[620px] xl:grid-cols-[minmax(0,1.4fr)_420px] 2xl:grid-cols-[minmax(0,1.45fr)_460px]'
            : 'grid-cols-1'
        }`}
      >
        <div className={`${assignmentEditorOpen ? '' : `flex ${queueSurfaceMinHeightClass} flex-col`}`}>
          <div
            ref={queueSurfaceRef}
            className={`${
              assignmentEditorOpen ? '' : 'rounded-2xl border border-border bg-background'
            } ${
              assignmentEditorOpen ? '' : `flex ${queueSurfaceMinHeightClass} flex-1 flex-col overflow-hidden`
            }`}
          >
            {assignmentEditorOpen ? (
              <AssignmentsEditorPanel
                draft={assignmentDraft}
                setDraft={setAssignmentDraft}
                dueInputState={assignmentDueInputState}
                onDueInputStateChange={onAssignmentDueInputStateChange}
                canManageWorkspace={canManageWorkspace}
                submittingKey={submittingKey}
                onSave={onSaveAssignment}
                onClose={onCloseAssignmentEditor}
                onApplyTemplate={onApplyAssignmentTemplate}
                formatDateTimeLabel={formatDateTimeLabel}
              />
            ) : teamDetail.assignments.length === 0 ? (
              <div className="flex flex-1 items-center p-4">
                <EmptyState
                  title="No assignments yet"
                  helper="Create a new assignment to start the queue, then review progress here as work begins."
                  action={
                    canManageWorkspace ? (
                      <button
                        type="button"
                        onClick={onOpenNewAssignmentEditor}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        New assignment
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="flex flex-1 items-center p-4">
                <EmptyState
                  title={assignmentModalStats.active === 0 && assignmentQueueFilter !== 'archived' ? 'No active assignments' : 'No assignments match this view'}
                  helper={
                    assignmentModalStats.active === 0 && assignmentQueueFilter !== 'archived'
                      ? 'Create a new assignment or restore archived work that still belongs in the queue.'
                      : 'Clear the search or switch queue state to bring more work back into view.'
                  }
                  action={
                    assignmentModalStats.active === 0 && assignmentQueueFilter !== 'archived'
                      ? (
                          <div className="flex flex-wrap gap-2">
                            {canManageWorkspace ? (
                              <button
                                type="button"
                                onClick={onOpenNewAssignmentEditor}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                              >
                                New assignment
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setAssignmentQueueFilter('archived')}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                            >
                              View archived
                            </button>
                          </div>
                        )
                      : (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignmentSearchQuery('');
                              setAssignmentTypeFilter('all');
                              setAssignmentQueueFilter('all');
                              setAssignmentSort('priority');
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                          >
                            Reset filters
                          </button>
                        )
                  }
                />
              </div>
            ) : (
              <AssignmentsQueueTable
                assignments={filteredAssignments}
                selectedAssignmentId={selectedAssignment?.id || null}
                selectedAssignmentIds={selectedAssignmentIds}
                allFilteredAssignmentsSelected={allFilteredAssignmentsSelected}
                assignmentOperationalMeta={assignmentOperationalMeta}
                reviewSubmissionByAssignmentId={reviewSubmissionByAssignmentId}
                canManageWorkspace={canManageWorkspace}
                submittingKey={submittingKey}
                onSelectAssignment={handleOpenAssignmentDetails}
                onToggleAssignmentSelection={toggleAssignmentSelection}
                onToggleAllFilteredAssignments={toggleAllFilteredAssignments}
                onRestoreAssignment={onRestoreAssignment}
                onReviewAssignment={handleOpenAssignmentReview}
                formatDateLabel={formatDateLabel}
                formatRelativeActivityLabel={formatRelativeActivityLabel}
              />
            )}
          </div>

          {!assignmentEditorOpen && selectedAssignment && !useSideInspector ? (
            <div ref={bottomInspectorRef} className="mt-5">
              <AssignmentInspector
                assignment={selectedAssignment}
                operationalMeta={selectedAssignmentOperationalMeta}
                submissions={selectedAssignmentSubmissions}
                feedbackEntries={selectedAssignmentFeedback}
                hasReviewBacklog={selectedAssignmentHasReviewBacklog}
                canManageWorkspace={canManageWorkspace}
                submittingKey={submittingKey}
                layout="bottom"
                onRestore={onRestoreAssignment}
                onEdit={handleStartAssignmentEdit}
                onDuplicate={onDuplicateAssignment}
                onArchive={onRequestArchiveAssignment}
                onReviewProgress={handlePrimaryReview}
                onReviewSubmission={onOpenReviewForSubmission}
                onOpenFeedbackEntry={onOpenFeedbackEntry}
                formatDateLabel={formatDateLabel}
                formatRelativeActivityLabel={formatRelativeActivityLabel}
                formatSubmissionStatusLabel={formatSubmissionStatusLabel}
                formatSubmissionTypeLabel={formatSubmissionTypeLabel}
              />
            </div>
          ) : null}
        </div>

        {useSideInspector && selectedAssignment ? (
          <AssignmentInspector
            assignment={selectedAssignment}
            operationalMeta={selectedAssignmentOperationalMeta}
            submissions={selectedAssignmentSubmissions}
            feedbackEntries={selectedAssignmentFeedback}
            hasReviewBacklog={selectedAssignmentHasReviewBacklog}
            canManageWorkspace={canManageWorkspace}
            submittingKey={submittingKey}
            layout="side"
            onRestore={onRestoreAssignment}
            onEdit={handleStartAssignmentEdit}
            onDuplicate={onDuplicateAssignment}
            onArchive={onRequestArchiveAssignment}
            onReviewProgress={handlePrimaryReview}
            onReviewSubmission={onOpenReviewForSubmission}
            onOpenFeedbackEntry={onOpenFeedbackEntry}
            formatDateLabel={formatDateLabel}
            formatRelativeActivityLabel={formatRelativeActivityLabel}
            formatSubmissionStatusLabel={formatSubmissionStatusLabel}
            formatSubmissionTypeLabel={formatSubmissionTypeLabel}
          />
        ) : null}
      </div>
    </div>
  );
}
