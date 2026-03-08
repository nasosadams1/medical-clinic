import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStoreItem, isCoinStoreItem, isStripeStoreItem, STORE_ITEMS, STRIPE_STORE_ITEMS } from './shared/store-catalog.js';
import {
  CoinPurchaseSchema,
  ConfirmPaymentSchema,
  CreatePaymentIntentSchema,
} from './shared/store-contract.js';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SERVER_PORT = Number(process.env.STRIPE_SERVER_PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const API_JSON_LIMIT = process.env.STRIPE_API_JSON_LIMIT || '10mb';
const ALLOWED_ORIGINS = (process.env.STRIPE_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const stripeConfigValid = typeof STRIPE_SECRET_KEY === 'string'
  && (STRIPE_SECRET_KEY.startsWith('sk_test_') || STRIPE_SECRET_KEY.startsWith('sk_live_'));
const supabaseConfigValid = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!stripeConfigValid) {
  console.error('Invalid STRIPE_SECRET_KEY. Expected sk_test_... or sk_live_...');
}

if (!supabaseConfigValid) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for store fulfillment.');
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

  if (String(paymentIntent.metadata?.coins || '') !== String(product.coinsGranted)) {
    throw new Error('Payment intent coin metadata is invalid.');
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
    multiplier: item.multiplier || null,
    stripeAmountCents: item.stripeAmountCents || null,
    currency: item.currency || null,
    bonusPercent: item.bonusPercent || 0,
    popular: Boolean(item.popular),
    bestValue: Boolean(item.bestValue),
  }));
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
    coinsGranted: Number(data?.coinsGranted || product.coinsGranted || 0),
    coins: Number(data?.coins || 0),
    totalCoinsEarned: Number(data?.totalCoinsEarned || 0),
    itemId: product.id,
    userId,
  };
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
      case 'payment_intent.succeeded': {
        const result = await fulfillCoinPurchase(event.data.object);
        console.log('Store payment fulfilled via webhook:', event.data.object.id, result);
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
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
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
        coins: String(product.coinsGranted),
        productName: product.name,
      },
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: product.stripeAmountCents,
      currency: product.currency,
      coins: product.coinsGranted,
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

    const fulfillment = await fulfillCoinPurchase(paymentIntent);

    return res.json({
      success: true,
      status: paymentIntent.status,
      fulfilled: true,
      alreadyFulfilled: fulfillment.alreadyFulfilled,
      coinsGranted: fulfillment.coinsGranted,
      coins: fulfillment.coins,
      totalCoinsEarned: fulfillment.totalCoinsEarned,
      payment_intent_id: paymentIntent.id,
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
  console.log('- STRIPE_ALLOWED_ORIGINS:', ALLOWED_ORIGINS.join(', '));
  console.log('- STORE_ITEMS:', STORE_ITEMS.length);
});
