import { supabase } from './supabase';

const LEADERBOARD_API_URL =
  (import.meta.env.VITE_LEADERBOARD_API_URL as string | undefined)?.trim() || "";

export function hasLeaderboardApi(): boolean {
  return Boolean(LEADERBOARD_API_URL);
}

export async function submitToLeaderboard(payload: unknown): Promise<void> {
  if (!LEADERBOARD_API_URL) return;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

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
    const txt = await res.text().catch(() => "");
    throw new Error(`Leaderboard submit failed: ${res.status} ${txt}`);
  }
}
