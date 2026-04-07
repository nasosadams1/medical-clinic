import { getValidAccessToken, recoverFromSupabaseSessionError } from './supabase';

const LEADERBOARD_API_URL =
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() || "";

export function hasLeaderboardApi(): boolean {
  return Boolean(LEADERBOARD_API_URL);
}

export async function submitToLeaderboard(payload: unknown): Promise<void> {
  if (!LEADERBOARD_API_URL) return;

  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('Leaderboard submit failed: missing access token');
  }

  const res = await fetch(`${LEADERBOARD_API_URL}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const txt = await res.text().catch(() => "");
      await recoverFromSupabaseSessionError({
        status: res.status,
        message: txt || res.statusText,
      });
      throw new Error(`Leaderboard submit failed: ${res.status} ${txt}`);
    }

    const txt = await res.text().catch(() => "");
    throw new Error(`Leaderboard submit failed: ${res.status} ${txt}`);
  }
}
