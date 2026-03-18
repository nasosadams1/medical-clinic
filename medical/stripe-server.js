import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  getStoreItem,
  isCoinStoreItem,
  isPlanStoreItem,
  isStripeStoreItem,
  isSubscriptionPlanStoreItem,
  STORE_ITEMS,
  STRIPE_STORE_ITEMS,
} from './shared/store-catalog.js';
import { formatAllowedOriginsError, isAllowedOrigin, resolveAllowedOrigins } from './services/allowed-origins.js';
import {
  CoinPurchaseSchema,
  ConfirmPaymentSchema,
  CreateCheckoutSessionSchema,
  CreateCustomerPortalSessionSchema,
  CreatePaymentIntentSchema,
  FinalizeCheckoutSessionSchema,
} from './shared/store-contract.js';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SERVER_PORT = Number(process.env.STRIPE_SERVER_PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const API_JSON_LIMIT = process.env.STRIPE_API_JSON_LIMIT || '10mb';
const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';
const STRIPE_ALLOWED_ORIGIN_ENV_KEYS = ['STRIPE_ALLOWED_ORIGINS', 'FRONTEND_URL', 'RENDER_EXTERNAL_URL'];
const { origins: allowedOrigins, sourceEnv: allowedOriginsSourceEnv } = resolveAllowedOrigins(STRIPE_ALLOWED_ORIGIN_ENV_KEYS, {
  isProduction: IS_PRODUCTION,
});

const stripeConfigValid = typeof STRIPE_SECRET_KEY === 'string'
  && (STRIPE_SECRET_KEY.startsWith('sk_test_') || STRIPE_SECRET_KEY.startsWith('sk_live_'));
const supabaseConfigValid = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!stripeConfigValid) {
  console.error('Invalid STRIPE_SECRET_KEY. Expected sk_test_... or sk_live_...');
}

if (!supabaseConfigValid) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for store fulfillment.');
}

if (IS_PRODUCTION && allowedOrigins.length === 0) {
  console.error(formatAllowedOriginsError('Stripe store server', STRIPE_ALLOWED_ORIGIN_ENV_KEYS));
  process.exit(1);
}

const stripe = stripeConfigValid ? new Stripe(STRIPE_SECRET_KEY) : null;
const supabaseAdmin = supabaseConfigValid
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const app = express();
app.set('trust proxy', 1);

function createLimiter({ max, windowMs, label }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
    handler: (_req, res) => {
      res.status(429).json({ error: `${label} rate limit exceeded. Please try again shortly.` });
    },
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: 'Missing authorization token.' };
  }

  if (!supabaseAdmin) {
    return { user: null, error: 'Store server is not configured for Supabase.' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired session token.' };
  }

  return { user: data.user, error: null };
}

function validateProductForPaymentIntent(paymentIntent, product) {
  if (!product || !isStripeStoreItem(product)) {
    throw new Error('Payment intent metadata is missing a valid store item.');
  }

  if (paymentIntent.amount !== product.stripeAmountCents) {
    throw new Error('Payment intent amount does not match the configured store item.');
  }

  if ((paymentIntent.currency || '').toLowerCase() !== product.currency) {
    throw new Error('Payment intent currency does not match the configured store item.');
  }

  if (paymentIntent.metadata?.itemId !== product.id) {
    throw new Error('Payment intent item metadata is invalid.');
  }

  if (paymentIntent.metadata?.productKind !== product.kind) {
    throw new Error('Payment intent product metadata is invalid.');
  }

  if (product.kind === 'coin_pack' && String(paymentIntent.metadata?.coins || '') !== String(product.coinsGranted)) {
    throw new Error('Payment intent coin metadata is invalid.');
  }

  if (product.kind === 'plan') {
    if ((paymentIntent.metadata?.planName || '') !== product.planName) {
      throw new Error('Payment intent plan metadata is invalid.');
    }

    if (String(paymentIntent.metadata?.durationDays || '') !== String(product.durationDays)) {
      throw new Error('Payment intent plan duration metadata is invalid.');
    }
  }
}

