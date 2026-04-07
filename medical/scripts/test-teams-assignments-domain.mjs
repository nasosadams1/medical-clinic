import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertActiveAssignmentCapacity,
  buildAssignmentCreateRecord,
  buildAssignmentProgressByUser,
  buildDuplicatedAssignmentRecord,
  deriveDuplicatedAssignmentDueAt,
  serializeTeamAssignment,
} from '../services/teams/assignment-domain.js';
import {
  ASSIGNMENT_QUEUE_FILTER_OPTIONS,
  ASSIGNMENT_QUEUE_TABLE_COLUMNS,
  ASSIGNMENT_SUMMARY_STRIP_ITEMS,
  getAssignmentDisplayTitle,
  getAssignmentInspectorLayout,
  getAssignmentRowSupportLabel,
} from '../shared/team-assignments-ui-contract.js';
import {
  createAssignmentCompletionRule,
  createAssignmentDefinitionSnapshot,
  getAssignmentOperationalSignal,
  getTeamAssignmentAudienceLabel,
  getTeamAssignmentTypeLabel,
} from '../shared/team-assignments.js';

const capturedAt = '2026-04-07T10:00:00.000Z';

const withIdentity = (record, overrides = {}) => ({
  id: overrides.id || 'assignment-1',
  created_at: overrides.created_at || capturedAt,
  updated_at: overrides.updated_at || capturedAt,
  archived_at: overrides.archived_at || null,
  archived_by: overrides.archived_by || null,
  ...record,
  ...overrides,
});

test('cap invariant blocks create, restore, and duplicate when limit would be exceeded', () => {
  assert.doesNotThrow(() =>
    assertActiveAssignmentCapacity({
      currentActiveCount: 4,
      additionalActiveCount: 1,
      assignmentLimit: 5,
      planLabel: 'Teams Starter',
      actionLabel: 'create',
    })
  );

  assert.throws(
    () =>
      assertActiveAssignmentCapacity({
        currentActiveCount: 5,
        additionalActiveCount: 1,
        assignmentLimit: 5,
        planLabel: 'Teams Starter',
        actionLabel: 'restore',
      }),
    /before you restore another one/i
  );

  assert.throws(
    () =>
      assertActiveAssignmentCapacity({
        currentActiveCount: 4,
        additionalActiveCount: 2,
        assignmentLimit: 5,
        planLabel: 'Teams Starter',
        actionLabel: 'duplicate',
      }),
    /before you duplicate another one/i
  );
});

test('roadmap assignments freeze lesson membership inside the snapshot', () => {
  const assignment = withIdentity(
    buildAssignmentCreateRecord({
      teamId: 'team-1',
      createdByUserId: 'coach-1',
      capturedAt,
      input: {
        title: 'Python roadmap',
        description: '',
        assignmentType: 'roadmap',
        benchmarkLanguage: null,
        trackId: 'python-fundamentals',
        duelTargetCount: 3,
        dueAt: null,
      },
      metadata: {},
    }),
    {
      track_id: 'javascript-interview-prep',
    }
  );

  const progress = buildAssignmentProgressByUser({
    assignment,
    learnerMembers: [{ userId: 'learner-1' }],
    reports: [],
    lessonCompletionEvents: [
      {
        user_id: 'learner-1',
        lesson_id: 'python-functions',
        completed_at: '2026-04-08T10:00:00.000Z',
      },
    ],
    duelMatches: [],
  });

  assert.equal(progress[0].completedCount, 1);
  assert.equal(progress[0].status, 'in_progress');
  assert.equal(assignment.definition_snapshot.track.id, 'python-fundamentals');
});

