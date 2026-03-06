import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  UserRound,
  RefreshCw,
  Save,
  LogOut,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { updateDisplayName } from '../lib/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const Account: React.FC = () => {
  const { user, updateUser, addNotification, isAuthenticated } = useUser();
  const {
    user: authUser,
    resetPassword,
    confirmUser,
    signOut,
    updateProfile,
    refetchProfile,
  } = useAuth();

  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [displayNameError, setDisplayNameError] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setDisplayName(user?.name ?? '');
    setDisplayNameError('');
  }, [user?.name]);

  const accountEmail = authUser?.email ?? '';
  const isEmailVerified = !!authUser?.email_confirmed_at;
  const hasNameChanges = displayName.trim() !== (user?.name ?? '');

  const lastSignIn = useMemo(() => {
    if (!authUser?.last_sign_in_at) return 'Unknown';

    return new Date(authUser.last_sign_in_at).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [authUser?.last_sign_in_at]);

  if (!user || !authUser || !isAuthenticated()) {
    return null;
  }

  const validateDisplayName = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return 'Display name is required.';
    if (trimmed.length < 4) return 'Display name must be at least 4 characters.';
    if (trimmed.length > 16) return 'Display name must be 16 characters or less.';
    if (!USERNAME_REGEX.test(trimmed)) return 'Use only letters, numbers, and underscores.';
    return '';
  };

  const handleSaveDisplayName = async () => {
    const trimmed = displayName.trim();
    const error = validateDisplayName(trimmed);
    setDisplayNameError(error);

    if (error || !hasNameChanges) return;

    setIsSavingName(true);

    try {
      const authUpdate = await updateDisplayName(trimmed);
      if (authUpdate.error) {
        throw authUpdate.error;
      }

      await updateUser({ name: trimmed });
      await updateProfile({ name: trimmed });
      await refetchProfile();

      addNotification({
        message: 'Account name updated successfully.',
        type: 'success',
        icon: '\u{2705}',
      });
    } catch (error: any) {
      setDisplayNameError(error?.message || 'We could not save your account name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!accountEmail || isSendingReset) return;

    setIsSendingReset(true);
    try {
      const { error } = await resetPassword(accountEmail);
      if (error) throw error;

      addNotification({
        message: `Password reset instructions were sent to ${accountEmail}.`,
        type: 'info',
        icon: '\u{1F512}',
      });
    } catch (error: any) {
      addNotification({
        message: error?.message || 'We could not send the password reset email.',
        type: 'error',
        icon: '\u{26A0}',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendVerification = async () => {
    if (!accountEmail || isResendingVerification || isEmailVerified) return;

    setIsResendingVerification(true);
    try {
      const { error } = await confirmUser(accountEmail);
      if (error) throw error;

      addNotification({
        message: `A new verification email was sent to ${accountEmail}.`,
        type: 'success',
        icon: '\u{2709}',
      });
    } catch (error: any) {
      addNotification({
        message: error?.message || 'We could not resend the verification email.',
        type: 'error',
        icon: '\u{26A0}',
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <ShieldCheck className="h-4 w-4" />
                Account
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">Account management</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Manage your identity, email verification, and recovery settings from one place. This screen is designed to be the single source of truth for account-level changes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Email status</div>
                <div className={`mt-1 text-sm font-semibold ${isEmailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isEmailVerified ? 'Verified' : 'Verification pending'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Last sign-in</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{lastSignIn}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Identity</h2>
                <p className="mt-1 text-sm text-slate-600">
                  This is the name shown across lessons, rankings, and profile surfaces.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <label htmlFor="account-display-name" className="text-sm font-medium text-slate-700">
                Display name
              </label>
              <input
                id="account-display-name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (displayNameError) {
                    setDisplayNameError(validateDisplayName(e.target.value));
                  }
                }}
                onBlur={() => setDisplayNameError(validateDisplayName(displayName))}
                maxLength={16}
                className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition ${
                  displayNameError
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
                }`}
                placeholder="Enter your display name"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={displayNameError ? 'text-red-600' : 'text-slate-500'}>
                  {displayNameError || 'Use 4-16 characters. Letters, numbers, and underscores only.'}
                </span>
                <span className="text-slate-400">{displayName.length}/16</span>
              </div>

              <button
                type="button"
                onClick={handleSaveDisplayName}
                disabled={!hasNameChanges || !!displayNameError || isSavingName}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSavingName ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{isSavingName ? 'Saving changes...' : 'Save display name'}</span>
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Email</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Password recovery and verification are tied to this address.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Primary email</div>
                <div className="mt-2 break-all text-sm font-semibold text-slate-900">{accountEmail}</div>
              </div>

              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResendingVerification ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  <span>{isResendingVerification ? 'Sending verification...' : 'Resend verification email'}</span>
                </button>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8 xl:col-span-2">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Security</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Use email-based recovery to rotate credentials without exposing password state in the client.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isSendingReset}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSendingReset ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>{isSendingReset ? 'Sending reset email...' : 'Send password reset email'}</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span>{isSigningOut ? 'Signing out...' : 'Sign out of this session'}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Account;