function getPublicCatalog() {
  return STORE_ITEMS.map((item) => ({
    id: item.id,
    source: item.source,
    kind: item.kind,
    name: item.name,
    description: item.description,
    coinsGranted: item.coinsGranted || null,
    coinCost: item.coinCost || null,
    durationHours: item.durationHours || null,
    durationDays: item.durationDays || null,
    billingMode: item.billingMode || null,
    billingInterval: item.billingInterval || null,
    billingIntervalCount: item.billingIntervalCount || null,
    multiplier: item.multiplier || null,
    planName: item.planName || null,
    planScope: item.planScope || null,
    stripeAmountCents: item.stripeAmountCents || null,
    currency: item.currency || null,
    bonusPercent: item.bonusPercent || 0,
    popular: Boolean(item.popular),
    bestValue: Boolean(item.bestValue),
  }));
}

function isRelativeReturnPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function buildAppReturnUrl(req, returnPath, fallbackPath = '/pricing') {
  const rawOrigin =
    (typeof req.headers.origin === 'string' && req.headers.origin.trim()) ||
    (process.env.FRONTEND_URL || '').trim() ||
    (process.env.RENDER_EXTERNAL_URL || '').trim();

  if (!rawOrigin) {
    throw new Error('Could not determine the frontend origin for Stripe redirects.');
  }

  const safePath = isRelativeReturnPath(returnPath) ? returnPath : fallbackPath;
  return new URL(safePath, rawOrigin).toString();
}

function appendQueryParams(url, params) {
  const nextUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    nextUrl.searchParams.set(key, String(value));
  });
  return nextUrl.toString();
}

function mapStripeSubscriptionStatus(subscription) {
  switch (subscription?.status) {
    case 'active':
    case 'trialing':
    case 'past_due':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'incomplete_expired':
    case 'unpaid':
      return 'expired';
    default:
      return subscription?.ended_at ? 'cancelled' : 'active';
  }
}

