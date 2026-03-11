const SANCTION_SCOPES = new Set(['duels', 'progression', 'all']);
const SANCTION_ACTIONS = new Set(['suspend', 'review_hold', 'watch']);

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeString = (value, maxLength = 512) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;

const clampCounter = (value) => Math.max(0, Math.floor(safeNumber(value, 0)));
const nowIso = () => new Date().toISOString();
const distinct = (items) => [...new Set(items.filter(Boolean))];

const appendModerationNote = (baseNote, nextNote) => {
  const normalizedBase = safeString(baseNote, 4000);
  const normalizedNext = safeString(nextNote, 2000);
  if (!normalizedNext) return normalizedBase;
  if (!normalizedBase) return normalizedNext;
  return `${normalizedBase}\n\n${normalizedNext}`;
};

const getCasePlayers = (entry) => {
  const playerEvidence = entry?.evidence?.players || {};
  const playerA = playerEvidence.playerA || {};
  const playerB = playerEvidence.playerB || {};
  const playerIds = distinct([playerA.userId, playerB.userId]);

  return {
    playerIds,
    playerA,
    playerB,
  };
};

const buildFingerprintParts = (entry) => {
  const { playerIds, playerA, playerB } = getCasePlayers(entry);
  const flags = distinct(safeArray(entry?.evidence?.flags));
  const sameDevice = flags.includes('same_device_cluster');
  const sameIpExact = flags.includes('same_ip_exact');
  const sameIpPrefix = flags.includes('same_ip_prefix');
  const deviceClusterId =
    sameDevice && playerA?.session?.deviceClusterId && playerA.session.deviceClusterId === playerB?.session?.deviceClusterId
      ? playerA.session.deviceClusterId
      : null;
  const ipPrefix =
    playerA?.session?.ipPrefix && playerA.session.ipPrefix === playerB?.session?.ipPrefix
      ? playerA.session.ipPrefix
      : null;

  const evidenceType = deviceClusterId
    ? `device:${deviceClusterId}`
    : sameIpExact && playerA?.session?.ipAddress && playerA.session.ipAddress === playerB?.session?.ipAddress
      ? `ip:${playerA.session.ipAddress}`
      : sameIpPrefix && ipPrefix
        ? `prefix:${ipPrefix}`
        : 'pair';

  return {
    playerIds,
    flags,
    deviceClusterId,
    ipPrefix,
    evidenceType,
  };
};

export function deriveCaseCluster(entry) {
  if (!entry?.id) return null;

  const { playerIds, flags, deviceClusterId, ipPrefix, evidenceType } = buildFingerprintParts(entry);
  if (playerIds.length === 0) return null;

  const fingerprint =
    evidenceType === 'pair'
      ? `pair:${playerIds.sort().join('|')}`
      : `${evidenceType}|${playerIds.sort().join('|')}`;

  const headlineNames = [entry?.evidence?.players?.playerA?.username, entry?.evidence?.players?.playerB?.username]
    .map((value) => safeString(value, 80))
    .filter(Boolean)
    .join(' / ');

  const summaryBase = headlineNames || playerIds.join(' / ');
  const evidenceSummary = deviceClusterId
    ? 'shared device cluster'
    : ipPrefix
      ? `shared network prefix ${ipPrefix}`
      : 'repeated player pairing';

  return {
    fingerprint,
    summary: `Clustered integrity review for ${summaryBase} (${evidenceSummary}).`,
    metadata: {
      playerIds,
      sharedDeviceClusterId: deviceClusterId,
      sharedIpPrefix: ipPrefix,
      seedFlags: flags,
    },
  };
}

async function maybeSingle(query, errorMessage) {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || errorMessage);
  }
  return data ?? null;
}

