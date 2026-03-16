import { supabase } from './supabase';
import { resolveApiBaseUrl } from './apiBase';

const STORE_SERVER_URL =
  (import.meta.env.VITE_STRIPE_SERVER_URL as string | undefined)?.trim() ||
  resolveApiBaseUrl();

export interface StorePurchaseResponse {
  success: boolean;
  itemId: string;
  itemKind: string;
  alreadyProcessed: boolean;
  profile: {
    coins: number;
    hearts: number;
    xpBoostMultiplier: number;
    xpBoostExpiresAt: number;
    unlimitedHeartsExpiresAt: number;
  };
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to make store purchases.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function purchaseStoreItem(itemId: string): Promise<StorePurchaseResponse> {
  const response = await fetch(`${STORE_SERVER_URL}/api/store/purchase`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ itemId, requestId: crypto.randomUUID() }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Store purchase failed.');
  }

  return payload as StorePurchaseResponse;
}
