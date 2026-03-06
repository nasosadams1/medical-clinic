import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SERVER_PORT = Number(process.env.STRIPE_SERVER_PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ALLOWED_ORIGINS = (process.env.STRIPE_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const PRODUCT_CATALOG = {
  coins_150: { amount: 199, currency: 'usd', coins: 150, name: '150 Coins', description: 'Starter stack' },
  coins_420: { amount: 499, currency: 'usd', coins: 420, name: '420 Coins', description: 'First real upgrade' },
  coins_900: { amount: 999, currency: 'usd', coins: 900, name: '900 Coins', description: 'Most players start here' },
  coins_1900: { amount: 1999, currency: 'usd', coins: 1900, name: '1,900 Coins', description: 'Best balance of value and flexibility' },
  coins_3000: { amount: 2999, currency: 'usd', coins: 3000, name: '3,000 Coins', description: 'Built for long streaks and resets' },
  coins_5600: { amount: 4999, currency: 'usd', coins: 5600, name: '5,600 Coins', description: 'Competitive grind bundle' },
  coins_12000: { amount: 9999, currency: 'usd', coins: 12000, name: '12,000 Coins', description: 'Maximum bonus, longest runway' },
};

function isValidStripeSecret(key) {
  return typeof key === 'string' && (key.startsWith('sk_test_') || key.startsWith('sk_live_'));
}

const stripeConfigValid = isValidStripeSecret(STRIPE_SECRET_KEY);
const supabaseConfigValid = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!stripeConfigValid) {
  console.error('Invalid STRIPE_SECRET_KEY. Expected sk_test_... or sk_live_...');
}

if (!supabaseConfigValid) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Stripe fulfillment.');
}

const stripe = stripeConfigValid ? new Stripe(STRIPE_SECRET_KEY) : null;
const supabaseAdmin = supabaseConfigValid
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
const app = express();

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
    return { user: null, error: 'Payment server is not configured for Supabase.' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired session token.' };
  }

  return { user: data.user, error: null };
}

async function grantCoinsToUser(userId, coinsToGrant) {
  if (!supabaseAdmin) {
    throw new Error('Payment server is not configured for Supabase.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('id, coins')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load user profile: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error('User profile not found for fulfilled payment.');
  }

  const currentCoins = Number(profile.coins || 0);
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({ coins: currentCoins + coinsToGrant })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to grant purchased coins: ${updateError.message}`);
  }
}

async function fulfillCoinPurchase(paymentIntent) {
  const itemId = paymentIntent.metadata?.itemId;
  const userId = paymentIntent.metadata?.userId;
  const alreadyFulfilled = paymentIntent.metadata?.fulfilled_at;
  const product = PRODUCT_CATALOG[itemId];

  if (!product) {
    throw new Error('Payment intent metadata is missing a valid itemId.');
  }

  if (!userId) {
    throw new Error('Payment intent metadata is missing userId.');
  }

  if (alreadyFulfilled) {
    return {
      alreadyFulfilled: true,
      coinsGranted: Number(paymentIntent.metadata?.coins || product.coins || 0),
      itemId,
      userId,
    };
  }

  await grantCoinsToUser(userId, product.coins);

  if (!stripe) {
    throw new Error('Payment server is not configured for Stripe.');
  }

  const updatedIntent = await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: {
      ...paymentIntent.metadata,
      fulfilled_at: new Date().toISOString(),
      fulfilled_by: 'stripe-server',
    },
  });

  return {
    alreadyFulfilled: false,
    coinsGranted: product.coins,
    itemId,
    userId,
    paymentIntent: updatedIntent,
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
        console.log('Payment fulfilled via webhook:', event.data.object.id, result);
        break;
      }
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true, verified: true });
  } catch (error) {
    console.error('Webhook processing failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by Stripe server CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: stripeConfigValid && supabaseConfigValid ? 'ok' : 'degraded',
    service: 'stripe-server',
    stripeConfigured: stripeConfigValid,
    supabaseConfigured: supabaseConfigValid,
  });
});

app.get('/api/stripe-config', (_req, res) => {
  res.json({
    publishableKeyConfigured: true,
    products: PRODUCT_CATALOG,
  });
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase payment fulfillment is not configured.' });
    }
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const { itemId, customerEmail } = req.body;
    const product = PRODUCT_CATALOG[itemId];

    if (!itemId || !product) {
      return res.status(400).json({ error: 'Invalid purchasable item.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.amount,
      currency: product.currency,
      description: `${product.name} - ${product.description}`,
      receipt_email: customerEmail || user.email || undefined,
      metadata: {
        itemId,
        userId: user.id,
        coins: String(product.coins),
        productName: product.name,
      },
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: product.amount,
      currency: product.currency,
      coins: product.coins,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

app.post('/api/confirm-payment', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set a valid STRIPE_SECRET_KEY.' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase payment fulfillment is not configured.' });
    }
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const { payment_intent_id } = req.body;
    if (!payment_intent_id) {
      return res.status(400).json({ error: 'payment_intent_id is required' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.metadata?.userId !== user.id) {
      return res.status(403).json({ error: 'This payment intent does not belong to the authenticated user.' });
    }

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
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: error.message || 'Failed to confirm payment' });
  }
});

app.listen(STRIPE_SERVER_PORT, () => {
  console.log(`Stripe server running on port ${STRIPE_SERVER_PORT}`);
  console.log('Environment check:');
  console.log('- STRIPE_SECRET_KEY:', stripeConfigValid ? (STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'Live key' : 'Test key') : 'Invalid or missing');
  console.log('- STRIPE_WEBHOOK_SECRET:', STRIPE_WEBHOOK_SECRET ? 'Set' : 'Missing (recommended)');
  console.log('- SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  console.log('- STRIPE_ALLOWED_ORIGINS:', ALLOWED_ORIGINS.join(', '));
});
