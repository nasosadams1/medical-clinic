import { useMemo } from 'react';
import { TeamAssignment, TeamAssignmentType, TeamFeedback, TeamWorkspaceDetail } from '../../../lib/teams';
import { getAssignmentOperationalSignal, getTeamAssignmentTypeLabel } from '../../../../shared/team-assignments.js';
import {
  AssignmentOperationalMeta,
  AssignmentQueueFilter,
  AssignmentQueueStats,
  AssignmentSortOption,
  getAssignmentDueMeta,
} from './model';

const SIGNAL_SORT_PRIORITY: Record<string, number> = {
  overdue: 0,
  awaiting_review: 1,
  due_this_week: 2,
  stalled: 3,
  active: 4,
  archived: 5,
};

type ReviewSubmissionMap = Map<string, TeamWorkspaceDetail['submissions'][number] | null>;

export function useAssignmentsQueueState({
  teamDetail,
  assignmentSearchQuery,
  assignmentTypeFilter,
  assignmentQueueFilter,
  assignmentSort,
  selectedAssignmentId,
  selectedAssignmentIds,
  trackTitleById,
}: {
  teamDetail: TeamWorkspaceDetail | null;
  assignmentSearchQuery: string;
  assignmentTypeFilter: 'all' | TeamAssignmentType;
  assignmentQueueFilter: AssignmentQueueFilter;
  assignmentSort: AssignmentSortOption;
  selectedAssignmentId: string | null;
  selectedAssignmentIds: string[];
  trackTitleById: Map<string, string>;
}) {
  const feedbackEntries = teamDetail?.feedback || [];
  const submissions = teamDetail?.submissions || [];
  const assignments = teamDetail?.assignments || [];

  const latestFeedbackBySubmissionId = useMemo(() => {
    const bySubmissionId = new Map<string, TeamFeedback>();

    feedbackEntries
      .filter((entry) => entry.submissionId)
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .forEach((entry) => {
        if (entry.submissionId && !bySubmissionId.has(entry.submissionId)) {
          bySubmissionId.set(entry.submissionId, entry);
        }
      });

    return bySubmissionId;
  }, [feedbackEntries]);

  const assignmentOperationalMeta = useMemo(() => {
    return new Map(
      assignments.map((assignment) => {
        const relatedSubmissions = submissions.filter((entry) => entry.assignmentId === assignment.id);
        const relatedSubmissionIds = new Set(relatedSubmissions.map((entry) => entry.id));
        const relatedFeedback = feedbackEntries.filter(
          (entry) => entry.assignmentId === assignment.id || (entry.submissionId ? relatedSubmissionIds.has(entry.submissionId) : false)
        );
        const scoredFeedback = relatedFeedback.map((entry) => entry.rubricScore).filter((value): value is number => value !== null);
        const scoredSubmissions = relatedSubmissions
          .map((entry) => entry.rubricScore)
          .filter((value): value is number => value !== null);
        const averageScoreSource = scoredFeedback.length > 0 ? scoredFeedback : scoredSubmissions;
        const averageScore =
          averageScoreSource.length > 0
            ? Math.round(averageScoreSource.reduce((total, value) => total + value, 0) / averageScoreSource.length)
            : null;
        const needsReviewCount = relatedSubmissions.filter((submission) => {
          const latestFeedback = latestFeedbackBySubmissionId.get(submission.id);
          if (!latestFeedback) return true;
          return latestFeedback.status !== 'resolved' && !latestFeedback.sharedWithMember && latestFeedback.status !== 'shared';
        }).length;
        const lastActivityCandidates = [
          assignment.updatedAt || assignment.createdAt,
          ...relatedSubmissions.map((entry) => entry.updatedAt || entry.createdAt),
          ...relatedFeedback.map((entry) => entry.updatedAt || entry.createdAt),
        ]
          .filter(Boolean)
          .map((value) => new Date(value as string).getTime())
          .filter((value) => Number.isFinite(value));
        const lastActivityAt =
          lastActivityCandidates.length > 0
            ? new Date(Math.max(...lastActivityCandidates)).toISOString()
            : assignment.updatedAt || assignment.createdAt;

        return [
          assignment.id,
          {
            needsReviewCount,
            submissionCount: relatedSubmissions.length,
            feedbackCount: relatedFeedback.length,
            averageScore,
            lastActivityAt,
          } satisfies AssignmentOperationalMeta,
        ] as const;
      })
    );
  }, [assignments, feedbackEntries, latestFeedbackBySubmissionId, submissions]);

  const reviewSubmissionByAssignmentId = useMemo<ReviewSubmissionMap>(() => {
    return new Map(
      assignments.map((assignment) => {
        const nextReviewSubmission =
          submissions
            .filter((entry) => entry.assignmentId === assignment.id && Boolean(entry.memberUserId))
            .slice()
            .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
            .find((submission) => {
              const latestFeedback = latestFeedbackBySubmissionId.get(submission.id);
              if (!latestFeedback) return true;
              return latestFeedback.status !== 'resolved' && !latestFeedback.sharedWithMember && latestFeedback.status !== 'shared';
            }) || null;

        return [assignment.id, nextReviewSubmission] as const;
      })
    );
  }, [assignments, latestFeedbackBySubmissionId, submissions]);

  const assignmentModalStats = useMemo<AssignmentQueueStats>(() => {
    return assignments.reduce(
      (accumulator, assignment) => {
        const operationalMeta = assignmentOperationalMeta.get(assignment.id);
        const signal = getAssignmentOperationalSignal({
          lifecycleState: assignment.lifecycleState,
          dueAt: assignment.dueAt,
          completionRate: assignment.completionRate,
          needsReviewCount: operationalMeta?.needsReviewCount || 0,
          lastActivityAt: operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt,
        });
        accumulator.total += 1;
        if (assignment.lifecycleState === 'active') accumulator.active += 1;
        if (assignment.lifecycleState === 'archived') accumulator.archived += 1;
        if (signal.key === 'overdue') accumulator.overdue += 1;
        if (signal.key === 'due_this_week') accumulator.dueThisWeek += 1;
        if (signal.key === 'awaiting_review') accumulator.awaitingReview += 1;
        if (signal.key === 'stalled') accumulator.stalled += 1;
        if (signal.key !== 'active' && signal.key !== 'archived') accumulator.needsAction += 1;
        return accumulator;
      },
      {
        total: 0,
        active: 0,
        archived: 0,
        overdue: 0,
        dueThisWeek: 0,
        awaitingReview: 0,
        stalled: 0,
        needsAction: 0,
      }
    );
  }, [assignmentOperationalMeta, assignments]);

  const filteredAssignments = useMemo(() => {
    const normalizedQuery = assignmentSearchQuery.trim().toLowerCase();

    return [...assignments]
      .filter((assignment) => (assignmentTypeFilter === 'all' ? true : assignment.assignmentType === assignmentTypeFilter))
      .filter((assignment) => {
        if (assignmentQueueFilter === 'all') return true;

        const operationalMeta = assignmentOperationalMeta.get(assignment.id);
        const signal = getAssignmentOperationalSignal({
          lifecycleState: assignment.lifecycleState,
          dueAt: assignment.dueAt,
          completionRate: assignment.completionRate,
          needsReviewCount: operationalMeta?.needsReviewCount || 0,
          lastActivityAt: operationalMeta?.lastActivityAt || assignment.updatedAt || assignment.createdAt,
        });

        if (assignmentQueueFilter === 'needs_action') {
          return signal.key !== 'active' && signal.key !== 'archived';
        }

        if (assignmentQueueFilter === 'active') {
          return assignment.lifecycleState !== 'archived';
        }

        if (assignmentQueueFilter === 'archived') {
          return assignment.lifecycleState === 'archived';
        }

        return signal.key === assignmentQueueFilter;
      })
      .filter((assignment) => {
        if (!normalizedQuery) return true;

        return [
          assignment.title,
          assignment.description || '',
          assignment.benchmarkLanguage || '',
          assignment.trackId || '',
          trackTitleById.get(assignment.trackId || '') || '',
          assignment.scopeLabel || '',
          assignment.audienceLabel || '',
          getTeamAssignmentTypeLabel(assignment.assignmentType),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftDue = getAssignmentDueMeta(left.dueAt);
        const rightDue = getAssignmentDueMeta(right.dueAt);
        const leftUpdatedAt = new Date(left.updatedAt || left.createdAt).getTime();
        const rightUpdatedAt = new Date(right.updatedAt || right.createdAt).getTime();

        if (assignmentSort === 'completion') {
          if (left.completionRate !== right.completionRate) {
            return right.completionRate - left.completionRate;
          }
          return rightUpdatedAt - leftUpdatedAt;
        }

        if (assignmentSort === 'recent') {
          return rightUpdatedAt - leftUpdatedAt;
        }

        if (assignmentSort === 'due') {
          const leftSortValue = Number.isFinite(leftDue.sortValue) ? leftDue.sortValue : Number.MAX_SAFE_INTEGER;
          const rightSortValue = Number.isFinite(rightDue.sortValue) ? rightDue.sortValue : Number.MAX_SAFE_INTEGER;
          if (leftSortValue !== rightSortValue) return leftSortValue - rightSortValue;
          return rightUpdatedAt - leftUpdatedAt;
        }

        const leftSignal = getAssignmentOperationalSignal({
          lifecycleState: left.lifecycleState,
          dueAt: left.dueAt,
          completionRate: left.completionRate,
          needsReviewCount: assignmentOperationalMeta.get(left.id)?.needsReviewCount || 0,
          lastActivityAt: assignmentOperationalMeta.get(left.id)?.lastActivityAt || left.updatedAt || left.createdAt,
        });
        const rightSignal = getAssignmentOperationalSignal({
          lifecycleState: right.lifecycleState,
          dueAt: right.dueAt,
          completionRate: right.completionRate,
          needsReviewCount: assignmentOperationalMeta.get(right.id)?.needsReviewCount || 0,
          lastActivityAt: assignmentOperationalMeta.get(right.id)?.lastActivityAt || right.updatedAt || right.createdAt,
        });
        if (SIGNAL_SORT_PRIORITY[leftSignal.key] !== SIGNAL_SORT_PRIORITY[rightSignal.key]) {
          return SIGNAL_SORT_PRIORITY[leftSignal.key] - SIGNAL_SORT_PRIORITY[rightSignal.key];
        }

        if (leftDue.sortValue !== rightDue.sortValue) {
          return leftDue.sortValue - rightDue.sortValue;
        }

        if (left.completionRate !== right.completionRate) {
          return right.completionRate - left.completionRate;
        }

        return rightUpdatedAt - leftUpdatedAt;
      });
  }, [
    assignmentOperationalMeta,
    assignmentQueueFilter,
    assignmentSearchQuery,
    assignmentSort,
    assignmentTypeFilter,
    assignments,
    trackTitleById,
  ]);

  const selectedAssignment = useMemo(
    () => filteredAssignments.find((assignment) => assignment.id === selectedAssignmentId) || filteredAssignments[0] || null,
    [filteredAssignments, selectedAssignmentId]
  );

  const selectedAssignments = useMemo(
    () => filteredAssignments.filter((assignment) => selectedAssignmentIds.includes(assignment.id)),
    [filteredAssignments, selectedAssignmentIds]
  );

  const allFilteredAssignmentsSelected =
    filteredAssignments.length > 0 && filteredAssignments.every((assignment) => selectedAssignmentIds.includes(assignment.id));

  const selectedAssignmentIndex = selectedAssignment ? filteredAssignments.findIndex((assignment) => assignment.id === selectedAssignment.id) : -1;

  const selectedAssignmentFeedback = useMemo(() => {
    if (!selectedAssignment) return [];

    return [...feedbackEntries]
      .filter((entry) => entry.assignmentId === selectedAssignment.id)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 4);
  }, [feedbackEntries, selectedAssignment]);

  const selectedAssignmentSubmissions = useMemo(() => {
    if (!selectedAssignment) return [];

    return [...submissions]
      .filter((entry) => entry.assignmentId === selectedAssignment.id)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 5);
  }, [selectedAssignment, submissions]);

  const selectedAssignmentOperationalMeta = selectedAssignment ? assignmentOperationalMeta.get(selectedAssignment.id) || null : null;

  const selectedAssignmentSignal = selectedAssignment
    ? getAssignmentOperationalSignal({
        lifecycleState: selectedAssignment.lifecycleState,
        dueAt: selectedAssignment.dueAt,
        completionRate: selectedAssignment.completionRate,
        needsReviewCount: selectedAssignmentOperationalMeta?.needsReviewCount || 0,
        lastActivityAt: selectedAssignmentOperationalMeta?.lastActivityAt || selectedAssignment.updatedAt || selectedAssignment.createdAt,
      })
    : null;

  const selectedAssignmentLastActivity =
    selectedAssignmentOperationalMeta?.lastActivityAt || selectedAssignment?.updatedAt || selectedAssignment?.createdAt || null;

  const selectedAssignmentAttentionCount = selectedAssignment
    ? Math.max(selectedAssignment.eligibleLearnerCount - selectedAssignment.completedLearnerCount, 0)
    : 0;

  const selectedAssignmentReviewSubmission =
    selectedAssignment && reviewSubmissionByAssignmentId.has(selectedAssignment.id)
      ? reviewSubmissionByAssignmentId.get(selectedAssignment.id) || null
      : null;

  const selectedAssignmentHasReviewBacklog = Boolean(
    selectedAssignment &&
      (selectedAssignmentOperationalMeta?.needsReviewCount || 0) > 0 &&
      selectedAssignmentReviewSubmission?.memberUserId
  );

  return {
    assignmentOperationalMeta,
    reviewSubmissionByAssignmentId,
    assignmentModalStats,
    filteredAssignments,
    selectedAssignment,
    selectedAssignments,
    allFilteredAssignmentsSelected,
    selectedAssignmentIndex,
    selectedAssignmentFeedback,
    selectedAssignmentSubmissions,
    selectedAssignmentOperationalMeta,
    selectedAssignmentSignal,
    selectedAssignmentLastActivity,
    selectedAssignmentAttentionCount,
    selectedAssignmentReviewSubmission,
    selectedAssignmentHasReviewBacklog,
  };
}
