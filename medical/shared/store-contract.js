import { z } from 'zod';

export const STORE_ITEM_ID_MAX_LENGTH = 80;
export const STORE_PAYMENT_INTENT_ID_MAX_LENGTH = 200;

export const CreatePaymentIntentSchema = z.object({
  itemId: z.string().trim().min(1).max(STORE_ITEM_ID_MAX_LENGTH),
}).strict();

export const ConfirmPaymentSchema = z.object({
  payment_intent_id: z.string().trim().min(1).max(STORE_PAYMENT_INTENT_ID_MAX_LENGTH),
}).strict();

export const CoinPurchaseSchema = z.object({
  itemId: z.string().trim().min(1).max(STORE_ITEM_ID_MAX_LENGTH),
  requestId: z.string().uuid(),
}).strict();
