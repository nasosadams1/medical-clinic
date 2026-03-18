import React, { useMemo, useState } from 'react';
import {
  Coins,
  Gift,
  Heart,
  Star,
  Zap,
  Crown,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import StripeCheckout from './StripeCheckout';
import MascotIcon from './branding/MascotIcon';
import { purchaseStoreItem } from '../lib/store';
import { STORE_ITEMS } from '../../shared/store-catalog.js';
import { Link } from 'react-router-dom';

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
}

interface StoreItemView extends StoreCatalogItem, StorePresentation {
  priceLabel: string;
}

const PRESENTATION_BY_ITEM_ID: Record<string, StorePresentation> = {
  coins_150: {
    icon: <Coins className="h-8 w-8" />,
    gradient: 'from-yellow-400 to-orange-500',
    glowColor: 'shadow-yellow-500/25',
  },
  coins_420: {
    icon: <Coins className="h-8 w-8" />,
    gradient: 'from-blue-400 to-purple-500',
    glowColor: 'shadow-blue-500/25',
  },
  coins_900: {
    icon: <Coins className="h-8 w-8" />,
    gradient: 'from-purple-400 to-pink-500',
    glowColor: 'shadow-purple-500/25',
  },
  coins_1900: {
    icon: <Crown className="h-8 w-8" />,
    gradient: 'from-orange-400 to-red-500',
    glowColor: 'shadow-orange-500/25',
  },
  coins_3000: {
    icon: <Crown className="h-8 w-8" />,
    gradient: 'from-pink-400 to-red-500',
    glowColor: 'shadow-pink-500/25',
  },
  coins_5600: {
    icon: <Star className="h-8 w-8" />,
    gradient: 'from-indigo-400 to-purple-600',
    glowColor: 'shadow-indigo-500/25',
  },
  coins_12000: {
    icon: <Gift className="h-8 w-8" />,
    gradient: 'from-emerald-400 to-teal-500',
    glowColor: 'shadow-emerald-500/25',
  },
  xp_boost_2x_1h: {
    icon: <Zap className="h-8 w-8" />,
    gradient: 'from-green-400 to-blue-500',
    glowColor: 'shadow-green-500/25',
  },
  xp_boost_2x_3h: {
    icon: <Zap className="h-8 w-8" />,
    gradient: 'from-blue-400 to-purple-500',
    glowColor: 'shadow-blue-500/25',
  },
  xp_boost_3x_1h: {
    icon: <Zap className="h-8 w-8" />,
    gradient: 'from-purple-400 to-pink-500',
    glowColor: 'shadow-purple-500/25',
  },
  heart_refill: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-red-400 to-pink-500',
    glowColor: 'shadow-red-500/25',
  },
  unlimited_hearts_1h: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-pink-400 to-red-500',
    glowColor: 'shadow-pink-500/25',
  },
  unlimited_hearts_3h: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-red-400 to-orange-500',
    glowColor: 'shadow-red-500/25',
  },
  unlimited_hearts_24h: {
    icon: <Heart className="h-8 w-8" />,
    gradient: 'from-orange-400 to-red-600',
    glowColor: 'shadow-orange-500/25',
  },
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getSuccessMessage(item: StoreCatalogItem) {
  if (item.kind === 'heart_refill') {
    return 'Hearts refilled successfully.';
  }

  if (item.kind === 'xp_boost') {
    return `${item.multiplier}x XP Boost activated for ${item.durationHours} hour${item.durationHours === 1 ? '' : 's'}.`;
  }

  if (item.kind === 'unlimited_hearts') {
    return `Unlimited Hearts activated for ${item.durationHours} hour${item.durationHours === 1 ? '' : 's'}.`;
  }

  return 'Purchase completed successfully.';
}