function resolveStripeSubscriptionPeriod(subscription) {
  const startSeconds = Number(subscription?.current_period_start || 0);
  const endSeconds = Number(subscription?.current_period_end || 0);

  return {
    currentPeriodStart: startSeconds > 0 ? new Date(startSeconds * 1000).toISOString() : new Date().toISOString(),
    currentPeriodEnd: endSeconds > 0 ? new Date(endSeconds * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function syncStripeSubscriptionEntitlement({
  userId,
  itemId,
  planName,
  customerId,
  subscriptionId,
  priceId,
  subscription,
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase store fulfillment is not configured.');
  }

  if (!userId || !itemId || !planName || !subscriptionId) {
    throw new Error('Subscription sync is missing required metadata.');
  }

  const { currentPeriodStart, currentPeriodEnd } = resolveStripeSubscriptionPeriod(subscription);
  const nextStatus = mapStripeSubscriptionStatus(subscription);
  const nextMetadata = {
    billing_mode: 'subscription',
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId || null,
    stripe_status: subscription?.status || null,
    cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    updated_from: 'stripe_subscription',
    updated_at: new Date().toISOString(),
  };

  const { data: existingRow, error: existingRowError } = await supabaseAdmin
    .from('plan_entitlements')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existingRowError) {
    throw new Error(existingRowError.message || 'Could not load the existing plan entitlement.');
  }

  if (existingRow) {
    const { data, error } = await supabaseAdmin
      .from('plan_entitlements')
      .update({
        plan_name: planName,
        status: nextStatus,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        purchase_count: Math.max(Number(existingRow.purchase_count || 1), 1),
        metadata: {
          ...(typeof existingRow.metadata === 'object' && existingRow.metadata ? existingRow.metadata : {}),
          ...nextMetadata,
        },
      })
      .eq('id', existingRow.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not update the recurring plan entitlement.');
    }

    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('plan_entitlements')
    .insert({
      user_id: userId,
      item_id: itemId,
      plan_name: planName,
      status: nextStatus,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      purchase_count: 1,
      metadata: nextMetadata,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not create the recurring plan entitlement.');
  }

  return data;
}

async function syncEntitlementFromStripeSubscription(subscription, overrides = {}) {
  if (!subscription) {
    throw new Error('Stripe subscription payload is required.');
  }

  const userId = overrides.userId || subscription.metadata?.userId || '';
  const itemId = overrides.itemId || subscription.metadata?.itemId || '';
  const planName = overrides.planName || subscription.metadata?.planName || '';
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const subscriptionId = subscription.id;
  const priceId = subscription.items?.data?.[0]?.price?.id || null;

  return syncStripeSubscriptionEntitlement({
    userId,
    itemId,
    planName,
    customerId,
    subscriptionId,
    priceId,
    subscription,
  });
}

function mapCoinPurchaseError(error) {
  const message = String(error?.message || error || 'STORE_PURCHASE_FAILED');

  if (message.includes('INSUFFICIENT_COINS')) {
    return { status: 409, message: 'Not enough coins for this purchase.' };
  }

  if (message.includes('HEARTS_ALREADY_FULL')) {
    return { status: 409, message: 'Your hearts are already full.' };
  }

  if (message.includes('USER_PROFILE_NOT_FOUND')) {
    return { status: 404, message: 'User profile not found.' };
  }

  if (message.includes('INVALID_')) {
    return { status: 400, message: 'Invalid store purchase request.' };
  }

  return { status: 500, message: 'Store purchase failed.' };
}

async function fulfillCoinPurchase(paymentIntent) {
  const itemId = paymentIntent.metadata?.itemId;
  const userId = paymentIntent.metadata?.userId;
  const product = getStoreItem(itemId);

  if (!userId) {
    throw new Error('Payment intent metadata is missing userId.');
  }

  validateProductForPaymentIntent(paymentIntent, product);

  if (!supabaseAdmin) {
    throw new Error('Store server is not configured for Supabase.');
  }

  const { data, error } = await supabaseAdmin.rpc('fulfill_store_coin_pack', {
    p_user_id: userId,
    p_payment_intent_id: paymentIntent.id,
    p_item_id: product.id,
    p_coins: product.coinsGranted,
    p_amount_cents: product.stripeAmountCents,
    p_currency: product.currency,
  });

  if (error) {
    throw new Error(`Failed to fulfill store coin pack: ${error.message}`);
  }

  if (stripe) {
    try {
      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: {
          ...paymentIntent.metadata,
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: 'stripe-server',
        },
      });
    } catch (metadataError) {
      console.warn('Payment fulfilled but Stripe metadata update failed:', metadataError.message || metadataError);
    }
  }

  return {
    alreadyFulfilled: Boolean(data?.alreadyFulfilled),
    kind: 'coin_pack',
    coinsGranted: Number(data?.coinsGranted || product.coinsGranted || 0),
    coins: Number(data?.coins || 0),
    totalCoinsEarned: Number(data?.totalCoinsEarned || 0),
    itemId: product.id,
    userId,
  };
}

async function fulfillPlanPurchase(paymentIntent) {
  const itemId = paymentIntent.metadata?.itemId;
  const userId = paymentIntent.metadata?.userId;
  const product = getStoreItem(itemId);

  if (!userId) {
    throw new Error('Payment intent metadata is missing userId.');
  }

  if (!product || !isPlanStoreItem(product)) {
    throw new Error('Payment intent metadata is missing a valid plan item.');
  }

  validateProductForPaymentIntent(paymentIntent, product);

  if (!supabaseAdmin) {
    throw new Error('Store server is not configured for Supabase.');
  }

  const { data, error } = await supabaseAdmin.rpc('fulfill_plan_purchase', {
    p_user_id: userId,
    p_payment_intent_id: paymentIntent.id,
    p_item_id: product.id,
    p_plan_name: product.planName,
    p_amount_cents: product.stripeAmountCents,
    p_currency: product.currency,
    p_duration_days: product.durationDays,
  });

  if (error) {
    throw new Error(`Failed to fulfill plan purchase: ${error.message}`);
  }

  if (stripe) {
    try {
      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: {
          ...paymentIntent.metadata,
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: 'stripe-server',
        },
      });
    } catch (metadataError) {
      console.warn('Plan payment fulfilled but Stripe metadata update failed:', metadataError.message || metadataError);
    }
  }

  return {
    alreadyFulfilled: Boolean(data?.alreadyFulfilled),
    kind: 'plan',
    itemId: product.id,
    planId: product.id,
    planName: product.planName,
    status: String(data?.status || 'active'),
    currentPeriodStart: data?.currentPeriodStart || null,
    currentPeriodEnd: data?.currentPeriodEnd || null,
    purchaseCount: Number(data?.purchaseCount || 1),
    userId,
  };
}

