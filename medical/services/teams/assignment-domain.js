import { getTeamPlanPolicyFromSeatLimit } from '../../shared/team-plan-policy.js';
import {
  TEAM_ASSIGNMENT_AUDIENCE_LABEL,
  clampInteger,
  createAssignmentCompletionRule,
  createAssignmentDefinitionSnapshot,
  DUEL_ACTIVITY_DEFAULT_TARGET,
  DUEL_ACTIVITY_MAX_TARGET,
  DUEL_ACTIVITY_MIN_TARGET,
  getAssignmentCompletionRuleFromRecord,
  getAssignmentCompletionRuleSummary,
  getAssignmentDefinitionSnapshotFromRecord,
  getAssignmentProgressDefinition,
  getAssignmentScopeLabelFromSnapshot,
  getTeamAssignmentAudienceLabel,
  MATCH_COMPLETION_STATUSES,
  normalizeTeamAssignmentType,
} from '../../shared/team-assignments.js';

const isValidDateInput = (value) => {
  if (!value) return true;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const getNormalizedMetadata = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const getDuelTargetCount = (assignment, inputValue) => {
  if (inputValue !== undefined) {
    return clampInteger(inputValue, DUEL_ACTIVITY_MIN_TARGET, DUEL_ACTIVITY_MAX_TARGET);
  }

  const snapshot = getAssignmentDefinitionSnapshotFromRecord(assignment);
  const metadata = getNormalizedMetadata(assignment?.metadata);
  return clampInteger(
    snapshot?.requiredMatchCount ??
      metadata.duelTargetCount ??
      metadata.requiredChallengeCount ??
      DUEL_ACTIVITY_DEFAULT_TARGET,
    DUEL_ACTIVITY_MIN_TARGET,
    DUEL_ACTIVITY_MAX_TARGET
  );
};

export const ensureAssignmentPayloadIsValid = (payload) => {
  const normalizedType = normalizeTeamAssignmentType(payload.assignmentType);
  const isLegacyChallengeInput = String(payload.assignmentType || '').trim().toLowerCase() === 'challenge_pack';

  if (!isValidDateInput(payload.dueAt)) {
    throw new Error('Assignment due date is invalid.');
  }

  if (normalizedType === 'roadmap') {
    if (!payload.trackId) {
      throw new Error('Roadmap assignments require a track.');
    }
    if (payload.benchmarkLanguage) {
      throw new Error('Roadmap assignments cannot also set a benchmark language.');
    }
    return;
  }

  if (normalizedType === 'duel_activity') {
    if (payload.trackId) {
      throw new Error('Duel activity goals cannot include a roadmap track.');
    }

    if (payload.benchmarkLanguage && !isLegacyChallengeInput) {
      throw new Error('Duel activity goals do not support a language filter.');
    }

    return;
  }

  if (!payload.benchmarkLanguage) {
    throw new Error('Benchmark assignments require a language.');
  }

  if (payload.trackId) {
    throw new Error('Only roadmap assignments can include a track.');
  }
};

export const buildAssignmentPersistenceFields = ({
  assignmentType,
  benchmarkLanguage,
  trackId,
  duelTargetCount,
  metadata = {},
  capturedAt,
  snapshot,
  completionRule,
}) => {
  const normalizedType = normalizeTeamAssignmentType(assignmentType);
  const nextSnapshot =
    snapshot ||
    createAssignmentDefinitionSnapshot({
      assignmentType: normalizedType,
      benchmarkLanguage,
      trackId,
      duelTargetCount,
      capturedAt,
      snapshotState: 'captured',
    });
  const nextCompletionRule = completionRule || createAssignmentCompletionRule(nextSnapshot);
  const nextMetadata = {
    ...getNormalizedMetadata(metadata),
    duelTargetCount:
      normalizedType === 'duel_activity'
        ? clampInteger(
            nextSnapshot.requiredMatchCount ?? duelTargetCount,
            DUEL_ACTIVITY_MIN_TARGET,
            DUEL_ACTIVITY_MAX_TARGET
          )
        : undefined,
    requiredChallengeCount:
      normalizedType === 'duel_activity'
        ? clampInteger(
            nextSnapshot.requiredMatchCount ?? duelTargetCount,
            DUEL_ACTIVITY_MIN_TARGET,
            DUEL_ACTIVITY_MAX_TARGET
          )
        : undefined,
  };

  return {
    assignment_type: normalizedType,
    benchmark_language: normalizedType === 'benchmark' ? benchmarkLanguage : null,
    track_id: normalizedType === 'roadmap' ? nextSnapshot?.track?.id || trackId || null : null,
    audience_type: 'team_wide',
    definition_snapshot: nextSnapshot,
    completion_rule: nextCompletionRule,
    metadata: nextMetadata,
  };
};

export const buildAssignmentCreateRecord = ({ teamId, createdByUserId, input, metadata = {}, capturedAt }) => ({
  team_id: teamId,
  title: input.title,
  description: input.description,
  due_at: input.dueAt,
  created_by: createdByUserId,
  ...buildAssignmentPersistenceFields({
    assignmentType: input.assignmentType,
    benchmarkLanguage: input.benchmarkLanguage,
    trackId: input.trackId,
    duelTargetCount: input.duelTargetCount,
    metadata,
    capturedAt,
  }),
});

export const buildAssignmentUpdateRecord = ({ existingAssignment, input, actorUserId, capturedAt }) => {
  const snapshot = getAssignmentDefinitionSnapshotFromRecord(existingAssignment);
  const normalizedType = normalizeTeamAssignmentType(input.assignmentType ?? existingAssignment.assignment_type);
  const nextBenchmarkLanguage =
    input.benchmarkLanguage !== undefined
      ? input.benchmarkLanguage
      : normalizedType === 'benchmark'
      ? snapshot?.benchmarkLanguage || existingAssignment.benchmark_language || null
      : null;
  const nextTrackId =
    input.trackId !== undefined
      ? input.trackId
      : normalizedType === 'roadmap'
      ? snapshot?.track?.id || existingAssignment.track_id || null
      : null;
  const nextDuelTargetCount = getDuelTargetCount(existingAssignment, input.duelTargetCount);
  const shouldRefreshDefinition =
    input.assignmentType !== undefined ||
    input.benchmarkLanguage !== undefined ||
    input.trackId !== undefined ||
    input.duelTargetCount !== undefined ||
    !existingAssignment?.audience_type ||
    !existingAssignment?.definition_snapshot ||
    !existingAssignment?.completion_rule;

  const updatePayload = {};

  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.dueAt !== undefined) updatePayload.due_at = input.dueAt;

  if (input.archived !== undefined) {
    updatePayload.archived_at = input.archived ? capturedAt : null;
    updatePayload.archived_by = input.archived ? actorUserId : null;
  }

  if (shouldRefreshDefinition) {
    Object.assign(
      updatePayload,
      buildAssignmentPersistenceFields({
        assignmentType: normalizedType,
        benchmarkLanguage: nextBenchmarkLanguage,
        trackId: nextTrackId,
        duelTargetCount: nextDuelTargetCount,
        metadata: existingAssignment.metadata,
        capturedAt: capturedAt || existingAssignment.updated_at || existingAssignment.created_at,
      })
    );
  }

  return updatePayload;
};

