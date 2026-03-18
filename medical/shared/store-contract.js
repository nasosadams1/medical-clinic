import { z } from 'zod';

export const STORE_ITEM_ID_MAX_LENGTH = 80;
export const STORE_PAYMENT_INTENT_ID_MAX_LENGTH = 200;
export const STORE_RETURN_PATH_MAX_LENGTH = 500;

export const CreatePaymentIntentSchema = z.object({
  itemId: z.string().trim().min(1).max(STORE_ITEM_ID_MAX_LENGTH),
}).strict();

export const ConfirmPaymentSchema = z.object({
  payment_intent_id: z.string().trim().min(1).max(STORE_PAYMENT_INTENT_ID_MAX_LENGTH),
}).strict();

export const CreateCheckoutSessionSchema = z.object({
  itemId: z.string().trim().min(1).max(STORE_ITEM_ID_MAX_LENGTH),
  returnPath: z
    .string()
    .trim()
    .min(1)
    .max(STORE_RETURN_PATH_MAX_LENGTH)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
      message: 'returnPath must be a relative application path.',
    }),
}).strict();

export const FinalizeCheckoutSessionSchema = z.object({
  session_id: z.string().trim().min(1).max(STORE_PAYMENT_INTENT_ID_MAX_LENGTH),
}).strict();

export const CreateCustomerPortalSessionSchema = z.object({
  returnPath: z
    .string()
    .trim()
    .min(1)
    .max(STORE_RETURN_PATH_MAX_LENGTH)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
      message: 'returnPath must be a relative application path.',
    }),
}).strict();

export const CoinPurchaseSchema = z.object({
  itemId: z.string().trim().min(1).max(STORE_ITEM_ID_MAX_LENGTH),
  requestId: z.string().uuid(),
}).strict();