const Store: React.FC = () => {
  const { user, addNotification, forceRefreshFromDatabase, isUnlimitedHeartsActive } = useUser();
  const { user: authUser } = useAuth();
  const [selectedItem, setSelectedItem] = useState<StoreItemView | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  const storeItems = useMemo(() => {
    return (STORE_ITEMS as StoreCatalogItem[]).map((item) => ({
      ...item,
      ...PRESENTATION_BY_ITEM_ID[item.id],
      priceLabel: item.source === 'stripe'
        ? formatUsd(item.stripeAmountCents || 0)
        : `${item.coinCost} coins`,
    }));
  }, []);

  const maxBundleBonus = useMemo(() => {
    return storeItems
      .filter((item) => item.source === 'stripe')
      .reduce((max, item) => Math.max(max, item.bonusPercent || 0), 0);
  }, [storeItems]);

  const [coinPacks, practiceBoosts] = useMemo(() => {
    const packs = storeItems.filter((item) => item.kind === 'coin_pack');
    const boosts = storeItems.filter((item) => item.kind !== 'coin_pack');
    return [packs, boosts];
  }, [storeItems]);

  const getDisabledReason = (item: StoreItemView) => {
    if (item.source !== 'coins') {
      return null;
    }

    if ((item.coinCost || 0) > user.coins) {
      return 'Not enough coins';
    }

    if (item.kind === 'heart_refill' && (user.hearts >= user.maxHearts || isUnlimitedHeartsActive())) {
      return 'Hearts already full';
    }

    return null;
  };

  const handlePurchase = async (item: StoreItemView) => {
    if (!authUser) {
      addNotification({
        message: 'Please sign in to make purchases.',
        type: 'warning',
        icon: '\u{26A0}',
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
        icon: '\u{2705}',
      });
    } catch (error: any) {
      addNotification({
        message: error?.message || 'Purchase failed. Please try again.',
        type: 'error',
        icon: '\u{274C}',
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
      icon: '\u{274C}',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-center lg:mb-10">
          <div className="flex w-full max-w-[26rem] flex-col items-center px-4 py-2 text-center sm:max-w-[30rem]">
            <div className="h-32 w-32 sm:h-36 sm:w-36 lg:h-40 lg:w-40">
              <MascotIcon mascot="store" className="h-full w-full" imageClassName="drop-shadow-md" />
            </div>
            <span className="mt-3 text-2xl font-semibold text-slate-800 sm:text-3xl">Store</span>
          </div>
        </div>

        <div className="mx-0 mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Optional workspace add-ons</div>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Codhak makes money through plans and team access. The store is secondary.</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Use these add-ons only if you want extra practice fuel inside the workspace. Benchmark reports, interview tracks, and team plans live on the public pricing page.
              </p>
            </div>
            <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
              <span>See plans</span>
            </Link>
          </div>
        </div>

        <div className="mx-0 mb-8 rounded-2xl bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 p-4 text-white shadow-xl sm:p-5 lg:p-6">
          <div className="flex flex-col items-center justify-between text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="mb-2 text-xl font-bold lg:text-2xl">Premium bundles</h3>
              <p className="text-sm text-white/90 lg:text-base">Get up to {maxBundleBonus}% more coins in premium bundles for optional workspace purchases.</p>
            </div>
            <div className="mt-4 text-center sm:mt-0 sm:text-right">
              <div className="text-3xl font-bold">{maxBundleBonus}%</div>
              <div className="text-sm text-white/80">BONUS</div>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Coin packs</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {coinPacks.map((item) => {
              const disabledReason = getDisabledReason(item);
              const isProcessing = processingItemId === item.id;
              const buttonDisabled = Boolean(disabledReason) || isProcessing;
              const buttonLabel = item.source === 'stripe'
                ? 'Buy now'
                : disabledReason || 'Use coins';

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${item.glowColor}`}
                >
                  <div className="absolute left-3 top-3 z-10">
                    {item.popular ? (
                      <div className="mb-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white lg:px-3">
                        POPULAR
                      </div>
                    ) : null}
                    {item.bestValue ? (
                      <div className="mb-2 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white lg:px-3">
                        BEST VALUE
                      </div>
                    ) : null}
                    {(item.bonusPercent || 0) > 0 ? (
                      <div className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white lg:px-3">
                        +{item.bonusPercent}%
                      </div>
                    ) : null}
                  </div>

                  <div className={`bg-gradient-to-r ${item.gradient} p-6 text-white`}>
                    <div className="mb-4 flex items-center justify-between pt-8">
                      <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">{item.icon}</div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{item.coinsGranted?.toLocaleString()}</div>
                        <div className="text-sm text-white/80">Coins</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">{item.name}</h3>
                    <p className="mb-4 min-h-[48px] text-gray-600">{item.description}</p>

                    <div className="mb-6 flex items-center justify-between">
                      <div className="text-3xl font-bold text-gray-900">{item.priceLabel}</div>
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={buttonDisabled}
                      className={`w-full rounded-xl py-3 font-semibold transition-all duration-200 ${buttonDisabled ? 'cursor-not-allowed bg-gray-200 text-gray-500' : `bg-gradient-to-r ${item.gradient} text-white shadow-lg hover:shadow-xl`} `}
                    >
                      {isProcessing ? 'Processing...' : buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Practice boosts and refills</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {practiceBoosts.map((item) => {
            const disabledReason = getDisabledReason(item);
            const isProcessing = processingItemId === item.id;
            const buttonDisabled = Boolean(disabledReason) || isProcessing;
            const buttonLabel = item.source === 'stripe'
              ? 'Buy now'
              : disabledReason || 'Use coins';

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${item.glowColor}`}
                >
                  <div className={`bg-gradient-to-r ${item.gradient} p-6 text-white`}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">{item.icon}</div>
                      {item.kind === 'xp_boost' ? (
                        <div className="text-right">
                          <div className="text-2xl font-bold">{item.multiplier}x XP</div>
                          <div className="text-sm text-white/80">{item.durationHours}h duration</div>
                        </div>
                      ) : item.kind === 'heart_refill' ? (
                        <div className="text-right">
                          <div className="text-2xl font-bold">Full Hearts</div>
                          <div className="text-sm text-white/80">Instant refill</div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-2xl font-bold">Unlimited</div>
                          <div className="text-sm text-white/80">{item.durationHours}h duration</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">{item.name}</h3>
                    <p className="mb-4 min-h-[48px] text-gray-600">{item.description}</p>

                    <div className="mb-6 flex items-center justify-between">
                      <div className="text-3xl font-bold text-gray-900">{item.priceLabel}</div>
                      {item.source === 'coins' && item.durationHours ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{item.durationHours}h</span>
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={buttonDisabled}
                      className={`w-full rounded-xl py-3 font-semibold transition-all duration-200 ${buttonDisabled ? 'cursor-not-allowed bg-gray-200 text-gray-500' : `bg-gradient-to-r ${item.gradient} text-white shadow-lg hover:shadow-xl`} `}
                    >
                      {isProcessing ? 'Processing...' : buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
    </div>
  );
};

export default Store;
