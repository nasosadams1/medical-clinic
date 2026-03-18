import React, { useMemo, useState } from 'react';
import { Coins, Crown, Gift, Heart, Star, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import StripeCheckout from './StripeCheckout';
import MascotIcon from './branding/MascotIcon';
import { purchaseStoreItem } from '../lib/store';
import { STORE_ITEMS } from '../../shared/store-catalog.js';

type StoreSource = 'stripe' | 'coins';
type StoreKind = 'coin_pack' | 'xp_boost' | 'heart_refill' | 'unlimited_hearts';

interface StoreCatalogItem {
  id: string;
  source: StoreSource;
  kind: StoreKind;
  name: string;
  description: string;
  coinsGranted?: number;
  stripeAmountCents?: number;
  currency?: string;
  bonusPercent?: number;
  coinCost?: number;
  durationHours?: number;
  multiplier?: number;
  popular?: boolean;
  bestValue?: boolean;
}

interface StorePresentation {
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
  tone: 'coins' | 'xp' | 'hearts' | 'primary';
}

interface StoreItemView extends StoreCatalogItem, StorePresentation {
  priceLabel: string;
}

const PRESENTATION_BY_ITEM_ID: Record<string, StorePresentation> = {
  coins_150: {
    icon: <Coins className="h-8 w-8" />,
    gradient: 'from-coins to-orange-500',
    glowColor: 'glow-coins',
    tone: 'coins',
  },
  coins_420: {
    icon: <Coins className="h-8 w-8" />,
    gradient: 'from-primary to-accent',
    glowColor: 'glow-primary',
    tone: 'primary',
  },
  coins_900: {
    icon: <Coins className="h-8 w-8" />,
    gradient: 'from-primary to-fuchsia-500',
    glowColor: 'glow-primary',
    tone: 'primary',
  },
  coins_1900: {
    icon: <Crown className="h-8 w-8" />,
    gradient: 'from-coins to-red-500',
    glowColor: 'glow-coins',
    tone: 'coins',
  },
  coins_3000: {
    icon: <Crown className="h-8 w-8" />,
    gradient: 'from-fuchsia-500 to-red-500',
    glowColor: 'glow-primary',
    tone: 'primary',
  },
  coins_5600: {
    icon: <Star className="h-8 w-8" />,
    gradient: 'from-indigo-500 to-fuchsia-500',
    glowColor: 'glow-primary',
    tone: 'primary',
  },
  coins_12000: {
    icon: <Gift className="h-8 w-8" />,
    gradient: 'from-xp to-emerald-400',
    glowColor: 'glow-xp',
    tone: 'xp',
  },
  xp_boost_2x_1h: {
    icon: <Zap className="h-8 w-8" />,
    gradient: 'from-xp to-accent',
    glowColor: 'glow-xp',
    tone: 'xp',
  },
  xp_boost_2x_3h: {
    icon: <Zap className="h-8 w-8" />,
    gradient: 'from-primary to-accent',
    glowColor: 'glow-primary',
    tone: 'primary',
  },
  xp_boost_3x_1h: {
    icon: <Zap className="h-8 w-8" />,
    gradient: 'from-fuchsia-500 to-primary',
    glowColor: 'glow-primary',
    tone: 'primary',
  },
  heart_refill: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-destructive to-pink-500',
    glowColor: '',
    tone: 'hearts',
  },
  unlimited_hearts_1h: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-pink-500 to-red-500',
    glowColor: '',
    tone: 'hearts',
  },
  unlimited_hearts_3h: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-red-500 to-orange-500',
    glowColor: '',
    tone: 'hearts',
  },
  unlimited_hearts_24h: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-orange-500 to-red-600',
    glowColor: '',
    tone: 'hearts',
  },
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getSuccessMessage(item: StoreCatalogItem) {
  if (item.kind === 'heart_refill') return 'Hearts refilled successfully.';
  if (item.kind === 'xp_boost') {
    return `${item.multiplier}x XP Boost activated for ${item.durationHours} hour${item.durationHours === 1 ? '' : 's'}.`;
  }
  if (item.kind === 'unlimited_hearts') {
    return `Unlimited Hearts activated for ${item.durationHours} hour${item.durationHours === 1 ? '' : 's'}.`;
  }
  return 'Purchase completed successfully.';
}