async function fulfillStripeProduct(paymentIntent) {
  const product = getStoreItem(paymentIntent.metadata?.itemId);

  if (product && isPlanStoreItem(product)) {
    return fulfillPlanPurchase(paymentIntent);
  }

  return fulfillCoinPurchase(paymentIntent);
}

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || Array.isArray(sig)) {
    return res.status(400).send('Missing or invalid Stripe signature');
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on this server.' });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET not set - webhook verification disabled');
    return res.status(200).json({ received: true, verified: false });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription =
            typeof session.subscription === 'string'
              ? await stripe.subscriptions.retrieve(session.subscription)
              : session.subscription;

          await syncEntitlementFromStripeSubscription(subscription, {
            userId: session.client_reference_id || session.metadata?.userId,
            itemId: session.metadata?.itemId,
            planName: session.metadata?.planName,
          });
          console.log('Stripe subscription checkout synced:', session.id);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncEntitlementFromStripeSubscription(event.data.object);
        console.log('Stripe subscription entitlement synced:', event.data.object.id, event.type);
        break;
      }
      case 'payment_intent.succeeded': {
        const result = await fulfillStripeProduct(event.data.object);
        console.log('Stripe payment fulfilled via webhook:', event.data.object.id, result);
        break;
      }
      case 'payment_intent.payment_failed':
        console.log('Store payment failed:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled Stripe event type ${event.type}`);
    }

    return res.json({ received: true, verified: true });
  } catch (error) {
    console.error('Webhook processing failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin, allowedOrigins, IS_PRODUCTION)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by store server CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: API_JSON_LIMIT }));

const paymentIntentLimiter = createLimiter({ max: 10, windowMs: 10 * 60 * 1000, label: 'Payment intent' });
const paymentConfirmLimiter = createLimiter({ max: 20, windowMs: 10 * 60 * 1000, label: 'Payment confirmation' });
const storePurchaseLimiter = createLimiter({ max: 20, windowMs: 5 * 60 * 1000, label: 'Store purchase' });
const checkoutSessionLimiter = createLimiter({ max: 10, windowMs: 10 * 60 * 1000, label: 'Checkout session' });
const billingPortalLimiter = createLimiter({ max: 10, windowMs: 10 * 60 * 1000, label: 'Billing portal' });

app.get('/health', (_req, res) => {
  res.json({
    status: stripeConfigValid && supabaseConfigValid ? 'ok' : 'degraded',
    service: 'stripe-store-server',
    stripeConfigured: stripeConfigValid,
    supabaseConfigured: supabaseConfigValid,
    catalogSize: STORE_ITEMS.length,
  });
});

app.get('/api/stripe-config', (_req, res) => {
  res.json({
    publishableKeyConfigured: true,
    products: STRIPE_STORE_ITEMS,
  });
});

app.get('/api/store/catalog', (_req, res) => {
  res.json({ items: getPublicCatalog() });
});

app.post('/api/create-checkout-session', checkoutSessionLimiter, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    const parsed = CreateCheckoutSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid checkout session request.' });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const product = getStoreItem(parsed.data.itemId);
    if (!product || !isSubscriptionPlanStoreItem(product)) {
      return res.status(400).json({ error: 'This plan is not configured for recurring checkout.' });
    }

    const baseReturnUrl = buildAppReturnUrl(req, parsed.data.returnPath, '/pricing');
    const successUrl = appendQueryParams(baseReturnUrl, {
      checkout: 'success',
      session_id: '{CHECKOUT_SESSION_ID}',
      plan: product.id,
    });
    const cancelUrl = appendQueryParams(baseReturnUrl, {
      checkout: 'cancelled',
      plan: product.id,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.stripeAmountCents,
            recurring: {
              interval: product.billingInterval || 'month',
              interval_count: Number(product.billingIntervalCount || 1),
            },
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
        },
      ],
      metadata: {
        userId: user.id,
        itemId: product.id,
        planName: product.planName,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          itemId: product.id,
          planName: product.planName,
        },
      },
    });

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: error.message || 'Failed to create checkout session.' });
  }
});

