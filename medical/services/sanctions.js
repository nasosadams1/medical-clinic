export async function getActiveSanctionsForUser(supabaseAdmin, userId, scopes = ['all']) {
  if (!supabaseAdmin || !userId) return [];

  const requestedScopes = [...new Set(['all', ...scopes].filter(Boolean))];
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('duel_player_sanctions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('scope', requestedScopes)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('issued_at', { ascending: false });

  if (error) {
    console.error('Could not load sanctions:', error);
    return [];
  }

  return data || [];
}

export async function getBlockingSanction(supabaseAdmin, userId, scopes = ['all']) {
  const sanctions = await getActiveSanctionsForUser(supabaseAdmin, userId, scopes);
  return sanctions[0] || null;
}

export function formatSanctionMessage(sanction, fallback = 'Access is temporarily restricted.') {
  if (!sanction) return fallback;
  const reason = typeof sanction.reason === 'string' && sanction.reason.trim() ? sanction.reason.trim() : null;
  const scopeLabel = sanction.scope === 'progression' ? 'progression' : sanction.scope === 'duels' ? 'duels' : 'this account';
  if (reason) {
    return `Access to ${scopeLabel} is restricted: ${reason}`;
  }
  return fallback;
}