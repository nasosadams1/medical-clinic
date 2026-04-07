import { TeamAssignmentType } from '../../../lib/teams';
import { getTeamAssignmentTrack } from '../../../../shared/team-assignment-tracks.js';
import {
  createAssignmentCompletionRule,
  createAssignmentDefinitionSnapshot,
  formatBenchmarkLanguageLabel,
  getAssignmentCompletionRuleSummary,
  getTeamAssignmentTypeLabel,
  normalizeTeamAssignmentType,
  TEAM_ASSIGNMENT_AUDIENCE_LABEL,
} from '../../../../shared/team-assignments.js';
import { AssignmentDraft, getAssignmentDueMeta } from './model';
import {
  AssignmentDueInputState,
  getAssignmentDraftValidation,
  parseDuelTargetCount,
} from './editorContract';

const EDITOR_PREVIEW_CAPTURED_AT = '2000-01-01T00:00:00.000Z';

export const ASSIGNMENT_EDITOR_TYPE_OPTIONS: Array<{
  value: TeamAssignmentType;
  label: string;
}> = [
  {
    value: 'benchmark',
    label: getTeamAssignmentTypeLabel('benchmark'),
  },
  {
    value: 'roadmap',
    label: getTeamAssignmentTypeLabel('roadmap'),
  },
  {
    value: 'duel_activity',
    label: getTeamAssignmentTypeLabel('duel_activity'),
  },
];

export type AssignmentEditorFocusField =
  | {
      label: 'Language';
      kind: 'benchmark_language';
    }
  | {
      label: 'Track';
      kind: 'roadmap_track';
    }
  | {
      label: 'Match goal';
      kind: 'duel_target_count';
      helper: 'Per learner';
    };

export interface AssignmentEditorViewModel {
  audienceLabel: string;
  assignmentTypeLabel: string;
  publishSummary: string;
  focusField: AssignmentEditorFocusField;
  focusValue: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  previewTitle: string | null;
  previewDescription: string | null;
  dueStatusLabel: string;
  dueStatusTone: 'default' | 'success' | 'warn' | 'danger';
  dueValue: string;
  completionRuleSummary: string;
  readyToSave: boolean;
  statusLabel: string;
  statusDetail: string;
  statusTone: 'success' | 'warn';
  blockingIssues: string[];
  advisory: string | null;
}

const normalizeDuelTargetCount = (value: string) => {
  const duelTargetValidation = parseDuelTargetCount(value);
  return duelTargetValidation.valid ? duelTargetValidation.value : null;
};

const hasValidRoadmapTrack = (trackId: string) => Boolean(getTeamAssignmentTrack(trackId));

const getAssignmentDraftSnapshot = (draft: AssignmentDraft) => {
  const normalizedType = normalizeTeamAssignmentType(draft.assignmentType);

  if (normalizedType === 'roadmap') {
    if (!hasValidRoadmapTrack(draft.trackId)) {
      return null;
    }

    return createAssignmentDefinitionSnapshot({
      assignmentType: normalizedType,
      trackId: draft.trackId,
      capturedAt: EDITOR_PREVIEW_CAPTURED_AT,
      snapshotState: 'captured',
    });
  }

  if (normalizedType === 'duel_activity') {
    const duelTargetCount = normalizeDuelTargetCount(draft.duelTargetCount);
    if (duelTargetCount === null) {
      return null;
    }

    return createAssignmentDefinitionSnapshot({
      assignmentType: normalizedType,
      duelTargetCount,
      capturedAt: EDITOR_PREVIEW_CAPTURED_AT,
      snapshotState: 'captured',
    });
  }

  if (!draft.benchmarkLanguage) {
    return null;
  }

  return createAssignmentDefinitionSnapshot({
    assignmentType: normalizedType,
    benchmarkLanguage: draft.benchmarkLanguage,
    capturedAt: EDITOR_PREVIEW_CAPTURED_AT,
    snapshotState: 'captured',
  });
};

const getCompletionRuleSummary = (draft: AssignmentDraft) => {
  const snapshot = getAssignmentDraftSnapshot(draft);
  if (!snapshot) {
    if (draft.assignmentType === 'roadmap') {
      return 'Choose a roadmap track to define the completion rule.';
    }

    if (draft.assignmentType === 'duel_activity') {
      return parseDuelTargetCount(draft.duelTargetCount).message || 'Set a duel activity goal.';
    }

    return 'Each learner completes one benchmark after this assignment starts.';
  }

  return getAssignmentCompletionRuleSummary(snapshot, createAssignmentCompletionRule(snapshot));
};