export const getAssignmentLifecycleState = (assignment) => {
  if (assignment?.archived_at) {
    return 'archived';
  }

  if (assignment?.due_at) {
    const dueAt = new Date(assignment.due_at).getTime();
    if (Number.isFinite(dueAt) && dueAt < Date.now()) {
      return 'past_due';
    }
  }

  return 'active';
};

export const serializeTeamAssignment = (assignment, learnerProgress, createdByName = null) => {
  const lifecycleState = getAssignmentLifecycleState(assignment);
  const eligibleLearnerCount = learnerProgress.length;
  const completedLearnerCount = learnerProgress.filter((entry) => entry.status === 'completed').length;
  const inProgressLearnerCount = learnerProgress.filter((entry) => entry.status === 'in_progress').length;
  const notStartedLearnerCount = learnerProgress.filter((entry) => entry.status === 'not_started').length;
  const completionRate = eligibleLearnerCount > 0 ? Math.round((completedLearnerCount / eligibleLearnerCount) * 100) : 0;
  const averageProgressPercent =
    eligibleLearnerCount > 0
      ? Math.round(learnerProgress.reduce((total, entry) => total + entry.progressPercent, 0) / eligibleLearnerCount)
      : 0;
  const definitionSnapshot = getAssignmentDefinitionSnapshotFromRecord(assignment);
  const completionRule = getAssignmentCompletionRuleFromRecord(assignment);
  const progressDefinition = getAssignmentProgressDefinition(assignment);
  const audienceType = assignment.audience_type || 'team_wide';

  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    assignmentType: normalizeTeamAssignmentType(assignment.assignment_type),
    status: lifecycleState === 'archived' ? 'archived' : 'active',
    benchmarkLanguage: definitionSnapshot?.benchmarkLanguage || assignment.benchmark_language || null,
    trackId: definitionSnapshot?.track?.id || assignment.track_id || null,
    dueAt: assignment.due_at,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at || assignment.created_at,
    createdByUserId: assignment.created_by || null,
    createdByName: createdByName || null,
    lifecycleState,
    archivedAt: assignment.archived_at || null,
    archivedByUserId: assignment.archived_by || null,
    audienceType,
    audienceLabel: getTeamAssignmentAudienceLabel(audienceType),
    eligibleLearnerCount,
    completedLearnerCount,
    inProgressLearnerCount,
    notStartedLearnerCount,
    completionRate,
    averageProgressPercent,
    requiredCompletionCount: progressDefinition.requiredCount,
    progressUnitLabel: progressDefinition.unitLabel,
    scopeLabel: getAssignmentScopeLabelFromSnapshot(definitionSnapshot),
    definitionSnapshot,
    completionRule,
    completionRuleSummary: getAssignmentCompletionRuleSummary(definitionSnapshot, completionRule),
    metadata: assignment.metadata || {},
  };
};

