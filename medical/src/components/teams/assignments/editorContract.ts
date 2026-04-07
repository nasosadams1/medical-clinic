import { getTeamAssignmentTrack } from '../../../../shared/team-assignment-tracks.js';
import {
  DUEL_ACTIVITY_MAX_TARGET,
  DUEL_ACTIVITY_MIN_TARGET,
} from '../../../../shared/team-assignments.js';
import { AssignmentDraft } from './model';

export type AssignmentDueInputStatus = 'empty' | 'valid' | 'incomplete' | 'invalid';

export interface AssignmentDueInputState {
  status: AssignmentDueInputStatus;
  hasPendingEdit: boolean;
  message: string | null;
}

export interface AssignmentEditorIssue {
  key: 'title' | 'benchmark_language' | 'roadmap_track' | 'duel_target' | 'due_at';
  message: string;
}

export interface AssignmentDraftValidation {
  readyToSave: boolean;
  issues: AssignmentEditorIssue[];
  title: string;
  description: string;
  duelTargetCount: number | null;
  dueAt: string;
}

export const EMPTY_ASSIGNMENT_DUE_INPUT_STATE: AssignmentDueInputState = {
  status: 'empty',
  hasPendingEdit: false,
  message: null,
};

export const getAssignmentDueInputStateFromValue = (
  value: string | null | undefined
): AssignmentDueInputState =>
  String(value || '').trim()
    ? {
        status: 'valid',
        hasPendingEdit: false,
        message: null,
      }
    : EMPTY_ASSIGNMENT_DUE_INPUT_STATE;

export const formatAssignmentDueAtInput = (value: string | null | undefined) => {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const offset = parsed.getTimezoneOffset();
  const normalized = new Date(parsed.getTime() - offset * 60 * 1000);
  return normalized.toISOString().slice(0, 16);
};

export const assignmentDueAtInputToIsoOrNull = (value: string | null | undefined) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return null;

  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
};

export const isValidAssignmentDueAtInput = (value: string | null | undefined) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return false;

  const parsed = new Date(normalizedValue);
  return !Number.isNaN(parsed.getTime());
};

export const parseDuelTargetCount = (value: string) => {
  const normalizedValue = String(value || '').trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return {
      valid: false,
      value: null,
      message: `Set a duel activity goal using a whole number between ${DUEL_ACTIVITY_MIN_TARGET} and ${DUEL_ACTIVITY_MAX_TARGET} matches.`,
    } as const;
  }

  const numericValue = Number(normalizedValue);
  if (
    !Number.isInteger(numericValue) ||
    numericValue < DUEL_ACTIVITY_MIN_TARGET ||
    numericValue > DUEL_ACTIVITY_MAX_TARGET
  ) {
    return {
      valid: false,
      value: null,
      message: `Set a duel activity goal using a whole number between ${DUEL_ACTIVITY_MIN_TARGET} and ${DUEL_ACTIVITY_MAX_TARGET} matches.`,
    } as const;
  }

  return {
    valid: true,
    value: numericValue,
    message: null,
  } as const;
};

export const getAssignmentDraftValidation = (
  draft: AssignmentDraft,
  dueInputState: AssignmentDueInputState = getAssignmentDueInputStateFromValue(draft.dueAt)
): AssignmentDraftValidation => {
  const issues: AssignmentEditorIssue[] = [];
  const title = draft.title.trim();
  const description = draft.description.trim();
  const dueAt = draft.dueAt.trim();

  if (title.length < 2) {
    issues.push({
      key: 'title',
      message: 'Add a title.',
    });
  }

  if (draft.assignmentType === 'benchmark' && !draft.benchmarkLanguage) {
    issues.push({
      key: 'benchmark_language',
      message: 'Choose a benchmark language.',
    });
  }

  if (draft.assignmentType === 'roadmap' && !getTeamAssignmentTrack(draft.trackId)) {
    issues.push({
      key: 'roadmap_track',
      message: 'Choose a roadmap track.',
    });
  }

  const duelTargetValidation =
    draft.assignmentType === 'duel_activity' ? parseDuelTargetCount(draft.duelTargetCount) : null;

  if (draft.assignmentType === 'duel_activity' && !duelTargetValidation?.valid) {
    issues.push({
      key: 'duel_target',
      message: duelTargetValidation?.message || 'Set a duel activity goal.',
    });
  }

  if (dueInputState.hasPendingEdit) {
    issues.push({
      key: 'due_at',
      message: dueInputState.message || 'Finish the due date entry or clear it.',
    });
  } else if (dueAt && !isValidAssignmentDueAtInput(dueAt)) {
    issues.push({
      key: 'due_at',
      message: 'Enter a valid due date.',
    });
  }

  return {
    readyToSave: issues.length === 0,
    issues,
    title,
    description,
    duelTargetCount: duelTargetValidation?.valid ? duelTargetValidation.value : null,
    dueAt,
  };
};