test('serialized roadmap assignments expose frozen snapshot details instead of live track assumptions', () => {
  const snapshot = createAssignmentDefinitionSnapshot({
    assignmentType: 'roadmap',
    trackId: 'junior-developer-screening',
    capturedAt,
  });
  const completionRule = createAssignmentCompletionRule(snapshot);
  const assignment = withIdentity({
    team_id: 'team-1',
    title: 'Readiness roadmap',
    description: '',
    assignment_type: 'roadmap',
    benchmark_language: null,
    track_id: 'backend-problem-solving',
    audience_type: 'team_wide',
    definition_snapshot: snapshot,
    completion_rule: completionRule,
    metadata: {},
    due_at: null,
    created_by: 'coach-1',
  });

  const serialized = serializeTeamAssignment(
    assignment,
    [
      { status: 'completed', progressPercent: 100 },
      { status: 'not_started', progressPercent: 0 },
    ],
    'Coach Riley'
  );

  assert.equal(serialized.scopeLabel, 'Junior Developer Readiness');
  assert.equal(serialized.audienceLabel, 'All active learners');
  assert.equal(serialized.definitionSnapshot.track.id, 'junior-developer-screening');
  assert.match(serialized.completionRuleSummary, /roadmap snapshot/i);
});

test('duel activity goals are honest about the rule and do not rely on fake language scoping', () => {
  const assignment = withIdentity(
    buildAssignmentCreateRecord({
      teamId: 'team-1',
      createdByUserId: 'coach-1',
      capturedAt,
      input: {
        title: 'Weekly duel goal',
        description: '',
        assignmentType: 'duel_activity',
        benchmarkLanguage: null,
        trackId: null,
        duelTargetCount: 4,
        dueAt: null,
      },
      metadata: {},
    })
  );

  const duelMatches = Array.from({ length: 4 }, (_, index) => {
    const day = String(index + 8).padStart(2, '0');
    return {
    id: `match-${index + 1}`,
    player_a_id: 'learner-1',
    player_b_id: 'learner-2',
    status: 'completed',
      created_at: `2026-04-${day}T10:00:00.000Z`,
      completed_at: `2026-04-${day}T10:05:00.000Z`,
    };
  });

  const progress = buildAssignmentProgressByUser({
    assignment,
    learnerMembers: [{ userId: 'learner-1' }],
    reports: [],
    lessonCompletionEvents: [],
    duelMatches,
  });

  assert.equal(progress[0].completedCount, 4);
  assert.equal(progress[0].status, 'completed');
  assert.equal(assignment.benchmark_language, null);
  assert.equal(getTeamAssignmentTypeLabel('duel_activity'), 'Duel activity goal');
});

test('duplicate rules keep the definition, avoid stale overdue dates, and generate intentional titles', () => {
  const overdueDueAt = deriveDuplicatedAssignmentDueAt({
    sourceCreatedAt: '2026-03-01T10:00:00.000Z',
    sourceDueAt: '2026-03-03T10:00:00.000Z',
    now: '2026-04-07T10:00:00.000Z',
  });
  assert.equal(overdueDueAt, '2026-04-09T10:00:00.000Z');

  const sameDayDueAt = deriveDuplicatedAssignmentDueAt({
    sourceCreatedAt: '2026-03-01T10:00:00.000Z',
    sourceDueAt: '2026-03-01T18:00:00.000Z',
    now: '2026-04-07T10:00:00.000Z',
  });
  assert.equal(sameDayDueAt, null);

  const sourceAssignment = withIdentity(
    buildAssignmentCreateRecord({
      teamId: 'team-1',
      createdByUserId: 'coach-1',
      capturedAt: '2026-03-01T10:00:00.000Z',
      input: {
        title: 'Weekly duel goal',
        description: '',
        assignmentType: 'duel_activity',
        benchmarkLanguage: null,
        trackId: null,
        duelTargetCount: 5,
        dueAt: '2026-03-08T10:00:00.000Z',
      },
      metadata: {},
    })
  );

  const duplicate = buildDuplicatedAssignmentRecord({
    teamId: 'team-1',
    sourceAssignment,
    actorUserId: 'coach-2',
    existingAssignments: [{ title: 'Weekly duel goal' }, { title: 'Weekly duel goal (Copy)' }],
    capturedAt,
  });

  assert.equal(duplicate.title, 'Weekly duel goal (Copy 2)');
  assert.equal(duplicate.archived_at, undefined);
  assert.equal(duplicate.definition_snapshot.assignmentType, 'duel_activity');
  assert.equal(duplicate.definition_snapshot.requiredMatchCount, 5);

  const duplicateFromLegacyCopy = buildDuplicatedAssignmentRecord({
    teamId: 'team-1',
    sourceAssignment: {
      ...sourceAssignment,
      title: 'Copy of Weekly duel goal 1775323674650',
    },
    actorUserId: 'coach-2',
    existingAssignments: [
      { title: 'Weekly duel goal' },
      { title: 'Weekly duel goal (Copy)' },
      { title: 'Copy of Weekly duel goal 1775323674650' },
    ],
    capturedAt,
  });

  assert.equal(duplicateFromLegacyCopy.title, 'Weekly duel goal (Copy 2)');
});