export async function assignCaseCluster(supabaseAdmin, entry) {
  if (!supabaseAdmin || !entry?.id) return null;

  const cluster = deriveCaseCluster(entry);
  if (!cluster) return null;

  const insertedCluster = await maybeSingle(
    supabaseAdmin
      .from('anti_cheat_case_clusters')
      .upsert(
        {
          fingerprint: cluster.fingerprint,
          summary: cluster.summary,
          metadata: cluster.metadata,
          updated_at: nowIso(),
        },
        { onConflict: 'fingerprint' }
      )
      .select('*')
      .single(),
    'Could not upsert anti-cheat cluster.'
  );

  if (!insertedCluster?.id) {
    return null;
  }

  const { error: caseUpdateError } = await supabaseAdmin
    .from('anti_cheat_cases')
    .update({ cluster_id: insertedCluster.id })
    .eq('id', entry.id);

  if (caseUpdateError) {
    console.error('Could not assign anti-cheat cluster to case:', caseUpdateError);
  }

  return insertedCluster;
}

export async function loadClusterMap(supabaseAdmin, clusterIds) {
  const ids = distinct(clusterIds);
  if (!supabaseAdmin || ids.length === 0) return new Map();

  const clusters = await maybeSingle(
    supabaseAdmin
      .from('anti_cheat_case_clusters')
      .select('*')
      .in('id', ids),
    'Could not load anti-cheat clusters.'
  );

  const clusterCases = await maybeSingle(
    supabaseAdmin
      .from('anti_cheat_cases')
      .select('id, match_id, cluster_id, status, risk_score, summary, created_at')
      .in('cluster_id', ids)
      .order('created_at', { ascending: false }),
    'Could not load anti-cheat cluster cases.'
  );

  const casesByClusterId = new Map();
  safeArray(clusterCases).forEach((entry) => {
    const bucket = casesByClusterId.get(entry.cluster_id) || [];
    bucket.push(entry);
    casesByClusterId.set(entry.cluster_id, bucket);
  });

  return new Map(
    safeArray(clusters).map((cluster) => {
      const relatedCases = casesByClusterId.get(cluster.id) || [];
      return [
        cluster.id,
        {
          ...cluster,
          case_count: relatedCases.length,
          related_cases: relatedCases.slice(0, 8),
        },
      ];
    })
  );
}

async function loadCaseAndMatch(supabaseAdmin, caseId) {
  const caseRow = await maybeSingle(
    supabaseAdmin.from('anti_cheat_cases').select('*').eq('id', caseId).single(),
    'Could not load anti-cheat case.'
  );
  if (!caseRow?.match_id) {
    throw new Error('Case does not have an associated match.');
  }

  const matchRow = await maybeSingle(
    supabaseAdmin.from('matches').select('*').eq('id', caseRow.match_id).single(),
    'Could not load duel match.'
  );

  return { caseRow, matchRow };
}

const buildCounterAdjustment = (value, delta) => clampCounter(safeNumber(value, 0) + delta);

const buildRollbackPatch = ({ currentUser, matchRow, side }) => {
  const sidePrefix = side === 'playerA' ? 'player_a' : 'player_b';
  const opponentPrefix = side === 'playerA' ? 'player_b' : 'player_a';
  const ratingChange = safeNumber(matchRow?.[`${sidePrefix}_rating_change`], 0);
  const subratingField = safeString(matchRow?.[`${sidePrefix}_subrating_field`], 80);
  const subratingChange = safeNumber(matchRow?.[`${sidePrefix}_subrating_change`], 0);
  const userId = currentUser?.id || matchRow?.[`${sidePrefix}_id`];
  const opponentId = matchRow?.[`${opponentPrefix}_id`];
  const winnerId = matchRow?.winner_id || null;
  const isDraw = !winnerId;

  const patch = {
    rating: Math.max(300, safeNumber(currentUser?.rating, 500) - ratingChange),
    updated_at: nowIso(),
  };

  if (subratingField && Object.prototype.hasOwnProperty.call(currentUser || {}, subratingField)) {
    patch[subratingField] = Math.max(300, safeNumber(currentUser?.[subratingField], patch.rating) - subratingChange);
  }

  if (winnerId && userId) {
    if (winnerId === userId) {
      patch.wins = buildCounterAdjustment(currentUser?.wins, -1);
    } else if (winnerId === opponentId) {
      patch.losses = buildCounterAdjustment(currentUser?.losses, -1);
    }
  } else if (isDraw) {
    patch.draws = buildCounterAdjustment(currentUser?.draws, -1);
  }

  if (currentUser?.matches_played != null) {
    patch.matches_played = buildCounterAdjustment(currentUser.matches_played, -1);
  }
  if (currentUser?.total_matches != null) {
    patch.total_matches = buildCounterAdjustment(currentUser.total_matches, -1);
  }
  if (currentUser?.games_played != null) {
    patch.games_played = buildCounterAdjustment(currentUser.games_played, -1);
  }

  return patch;
};