const getFocusValue = (draft: AssignmentDraft) => {
  if (draft.assignmentType === 'roadmap') {
    return getTeamAssignmentTrack(draft.trackId)?.title || 'Track not selected';
  }

  if (draft.assignmentType === 'duel_activity') {
    const matchCount = normalizeDuelTargetCount(draft.duelTargetCount);
    if (matchCount === null) {
      return 'Set a valid match goal';
    }

    return `${matchCount} duel match${matchCount === 1 ? '' : 'es'}`;
  }

  return formatBenchmarkLanguageLabel(draft.benchmarkLanguage || null);
};

export const getAssignmentEditorFocusField = (draft: AssignmentDraft): AssignmentEditorFocusField => {
  if (draft.assignmentType === 'roadmap') {
    return {
      label: 'Track',
      kind: 'roadmap_track',
    };
  }

  if (draft.assignmentType === 'duel_activity') {
    return {
      label: 'Match goal',
      kind: 'duel_target_count',
      helper: 'Per learner · whole number',
    };
  }

  return {
    label: 'Language',
    kind: 'benchmark_language',
  };
};

export const getAssignmentEditorTitlePlaceholder = (assignmentType: AssignmentDraft['assignmentType']) => {
  if (assignmentType === 'roadmap') return 'Add a roadmap title';
  if (assignmentType === 'duel_activity') return 'Add a duel activity title';
  return 'Add a benchmark title';
};

export const getAssignmentEditorDescriptionPlaceholder = (assignmentType: AssignmentDraft['assignmentType']) => {
  if (assignmentType === 'roadmap') {
    return 'Explain what learners should complete in this roadmap and how it will be reviewed.';
  }

  if (assignmentType === 'duel_activity') {
    return 'Explain the duel goal and what learners should focus on this round.';
  }

  return 'Explain why learners are taking this benchmark and what it should reveal.';
};

export const applyAssignmentTypeToDraft = (
  draft: AssignmentDraft,
  assignmentType: TeamAssignmentType
): AssignmentDraft => ({
  ...draft,
  assignmentType,
  trackId: assignmentType === 'roadmap' ? draft.trackId : '',
  benchmarkLanguage: assignmentType === 'benchmark' ? draft.benchmarkLanguage || 'python' : 'python',
});

export const createAssignmentEditorViewModel = (
  draft: AssignmentDraft,
  dueInputState: AssignmentDueInputState,
  formatDateTimeLabel: (value: string | null | undefined) => string
): AssignmentEditorViewModel => {
  const validation = getAssignmentDraftValidation(draft, dueInputState);
  const dueMeta = getAssignmentDueMeta(validation.dueAt);
  const readyToSave = validation.readyToSave;
  const blockingIssues = validation.issues.map((issue) => issue.message);

  return {
    audienceLabel: TEAM_ASSIGNMENT_AUDIENCE_LABEL,
    assignmentTypeLabel: getTeamAssignmentTypeLabel(draft.assignmentType),
    publishSummary: `${getTeamAssignmentTypeLabel(draft.assignmentType)} · ${getFocusValue(draft)}`,
    focusField: getAssignmentEditorFocusField(draft),
    focusValue: getFocusValue(draft),
    titlePlaceholder: getAssignmentEditorTitlePlaceholder(draft.assignmentType),
    descriptionPlaceholder: getAssignmentEditorDescriptionPlaceholder(draft.assignmentType),
    previewTitle: validation.title || null,
    previewDescription: validation.description || null,
    dueStatusLabel: validation.dueAt ? dueMeta.label : 'No due date',
    dueStatusTone: validation.dueAt ? dueMeta.tone : 'default',
    dueValue: validation.dueAt ? formatDateTimeLabel(validation.dueAt) : 'No due date',
    completionRuleSummary: getCompletionRuleSummary(draft),
    readyToSave,
    statusLabel: readyToSave ? 'Ready to save' : `${blockingIssues.length} item${blockingIssues.length === 1 ? '' : 's'} missing`,
    statusDetail: readyToSave
      ? 'Ready to publish.'
      : 'Complete the required fields before saving.',
    statusTone: readyToSave ? 'success' : 'warn',
    blockingIssues,
    advisory: validation.description ? null : 'Learners will not see extra guidance until you add learner instructions.',
  };
};