app.post('/api/finalize-checkout-session', paymentConfirmLimiter, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    const parsed = FinalizeCheckoutSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid checkout finalization request.' });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const session = await stripe.checkout.sessions.retrieve(parsed.data.session_id, {
      expand: ['subscription'],
    });

    const sessionUserId = session.client_reference_id || session.metadata?.userId || '';
    if (sessionUserId !== user.id) {
      return res.status(403).json({ error: 'This checkout session does not belong to the authenticated user.' });
    }

    if (session.mode !== 'subscription' || !session.subscription) {
      return res.status(400).json({ error: 'This checkout session is not a subscription checkout.' });
    }

    const subscription =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    const entitlement = await syncEntitlementFromStripeSubscription(subscription, {
      userId: user.id,
      itemId: session.metadata?.itemId || subscription.metadata?.itemId,
      planName: session.metadata?.planName || subscription.metadata?.planName,
    });

    return res.json({
      success: true,
      entitlement: {
        id: entitlement.id,
        userId: entitlement.user_id,
        itemId: entitlement.item_id,
        planName: entitlement.plan_name,
        status: entitlement.status,
        currentPeriodStart: entitlement.current_period_start,
        currentPeriodEnd: entitlement.current_period_end,
        purchaseCount: entitlement.purchase_count,
        lastPaymentIntentId: entitlement.last_payment_intent_id || null,
        metadata: entitlement.metadata || {},
        createdAt: entitlement.created_at,
        updatedAt: entitlement.updated_at,
        isActive:
          entitlement.status === 'active' &&
          entitlement.current_period_end &&
          new Date(entitlement.current_period_end).getTime() > Date.now(),
      },
    });
  } catch (error) {
    console.error('Error finalizing checkout session:', error);
    return res.status(500).json({ error: error.message || 'Failed to finalize checkout session.' });
  }
});

app.post('/api/create-customer-portal-session', billingPortalLimiter, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    const parsed = CreateCustomerPortalSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid customer portal request.' });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase store fulfillment is not configured.' });
    }

    const { data, error } = await supabaseAdmin
      .from('plan_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const recurringEntitlement = (data || []).find((entry) => {
      const metadata = typeof entry.metadata === 'object' && entry.metadata ? entry.metadata : {};
      return metadata.billing_mode === 'subscription' && typeof metadata.stripe_customer_id === 'string' && metadata.stripe_customer_id;
    });

    if (!recurringEntitlement) {
      return res.status(404).json({ error: 'No recurring subscription was found for this account.' });
    }

    const metadata = recurringEntitlement.metadata || {};
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: metadata.stripe_customer_id,
      return_url: buildAppReturnUrl(req, parsed.data.returnPath, '/pricing'),
    });

    return res.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return res.status(500).json({ error: error.message || 'Failed to create customer portal session.' });
  }
});

