import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { X, Lock, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StripeCheckoutProps {
  itemId: string;
  amount: number;
  description: string;
  coins?: number;
  onSuccess: (paymentResult: any) => void | Promise<void>;
  onError: (error: string) => void;
  onClose: () => void;
}

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_SERVER_URL = import.meta.env.VITE_STRIPE_SERVER_URL || 'http://localhost:3001';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null);

const CheckoutForm: React.FC<StripeCheckoutProps> = ({
  itemId,
  amount,
  description,
  coins,
  onSuccess,
  onError,
  onClose
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSecret, setClientSecret] = useState('');
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error('You must be signed in to make a purchase.');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  };

  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      onErrorRef.current('Stripe publishable key is not configured.');
      return;
    }

    let cancelled = false;

    const createPaymentIntent = async () => {
      try {
        const response = await fetch(`${STRIPE_SERVER_URL}/api/create-payment-intent`, {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ itemId }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to create payment intent');
        }

        if (!cancelled) {
          setClientSecret(payload.client_secret || '');
        }
      } catch (error) {
        if (!cancelled) {
          onErrorRef.current(error instanceof Error ? error.message : 'Failed to initialize payment');
        }
      }
    };

    setClientSecret('');
    createPaymentIntent();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !validateForm() || !clientSecret) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found');
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name,
            email,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent?.status !== 'succeeded') {
        throw new Error(`Payment was not successful (${paymentIntent?.status || 'unknown status'})`);
      }

      const confirmationResponse = await fetch(`${STRIPE_SERVER_URL}/api/confirm-payment`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ payment_intent_id: paymentIntent.id }),
      });

      const confirmationPayload = await confirmationResponse.json().catch(() => ({}));
      if (!confirmationResponse.ok) {
        throw new Error(confirmationPayload.error || 'Payment was captured but fulfillment failed.');
      }

      if (!confirmationPayload.success || !confirmationPayload.fulfilled) {
        throw new Error('Payment succeeded, but the purchase could not be fulfilled.');
      }

      await onSuccess(confirmationPayload);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        padding: '12px',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center text-lg font-bold text-gray-900 sm:text-xl">
              <Shield className="w-6 h-6 mr-2 text-green-500" />
              Secure Payment
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-gray-700">Total Amount</span>
              <span className="text-xl font-bold text-gray-900 sm:text-2xl">USD {(amount / 100).toFixed(2)}</span>
            </div>
            <p className="text-gray-600 text-sm">{description}</p>
            {coins ? (
              <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium">You will receive {coins.toLocaleString()} coins</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="John Doe"
                required
              />
              {errors.name ? <p className="text-red-500 text-sm mt-1">{errors.name}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${errors.email ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="john@example.com"
                required
              />
              {errors.email ? <p className="text-red-500 text-sm mt-1">{errors.email}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Card Information *</label>
              <div className="border border-gray-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <CardElement options={cardElementOptions} />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4" />
              <span>Your payment information is encrypted and handled by Stripe</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing || !clientSecret || !stripe}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-500 to-blue-600 py-4 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing Payment...
              </div>
            ) : (
              `Pay USD ${(amount / 100).toFixed(2)}`
            )}
          </button>
        </form>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500 sm:gap-4">
            <span>Powered by Stripe</span>
            <span>�</span>
            <span>Encrypted</span>
            <span>�</span>
            <span>PCI Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default StripeCheckout;
