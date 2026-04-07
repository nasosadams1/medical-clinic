import { getTeamAssignmentTrack } from './team-assignment-tracks.js';

export const TEAM_ASSIGNMENT_INPUT_TYPES = ['benchmark', 'roadmap', 'duel_activity', 'challenge_pack'];
export const TEAM_ASSIGNMENT_TYPES = ['benchmark', 'roadmap', 'duel_activity'];
export const TEAM_ASSIGNMENT_AUDIENCE_TYPES = ['team_wide'];
export const TEAM_ASSIGNMENT_SNAPSHOT_VERSION = 1;
export const TEAM_ASSIGNMENT_AUDIENCE_LABEL = 'All active learners';
export const DUEL_ACTIVITY_DEFAULT_TARGET = 3;
export const DUEL_ACTIVITY_MIN_TARGET = 1;
export const DUEL_ACTIVITY_MAX_TARGET = 20;
export const MATCH_COMPLETION_STATUSES = new Set(['completed', 'ended', 'finished']);

const SPECIAL_WORDS = new Map([
  ['api', 'API'],
  ['cpp', 'C++'],
  ['dsa', 'DSA'],
  ['js', 'JS'],
  ['id', 'ID'],
]);

const titleCaseToken = (token) => {
  const normalized = String(token || '').trim().toLowerCase();
  if (!normalized) return '';
  if (/^\d+$/.test(normalized)) return normalized;
  if (SPECIAL_WORDS.has(normalized)) return SPECIAL_WORDS.get(normalized);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const clampInteger = (value, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
};

export const normalizeTeamAssignmentType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'challenge_pack') {
    return 'duel_activity';
  }
  if (TEAM_ASSIGNMENT_TYPES.includes(normalized)) {
    return normalized;
  }
  return 'benchmark';
};

export const getTeamAssignmentTypeLabel = (assignmentType) => {
  const normalizedType = normalizeTeamAssignmentType(assignmentType);
  if (normalizedType === 'roadmap') return 'Roadmap';
  if (normalizedType === 'duel_activity') return 'Duel activity goal';
  return 'Benchmark';
};

export const formatBenchmarkLanguageLabel = (language) => {
  if (language === 'javascript') return 'JavaScript';
  if (language === 'java') return 'Java';
  if (language === 'cpp') return 'C++';
  if (language === 'python') return 'Python';
  return 'Unspecified language';
};

export const humanizeLessonId = (lessonId) =>
  String(lessonId || '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ')
    .trim();

export const getTeamAssignmentAudienceLabel = (audienceType) => {
  if (String(audienceType || 'team_wide').trim().toLowerCase() === 'team_wide') {
    return TEAM_ASSIGNMENT_AUDIENCE_LABEL;
  }

  return 'Custom audience';
};

export const getTrackSnapshotDefinition = (trackId) => {
  const track = getTeamAssignmentTrack(trackId);
  if (!track) {
    return null;
  }

  const lessonIds = Array.isArray(track.recommendedLessonIds) ? track.recommendedLessonIds.filter(Boolean) : [];
  const lessonItems = lessonIds.map((lessonId) => ({
    lessonId,
    title: humanizeLessonId(lessonId),
  }));

  return {
    id: trackId,
    title: track.title || humanizeLessonId(trackId),
    language: track.language || 'multi',
    version: Number(track.version || 1),
    requiredLessonIds: lessonIds,
    lessonItems,
    requiredLessonCount: lessonItems.length,
  };
};

export const createBenchmarkAssignmentSnapshot = ({ benchmarkLanguage, capturedAt, snapshotState = 'captured' }) => ({
  snapshotVersion: TEAM_ASSIGNMENT_SNAPSHOT_VERSION,
  snapshotState,
  capturedAt: capturedAt || new Date().toISOString(),
  assignmentType: 'benchmark',
  summary: `${formatBenchmarkLanguageLabel(benchmarkLanguage)} benchmark`,
  benchmarkLanguage,
  requiredCompletionCount: 1,
  progressUnitLabel: 'benchmarks',
});

export const createRoadmapAssignmentSnapshot = ({ trackId, capturedAt, snapshotState = 'captured' }) => {
  const track = getTrackSnapshotDefinition(trackId);
  if (!track) {
    throw new Error('Roadmap assignments require a valid track.');
  }

  return {
    snapshotVersion: TEAM_ASSIGNMENT_SNAPSHOT_VERSION,
    snapshotState,
    capturedAt: capturedAt || new Date().toISOString(),
    assignmentType: 'roadmap',
    summary: `${track.title} roadmap`,
    track,
    requiredCompletionCount: track.requiredLessonCount,
    progressUnitLabel: 'lessons',
  };
};