function StoreStat({
  icon,
  label,
  value,
  subtitle,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
  tone: 'coins' | 'xp' | 'hearts' | 'primary';
}) {
  const iconTone = {
    coins: 'bg-coins/10 text-coins glow-coins',
    xp: 'bg-xp/10 text-xp glow-xp',
    hearts: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary glow-primary',
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-elevated">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'var(--gradient-card-glow)' }} />
      <div className="relative flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold font-display text-foreground">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function StoreCard({
  item,
  onPurchase,
  buttonLabel,
  buttonDisabled,
  isProcessing,
}: {
  item: StoreItemView;
  onPurchase: (item: StoreItemView) => void;
  buttonLabel: string;
  buttonDisabled: boolean;
  isProcessing: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated ${item.glowColor}`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.gradient}`} />

      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        {item.popular ? (
          <span className="rounded-full bg-destructive px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-destructive-foreground">
            Popular
          </span>
        ) : null}
        {item.bestValue ? (
          <span className="rounded-full bg-xp px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-xp-foreground">
            Best value
          </span>
        ) : null}
        {(item.bonusPercent || 0) > 0 ? (
          <span className="rounded-full bg-coins px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-coins-foreground">
            +{item.bonusPercent}%
          </span>
        ) : null}
      </div>

      <div className={`bg-gradient-to-r ${item.gradient} p-6 text-white`}>
        <div className="flex items-start justify-between gap-4 pt-8">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">{item.icon}</div>
          <div className="text-right">
            <div className="text-3xl font-bold font-display">
              {item.kind === 'coin_pack'
                ? item.coinsGranted?.toLocaleString()
                : item.kind === 'xp_boost'
                ? `${item.multiplier}x XP`
                : item.kind === 'heart_refill'
                ? 'Full Hearts'
                : 'Unlimited'}
            </div>
            <div className="mt-1 text-sm text-white/80">
              {item.kind === 'coin_pack'
                ? 'Coins'
                : item.kind === 'heart_refill'
                ? 'Instant refill'
                : `${item.durationHours}h duration`}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="text-xl font-bold font-display text-foreground">{item.name}</div>
        <p className="mt-2 min-h-[72px] text-sm leading-7 text-muted-foreground">{item.description}</p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-bold font-display text-foreground">{item.priceLabel}</div>
            {item.source === 'coins' && item.durationHours ? (
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.durationHours} hour duration</div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPurchase(item)}
          disabled={buttonDisabled}
          className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            buttonDisabled
              ? 'cursor-not-allowed border border-border bg-secondary text-muted-foreground'
              : `bg-gradient-to-r ${item.gradient} text-white shadow-glow hover:opacity-95`
          }`}
        >
          {isProcessing ? 'Processing...' : buttonLabel}
        </button>
      </div>
    </div>
  );
}

const Store: React.FC = () => {
  const { user, addNotification, forceRefreshFromDatabase, isUnlimitedHeartsActive, isXPBoostActive } = useUser();
  const { user: authUser } = useAuth();
  const [selectedItem, setSelectedItem] = useState<StoreItemView | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  const storeItems = useMemo(() => {
    return (STORE_ITEMS as StoreCatalogItem[]).map((item) => ({
      ...item,
      ...PRESENTATION_BY_ITEM_ID[item.id],
      priceLabel: item.source === 'stripe' ? formatUsd(item.stripeAmountCents || 0) : `${item.coinCost} coins`,
    }));
  }, []);

  const maxBundleBonus = useMemo(
    () =>
      storeItems
        .filter((item) => item.source === 'stripe')
        .reduce((max, item) => Math.max(max, item.bonusPercent || 0), 0),
    [storeItems]
  );

  const [coinPacks, practiceBoosts] = useMemo(() => {
    const packs = storeItems.filter((item) => item.kind === 'coin_pack');
    const boosts = storeItems.filter((item) => item.kind !== 'coin_pack');
    return [packs, boosts];
  }, [storeItems]);

  const getDisabledReason = (item: StoreItemView) => {
    if (item.source !== 'coins') return null;
    if ((item.coinCost || 0) > user.coins) return 'Not enough coins';
    if (item.kind === 'heart_refill' && (user.hearts >= user.maxHearts || isUnlimitedHeartsActive())) return 'Hearts already full';
    return null;
  };

  const handlePurchase = async (item: StoreItemView) => {
    if (!authUser) {
      addNotification({
        message: 'Please sign in to make purchases.',
        type: 'warning',
        icon: '\u26A0',
      });
      return;
    }

    if (item.source === 'stripe') {
      setSelectedItem(item);
      setShowPaymentModal(true);
      return;
    }

    const disabledReason = getDisabledReason(item);
    if (disabledReason) {
      addNotification({
        message: disabledReason,
        type: 'warning',
        icon: '\u{1F512}',
      });
      return;
    }

    setProcessingItemId(item.id);
    try {
      await purchaseStoreItem(item.id);
      await forceRefreshFromDatabase();
      addNotification({
        message: getSuccessMessage(item),
        type: 'success',
        icon: '\u2705',
      });
    } catch (error: any) {
      addNotification({
        message: error?.message || 'Purchase failed. Please try again.',
        type: 'error',
        icon: '\u274C',
      });
    } finally {
      setProcessingItemId(null);
    }
  };

  const handlePaymentSuccess = async (paymentResult: { coinsGranted?: number }) => {
    await forceRefreshFromDatabase();
    setShowPaymentModal(false);
    setSelectedItem(null);

    addNotification({
      message: `Payment successful. You received ${paymentResult?.coinsGranted || selectedItem?.coinsGranted || 0} coins.`,
      type: 'success',
      icon: '\u{1F4B0}',
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    addNotification({
      message: error || 'Payment failed. Please try again.',
      type: 'error',
      icon: '\u274C',
    });
  };

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Optional workspace add-ons</span>
          </div>
          <h1 className="mt-5 text-3xl font-bold font-display text-foreground sm:text-4xl">The store now looks like part of the product, not a separate app.</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            Codhak makes money through benchmark depth, interview tracks, and team plans. The store is still here for optional boosts and refills, but it no longer drives the product story.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
            >
              See plans
            </Link>
            <Link
              to="/teams"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              See team plans
            </Link>
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-gradient-to-br from-card via-sidebar to-background p-6 shadow-elevated">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 shrink-0">
              <MascotIcon mascot="store" className="h-full w-full" imageClassName="drop-shadow-md" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bundle offer</div>
              <div className="mt-2 text-3xl font-bold font-display text-foreground">Up to {maxBundleBonus}% bonus</div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Premium bundles are still available, but they now sit inside the same dark competitive dashboard system as the rest of Codhak.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StoreStat
          icon={<Coins className="h-5 w-5" />}
          label="Balance"
          value={user.coins.toLocaleString()}
          subtitle="Available for store purchases"
          tone="coins"
        />
        <StoreStat
          icon={<Heart className="h-5 w-5 fill-current" />}
          label="Hearts"
          value={isUnlimitedHeartsActive() ? 'Unlimited' : `${user.hearts}/${user.maxHearts}`}
          subtitle="Refills and unlimited access live here"
          tone="hearts"
        />
        <StoreStat
          icon={<Zap className="h-5 w-5" />}
          label="XP Boost"
          value={isXPBoostActive() ? 'Active' : 'Inactive'}
          subtitle="Temporary progression boosts"
          tone="xp"
        />
        <StoreStat
          icon={<Crown className="h-5 w-5" />}
          label="Premium packs"
          value={coinPacks.length}
          subtitle="Stripe-backed bundle options"
          tone="primary"
        />
      </div>

      <section>
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Coin packs</div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {coinPacks.map((item) => {
            const disabledReason = getDisabledReason(item);
            const isProcessing = processingItemId === item.id;
            const buttonDisabled = Boolean(disabledReason) || isProcessing;
            const buttonLabel = item.source === 'stripe' ? 'Buy now' : disabledReason || 'Use coins';

            return (
              <StoreCard
                key={item.id}
                item={item}
                onPurchase={handlePurchase}
                buttonDisabled={buttonDisabled}
                buttonLabel={buttonLabel}
                isProcessing={isProcessing}
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Practice boosts and refills</div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {practiceBoosts.map((item) => {
            const disabledReason = getDisabledReason(item);
            const isProcessing = processingItemId === item.id;
            const buttonDisabled = Boolean(disabledReason) || isProcessing;
            const buttonLabel = item.source === 'stripe' ? 'Buy now' : disabledReason || 'Use coins';

            return (
              <StoreCard
                key={item.id}
                item={item}
                onPurchase={handlePurchase}
                buttonDisabled={buttonDisabled}
                buttonLabel={buttonLabel}
                isProcessing={isProcessing}
              />
            );
          })}
        </div>
      </section>

      {showPaymentModal && selectedItem ? (
        <StripeCheckout
          itemId={selectedItem.id}
          amount={selectedItem.stripeAmountCents || 0}
          description={`${selectedItem.name} - ${selectedItem.description}`}
          coins={selectedItem.coinsGranted}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedItem(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default Store;