export const buildAssignmentProgressByUser = ({
  assignment,
  learnerMembers,
  reports,
  lessonCompletionEvents,
  duelMatches,
}) => {
  const assignmentCreatedAt = new Date(assignment.created_at).getTime();
  const reportsByUser = new Map();
  const lessonEventsByUser = new Map();
  const matchesByUser = new Map();

  (reports || []).forEach((report) => {
    const existing = reportsByUser.get(report.user_id) || [];
    existing.push(report);
    reportsByUser.set(report.user_id, existing);
  });

  (lessonCompletionEvents || []).forEach((entry) => {
    const existing = lessonEventsByUser.get(entry.user_id) || [];
    existing.push(entry);
    lessonEventsByUser.set(entry.user_id, existing);
  });

  (duelMatches || []).forEach((match) => {
    const normalizedStatus = String(match.status || '').trim().toLowerCase();
    if (!MATCH_COMPLETION_STATUSES.has(normalizedStatus)) {
      return;
    }

    const completionTimestamp = new Date(match.completed_at || match.ended_at || match.created_at || '').getTime();
    if (!Number.isFinite(completionTimestamp) || completionTimestamp < assignmentCreatedAt) {
      return;
    }

    [match.player_a_id, match.player_b_id]
      .filter(Boolean)
      .forEach((userId) => {
        const existing = matchesByUser.get(userId) || [];
        existing.push(match);
        matchesByUser.set(userId, existing);
      });
  });

  const progressDefinition = getAssignmentProgressDefinition(assignment);

  return learnerMembers.map((member) => {
    const normalizedType = progressDefinition.assignmentType;
    let completedCount = 0;
    let requiredCount = progressDefinition.requiredCount;
    let completedAt = null;

    if (normalizedType === 'benchmark') {
      const matchingReports = (reportsByUser.get(member.userId) || []).filter((report) => {
        const createdAt = new Date(report.created_at).getTime();
        if (!Number.isFinite(createdAt) || createdAt < assignmentCreatedAt) {
          return false;
        }

        if (!assignment.benchmark_language && !progressDefinition.language) {
          return true;
        }

        const expectedLanguage = progressDefinition.language || assignment.benchmark_language;
        return report.language === expectedLanguage;
      });

      completedCount = matchingReports.length > 0 ? 1 : 0;
      completedAt =
        matchingReports.length > 0
          ? [...matchingReports]
              .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())[0]?.created_at || null
          : null;
    } else if (normalizedType === 'roadmap') {
      const lessonIds = progressDefinition.lessonIds;
      const matchingCompletions = (lessonEventsByUser.get(member.userId) || []).filter((entry) => {
        const completedAtTime = new Date(entry.completed_at).getTime();
        return Number.isFinite(completedAtTime) && completedAtTime >= assignmentCreatedAt && lessonIds.includes(entry.lesson_id);
      });
      const completedLessonIds = Array.from(new Set(matchingCompletions.map((entry) => entry.lesson_id)));
      completedCount = completedLessonIds.length;
      completedAt =
        completedCount >= requiredCount && requiredCount > 0
          ? matchingCompletions
              .map((entry) => entry.completed_at)
              .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null
          : null;
    } else {
      const completedMatches = matchesByUser.get(member.userId) || [];
      completedCount = completedMatches.length;
      completedAt =
        completedMatches.length > 0
          ? [...completedMatches]
              .map((match) => match.completed_at || match.ended_at || match.created_at)
              .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null
          : null;
    }

    const cappedCompletedCount = requiredCount > 0 ? Math.min(completedCount, requiredCount) : 0;
    const progressPercent =
      requiredCount > 0 ? Math.round((cappedCompletedCount / Math.max(1, requiredCount)) * 100) : 0;
    const status =
      cappedCompletedCount >= requiredCount && requiredCount > 0
        ? 'completed'
        : cappedCompletedCount > 0
        ? 'in_progress'
        : 'not_started';

    return {
      userId: member.userId,
      status,
      progressPercent,
      completedCount: cappedCompletedCount,
      requiredCount,
      completedAt,
    };
  });
};