export const createDuelActivityAssignmentSnapshot = ({
  duelTargetCount,
  capturedAt,
  snapshotState = 'captured',
}) => {
  const requiredMatchCount = clampInteger(
    duelTargetCount ?? DUEL_ACTIVITY_DEFAULT_TARGET,
    DUEL_ACTIVITY_MIN_TARGET,
    DUEL_ACTIVITY_MAX_TARGET
  );

  return {
    snapshotVersion: TEAM_ASSIGNMENT_SNAPSHOT_VERSION,
    snapshotState,
    capturedAt: capturedAt || new Date().toISOString(),
    assignmentType: 'duel_activity',
    summary: `${requiredMatchCount} duel match${requiredMatchCount === 1 ? '' : 'es'}`,
    requiredMatchCount,
    requiredCompletionCount: requiredMatchCount,
    progressUnitLabel: 'matches',
  };
};

export const createAssignmentDefinitionSnapshot = ({
  assignmentType,
  benchmarkLanguage,
  trackId,
  duelTargetCount,
  capturedAt,
  snapshotState = 'captured',
}) => {
  const normalizedType = normalizeTeamAssignmentType(assignmentType);

  if (normalizedType === 'roadmap') {
    return createRoadmapAssignmentSnapshot({ trackId, capturedAt, snapshotState });
  }

  if (normalizedType === 'duel_activity') {
    return createDuelActivityAssignmentSnapshot({ duelTargetCount, capturedAt, snapshotState });
  }

  if (!benchmarkLanguage) {
    throw new Error('Benchmark assignments require a language.');
  }

  return createBenchmarkAssignmentSnapshot({ benchmarkLanguage, capturedAt, snapshotState });
};

export const createAssignmentCompletionRule = (snapshot) => {
  const normalizedType = normalizeTeamAssignmentType(snapshot?.assignmentType);

  if (normalizedType === 'roadmap') {
    return {
      mode: 'lesson_completion_since_assignment_start',
      requiredLessonIds: snapshot?.track?.requiredLessonIds || [],
      requiredCount: Number(snapshot?.requiredCompletionCount || snapshot?.track?.requiredLessonCount || 0),
    };
  }

  if (normalizedType === 'duel_activity') {
    return {
      mode: 'completed_duel_matches_since_assignment_start',
      requiredCount: clampInteger(
        snapshot?.requiredMatchCount ?? snapshot?.requiredCompletionCount,
        DUEL_ACTIVITY_MIN_TARGET,
        DUEL_ACTIVITY_MAX_TARGET
      ),
    };
  }

  return {
    mode: 'benchmark_completion_since_assignment_start',
    language: snapshot?.benchmarkLanguage || null,
    requiredCount: 1,
  };
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const getAssignmentDefinitionSnapshotFromRecord = (assignment) => {
  if (isPlainObject(assignment?.definition_snapshot) && assignment.definition_snapshot.snapshotVersion) {
    const snapshot = assignment.definition_snapshot;
    return {
      ...snapshot,
      assignmentType: normalizeTeamAssignmentType(snapshot.assignmentType || assignment.assignment_type),
    };
  }

  const metadata = isPlainObject(assignment?.metadata) ? assignment.metadata : {};
  return createAssignmentDefinitionSnapshot({
    assignmentType: assignment?.assignment_type,
    benchmarkLanguage: assignment?.benchmark_language || null,
    trackId: assignment?.track_id || null,
    duelTargetCount: metadata.requiredChallengeCount ?? metadata.duelTargetCount ?? DUEL_ACTIVITY_DEFAULT_TARGET,
    capturedAt: assignment?.created_at || new Date().toISOString(),
    snapshotState: 'legacy_backfill',
  });
};

export const getAssignmentCompletionRuleFromRecord = (assignment) => {
  if (isPlainObject(assignment?.completion_rule) && assignment.completion_rule.mode) {
    return assignment.completion_rule;
  }

  const snapshot = getAssignmentDefinitionSnapshotFromRecord(assignment);
  return createAssignmentCompletionRule(snapshot);
};

export const getAssignmentProgressDefinition = (assignment) => {
  const snapshot = getAssignmentDefinitionSnapshotFromRecord(assignment);
  const normalizedType = normalizeTeamAssignmentType(snapshot.assignmentType);

  if (normalizedType === 'roadmap') {
    const lessonIds = Array.isArray(snapshot?.track?.requiredLessonIds) ? snapshot.track.requiredLessonIds.filter(Boolean) : [];
    return {
      assignmentType: normalizedType,
      unitLabel: 'lessons',
      requiredCount: Number(snapshot?.requiredCompletionCount || lessonIds.length || 0),
      lessonIds,
    };
  }

  if (normalizedType === 'duel_activity') {
    return {
      assignmentType: normalizedType,
      unitLabel: 'matches',
      requiredCount: clampInteger(
        snapshot?.requiredMatchCount ?? snapshot?.requiredCompletionCount,
        DUEL_ACTIVITY_MIN_TARGET,
        DUEL_ACTIVITY_MAX_TARGET
      ),
      lessonIds: [],
    };
  }

  return {
    assignmentType: 'benchmark',
    unitLabel: 'benchmarks',
    requiredCount: 1,
    language: snapshot?.benchmarkLanguage || assignment?.benchmark_language || null,
    lessonIds: [],
  };
};

export const getAssignmentScopeLabelFromSnapshot = (snapshot) => {
  const normalizedType = normalizeTeamAssignmentType(snapshot?.assignmentType);
  if (normalizedType === 'roadmap') {
    return snapshot?.track?.title || 'Roadmap';
  }
  if (normalizedType === 'duel_activity') {
    const requiredMatchCount = clampInteger(
      snapshot?.requiredMatchCount ?? snapshot?.requiredCompletionCount,
      DUEL_ACTIVITY_MIN_TARGET,
      DUEL_ACTIVITY_MAX_TARGET
    );
    return `${requiredMatchCount} duel match${requiredMatchCount === 1 ? '' : 'es'}`;
  }
  return formatBenchmarkLanguageLabel(snapshot?.benchmarkLanguage || null);
};

export const getAssignmentCompletionRuleSummary = (snapshot, completionRule) => {
  const normalizedType = normalizeTeamAssignmentType(snapshot?.assignmentType);
  if (normalizedType === 'roadmap') {
    const lessonCount = Number(snapshot?.track?.requiredLessonCount || snapshot?.requiredCompletionCount || 0);
    return `Each learner completes the ${lessonCount}-lesson roadmap snapshot captured when this assignment was created.`;
  }
  if (normalizedType === 'duel_activity') {
    const requiredMatchCount = clampInteger(
      completionRule?.requiredCount ?? snapshot?.requiredMatchCount ?? snapshot?.requiredCompletionCount,
      DUEL_ACTIVITY_MIN_TARGET,
      DUEL_ACTIVITY_MAX_TARGET
    );
    return `Each learner completes ${requiredMatchCount} finished duel match${requiredMatchCount === 1 ? '' : 'es'} after this goal starts.`;
  }
  return `Each learner completes one ${formatBenchmarkLanguageLabel(snapshot?.benchmarkLanguage || null)} benchmark after this assignment starts.`;
};

export const getAssignmentAuditSummary = (snapshot) => {
  if (!snapshot?.capturedAt) {
    return 'Snapshot not recorded';
  }

  const capturedAtLabel = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(snapshot.capturedAt));

  return snapshot.snapshotState === 'legacy_backfill'
    ? `Snapshot captured from legacy assignment data on ${capturedAtLabel}.`
    : `Definition snapshot captured on ${capturedAtLabel}.`;
};

