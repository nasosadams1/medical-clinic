import React, { useState } from 'react';
import { X, Coins, Zap, Heart, Clock, Star, Crown, Gift, ShoppingCart, CreditCard } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import StripeCheckout from './StripeCheckout';

interface StoreItem {
  id: string;
  type: 'coins' | 'xp_boost' | 'hearts' | 'unlimited_hearts';
  name: string;
  description: string;
  coins?: number;
  price: number; // in USD cents or coins
  priceDisplay: string;
  bonus?: number; // bonus percentage
  duration?: number; // in hours for time-limited items
  multiplier?: number; // for XP boosts
  icon: React.ReactNode;
  popular?: boolean;
  bestValue?: boolean;
  gradient: string;
  glowColor: string;
}

const Store: React.FC = () => {
  const { user, purchaseWithCoins, activateXPBoost, activateUnlimitedHearts, refillHearts, addNotification, forceRefreshFromDatabase } = useUser();
  const { user: authUser } = useAuth();
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Store items with proper pricing
  const storeItems: StoreItem[] = [
    // Coin Packages (real money purchases)
    {
      id: 'coins_150',
      type: 'coins',
      name: '150 Coins',
      description: 'Starter stack',
      coins: 150,
      price: 199, // $1.99 in cents
      priceDisplay: '$1.99',
      icon: <Coins className="w-8 h-8" />,
      gradient: 'from-yellow-400 to-orange-500',
      glowColor: 'shadow-yellow-500/25'
    },
    {
      id: 'coins_420',
      type: 'coins',
      name: '420 Coins',
      description: 'First real upgrade',
      coins: 420,
      price: 499, // $4.99 in cents
      priceDisplay: '$4.99',
      bonus: 12,
      
      icon: <Coins className="w-8 h-8" />,
      gradient: 'from-blue-400 to-purple-500',
      glowColor: 'shadow-blue-500/25'
    },
    {
      id: 'coins_900',
      type: 'coins',
      name: '900 Coins',
      description: 'Most players start here',
      coins: 900,
      price: 999, // $9.99 in cents
      priceDisplay: '$9.99',
      bonus: 20,
      popular: true,
      icon: <Coins className="w-8 h-8" />,
      gradient: 'from-purple-400 to-pink-500',
      glowColor: 'shadow-purple-500/25'
    },
    {
      id: 'coins_1900',
      type: 'coins',
      name: '1,900 Coins',
      description: 'Best balance of value and flexibility',
      coins: 1900,
      price: 1999, // $19.99 in cents
      priceDisplay: '$19.99',
      bonus: 26,
      icon: <Crown className="w-8 h-8" />,
      gradient: 'from-orange-400 to-red-500',
      glowColor: 'shadow-orange-500/25'
    },
    {
      id: 'coins_3000',
      type: 'coins',
      name: '3,000 Coins',
      description: 'Built for long streaks and resets',
      coins: 3000,
      price: 2999, // $29.99 in cents
      priceDisplay: '$29.99',
      bonus: 33,
      bestValue: true,
      icon: <Crown className="w-8 h-8" />,
      gradient: 'from-pink-400 to-red-500',
      glowColor: 'shadow-pink-500/25'
    },
    {
      id: 'coins_5600',
      type: 'coins',
      name: '5,600 Coins',
      description: 'Competitive grind bundle',
      coins: 5600,
      price: 4999, // $49.99 in cents
      priceDisplay: '$49.99',
      bonus: 49,
      icon: <Star className="w-8 h-8" />,
      gradient: 'from-indigo-400 to-purple-600',
      glowColor: 'shadow-indigo-500/25'
    },
    {
      id: 'coins_12000',
      type: 'coins',
      name: '12,000 Coins',
      description: 'Maximum bonus, longest runway',
      coins: 12000,
      price: 9999, // $99.99 in cents
      priceDisplay: '$99.99',
      bonus: 59,
      icon: <Gift className="w-8 h-8" />,
      gradient: 'from-emerald-400 to-teal-500',
      glowColor: 'shadow-emerald-500/25'
    },

    // XP Boosts (coin purchases)
    {
      id: 'xp_boost_2x_1h',
      type: 'xp_boost',
      name: '2x XP Boost',
      description: '1 hour duration',
      price: 120, // 120 coins
      priceDisplay: '120 coins',
      duration: 1,
      multiplier: 2,
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-green-400 to-blue-500',
      glowColor: 'shadow-green-500/25'
    },
    {
      id: 'xp_boost_2x_3h',
      type: 'xp_boost',
      name: '2x XP Boost',
      description: '3 hours duration',
      price: 300, // 300 coins
      priceDisplay: '300 coins',
      duration: 3,
      multiplier: 2,
      popular: true,
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-blue-400 to-purple-500',
      glowColor: 'shadow-blue-500/25'
    },
    {
      id: 'xp_boost_3x_1h',
      type: 'xp_boost',
      name: '3x XP Boost',
      description: '1 hour duration',
      price: 180, // 180 coins
      priceDisplay: '180 coins',
      duration: 1,
      multiplier: 3,
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-purple-400 to-pink-500',
      glowColor: 'shadow-purple-500/25'
    },

    // Heart Packages (coin purchases)
    {
      id: 'heart_refill',
      type: 'hearts',
      name: 'Refill Hearts',
      description: 'Restore all hearts',
      price: 60, // 60 coins
      priceDisplay: '60 coins',
      icon: <Heart className="w-8 h-8" />,
      gradient: 'from-red-400 to-pink-500',
      glowColor: 'shadow-red-500/25'
    },
    {
      id: 'unlimited_hearts_1h',
      type: 'unlimited_hearts',
      name: 'Unlimited Hearts',
      description: '1 hour duration',
      price: 220, // 220 coins
      priceDisplay: '220 coins',
      duration: 1,
      icon: <Heart className="w-8 h-8" />,
      gradient: 'from-pink-400 to-red-500',
      glowColor: 'shadow-pink-500/25'
    },
    {
      id: 'unlimited_hearts_3h',
      type: 'unlimited_hearts',
      name: 'Unlimited Hearts',
      description: '3 hours duration',
      price: 500, // 500 coins
      priceDisplay: '500 coins',
      duration: 3,
      popular: true,
      icon: <Heart className="w-8 h-8" />,
      gradient: 'from-red-400 to-orange-500',
      glowColor: 'shadow-red-500/25'
    },
    {
      id: 'unlimited_hearts_24h',
      type: 'unlimited_hearts',
      name: 'Unlimited Hearts',
      description: '24 hours duration',
      price: 1500, // 1500 coins
      priceDisplay: '1500 coins',
      duration: 24,
      bestValue: true,
      icon: <Heart className="w-8 h-8" />,
      gradient: 'from-orange-400 to-red-600',
      glowColor: 'shadow-orange-500/25'
    }
  ];

 const handlePurchase = async (item: StoreItem) => {
  if (!authUser) {
    addNotification({
      message: 'Please sign in to make purchases',
      type: 'warning',
      icon: '⚠️'
    });
    return;
  }
  
  // Handle coin purchases (items that cost coins)
  if (item.type !== 'coins') {
    try {
      const success = await purchaseWithCoins(item.price);
      if (success) {
        // Apply the purchased item effects using UserContext functions
        switch (item.type) {
          case 'hearts':
            await refillHearts();
            break;
          case 'xp_boost':
            if (item.multiplier && item.duration) {
              await activateXPBoost(item.multiplier, item.duration);
            }
            break;
          case 'unlimited_hearts':
            if (item.duration) {
              await activateUnlimitedHearts(item.duration);
            }
            break;
          default:
            console.warn('Unknown item type:', item.type);
        }
      } else {
        addNotification({
          message: 'Not enough coins! Purchase more coins to continue.',
          type: 'error',
          icon: '💰'
        });
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      addNotification({
        message: 'Purchase failed. Please try again.',
        type: 'error',
        icon: '❌'
      });
    }
    return;
  }
  
  // Handle real money purchases (coin packages)
  setSelectedItem(item);
  setShowPaymentModal(true);
};

  const handlePaymentSuccess = async (paymentResult: any) => {
    await forceRefreshFromDatabase();

    setShowPaymentModal(false);
    setSelectedItem(null);

    addNotification({
      message: `Payment successful! You received ${paymentResult?.coinsGranted || selectedItem?.coins || 0} coins!`,
      type: 'success',
      icon: '\u{1F3C6}'
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    
    // Show the user-friendly notification for payment errors
    addNotification({
      message: "Oops! Your payment didn't go through. Please check your card details or try a different payment method.",
      type: 'error',
      icon: '💳'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center lg:mb-12">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg sm:h-20 sm:w-20 sm:mb-6">
            <ShoppingCart className="h-8 w-8 text-white sm:h-10 sm:w-10" />
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-4">Codhak Store</h1>
          <p className="text-base lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Enhance your coding journey with premium coins, XP boosts, and unlimited hearts
          </p>
          <div className="mt-6 inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900">{user.coins} coins</span>
          </div>
        </div>

        {/* Special Offer Banner */}
        <div className="mx-0 mb-8 rounded-2xl bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 p-4 text-white shadow-xl sm:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left">
            <div>
              <h3 className="text-xl lg:text-2xl font-bold mb-2">Best-Selling Bundles</h3>
              <p className="text-white/90 text-sm lg:text-base">Get up to 59% more coins in premium bundles</p>
            </div>
            <div className="text-center sm:text-right mt-4 sm:mt-0">
              <div className="text-3xl font-bold">59%</div>
              <div className="text-sm text-white/80">BONUS</div>
            </div>
          </div>
        </div>

        {/* Store Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {storeItems.map((item) => (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${item.glowColor}`}
            >
              {/* Badges */}
              <div className="absolute top-3 left-3 z-10">
                {item.popular && (
                  <div className="bg-red-500 text-white px-2 lg:px-3 py-1 rounded-full text-xs font-bold mb-2">
                    POPULAR
                  </div>
                )}
                {item.bestValue && (
                  <div className="bg-green-500 text-white px-2 lg:px-3 py-1 rounded-full text-xs font-bold mb-2">
                    BEST VALUE
                  </div>
                )}
                {item.bonus && (
                  <div className="bg-orange-500 text-white px-2 lg:px-3 py-1 rounded-full text-xs font-bold">
                    +{item.bonus}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`relative overflow-hidden bg-gradient-to-br ${item.gradient} p-4 text-white sm:p-5 lg:p-6`}>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                    {item.icon}
                  </div>
                  
                  {item.type === 'coins' && (
                    <div className="text-center">
                      <div className="text-2xl lg:text-3xl font-bold mb-1">{item.coins?.toLocaleString()}</div>
                      <div className="text-white/80 text-sm">Coins</div>
                    </div>
                  )}
                  
                  {item.type === 'xp_boost' && (
                    <div className="text-center">
                      <div className="text-xl lg:text-2xl font-bold mb-1">{item.multiplier}x XP</div>
                      <div className="text-white/80 text-sm">{item.duration}h duration</div>
                    </div>
                  )}
                  
                  {(item.type === 'hearts' || item.type === 'unlimited_hearts') && (
                    <div className="text-center">
                      <div className="text-xl lg:text-2xl font-bold mb-1">
                        {item.type === 'hearts' ? 'Full Hearts' : 'Unlimited'}
                      </div>
                      <div className="text-white/80 text-sm">
                        {item.duration ? `${item.duration}h duration` : 'Instant refill'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 lg:p-6">
                <h3 className="font-bold text-gray-900 text-base lg:text-lg mb-2">{item.name}</h3>
                {item.type === 'coins' ? <div className="mb-4" /> : <p className="text-gray-600 text-sm mb-4">{item.description}</p>}
                
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div className="text-xl lg:text-2xl font-bold text-gray-900">{item.priceDisplay}</div>
                  {item.bonus && (
                    <div className="text-green-600 text-sm font-semibold">
                      Save {item.bonus}%
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handlePurchase(item)}
                  className={`w-full py-2 lg:py-3 bg-gradient-to-r ${item.gradient} hover:shadow-lg text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 text-sm lg:text-base ${
                    item.type !== 'coins' && user.coins < item.price ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={item.type !== 'coins' && user.coins < item.price}
                >
                  {item.type === 'coins' ? 'Buy Now' : 
                   user.coins < item.price ? 'Not Enough Coins' : 'Purchase'}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {showPaymentModal && selectedItem && (
        <StripeCheckout
          itemId={selectedItem.id}
          amount={selectedItem.price}
          description={`${selectedItem.name} - ${selectedItem.description}`}
          coins={selectedItem.coins}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};

export default Store;