export const ensureTeamAssignmentCapacityAvailable = async ({
  supabaseAdmin,
  teamId,
  additionalActiveCount = 0,
  actionLabel = 'create',
}) => {
  if (Number(additionalActiveCount || 0) <= 0) {
    return null;
  }

  const { data: teamSummary, error: teamSummaryError } = await supabaseAdmin
    .from('skill_teams')
    .select('id, seat_limit')
    .eq('id', teamId)
    .single();

  if (teamSummaryError || !teamSummary) {
    throw new Error(teamSummaryError?.message || 'Could not load team plan limits.');
  }

  const teamPolicy = getTeamPlanPolicyFromSeatLimit(teamSummary.seat_limit);
  const { count: assignmentCount, error: assignmentCountError } = await supabaseAdmin
    .from('skill_team_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .is('archived_at', null);

  if (assignmentCountError) {
    throw new Error(assignmentCountError.message || 'Could not validate assignment limits.');
  }

  assertActiveAssignmentCapacity({
    currentActiveCount: Number(assignmentCount || 0),
    additionalActiveCount,
    assignmentLimit: teamPolicy.assignmentLimit,
    planLabel: teamPolicy.label,
    actionLabel,
  });

  return teamPolicy;
};

export const assertActiveAssignmentCapacity = ({
  currentActiveCount,
  additionalActiveCount = 0,
  assignmentLimit,
  planLabel = 'This plan',
  actionLabel = 'create',
}) => {
  if (Number(currentActiveCount || 0) + Number(additionalActiveCount || 0) > Number(assignmentLimit || 0)) {
    throw new Error(
      `${planLabel} allows up to ${assignmentLimit} active assignments per team. Archive an active item before you ${actionLabel} another one.`
    );
  }

  return true;
};

export const deriveDuplicatedAssignmentDueAt = ({ sourceCreatedAt, sourceDueAt, now = new Date() }) => {
  if (!sourceDueAt || !sourceCreatedAt) {
    return null;
  }

  const createdAtMs = new Date(sourceCreatedAt).getTime();
  const dueAtMs = new Date(sourceDueAt).getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(dueAtMs)) {
    return null;
  }

  const leadTimeMs = dueAtMs - createdAtMs;
  if (!Number.isFinite(leadTimeMs) || leadTimeMs < 24 * 60 * 60 * 1000) {
    return null;
  }

  return new Date(new Date(now).getTime() + leadTimeMs).toISOString();
};