app.post('/api/store/purchase', storePurchaseLimiter, async (req, res) => {
  try {
    const parsed = CoinPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid store purchase payload.' });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const item = getStoreItem(parsed.data.itemId);
    if (!item || !isCoinStoreItem(item)) {
      return res.status(400).json({ error: 'Invalid coin-purchased store item.' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Store fulfillment is not configured.' });
    }

    const { data, error } = await supabaseAdmin.rpc('apply_store_coin_purchase', {
      p_user_id: user.id,
      p_request_id: parsed.data.requestId,
      p_item_id: item.id,
      p_coin_cost: item.coinCost,
      p_item_kind: item.kind,
      p_duration_hours: item.durationHours || null,
      p_multiplier: item.multiplier || null,
    });

    if (error) {
      const mapped = mapCoinPurchaseError(error);
      return res.status(mapped.status).json({ error: mapped.message });
    }

    return res.json({
      success: true,
      itemId: item.id,
      itemKind: item.kind,
      alreadyProcessed: Boolean(data?.alreadyProcessed),
      profile: {
        coins: Number(data?.coins || 0),
        hearts: Number(data?.hearts || 0),
        xpBoostMultiplier: Number(data?.xpBoostMultiplier || 1),
        xpBoostExpiresAt: Number(data?.xpBoostExpiresAt || 0),
        unlimitedHeartsExpiresAt: Number(data?.unlimitedHeartsExpiresAt || 0),
      },
    });
  } catch (error) {
    console.error('Error processing coin store purchase:', error);
    return res.status(500).json({ error: error.message || 'Failed to process store purchase' });
  }
});

app.post('/api/create-payment-intent', paymentIntentLimiter, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase store fulfillment is not configured.' });
    }

    const parsed = CreatePaymentIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payment intent request.' });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const product = getStoreItem(parsed.data.itemId);
    if (!product || !isStripeStoreItem(product)) {
      return res.status(400).json({ error: 'Invalid purchasable item.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.stripeAmountCents,
      currency: product.currency,
      description: `${product.name} - ${product.description}`,
      receipt_email: user.email || undefined,
      metadata: {
        itemId: product.id,
        userId: user.id,
        productKind: product.kind,
        productName: product.name,
        ...(product.kind === 'coin_pack' ? { coins: String(product.coinsGranted) } : {}),
        ...(product.kind === 'plan'
          ? {
              planName: product.planName,
              durationDays: String(product.durationDays),
            }
          : {}),
      },
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: product.stripeAmountCents,
      currency: product.currency,
      productKind: product.kind,
      coins: product.coinsGranted || null,
      planId: product.id,
      planName: product.planName || null,
      durationDays: product.durationDays || null,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

app.post('/api/confirm-payment', paymentConfirmLimiter, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase store fulfillment is not configured.' });
    }

    const parsed = ConfirmPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payment confirmation payload.' });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(parsed.data.payment_intent_id);

    if (paymentIntent.metadata?.userId !== user.id) {
      return res.status(403).json({ error: 'This payment intent does not belong to the authenticated user.' });
    }

    const product = getStoreItem(paymentIntent.metadata?.itemId);
    validateProductForPaymentIntent(paymentIntent, product);

    if (paymentIntent.status !== 'succeeded') {
      return res.json({
        success: false,
        status: paymentIntent.status,
        fulfilled: false,
      });
    }

    const fulfillment = await fulfillStripeProduct(paymentIntent);

    return res.json({
      success: true,
      status: paymentIntent.status,
      fulfilled: true,
      payment_intent_id: paymentIntent.id,
      ...fulfillment,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: error.message || 'Failed to confirm payment' });
  }
});

app.listen(STRIPE_SERVER_PORT, () => {
  console.log(`Stripe store server running on port ${STRIPE_SERVER_PORT}`);
  console.log('Environment check:');
  console.log('- STRIPE_SECRET_KEY:', stripeConfigValid ? (STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'Live key' : 'Test key') : 'Invalid or missing');
  console.log('- STRIPE_WEBHOOK_SECRET:', STRIPE_WEBHOOK_SECRET ? 'Set' : 'Missing (recommended)');
  console.log('- SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  if (allowedOrigins.length > 0) {
    console.log(`- STRIPE_ALLOWED_ORIGINS (${allowedOriginsSourceEnv}): ${allowedOrigins.join(', ')}`);
  } else {
    console.log('- STRIPE_ALLOWED_ORIGINS: none configured');
  }
  console.log('- STORE_ITEMS:', STORE_ITEMS.length);
});
