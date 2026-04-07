import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  createAssignmentCompletionRule,
  getAssignmentDefinitionSnapshotFromRecord,
  normalizeTeamAssignmentType,
} from '../shared/team-assignments.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });
dotenv.config({ path: path.join(rootDir, '.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: assignments, error } = await supabaseAdmin
  .from('skill_team_assignments')
  .select('id, assignment_type, benchmark_language, track_id, metadata, created_at, definition_snapshot, completion_rule')
  .order('created_at', { ascending: true });

if (error) {
  throw new Error(error.message || 'Could not load team assignments for snapshot backfill.');
}

let updatedCount = 0;

for (const assignment of assignments || []) {
  const snapshot = getAssignmentDefinitionSnapshotFromRecord(assignment);
  const completionRule = createAssignmentCompletionRule(snapshot);
  const normalizedType = normalizeTeamAssignmentType(assignment.assignment_type);
  const hasStoredSnapshot =
    assignment.definition_snapshot &&
    typeof assignment.definition_snapshot === 'object' &&
    assignment.definition_snapshot.snapshotVersion;
  const hasStoredCompletionRule =
    assignment.completion_rule &&
    typeof assignment.completion_rule === 'object' &&
    assignment.completion_rule.mode;

  const needsUpdate =
    assignment.assignment_type !== normalizedType ||
    !hasStoredSnapshot ||
    !hasStoredCompletionRule;

  if (!needsUpdate) {
    continue;
  }

  const { error: updateError } = await supabaseAdmin
    .from('skill_team_assignments')
    .update({
      assignment_type: normalizedType,
      audience_type: 'team_wide',
      definition_snapshot: snapshot,
      completion_rule: completionRule,
      benchmark_language: normalizedType === 'benchmark' ? snapshot.benchmarkLanguage : null,
      track_id: normalizedType === 'roadmap' ? snapshot.track.id : null,
      metadata: {
        ...(assignment.metadata && typeof assignment.metadata === 'object' ? assignment.metadata : {}),
        duelTargetCount:
          normalizedType === 'duel_activity'
            ? snapshot.requiredMatchCount || snapshot.requiredCompletionCount || 3
            : undefined,
        requiredChallengeCount:
          normalizedType === 'duel_activity'
            ? snapshot.requiredMatchCount || snapshot.requiredCompletionCount || 3
            : undefined,
      },
    })
    .eq('id', assignment.id);

  if (updateError) {
    throw new Error(updateError.message || `Could not update assignment ${assignment.id}.`);
  }

  updatedCount += 1;
}

console.log(`[teams] assignment snapshot backfill complete: ${updatedCount} row(s) updated`);