test('operational labels stay product-honest in the queue', () => {
  assert.equal(getTeamAssignmentAudienceLabel('team_wide'), 'All active learners');

  const reviewSignal = getAssignmentOperationalSignal({
    lifecycleState: 'active',
    dueAt: '2026-04-10T10:00:00.000Z',
    completionRate: 40,
    needsReviewCount: 2,
    lastActivityAt: '2026-04-07T09:00:00.000Z',
    now: new Date('2026-04-07T10:00:00.000Z').getTime(),
  });
  assert.equal(reviewSignal.label, 'Awaiting review');

  const overdueSignal = getAssignmentOperationalSignal({
    lifecycleState: 'past_due',
    dueAt: '2026-04-01T10:00:00.000Z',
    completionRate: 50,
    needsReviewCount: 0,
    lastActivityAt: '2026-04-06T10:00:00.000Z',
    now: new Date('2026-04-07T10:00:00.000Z').getTime(),
  });
  assert.equal(overdueSignal.label, 'Overdue');
});

test('queue display helpers hide legacy copy prefixes and noisy machine suffixes', () => {
  assert.equal(
    getAssignmentDisplayTitle('Copy of Smoke workspace assignment 1775323674650'),
    'Smoke workspace assignment (Copy)'
  );
  assert.equal(
    getAssignmentDisplayTitle('Copy of Smoke workspace assignment 1775323674650 (Copy)'),
    'Smoke workspace assignment (Copy 2)'
  );
  assert.equal(
    getAssignmentDisplayTitle('Smoke workspace assignment 1775323674650'),
    'Smoke workspace assignment'
  );
  assert.equal(
    getAssignmentDisplayTitle('Smoke workspace assignment (Copy) (Copy)'),
    'Smoke workspace assignment (Copy 2)'
  );
  assert.equal(
    getAssignmentRowSupportLabel({
      isArchived: false,
      signalLabel: 'Active',
      needsReviewCount: 0,
      lastActivityLabel: '1m ago',
    }),
    'Last active 1m ago'
  );
  assert.equal(
    getAssignmentInspectorLayout({
      viewportWidth: 1520,
      rowCount: 8,
      detailContentWeight: 2,
    }),
    'side'
  );
  assert.equal(
    getAssignmentInspectorLayout({
      viewportWidth: 1320,
      rowCount: 8,
      detailContentWeight: 2,
    }),
    'bottom'
  );
  assert.equal(
    getAssignmentInspectorLayout({
      viewportWidth: 1520,
      rowCount: 3,
      detailContentWeight: 4,
    }),
    'bottom'
  );
});

test('queue IA contract stays queue-first and single-purpose', () => {
  assert.deepEqual(
    ASSIGNMENT_QUEUE_FILTER_OPTIONS.map((option) => option.label),
    ['All work', 'Needs action', 'Awaiting review', 'Overdue', 'Due this week', 'Stalled', 'Active', 'Archived']
  );

  assert.deepEqual([...ASSIGNMENT_QUEUE_TABLE_COLUMNS], ['Assignment', 'Audience', 'Due', 'Status', 'Progress', 'Action']);
  assert.deepEqual(
    ASSIGNMENT_SUMMARY_STRIP_ITEMS.map((item) => item.label),
    ['Needs action', 'Awaiting review', 'Overdue', 'Due this week', 'Stalled']
  );
});