const getDuplicateTitleStem = (sourceTitle) => {
  let normalizedTitle = String(sourceTitle || '').trim() || 'Untitled assignment';
  normalizedTitle = normalizedTitle.replace(/^Copy of\s+/i, '').trim();
  normalizedTitle = normalizedTitle.replace(/\s+\d{8,}(?=\s*(?:\(|$))/u, '').trim();

  for (;;) {
    const suffixMatch = normalizedTitle.match(/\s+\(copy(?:\s+(\d+))?\)$/i);
    if (!suffixMatch) break;
    normalizedTitle = normalizedTitle.slice(0, suffixMatch.index).trim();
  }

  return normalizedTitle || 'Untitled assignment';
};

const getCanonicalDuplicateTitle = (title) => {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) return 'untitled assignment';

  const titleStem = getDuplicateTitleStem(normalizedTitle);
  let copyCount = /^Copy of\s+/i.test(normalizedTitle) ? 1 : 0;
  let workingTitle = normalizedTitle.replace(/^Copy of\s+/i, '').trim();

  for (;;) {
    const suffixMatch = workingTitle.match(/\s+\(copy(?:\s+(\d+))?\)$/i);
    if (!suffixMatch) break;

    copyCount += Number(suffixMatch[1] || 1);
    workingTitle = workingTitle.slice(0, suffixMatch.index).trim();
  }

  if (copyCount <= 0) return titleStem.toLowerCase();
  if (copyCount === 1) return `${titleStem} (copy)`.toLowerCase();
  return `${titleStem} (copy ${copyCount})`.toLowerCase();
};

const buildDuplicatedAssignmentTitle = (sourceTitle, existingTitles) => {
  const normalizedExistingTitles = new Set((existingTitles || []).map((title) => getCanonicalDuplicateTitle(title)));
  const titleStem = getDuplicateTitleStem(sourceTitle);
  const baseTitle = `${titleStem} (Copy)`;

  if (!normalizedExistingTitles.has(getCanonicalDuplicateTitle(baseTitle))) {
    return baseTitle;
  }

  let attempt = 2;
  for (;;) {
    const nextTitle = `${titleStem} (Copy ${attempt})`;
    if (!normalizedExistingTitles.has(getCanonicalDuplicateTitle(nextTitle))) {
      return nextTitle;
    }
    attempt += 1;
  }
};

export const buildDuplicatedAssignmentRecord = ({
  teamId,
  sourceAssignment,
  actorUserId,
  existingAssignments,
  capturedAt,
}) => {
  const sourceSnapshot = getAssignmentDefinitionSnapshotFromRecord(sourceAssignment);
  const nextSnapshot = {
    ...sourceSnapshot,
    snapshotState: 'captured',
    capturedAt: capturedAt || new Date().toISOString(),
  };
  const completionRule = createAssignmentCompletionRule(nextSnapshot);
  const nextTitle = buildDuplicatedAssignmentTitle(
    sourceAssignment.title,
    (existingAssignments || []).map((assignment) => assignment.title)
  );
  const nextDueAt = deriveDuplicatedAssignmentDueAt({
    sourceCreatedAt: sourceAssignment.created_at,
    sourceDueAt: sourceAssignment.due_at,
    now: capturedAt || new Date().toISOString(),
  });

  return {
    team_id: teamId,
    title: nextTitle,
    description: sourceAssignment.description || '',
    due_at: nextDueAt,
    created_by: actorUserId,
    ...buildAssignmentPersistenceFields({
      assignmentType: sourceSnapshot.assignmentType,
      benchmarkLanguage: sourceSnapshot.benchmarkLanguage || null,
      trackId: sourceSnapshot?.track?.id || null,
      duelTargetCount: sourceSnapshot.requiredMatchCount ?? sourceSnapshot.requiredCompletionCount,
      metadata: {
        ...getNormalizedMetadata(sourceAssignment.metadata),
        duplicatedFromAssignmentId: sourceAssignment.id,
        seeded: false,
      },
      capturedAt,
      snapshot: nextSnapshot,
      completionRule,
    }),
  };
};

export const TEAM_WIDE_AUDIENCE_LABEL = TEAM_ASSIGNMENT_AUDIENCE_LABEL;