export const getAssignmentOperationalSignal = ({
  lifecycleState,
  dueAt,
  completionRate,
  needsReviewCount,
  lastActivityAt,
  now = Date.now(),
}) => {
  if (lifecycleState === 'archived') {
    return {
      key: 'archived',
      label: 'Archived',
      nextAction: 'Restore only if this work still belongs in the active queue.',
    };
  }

  const dueAtTime = dueAt ? new Date(dueAt).getTime() : null;
  const lastActivityTime = lastActivityAt ? new Date(lastActivityAt).getTime() : null;
  const dueSoon =
    Number.isFinite(dueAtTime) && dueAtTime >= now && dueAtTime <= now + 7 * 24 * 60 * 60 * 1000;
  const isOverdue = lifecycleState === 'past_due' || (Number.isFinite(dueAtTime) && dueAtTime < now);
  const isStalled = Number.isFinite(lastActivityTime) && now - lastActivityTime >= 72 * 60 * 60 * 1000;

  if (isOverdue && Number(completionRate || 0) < 100) {
    return {
      key: 'overdue',
      label: 'Overdue',
      nextAction: 'Follow up now or move the due date if the deadline changed.',
    };
  }

  if (Number(needsReviewCount || 0) > 0) {
    return {
      key: 'awaiting_review',
      label: 'Awaiting review',
      nextAction: 'Clear the review queue before learner momentum stalls.',
    };
  }

  if (dueSoon && Number(completionRate || 0) < 100) {
    return {
      key: 'due_this_week',
      label: 'Due this week',
      nextAction: 'Push completion before the due window closes.',
    };
  }

  if (isStalled && Number(completionRate || 0) < 100) {
    return {
      key: 'stalled',
      label: 'Stalled',
      nextAction: 'Nudge the team or update the plan if the work is blocked.',
    };
  }

  return {
    key: 'active',
    label: 'Active',
    nextAction: 'No immediate intervention needed.',
  };
};
