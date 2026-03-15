const DEFAULT_QUEUE_RANGE = {
  baseRange: 75,
  maxRange: 350,
  rangeGrowPerSec: 2,
};

const SHARED_STATE_RETRY_COOLDOWN_MS = 15_000;
const MAX_SHARED_STATE_ERROR_MESSAGE_LENGTH = 240;

const nowIso = () => new Date().toISOString();
const uniqueUserIds = (userIds) => [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean))];

const compactSharedStateError = (error) => {
  if (!error || typeof error !== 'object') return error;

  const compact = { ...error };
  if (typeof compact.message === 'string') {
    compact.message = compact.message.replace(/\s+/g, ' ').trim().slice(0, MAX_SHARED_STATE_ERROR_MESSAGE_LENGTH);
  }

  return compact;
};

export class SharedDuelStateStore {
  constructor(supabase, instanceId) {
    this.supabase = supabase;
    this.instanceId = instanceId;
    this.retryCooldowns = new Map();
    this.logCooldowns = new Map();
  }

  static isEnabled(supabase) {
    return Boolean(supabase && (process.env.DUEL_SHARED_STATE_MODE || 'database').toLowerCase() !== 'memory');
  }

  _isRetryCooldownActive(key) {
    return Number(this.retryCooldowns.get(key) || 0) > Date.now();
  }

  _markRetryCooldown(key, durationMs = SHARED_STATE_RETRY_COOLDOWN_MS) {
    this.retryCooldowns.set(key, Date.now() + durationMs);
  }

  _clearRetryCooldown(key) {
    this.retryCooldowns.delete(key);
  }

  _logWithCooldown(key, message, error, durationMs = SHARED_STATE_RETRY_COOLDOWN_MS) {
    const cooldownUntil = Number(this.logCooldowns.get(key) || 0);
    if (cooldownUntil > Date.now()) {
      return;
    }

    this.logCooldowns.set(key, Date.now() + durationMs);
    console.error(message, compactSharedStateError(error));
  }

