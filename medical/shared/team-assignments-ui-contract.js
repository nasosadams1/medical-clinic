export const ASSIGNMENT_QUEUE_FILTER_OPTIONS = [
  { value: 'all', label: 'All work' },
  { value: 'needs_action', label: 'Needs action' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_this_week', label: 'Due this week' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const ASSIGNMENT_SUMMARY_STRIP_ITEMS = [
  { key: 'needs_action', label: 'Needs action' },
  { key: 'awaiting_review', label: 'Awaiting review' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'due_this_week', label: 'Due this week' },
  { key: 'stalled', label: 'Stalled' },
];

export const ASSIGNMENT_QUEUE_TABLE_COLUMNS = ['Assignment', 'Audience', 'Due', 'Status', 'Progress', 'Action'];

const COPY_PREFIX_PATTERN = /^Copy of\s+/i;
const COPY_SUFFIX_PATTERN = /\s+\(copy(?:\s+(\d+))?\)$/i;
const MACHINE_SUFFIX_PATTERN = /\s+\d{8,}(?=\s*(?:\(|$))/u;

const parseAssignmentCopyTitle = (title) => {
  let workingTitle = String(title || '').trim();
  if (!workingTitle) {
    return { stem: 'Untitled assignment', copyCount: 0 };
  }

  let copyCount = 0;
  if (COPY_PREFIX_PATTERN.test(workingTitle)) {
    copyCount = 1;
    workingTitle = workingTitle.replace(COPY_PREFIX_PATTERN, '').trim();
  }

  workingTitle = workingTitle.replace(MACHINE_SUFFIX_PATTERN, '').trim();

  for (;;) {
    const suffixMatch = workingTitle.match(COPY_SUFFIX_PATTERN);
    if (!suffixMatch) break;

    copyCount += Number(suffixMatch[1] || 1);
    workingTitle = workingTitle.slice(0, suffixMatch.index).trim();
  }

  const stem = workingTitle.replace(MACHINE_SUFFIX_PATTERN, '').trim() || 'Untitled assignment';
  return { stem, copyCount };
};

export const getAssignmentDisplayTitle = (title) => {
  const { stem, copyCount } = parseAssignmentCopyTitle(title);
  if (copyCount <= 0) return stem;
  if (copyCount === 1) return `${stem} (Copy)`;
  return `${stem} (Copy ${copyCount})`;
};

export const getAssignmentRowSupportLabel = ({ isArchived, signalLabel, needsReviewCount, lastActivityLabel }) => {
  if (isArchived) return 'Inactive';
  if (needsReviewCount > 0) return `${needsReviewCount} waiting`;
  if (signalLabel === 'Overdue') return 'Past due';
  if (signalLabel === 'Due this week') return 'Due soon';
  if (signalLabel === 'Stalled') return 'Quiet recently';
  return lastActivityLabel ? `Last active ${lastActivityLabel}` : 'On track';
};

export const getAssignmentInspectorLayout = ({ viewportWidth, rowCount, detailContentWeight }) => {
  if (viewportWidth >= 1440 && rowCount >= 6 && detailContentWeight <= 3) {
    return 'side';
  }

  return 'bottom';
};
