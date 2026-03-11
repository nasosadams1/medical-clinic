import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  UserRound,
  RefreshCw,
  Save,
  LogOut,
  FileText,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import AccountFeedbackPanel from './account/AccountFeedbackPanel';
import AccountFeedbackAdminPanel from './account/AccountFeedbackAdminPanel';
import AccountDuelModerationPanel from './account/AccountDuelModerationPanel';
import MascotIcon from './branding/MascotIcon';
import { acceptLatestLegalDocuments, fetchLegalStatus, getLegalDocumentLinks, type LegalStatusResponse } from '../lib/legal';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Account: React.FC = () => {
  const { user, updateUser, addNotification, isAuthenticated } = useUser();
  const {
    user: authUser,
    resetPassword,
    updateEmail,
    confirmUser,
    signOut,
    updateProfile,
  } = useAuth();

  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [displayNameError, setDisplayNameError] = useState('');
  const [pendingEmail, setPendingEmail] = useState(authUser?.email ?? '');
  const [emailError, setEmailError] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [legalStatus, setLegalStatus] = useState<LegalStatusResponse | null>(null);
  const [isLoadingLegal, setIsLoadingLegal] = useState(true);
  const [isAcceptingLegal, setIsAcceptingLegal] = useState(false);

  useEffect(() => {
    if (isSavingName) return;
    setDisplayName(user?.name ?? '');
    setDisplayNameError('');
  }, [user?.name, isSavingName]);

  useEffect(() => {
    if (isUpdatingEmail) return;
    setPendingEmail(authUser?.email ?? '');
    setEmailError('');
  }, [authUser?.email, isUpdatingEmail]);

  const accountEmail = authUser?.email ?? '';
  const isEmailVerified = !!authUser?.email_confirmed_at;
  const hasNameChanges = displayName.trim() !== (user?.name ?? '');
  const hasEmailChanges = pendingEmail.trim().toLowerCase() !== accountEmail.trim().toLowerCase();

  const legalDocuments = useMemo(() => getLegalDocumentLinks(), []);

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

  useEffect(() => {
    let cancelled = false;

    const loadLegalStatus = async () => {
      setIsLoadingLegal(true);
      try {
        const nextStatus = await fetchLegalStatus();
        if (!cancelled) {
          setLegalStatus(nextStatus);
        }
      } catch (error) {
        if (!cancelled) {
          setLegalStatus(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLegal(false);
        }
      }
    };

    if (authUser?.id) {
      void loadLegalStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);
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

  const validateEmail = (value: string) => {
    const trimmed = value.trim().toLowerCase();

    if (!trimmed) return 'Email is required.';
    if (!EMAIL_REGEX.test(trimmed)) return 'Enter a valid email address.';
    if (trimmed === accountEmail.trim().toLowerCase()) return 'Use a different email address.';
    return '';
  };

  const handleSaveDisplayName = async () => {
    const trimmed = displayName.trim();
    const error = validateDisplayName(trimmed);
    const previousName = user.name;

    setDisplayNameError(error);
    if (error || !hasNameChanges) return;

    setIsSavingName(true);

    try {
      await updateUser({ name: trimmed });
      await updateProfile({ name: trimmed });

      addNotification({
        message: 'Account name updated successfully.',
        type: 'success',
        icon: '\u{2705}',
      });
    } catch (error: any) {
      await updateUser({ name: previousName });
      setDisplayName(previousName);
      setDisplayNameError(error?.message || 'We could not save your account name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    const trimmed = pendingEmail.trim().toLowerCase();
    const error = validateEmail(trimmed);

    setEmailError(error);
    if (error || !hasEmailChanges || isUpdatingEmail) return;

    setIsUpdatingEmail(true);
    try {
      const { error: updateError } = await updateEmail(trimmed);
      if (updateError) throw updateError;

      addNotification({
        message: `Email update request sent to ${trimmed}. Confirm the change from your inbox to complete it.`,
        type: 'success',
        icon: '\u{2709}',
      });
    } catch (error: any) {
      setEmailError(error?.message || 'We could not start the email change process.');
    } finally {
      setIsUpdatingEmail(false);
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


  const handleAcceptCurrentPolicies = async () => {
    if (isAcceptingLegal) return;

    setIsAcceptingLegal(true);
    try {
      const nextStatus = await acceptLatestLegalDocuments('account');
      setLegalStatus(nextStatus);
      addNotification({
        message: 'Current legal documents accepted successfully.',
        type: 'success',
        icon: '\u{2705}',
      });
    } catch (error: any) {
      addNotification({
        message: error?.message || 'We could not record legal acceptance.',
        type: 'error',
        icon: '\u{26A0}',
      });
    } finally {
      setIsAcceptingLegal(false);
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
                <div className="h-4 w-4">
                  <MascotIcon mascot="learn" className="h-full w-full" imageClassName="drop-shadow-sm" />
                </div>
                Account
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">Account management</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Manage your identity, email ownership, and account recovery from one place.
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

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
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

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span>{isSigningOut ? 'Signing out...' : 'Sign out of this session'}</span>
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Email and password</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Change your email address and start password recovery from the same place.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="space-y-3">
                <label htmlFor="account-email" className="text-sm font-medium text-slate-700">
                  Change email
                </label>
                <input
                  id="account-email"
                  type="email"
                  value={pendingEmail}
                  onChange={(e) => {
                    setPendingEmail(e.target.value);
                    if (emailError) {
                      setEmailError(validateEmail(e.target.value));
                    }
                  }}
                  onBlur={() => setEmailError(validateEmail(pendingEmail))}
                  className={`w-full rounded-2xl border px-4 py-3 text-base text-slate-900 outline-none transition ${
                    emailError
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
                  }`}
                  placeholder="Enter your new email address"
                />
                <div className="text-xs">
                  <span className={emailError ? 'text-red-600' : 'text-slate-500'}>
                    {emailError || 'We send a confirmation link to the new address before the change is applied.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUpdateEmail}
                  disabled={isUpdatingEmail || !hasEmailChanges || !!emailError}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isUpdatingEmail ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  <span>{isUpdatingEmail ? 'Sending email update...' : 'Send email change confirmation'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isSendingReset}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSendingReset ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>{isSendingReset ? 'Sending reset email...' : 'Send password reset email'}</span>
              </button>

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
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Legal and billing</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review the policies that govern account use, privacy, and digital purchases.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {legalDocuments.map((document) => {
              const acceptance = legalStatus?.acceptances?.[document.key];
              return (
                <div key={document.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{document.title}</div>
                      <div className="mt-1 text-xs text-slate-500">Version {document.version}</div>
                    </div>
                    {acceptance?.isCurrent ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <div className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Update needed
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    {acceptance?.isCurrent
                      ? `Accepted ${new Date(acceptance.acceptedAt || '').toLocaleString()}`
                      : 'Not yet accepted on this version.'}
                  </div>

                  <Link
                    to={document.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
                  >
                    Open document
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {isLoadingLegal
                ? 'Checking your latest acceptance status...'
                : legalStatus?.allCurrentAccepted
                  ? 'You have accepted the latest Terms of Service, Privacy Policy, and Refund Policy.'
                  : 'You need to accept the latest policy versions before sensitive account and payment actions can rely on current terms.'}
            </p>
            <button
              type="button"
              onClick={handleAcceptCurrentPolicies}
              disabled={isLoadingLegal || isAcceptingLegal || legalStatus?.allCurrentAccepted}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isAcceptingLegal ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span>{isAcceptingLegal ? 'Saving acceptance...' : 'Accept current versions'}</span>
            </button>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <AccountDuelModerationPanel />
          <AccountFeedbackAdminPanel />
          <AccountFeedbackPanel />
        </div>
      </div>
    </div>
  );
};

export default Account;








