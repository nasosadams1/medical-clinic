import { getStoreItem, isPlanStoreItem } from '../../shared/store-catalog.js';
import { isApiNetworkError, resolveApiBaseUrl } from './apiBase';
import { getValidAccessToken, recoverFromSupabaseSessionError } from './supabase';

export type SelfServePlanId =
  | 'pro_monthly'
  | 'interview_sprint'
  | 'teams_monthly'
  | 'teams_growth_monthly';
const resolveStripeServerUrl = () =>
  (import.meta.env.VITE_STRIPE_SERVER_URL as string | undefined)?.trim() || resolveApiBaseUrl();

export interface PlanEntitlement {
  id: string;
  userId: string;
  itemId: string;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'refunded';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  purchaseCount: number;
  lastPaymentIntentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface PlanStoreProduct {
  id: SelfServePlanId;
  kind: 'plan';
  name: string;
  description: string;
  stripeAmountCents: number;
  currency: string;
  durationDays: number;
  planName: string;
  planScope: string;
  billingMode?: 'subscription' | 'fixed_term';
  billingInterval?: 'day' | 'week' | 'month' | 'year';
  billingIntervalCount?: number;
}

const PRICING_PLAN_TO_PRODUCT_ID: Record<string, SelfServePlanId> = {
  Pro: 'pro_monthly',
  'Interview Sprint': 'interview_sprint',
  Teams: 'teams_monthly',
  'Teams Growth': 'teams_growth_monthly',
};

const mapEntitlement = (row: Record<string, any>): PlanEntitlement => {
  const currentPeriodEnd = String(row.current_period_end || '');

  return {
    id: String(row.id),
    userId: String(row.user_id),
    itemId: String(row.item_id),
    planName: String(row.plan_name),
    status: row.status,
    currentPeriodStart: String(row.current_period_start),
    currentPeriodEnd,
    purchaseCount: Number(row.purchase_count || 0),
    lastPaymentIntentId: row.last_payment_intent_id ? String(row.last_payment_intent_id) : null,
    metadata: typeof row.metadata === 'object' && row.metadata ? row.metadata : {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    isActive: row.status === 'active' && currentPeriodEnd.length > 0 && new Date(currentPeriodEnd).getTime() > Date.now(),
  };
};

export function getSelfServePlanProductById(planId: SelfServePlanId): PlanStoreProduct | null {
  const product = getStoreItem(planId);
  if (!product || !isPlanStoreItem(product)) {
    return null;
  }

  return product as PlanStoreProduct;
}

export function getSelfServePlanProductByPlanName(planName: string): PlanStoreProduct | null {
  const productId = PRICING_PLAN_TO_PRODUCT_ID[planName];
  return productId ? getSelfServePlanProductById(productId) : null;
}

export function isRecurringPlanProduct(product: PlanStoreProduct | null | undefined): boolean {
  return Boolean(product && product.billingMode === 'subscription');
}

export function isRecurringPlanEntitlement(entitlement: PlanEntitlement | null | undefined): boolean {
  return entitlement?.metadata?.billing_mode === 'subscription';
}

export function isAdminOverridePlanEntitlement(entitlement: PlanEntitlement | null | undefined): boolean {
  return entitlement?.metadata?.admin_override === true;
}

export function shouldDisplayPlanRenewalDate(entitlement: PlanEntitlement | null | undefined): boolean {
  return Boolean(entitlement?.currentPeriodEnd) && !isAdminOverridePlanEntitlement(entitlement);
}

export function formatPlanRenewalDate(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function formatPlanAccessWindowLabel(entitlement: PlanEntitlement | null | undefined) {
  if (!shouldDisplayPlanRenewalDate(entitlement)) {
    return null;
  }

  const formattedDate = formatPlanRenewalDate(entitlement?.currentPeriodEnd);
  if (!formattedDate) {
    return null;
  }

  return isRecurringPlanEntitlement(entitlement) ? `renews on ${formattedDate}` : `active through ${formattedDate}`;
}

export async function listPlanEntitlements(): Promise<PlanEntitlement[]> {
  const payload = (await authorizedBillingFetch('/api/billing/entitlements', {
    method: 'GET',
  })) as { entitlements?: Array<Record<string, any>> };

  return (payload.entitlements || []).map((row) => mapEntitlement(row));
}

async function getAccessToken() {
  return getValidAccessToken();
}

async function authorizedBillingFetch(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('You must be signed in to manage billing.');
  }

  let response: Response;
  try {
    response = await fetch(`${resolveStripeServerUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the billing service right now.');
    }

    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await recoverFromSupabaseSessionError({
        status: response.status,
        message: (payload as { error?: string }).error || response.statusText,
      });
    }
    throw new Error((payload as { error?: string }).error || 'Billing request failed.');
  }

  return payload;
}

export async function createPlanCheckoutSession(planId: SelfServePlanId, returnPath = '/pricing') {
  return authorizedBillingFetch('/api/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      itemId: planId,
      returnPath,
    }),
  }) as Promise<{ url: string; sessionId: string }>;
}

export async function finalizePlanCheckoutSession(sessionId: string) {
  return authorizedBillingFetch('/api/finalize-checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
    }),
  }) as Promise<{
    success: boolean;
    entitlement: PlanEntitlement;
  }>;
}

export async function createCustomerPortalSession(returnPath = '/pricing') {
  return authorizedBillingFetch('/api/create-customer-portal-session', {
    method: 'POST',
    body: JSON.stringify({
      returnPath,
    }),
  }) as Promise<{ url: string }>;
}
