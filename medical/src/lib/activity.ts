import { buildApiUrl, isApiNetworkError } from './apiBase';
import { supabase } from './supabase';

export type ActivityHeartbeatReason = 'bootstrap' | 'interaction' | 'focus' | 'interval' | 'hidden';
export type ActivityVisibilityState = 'visible' | 'hidden';

interface ActivityHeartbeatPayload {
  path: string;
  reason: ActivityHeartbeatReason;
  visibilityState: ActivityVisibilityState;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function sendActivityHeartbeat(payload: ActivityHeartbeatPayload) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('You must be signed in to update activity.');
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl('/api/activity/heartbeat'), {
      method: 'POST',
      keepalive: payload.visibilityState === 'hidden',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the activity service right now.');
    }

    throw error;
  }

  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((responsePayload as { error?: string }).error || 'Activity heartbeat failed.');
  }

  return responsePayload as {
    presence: {
      userId: string;
      lastSeenAt: string;
      lastActiveAt: string | null;
      activeSessionExpiresAt: string | null;
      lastPath: string | null;
      visibilityState: ActivityVisibilityState;
      lastReason: ActivityHeartbeatReason | null;
      isCurrentlyActive: boolean;
    };
  };
}
