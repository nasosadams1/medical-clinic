import React, { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { AlertCircle, CheckCircle2, Lock, Shield, X } from 'lucide-react';
import { resolveApiBaseUrl } from '../lib/apiBase';
import { supabase } from '../lib/supabase';
import { acceptLatestLegalDocuments, fetchLegalStatus, type LegalStatusResponse } from '../lib/legal';
import LegalLinksInline from './legal/LegalLinksInline';

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
const STRIPE_SERVER_URL = (import.meta.env.VITE_STRIPE_SERVER_URL as string | undefined)?.trim() || resolveApiBaseUrl();
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null);

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

const CheckoutForm: React.FC<StripeCheckoutProps> = ({
  itemId,
  amount,
  description,
  coins,
  onSuccess,
  onError,
  onClose,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const onErrorRef = useRef(onError);

  const [processing, setProcessing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientSecret, setClientSecret] = useState('');
  const [legalStatus, setLegalStatus] = useState<LegalStatusResponse | null>(null);
  const [legalLoading, setLegalLoading] = useState(true);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalError, setLegalError] = useState('');

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const hydrateCustomerFields = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) {
        return;
      }

      const nextEmail = data.user?.email || '';
      const nextName = (data.user?.user_metadata?.display_name || data.user?.user_metadata?.name || '').trim();
      if (nextEmail) setEmail(nextEmail);
      if (nextName) setName(nextName);
    };

    hydrateCustomerFields().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLegalStatus = async () => {
      setLegalLoading(true);
      try {
        const nextStatus = await fetchLegalStatus();
        if (!cancelled) {
          setLegalStatus(nextStatus);
          setLegalAccepted(Boolean(nextStatus.allCurrentAccepted));
          setLegalError('');
        }
      } catch (error) {
        if (!cancelled) {
          setLegalStatus(null);
          setLegalError(error instanceof Error ? error.message : 'Could not verify legal acceptance status.');
        }
      } finally {
        if (!cancelled) {
          setLegalLoading(false);
        }
      }
    };

    void loadLegalStatus();

    return () => {
      cancelled = true;
    };
  }, []);

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
    void createPaymentIntent();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Name is required';
    if (!email.trim()) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Email is invalid';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const requiresLegalAcceptance = !legalLoading && !legalStatus?.allCurrentAccepted;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !validateForm() || !clientSecret || legalLoading) {
      return;
    }

    if (requiresLegalAcceptance && !legalAccepted) {
      setLegalError('You must accept the current Terms of Service, Privacy Policy, and Refund Policy before completing this purchase.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found');
      return;
    }

    setProcessing(true);

    try {
      if (requiresLegalAcceptance) {
        const nextStatus = await acceptLatestLegalDocuments('checkout');
        setLegalStatus(nextStatus);
        setLegalAccepted(true);
        setLegalError('');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: name.trim(),
            email: email.trim(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center text-lg font-bold text-gray-900 sm:text-xl">
              <Shield className="mr-2 h-6 w-6 text-green-500" />
              Secure Payment
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close payment modal">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-gray-700">Total Amount</span>
              <span className="text-xl font-bold text-gray-900 sm:text-2xl">USD {(amount / 100).toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
            {coins ? (
              <div className="mt-2 rounded-lg bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-800">You will receive {coins.toLocaleString()} coins</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="John Doe"
                required
              />
              {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${errors.email ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="john@example.com"
                required
              />
              {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Card Information *</label>
              <div className="rounded-lg border border-gray-200 p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <CardElement options={cardElementOptions} />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Lock className="h-4 w-4" />
              <span>Your payment information is encrypted and handled by Stripe.</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {legalLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Checking current legal acceptance status...
              </div>
            ) : legalStatus?.allCurrentAccepted ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Latest legal documents already accepted.
                </div>
                <div className="text-xs text-slate-500">
                  Accepted versions are on file. You can review them here: <LegalLinksInline />.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => {
                      setLegalAccepted(e.target.checked);
                      if (e.target.checked) {
                        setLegalError('');
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    disabled={processing}
                  />
                  <span>
                    I agree to the <LegalLinksInline /> and understand that digital goods are fulfilled under those terms.
                  </span>
                </label>
                {legalError ? (
                  <div className="flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>{legalError}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={processing || legalLoading || !clientSecret || !stripe}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-500 to-blue-600 py-4 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
            <span>/</span>
            <span>Encrypted</span>
            <span>/</span>
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