async function maybeResolveCase(supabaseAdmin, caseId, actorUserId, note) {
  const patch = {
    status: 'resolved',
    reviewed_by: actorUserId,
    reviewed_at: nowIso(),
  };
  if (safeString(note, 1000)) {
    patch.resolution_note = safeString(note, 1000);
  }

  const { error } = await supabaseAdmin
    .from('anti_cheat_cases')
    .update(patch)
    .eq('id', caseId);

  if (error) {
    console.error('Could not mark anti-cheat case reviewed:', error);
  }
}

export async function invalidateMatchForCase(supabaseAdmin, { caseId, actorUserId, reason, note, rollbackRatings = true }) {
  const { caseRow, matchRow } = await loadCaseAndMatch(supabaseAdmin, caseId);
  const invalidationReason = safeString(reason, 300) || safeString(caseRow.summary, 300) || 'Match invalidated after moderation review.';
  const nextNote = appendModerationNote(matchRow?.moderation_note, note);

  const updatedMatch = await maybeSingle(
    supabaseAdmin
      .from('matches')
      .update({
        integrity_status: 'invalidated',
        invalidation_reason: invalidationReason,
        invalidated_at: nowIso(),
        invalidated_by: actorUserId,
        moderation_note: nextNote,
      })
      .eq('id', matchRow.id)
      .select('*')
      .single(),
    'Could not invalidate duel match.'
  );

  await maybeResolveCase(supabaseAdmin, caseId, actorUserId, note);

  let rollbackResult = null;
  if (rollbackRatings) {
    rollbackResult = await rollbackRatingsForCase(supabaseAdmin, {
      caseId,
      actorUserId,
      note: appendModerationNote(note, `Rollback triggered during match invalidation for ${matchRow.id}.`),
      skipCaseResolution: true,
    });
  }

  await supabaseAdmin.from('anti_cheat_case_events').insert({
    case_id: caseId,
    actor_user_id: actorUserId,
    action: 'match_invalidated',
    details: {
      reason: invalidationReason,
      note: safeString(note, 1000),
      rollback_ratings: Boolean(rollbackRatings),
    },
  });

  return {
    caseId,
    match: updatedMatch,
    rollback: rollbackResult,
  };
}

