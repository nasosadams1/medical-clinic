import { getStoreItem, isPlanStoreItem } from '../../shared/store-catalog.js';
import { supabase } from './supabase';

export type SelfServePlanId = 'pro_monthly' | 'interview_sprint';

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
}

const PRICING_PLAN_TO_PRODUCT_ID: Record<string, SelfServePlanId> = {
  Pro: 'pro_monthly',
  'Interview Sprint': 'interview_sprint',
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

export async function listPlanEntitlements(): Promise<PlanEntitlement[]> {
  const { data, error } = await supabase
    .from('plan_entitlements')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapEntitlement(row as Record<string, any>));
}
