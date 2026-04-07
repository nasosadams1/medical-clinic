import { interviewTracks } from '../../../data/siteContent';
import { TeamAssignment, TeamAssignmentType } from '../../../lib/teams';
import {
  ASSIGNMENT_QUEUE_FILTER_OPTIONS,
  ASSIGNMENT_QUEUE_TABLE_COLUMNS,
  ASSIGNMENT_SUMMARY_STRIP_ITEMS,
  getAssignmentDisplayTitle,
  getAssignmentInspectorLayout,
  getAssignmentRowSupportLabel,
} from '../../../../shared/team-assignments-ui-contract.js';

export interface AssignmentDraft {
  id: string | null;
  title: string;
  description: string;
  assignmentType: TeamAssignmentType;
  benchmarkLanguage: TeamAssignment['benchmarkLanguage'];
  trackId: string;
  duelTargetCount: string;
  dueAt: string;
}

export type AssignmentDueBand = 'overdue' | 'due_soon' | 'scheduled' | 'no_due_date';

export type AssignmentQueueFilter =
  | 'all'
  | 'needs_action'
  | 'awaiting_review'
  | 'overdue'
  | 'due_this_week'
  | 'stalled'
  | 'active'
  | 'archived';

export type AssignmentSortOption = 'priority' | 'due' | 'completion' | 'recent';

export type AssignmentOperationalMeta = {
  needsReviewCount: number;
  submissionCount: number;
  feedbackCount: number;
  averageScore: number | null;
  lastActivityAt: string | null;
};

export type AssignmentQueueStats = {
  total: number;
  active: number;
  archived: number;
  overdue: number;
  dueThisWeek: number;
  awaitingReview: number;
  stalled: number;
  needsAction: number;
};

export {
  ASSIGNMENT_QUEUE_FILTER_OPTIONS,
  ASSIGNMENT_QUEUE_TABLE_COLUMNS,
  ASSIGNMENT_SUMMARY_STRIP_ITEMS,
  getAssignmentDisplayTitle,
  getAssignmentInspectorLayout,
  getAssignmentRowSupportLabel,
};

export const ASSIGNMENT_TEMPLATES: Array<{
  id: string;
  title: string;
  assignmentType: TeamAssignmentType;
  benchmarkLanguage?: AssignmentDraft['benchmarkLanguage'];
  trackId?: string;
  description: string;
}> = [
  {
    id: 'benchmark-python-screen',
    title: 'Class benchmark',
    assignmentType: 'benchmark',
    benchmarkLanguage: 'python',
    description: 'Measure baseline fluency before the next coaching sprint.',
  },
  {
    id: 'duel-activity-sprint',
    title: 'Duel sprint',
    assignmentType: 'duel_activity',
    description: 'Set a clear duel volume goal for the whole team.',
  },
  {
    id: 'roadmap-junior',
    title: 'Junior prep roadmap',
    assignmentType: 'roadmap',
    trackId: interviewTracks[0]?.id || '',
    description: 'Assign a structured roadmap and review completion weekly.',
  },
];

export const getAssignmentTemplate = (templateId: string) =>
  ASSIGNMENT_TEMPLATES.find((template) => template.id === templateId) || null;

export const emptyAssignmentDraft = (): AssignmentDraft => ({
  id: null,
  title: '',
  description: '',
  assignmentType: 'benchmark',
  benchmarkLanguage: 'python',
  trackId: '',
  duelTargetCount: '3',
  dueAt: '',
});

export const createAssignmentDraftFromTemplate = (templateId: string): AssignmentDraft | null => {
  const template = getAssignmentTemplate(templateId);
  if (!template) return null;

  return {
    ...emptyAssignmentDraft(),
    title: template.title,
    description: template.description,
    assignmentType: template.assignmentType,
    benchmarkLanguage: template.assignmentType === 'benchmark' ? template.benchmarkLanguage || 'python' : 'python',
    trackId: template.assignmentType === 'roadmap' ? template.trackId || '' : '',
    duelTargetCount: template.assignmentType === 'duel_activity' ? '5' : '3',
  };
};

export const getAssignmentDueMeta = (dueAt: string | null | undefined) => {
  if (!dueAt) {
    return {
      band: 'no_due_date' as AssignmentDueBand,
      label: 'No due date',
      tone: 'default' as const,
      sortValue: Number.POSITIVE_INFINITY,
    };
  }

  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) {
    return {
      band: 'no_due_date' as AssignmentDueBand,
      label: 'No due date',
      tone: 'default' as const,
      sortValue: Number.POSITIVE_INFINITY,
    };
  }

  const diffMs = parsed.getTime() - Date.now();
  if (diffMs < 0) {
    return {
      band: 'overdue' as AssignmentDueBand,
      label: 'Overdue',
      tone: 'danger' as const,
      sortValue: parsed.getTime(),
    };
  }

  if (diffMs <= 7 * 24 * 60 * 60 * 1000) {
    return {
      band: 'due_soon' as AssignmentDueBand,
      label: 'Due soon',
      tone: 'warn' as const,
      sortValue: parsed.getTime(),
    };
  }

  return {
    band: 'scheduled' as AssignmentDueBand,
    label: 'Scheduled',
    tone: 'success' as const,
    sortValue: parsed.getTime(),
  };
};
