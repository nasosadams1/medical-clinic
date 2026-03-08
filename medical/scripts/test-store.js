import assert from 'assert';
import { getStoreItem, STORE_ITEMS, STRIPE_STORE_ITEMS, COIN_STORE_ITEMS } from '../shared/store-catalog.js';
import { CoinPurchaseSchema, ConfirmPaymentSchema, CreatePaymentIntentSchema } from '../shared/store-contract.js';

assert.equal(STORE_ITEMS.length, 14);
assert.equal(STRIPE_STORE_ITEMS.length, 7);
assert.equal(COIN_STORE_ITEMS.length, 7);

const ids = new Set(STORE_ITEMS.map((item) => item.id));
assert.equal(ids.size, STORE_ITEMS.length);

for (const item of STORE_ITEMS) {
  const resolved = getStoreItem(item.id);
  assert.ok(resolved);
  assert.equal(resolved.id, item.id);

  if (item.source === 'stripe') {
    assert.ok(item.stripeAmountCents > 0);
    assert.ok(item.coinsGranted > 0);
    assert.equal(typeof item.currency, 'string');
  }

  if (item.source === 'coins') {
    assert.ok(item.coinCost > 0);
    if (item.kind === 'xp_boost') {
      assert.ok(item.multiplier >= 2);
      assert.ok(item.durationHours > 0);
    }
    if (item.kind === 'unlimited_hearts') {
      assert.ok(item.durationHours > 0);
    }
  }
}

assert.equal(CreatePaymentIntentSchema.safeParse({ itemId: 'coins_900' }).success, true);
assert.equal(CreatePaymentIntentSchema.safeParse({ itemId: '' }).success, false);
assert.equal(ConfirmPaymentSchema.safeParse({ payment_intent_id: 'pi_123' }).success, true);
assert.equal(ConfirmPaymentSchema.safeParse({ payment_intent_id: '' }).success, false);
assert.equal(CoinPurchaseSchema.safeParse({ itemId: 'xp_boost_2x_3h', requestId: '550e8400-e29b-41d4-a716-446655440000' }).success, true);
assert.equal(CoinPurchaseSchema.safeParse({ itemId: 'xp_boost_2x_3h', requestId: 'bad-id' }).success, false);

console.log('Store validation tests passed.');