export async function rollbackRatingsForCase(
  supabaseAdmin,
  { caseId, actorUserId, note, skipCaseResolution = false }
) {
  const { matchRow } = await loadCaseAndMatch(supabaseAdmin, caseId);

  if (matchRow?.rating_reverted_at) {
    return {
      already_reverted: true,
      match: matchRow,
    };
  }

  const playerIds = distinct([matchRow.player_a_id, matchRow.player_b_id]);
  const duelUsers = await maybeSingle(
    supabaseAdmin.from('duel_users').select('*').in('id', playerIds),
    'Could not load duel users for rollback.'
  );

  const duelUsersById = new Map(safeArray(duelUsers).map((entry) => [entry.id, entry]));
  const playerA = duelUsersById.get(matchRow.player_a_id) || { id: matchRow.player_a_id, rating: matchRow.player_a_rating_after ?? 500 };
  const playerB = duelUsersById.get(matchRow.player_b_id) || { id: matchRow.player_b_id, rating: matchRow.player_b_rating_after ?? 500 };

  const playerAPatch = buildRollbackPatch({ currentUser: playerA, matchRow, side: 'playerA' });
  const playerBPatch = buildRollbackPatch({ currentUser: playerB, matchRow, side: 'playerB' });

  const [updatedPlayerA, updatedPlayerB, updatedMatch] = await Promise.all([
    maybeSingle(
      supabaseAdmin
        .from('duel_users')
        .update(playerAPatch)
        .eq('id', playerA.id)
        .select('*')
        .single(),
      'Could not rollback player A rating.'
    ),
    maybeSingle(
      supabaseAdmin
        .from('duel_users')
        .update(playerBPatch)
        .eq('id', playerB.id)
        .select('*')
        .single(),
      'Could not rollback player B rating.'
    ),
    maybeSingle(
      supabaseAdmin
        .from('matches')
        .update({
          rating_reverted_at: nowIso(),
          rating_reverted_by: actorUserId,
          moderation_note: appendModerationNote(matchRow?.moderation_note, note),
        })
        .eq('id', matchRow.id)
        .select('*')
        .single(),
      'Could not mark duel match rollback.'
    ),
  ]);

  if (!skipCaseResolution) {
    await maybeResolveCase(supabaseAdmin, caseId, actorUserId, note);
  }

  await supabaseAdmin.from('anti_cheat_case_events').insert({
    case_id: caseId,
    actor_user_id: actorUserId,
    action: 'rating_rollback',
    details: {
      note: safeString(note, 1000),
      player_a_rating_change: safeNumber(matchRow.player_a_rating_change, 0),
      player_b_rating_change: safeNumber(matchRow.player_b_rating_change, 0),
    },
  });

  return {
    already_reverted: false,
    match: updatedMatch,
    players: {
      playerA: updatedPlayerA,
      playerB: updatedPlayerB,
    },
  };
}

const resolveSanctionTargets = (matchRow, target) => {
  const normalizedTarget = safeString(target, 40);
  if (normalizedTarget === 'player_a') return distinct([matchRow.player_a_id]);
  if (normalizedTarget === 'player_b') return distinct([matchRow.player_b_id]);
  if (normalizedTarget === 'both') return distinct([matchRow.player_a_id, matchRow.player_b_id]);
  return [];
};

export async function issueSanctionForCase(
  supabaseAdmin,
  {
    caseId,
    actorUserId,
    scope = 'duels',
    action = 'suspend',
    reason,
    note,
    target,
    durationHours = null,
  }
) {
  const normalizedScope = SANCTION_SCOPES.has(scope) ? scope : 'duels';
  const normalizedAction = SANCTION_ACTIONS.has(action) ? action : 'suspend';
  const sanctionReason = safeString(reason, 500) || 'Integrity investigation sanction.';
  const { caseRow, matchRow } = await loadCaseAndMatch(supabaseAdmin, caseId);
  const targetUserIds = resolveSanctionTargets(matchRow, target);
  if (targetUserIds.length === 0) {
    throw new Error('Could not determine sanction target.');
  }

  const expiresAt =
    durationHours != null && Number.isFinite(Number(durationHours)) && Number(durationHours) > 0
      ? new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000).toISOString()
      : null;

  const sanctionRows = targetUserIds.map((userId) => ({
    user_id: userId,
    scope: normalizedScope,
    action: normalizedAction,
    reason: sanctionReason,
    metadata: {
      note: safeString(note, 1000),
      target,
      source_case_id: caseRow.id,
      source_match_id: matchRow.id,
    },
    case_id: caseRow.id,
    match_id: matchRow.id,
    issued_by: actorUserId,
    expires_at: expiresAt,
  }));

  const inserted = await maybeSingle(
    supabaseAdmin
      .from('duel_player_sanctions')
      .insert(sanctionRows)
      .select('*'),
    'Could not issue duel sanctions.'
  );

  await maybeResolveCase(supabaseAdmin, caseId, actorUserId, note);

  await supabaseAdmin.from('anti_cheat_case_events').insert({
    case_id: caseId,
    actor_user_id: actorUserId,
    action: 'sanction_issued',
    details: {
      scope: normalizedScope,
      action: normalizedAction,
      reason: sanctionReason,
      target,
      duration_hours: durationHours,
      user_ids: targetUserIds,
    },
  });

  return {
    sanctions: safeArray(inserted),
  };
}



