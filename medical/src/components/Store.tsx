import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Coins, Crown, Gift, Heart, Star, Trophy, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { usePlanAccess } from '../hooks/usePlanAccess';
import {
  createCustomerPortalSession,
  createPlanCheckoutSession,
  formatPlanRenewalDate,
  getSelfServePlanProductByPlanName,
  isRecurringPlanEntitlement,
  isRecurringPlanProduct,
  type PlanStoreProduct,
} from '../lib/billing';
import StripeCheckout from './StripeCheckout';
import MascotIcon from './branding/MascotIcon';
import { purchaseStoreItem } from '../lib/store';
import { trackEvent } from '../lib/analytics';
import { pricingPlans } from '../data/siteContent';
import { STORE_ITEMS } from '../../shared/store-catalog.js';

type StoreSource = 'stripe' | 'coins';
type StoreKind = 'coin_pack' | 'xp_boost' | 'heart_refill' | 'unlimited_hearts' | 'plan';

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

type PricingPlanView = (typeof pricingPlans)[number];
type CheckoutSelection = {
  itemId: string;
  amount: number;
  description: string;
  coins?: number;
  benefitLabel?: string;
  kind: 'coin_pack' | 'plan';
  successMessage: string;
};

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
    coins: 'bg-coins/10 text-coins',
    xp: 'bg-xp/10 text-xp',
    hearts: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/20">
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
  const toneClasses = {
    coins: 'bg-coins/10 text-coins',
    xp: 'bg-xp/10 text-xp',
    hearts: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  }[item.tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:border-primary/20">
      <div className="absolute right-4 top-4 z-10 flex max-w-[45%] flex-col items-end gap-2">
        {item.popular ? (
          <span className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
            Popular
          </span>
        ) : null}
        {item.bestValue ? (
          <span className="rounded-full border border-xp/20 bg-xp/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-xp">
            Best value
          </span>
        ) : null}
        {(item.bonusPercent || 0) > 0 ? (
          <span className="rounded-full border border-coins/20 bg-coins/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-coins">
            +{item.bonusPercent}%
          </span>
        ) : null}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4 pr-24">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses}`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold font-display text-foreground">{item.name}</div>
              <p className="mt-2 min-h-[72px] text-sm leading-7 text-muted-foreground">{item.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold font-display text-foreground">
              {item.kind === 'coin_pack'
                ? item.coinsGranted?.toLocaleString()
                : item.kind === 'xp_boost'
                ? `${item.multiplier}x XP`
                : item.kind === 'heart_refill'
                ? 'Full'
                : 'Unlimited'}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {item.kind === 'coin_pack'
                ? 'Coins'
                : item.kind === 'heart_refill'
                ? 'Hearts'
                : `${item.durationHours}h duration`}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-3">
          <div>
            <div className="text-xl font-semibold font-display text-foreground">{item.priceLabel}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {item.source === 'coins' ? 'Use balance' : 'Secure checkout'}
            </div>
          </div>
          {item.source === 'coins' && item.durationHours ? (
            <div className="text-right text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.durationHours} hour duration</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onPurchase(item)}
          disabled={buttonDisabled}
          className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            buttonDisabled
              ? 'cursor-not-allowed border border-border bg-secondary text-muted-foreground'
              : 'border border-border bg-background text-foreground hover:border-primary/30 hover:bg-card'
          }`}
        >
          {isProcessing ? 'Processing...' : buttonLabel}
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onCheckout,
  isActive,
  activeUntilLabel,
  isCheckoutProcessing,
}: {
  plan: PricingPlanView;
  onCheckout: (product: PlanStoreProduct) => void;
  isActive: boolean;
  activeUntilLabel?: string | null;
  isCheckoutProcessing: boolean;
}) {
  const highlighted = plan.badge === 'Most popular';
  const isIncluded = plan.name === 'Free';
  const isTeamPlan = plan.name === 'Teams' || plan.name === 'Teams Growth' || plan.name === 'Custom';
  const selfServeProduct = getSelfServePlanProductByPlanName(plan.name);
  const href = isIncluded
    ? '/app?section=benchmark'
    : plan.name === 'Teams'
    ? '/teams'
    : plan.name === 'Teams Growth'
    ? '/pricing?intent=teams_growth'
    : plan.name === 'Custom'
    ? '/pricing?intent=custom_plan'
    : plan.name === 'Interview Sprint'
    ? '/pricing?intent=interview_sprint'
    : '/pricing';
  const activeWorkspaceHref =
    plan.name === 'Interview Sprint'
      ? '/app?section=benchmark'
      : plan.name === 'Teams' || plan.name === 'Teams Growth' || plan.name === 'Custom'
      ? '/app?section=teams'
      : '/app?section=practice';

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 ${
        highlighted
          ? 'border-primary/40 bg-card shadow-card'
          : 'border-border bg-card shadow-card hover:border-primary/20'
      }`}
    >
      {plan.badge ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {plan.badge}
          </span>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{plan.name}</div>
          {isTeamPlan ? <Users className="h-4 w-4 text-primary" /> : null}
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold font-display text-foreground">{plan.price}</span>
          <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
        </div>
        <p className="text-sm leading-7 text-muted-foreground">{plan.description}</p>
      </div>

      <ul className="my-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {!isIncluded ? (
        <div className="mb-4 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs leading-6 text-muted-foreground">
          {isActive
            ? `Active now${activeUntilLabel ? ` until ${activeUntilLabel}` : ''}.`
            : selfServeProduct
            ? 'Activate here.'
            : isTeamPlan
            ? 'Talk with sales for a custom rollout.'
            : 'Use the pricing page.'}
        </div>
      ) : null}

      {isIncluded ? (
        <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
          Included in your account
        </div>
      ) : isActive ? (
        <Link
          to={activeWorkspaceHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-primary/90"
        >
          <span>Open workspace</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : selfServeProduct ? (
        <button
          type="button"
          onClick={() => {
            trackEvent('subscription_cta_clicked', { plan: plan.name, source: 'store_plan_card' });
            onCheckout(selfServeProduct);
          }}
          disabled={isCheckoutProcessing}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            highlighted
              ? 'bg-primary text-primary-foreground shadow-card hover:bg-primary/90 disabled:opacity-60'
              : 'border border-border bg-transparent text-foreground hover:bg-secondary disabled:opacity-60'
          }`}
        >
          <span>{isCheckoutProcessing ? 'Preparing checkout...' : plan.ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <Link
          to={href}
          onClick={() => trackEvent('subscription_cta_clicked', { plan: plan.name, source: 'store' })}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            highlighted
              ? 'bg-primary text-primary-foreground shadow-card hover:bg-primary/90'
              : 'border border-border bg-transparent text-foreground hover:bg-secondary'
          }`}
        >
          <span>{plan.ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const Store: React.FC = () => {
  const { user, addNotification, forceRefreshFromDatabase, isUnlimitedHeartsActive, isXPBoostActive } = useUser();
  const { user: authUser } = useAuth();
  const { getPlanEntitlement, getEntitlementByPlanName, primaryPlan, refresh: refreshPlanEntitlements } = usePlanAccess();
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutSelection | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);

  const storeItems = useMemo(() => {
    return (STORE_ITEMS as StoreCatalogItem[])
      .filter((item) => item.kind !== 'plan')
      .map((item) => ({
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
      setSelectedCheckout({
        itemId: item.id,
        amount: item.stripeAmountCents || 0,
        description: `${item.name} - ${item.description}`,
        coins: item.coinsGranted,
        kind: 'coin_pack',
        successMessage: `Payment successful. You received ${item.coinsGranted || 0} coins.`,
      });
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

  const handlePlanCheckout = (product: PlanStoreProduct) => {
    if (isRecurringPlanProduct(product)) {
      setProcessingItemId(product.id);
      void (async () => {
        try {
          const payload = await createPlanCheckoutSession(product.id, '/pricing?source=store');
          window.location.assign(payload.url);
        } catch (error: any) {
          setProcessingItemId(null);
          addNotification({
            message: error?.message || 'Subscription checkout could not be started.',
            type: 'error',
            icon: '\u274C',
          });
        }
      })();
      return;
    }

    setSelectedCheckout({
      itemId: product.id,
      amount: product.stripeAmountCents,
      description: `${product.name} - ${product.description}`,
      benefitLabel: `Activates ${product.planName} for ${product.durationDays} days.`,
      kind: 'plan',
      successMessage: `${product.planName} is active for ${product.durationDays} days.`,
    });
    setShowPaymentModal(true);
  };

  const handleManageBilling = async () => {
    if (managingBilling) return;

    setManagingBilling(true);
    try {
      const payload = await createCustomerPortalSession('/app?section=store');
      window.location.assign(payload.url);
    } catch (error: any) {
      setManagingBilling(false);
      addNotification({
        message: error?.message || 'Billing management is not available right now.',
        type: 'error',
        icon: '\u274C',
      });
    }
  };

  const handlePaymentSuccess = async (paymentResult: { coinsGranted?: number }) => {
    if (selectedCheckout?.kind === 'plan') {
      await refreshPlanEntitlements();
    } else {
      await forceRefreshFromDatabase();
    }

    setShowPaymentModal(false);
    setSelectedCheckout(null);

    addNotification({
      message:
        selectedCheckout?.kind === 'plan'
          ? selectedCheckout.successMessage
          : `Payment successful. You received ${paymentResult?.coinsGranted || selectedCheckout?.coins || 0} coins.`,
      type: 'success',
      icon: selectedCheckout?.kind === 'plan' ? '\u2728' : '\u{1F4B0}',
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
    <div className="space-y-4 px-1 py-1 sm:px-2 lg:px-3 xl:px-4 lg:py-2 xl:py-3">
      <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Plans, pricing, and add-ons</span>
          </div>
          <h1 className="mt-5 text-3xl font-bold font-display text-foreground sm:text-4xl">Manage plans first. Use add-ons only when they help.</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            Plans first. Add-ons second.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">Plans drive access.</div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">Add-ons stay optional.</div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">Billing stays simple.</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-primary/90"
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

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 shrink-0">
              <MascotIcon mascot="store" className="h-full w-full" imageClassName="drop-shadow-md" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pricing sync</div>
              <div className="mt-2 text-3xl font-bold font-display text-foreground">One billing surface</div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Plans and add-ons live here.
              </p>
              <div className="mt-4 rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                Best coin bonus: <span className="font-semibold text-foreground">up to {maxBundleBonus}% extra</span>
              </div>
              {primaryPlan ? (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-foreground">
                  Active plan: <span className="font-semibold">{primaryPlan.planName}</span>
                  {primaryPlan.currentPeriodEnd ? (
                    <span className="text-foreground/75"> until {formatPlanRenewalDate(primaryPlan.currentPeriodEnd) || 'your renewal date'}</span>
                  ) : null}
                </div>
              ) : null}
              {primaryPlan && isRecurringPlanEntitlement(primaryPlan) ? (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={managingBilling}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{managingBilling ? 'Opening billing portal...' : 'Manage billing'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StoreStat
          icon={<Coins className="h-5 w-5" />}
          label="Balance"
          value={user.coins.toLocaleString()}
          subtitle="Spend in store"
          tone="coins"
        />
        <StoreStat
          icon={<Heart className="h-5 w-5 fill-current" />}
          label="Hearts"
          value={isUnlimitedHeartsActive() ? 'Unlimited' : `${user.hearts}/${user.maxHearts}`}
          subtitle="Refills and unlimited"
          tone="hearts"
        />
        <StoreStat
          icon={<Zap className="h-5 w-5" />}
          label="XP Boost"
          value={isXPBoostActive() ? 'Active' : 'Inactive'}
          subtitle="Temporary boost"
          tone="xp"
        />
        <StoreStat
          icon={<Crown className="h-5 w-5" />}
          label="Plan status"
          value={primaryPlan ? primaryPlan.planName : 'Free'}
          subtitle={primaryPlan ? 'Current plan' : 'No paid plan'}
          tone="primary"
        />
      </div>

      <section className="space-y-3">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Plans and subscriptions</div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Pick a plan, then add extras if needed.
            </p>
          </div>
          <Link
            to="/pricing"
            onClick={() => trackEvent('subscription_cta_clicked', { plan: 'pricing_overview', source: 'store_header' })}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            View pricing page
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {pricingPlans.map((plan) => {
            const product = getSelfServePlanProductByPlanName(plan.name);
            const entitlement = product ? getPlanEntitlement(product.id) : getEntitlementByPlanName(plan.name);

            return (
              <PlanCard
                key={plan.name}
                plan={plan}
                onCheckout={handlePlanCheckout}
                isActive={Boolean(entitlement)}
                activeUntilLabel={formatPlanRenewalDate(entitlement?.currentPeriodEnd)}
                isCheckoutProcessing={
                  processingItemId === product?.id ||
                  (selectedCheckout?.kind === 'plan' && product?.id === selectedCheckout.itemId)
                }
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Coin packs</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="space-y-3">
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Practice boosts and refills</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      {showPaymentModal && selectedCheckout ? (
        <StripeCheckout
          itemId={selectedCheckout.itemId}
          amount={selectedCheckout.amount}
          description={selectedCheckout.description}
          coins={selectedCheckout.coins}
          benefitLabel={selectedCheckout.benefitLabel}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCheckout(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default Store;