  async upsertPresence(player) {
    if (!this.supabase || !player?.userId) return;

    const row = {
      user_id: player.userId,
      username: player.username || 'Player',
      socket_id: player.socketId || null,
      server_instance_id: this.instanceId,
      match_type: player.matchType || 'ranked',
      rating: Number(player.rating) || 500,
      session_evidence: player.sessionEvidence || null,
      connection_risk_flags: Array.isArray(player.connectionRiskFlags) ? player.connectionRiskFlags : [],
      connected_at: nowIso(),
      updated_at: nowIso(),
    };

    if (Object.prototype.hasOwnProperty.call(player, 'activeMatchId')) {
      row.active_match_id = player.activeMatchId || null;
    }

    const { error } = await this.supabase.from('duel_runtime_presence').upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.error('Could not upsert duel runtime presence:', error);
    }
  }

  async getPresence(userId) {
    if (!this.supabase || !userId) return null;
    const { data, error } = await this.supabase
      .from('duel_runtime_presence')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Could not load duel runtime presence:', error);
      return null;
    }

    return data || null;
  }

  async setPresenceActiveMatch(userIds, matchId) {
    const ids = uniqueUserIds(userIds);
    if (!this.supabase || ids.length === 0) return;

    const { error } = await this.supabase
      .from('duel_runtime_presence')
      .update({ active_match_id: matchId || null, updated_at: nowIso() })
      .in('user_id', ids);

    if (error) {
      console.error('Could not set active duel runtime match on presence:', error);
    }
  }

  async clearPresenceActiveMatch(userIds) {
    return this.setPresenceActiveMatch(userIds, null);
  }

  async removePresence(userId) {
    if (!this.supabase || !userId) return;
    const { error } = await this.supabase.from('duel_runtime_presence').delete().eq('user_id', userId);
    if (error) {
      console.error('Could not remove duel runtime presence:', error);
    }
  }

  async enqueuePlayer(player) {
    if (!this.supabase || !player?.userId) return;

    const row = {
      user_id: player.userId,
      username: player.username || 'Player',
      rating: Number(player.rating) || 500,
      socket_id: player.socketId || null,
      server_instance_id: this.instanceId,
      session_evidence: player.sessionEvidence || null,
      connection_risk_flags: Array.isArray(player.connectionRiskFlags) ? player.connectionRiskFlags : [],
      match_type: player.matchType || 'ranked',
      joined_at: new Date(player.joinedAt || Date.now()).toISOString(),
      updated_at: nowIso(),
    };

    const { error } = await this.supabase.from('duel_matchmaking_queue').upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.error('Could not enqueue duel player:', error);
      throw error;
    }
  }

  async removeFromQueue(userId) {
    if (!this.supabase || !userId) return;
    const { error } = await this.supabase.from('duel_matchmaking_queue').delete().eq('user_id', userId);
    if (error) {
      console.error('Could not remove duel player from queue:', error);
    }
  }

  async isQueued(userId, matchType = null) {
    if (!this.supabase || !userId) return false;
    let query = this.supabase.from('duel_matchmaking_queue').select('user_id').eq('user_id', userId);
    if (matchType) {
      query = query.eq('match_type', matchType);
    }
    const { data, error } = await query.limit(1);
    if (error) {
      console.error('Could not check duel queue status:', error);
      return false;
    }
    return Boolean(data?.length);
  }

  async listQueue(matchType) {
    if (!this.supabase) return [];
    if (this._isRetryCooldownActive('list_queue')) return [];

    const { data, error } = await this.supabase
      .from('duel_matchmaking_queue')
      .select('*')
      .eq('match_type', matchType)
      .order('joined_at', { ascending: true });

    if (error) {
      this._markRetryCooldown('list_queue');
      this._logWithCooldown('list_queue', 'Could not load shared duel queue. Retrying in 15s.', error);
      return [];
    }

    this._clearRetryCooldown('list_queue');
    return data || [];
  }

  async countPresence() {
    if (!this.supabase) return 0;
    if (this._isRetryCooldownActive('count_presence')) return 0;

    const { count, error } = await this.supabase
      .from('duel_runtime_presence')
      .select('user_id', { count: 'exact', head: true });

    if (error) {
      this._markRetryCooldown('count_presence');
      this._logWithCooldown('count_presence', 'Could not count duel runtime presence. Retrying in 15s.', error);
      return 0;
    }

    this._clearRetryCooldown('count_presence');
    return Number(count) || 0;
  }

  async claimMatchPair(matchType, options = {}) {
    if (!this.supabase) return null;
    if (this._isRetryCooldownActive('claim_match_pair')) return null;

    const settings = {
      ...DEFAULT_QUEUE_RANGE,
      ...options,
    };

    const { data, error } = await this.supabase.rpc('claim_duel_matchmaking_pair', {
      p_match_type: matchType,
      p_server_instance_id: this.instanceId,
      p_base_range: settings.baseRange,
      p_max_range: settings.maxRange,
      p_range_grow_per_sec: settings.rangeGrowPerSec,
    });

    if (error) {
      this._markRetryCooldown('claim_match_pair');
      this._logWithCooldown('claim_match_pair', 'Could not claim duel matchmaking pair. Retrying in 15s.', error);
      return null;
    }

    this._clearRetryCooldown('claim_match_pair');
    return data || null;
  }

  async upsertRuntimeMatch(matchId, payload) {
    if (!this.supabase || !matchId) return;
    const row = {
      match_id: matchId,
      owner_instance_id: this.instanceId,
      status: payload.status || 'UNKNOWN',
      state: payload.state || {},
      lease_expires_at: payload.leaseExpiresAt || new Date(Date.now() + 30_000).toISOString(),
      updated_at: nowIso(),
      player_a_user_id: payload.playerAUserId || null,
      player_b_user_id: payload.playerBUserId || null,
      match_type: payload.matchType || null,
      difficulty: payload.difficulty || null,
      problem_id: payload.problemId || null,
    };

    const { error } = await this.supabase.from('duel_runtime_matches').upsert(row, { onConflict: 'match_id' });

    if (error) {
      console.error('Could not upsert duel runtime match:', error);
    }
  }

  async getRuntimeMatch(matchId) {
    if (!this.supabase || !matchId) return null;
    const { data, error } = await this.supabase
      .from('duel_runtime_matches')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();

    if (error) {
      console.error('Could not load duel runtime match:', error);
      return null;
    }

    return data || null;
  }

  async getRuntimeMatchForUser(userId) {
    if (!this.supabase || !userId) return null;
    const { data, error } = await this.supabase
      .from('duel_runtime_matches')
      .select('*')
      .neq('status', 'FINISHED')
      .or(`player_a_user_id.eq.${userId},player_b_user_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Could not load duel runtime match for user:', error);
      return null;
    }

    return data || null;
  }

  async removeRuntimeMatch(matchId) {
    if (!this.supabase || !matchId) return;
    const { error } = await this.supabase.from('duel_runtime_matches').delete().eq('match_id', matchId);
    if (error) {
      console.error('Could not remove duel runtime match:', error);
    }
  }

  async dispatchRuntimeMessage(targetInstanceId, messageType, payload = {}, targetUserId = null, delayMs = 0) {
    if (!this.supabase || !targetInstanceId || !messageType) return;

    const availableAt = new Date(Date.now() + Math.max(0, Number(delayMs) || 0)).toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await this.supabase.from('duel_runtime_messages').insert({
      target_instance_id: targetInstanceId,
      target_user_id: targetUserId || null,
      message_type: messageType,
      payload,
      available_at: availableAt,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Could not dispatch duel runtime message:', error);
    }
  }

  async dispatchSocketEventToUser(userId, event, payload) {
    const presence = await this.getPresence(userId);
    if (!presence?.server_instance_id || presence.server_instance_id === this.instanceId) {
      return false;
    }

    await this.dispatchRuntimeMessage(
      presence.server_instance_id,
      'socket_event',
      { userId, event, payload },
      userId,
    );
    return true;
  }

  async consumeRuntimeMessages(limit = 50) {
    if (!this.supabase) return [];
    if (this._isRetryCooldownActive('consume_runtime_messages')) return [];

    const now = nowIso();
    const { data, error } = await this.supabase
      .from('duel_runtime_messages')
      .select('*')
      .eq('target_instance_id', this.instanceId)
      .is('delivered_at', null)
      .lte('available_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      this._markRetryCooldown('consume_runtime_messages');
      this._logWithCooldown(
        'consume_runtime_messages',
        'Could not consume duel runtime messages. Retrying in 15s.',
        error
      );
      return [];
    }

    this._clearRetryCooldown('consume_runtime_messages');
    return data || [];
  }

  async markRuntimeMessageDelivered(messageId) {
    if (!this.supabase || !messageId) return;
    const { error } = await this.supabase
      .from('duel_runtime_messages')
      .update({ delivered_at: nowIso(), updated_at: nowIso() })
      .eq('id', messageId);

    if (error) {
      console.error('Could not mark duel runtime message delivered:', error);
    }
  }
}
