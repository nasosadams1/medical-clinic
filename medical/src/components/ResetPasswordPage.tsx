import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react';

type ResetStatus = 'loading' | 'ready' | 'success' | 'error';

const PASSWORD_MIN_LENGTH = 8;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ResetStatus>('loading');
  const [title, setTitle] = useState('Preparing password reset');
  const [message, setMessage] = useState('We are validating your recovery link and establishing a secure reset session.');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordError = useMemo(() => {
    if (!password) return '';
    if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    return '';
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) return '';
    if (confirmPassword !== password) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, password]);

  useEffect(() => {
    let cancelled = false;

    const prepareRecoverySession = async () => {
      try {
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
        }

        if (window.location.hash || searchParams.get('token_hash') || searchParams.get('type')) {
          window.history.replaceState({}, document.title, '/auth/reset-password');
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          throw new Error('This password reset link is invalid or has expired. Request a new reset email and try again.');
        }

        if (cancelled) return;
        setStatus('ready');
        setTitle('Create a new password');
        setMessage('Choose a strong password for your account. Once saved, you can sign in immediately with the new password.');
      } catch (error: any) {
        if (cancelled) return;
        setStatus('error');
        setTitle('Password reset link is not valid');
        setMessage(error?.message || 'We could not start a secure password reset session. Request a new reset email and try again.');
      }
    };

    prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwordError || confirmError) {
      setFormError(passwordError || confirmError);
      return;
    }

    if (!password || !confirmPassword) {
      setFormError('Enter and confirm your new password.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatus('success');
      setTitle('Password updated');
      setMessage('Your password has been changed successfully. You can now return to the app and sign in with the new password.');
    } catch (error: any) {
      setFormError(error?.message || 'We could not update your password. Try again or request a new reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-slate-950 px-8 py-10 text-white sm:px-10 sm:py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              <ShieldCheck className="h-4 w-4" />
              Account Recovery
            </div>
            <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
              Reset your password securely.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
              This page completes the recovery flow from your email. Reset links are single-use and should only be opened by the account owner.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Recommended password standard</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use at least 8 characters and avoid reusing passwords from other services.
              </p>
            </div>
          </div>

          <div className="px-8 py-10 sm:px-10 sm:py-12">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              status === 'error'
                ? 'bg-amber-100 text-amber-700'
                : status === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
            }`}>
              {status === 'loading' ? 'Preparing' : status === 'ready' ? 'Ready' : status === 'success' ? 'Updated' : 'Action needed'}
            </div>

            <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-blue-600" />}
              {status === 'ready' && <Lock className="h-8 w-8 text-slate-900" />}
              {status === 'success' && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}
              {status === 'error' && <AlertTriangle className="h-8 w-8 text-amber-600" />}
            </div>

            <h2 className="mt-6 text-3xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{message}</p>

            {status === 'ready' && (
              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="reset-password" className="text-sm font-medium text-slate-700">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition ${
                      passwordError || formError ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
                    }`}
                    placeholder="Create a new password"
                    autoComplete="new-password"
                  />
                  <p className={`text-xs ${passwordError ? 'text-red-600' : 'text-slate-500'}`}>
                    {passwordError || `Use at least ${PASSWORD_MIN_LENGTH} characters.`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="reset-password-confirm" className="text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <input
                    id="reset-password-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition ${
                      confirmError || formError ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
                    }`}
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                  />
                  <p className={`text-xs ${confirmError ? 'text-red-600' : 'text-slate-500'}`}>
                    {confirmError || 'Re-enter the same password to confirm the change.'}
                  </p>
                </div>

                {formError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !!passwordError || !!confirmError}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  <span>{isSubmitting ? 'Updating password...' : 'Save new password'}</span>
                </button>
              </form>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Return to Codhak
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
