import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.ts'
import { CheckCircle2, AlertTriangle, Loader2, MailCheck, ArrowRight, RotateCcw } from 'lucide-react'

type ConfirmStatus = 'loading' | 'success' | 'error'

const REDIRECT_DELAY_MS = 2200

const AuthConfirm: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<ConfirmStatus>('loading')
  const [title, setTitle] = useState('Verifying your email')
  const [message, setMessage] = useState('We are securely confirming your account.')

  const confirmationParams = useMemo(() => {
    return {
      tokenHash: searchParams.get('token_hash'),
      type: searchParams.get('type')
    }
  }, [searchParams])

  useEffect(() => {
    let redirectTimer: number | null = null

    const verifyEmail = async () => {
      try {
        if (!confirmationParams.tokenHash || !confirmationParams.type) {
          setStatus('error')
          setTitle('This link is not valid')
          setMessage('The confirmation link is incomplete or has already been used. Request a fresh verification email and try again.')
          return
        }

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: confirmationParams.tokenHash,
          type: confirmationParams.type as 'signup' | 'email_change' | 'recovery' | 'invite' | 'email'
        })

        if (error) {
          setStatus('error')
          setTitle('Verification could not be completed')
          setMessage(error.message || 'This verification link has expired or is no longer valid. Return to sign up and request a new email.')
          return
        }

        if (data.user) {
          setStatus('success')
          setTitle('Email verified')
          setMessage('Your account is confirmed and ready to use. We are signing you in now.')
          redirectTimer = window.setTimeout(() => navigate('/'), REDIRECT_DELAY_MS)
          return
        }

        setStatus('error')
        setTitle('Verification could not be completed')
        setMessage('We could not confirm your account from this link. Request a fresh verification email and try again.')
      } catch {
        setStatus('error')
        setTitle('Verification failed')
        setMessage('An unexpected error interrupted verification. Try the link again or request a new email from the sign up screen.')
      }
    }

    verifyEmail()

    return () => {
      if (redirectTimer) window.clearTimeout(redirectTimer)
    }
  }, [confirmationParams, navigate])

  const statusIcon = status === 'loading'
    ? <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    : status === 'success'
      ? <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      : <AlertTriangle className="h-8 w-8 text-amber-600" />

  const statusBadgeClass = status === 'loading'
    ? 'bg-blue-100 text-blue-700'
    : status === 'success'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-slate-950 px-8 py-10 text-white sm:px-10 sm:py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200">
              <MailCheck className="h-4 w-4" />
              Account Security
            </div>
            <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
              Finish setting up your Codhak account.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
              Every new account is verified before it can access lessons, ranks, store purchases, and progression. This keeps recovery, identity, and rewards tied to a real email.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">What happens next</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Once verification succeeds, your session becomes active and you will be returned to the app automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">If the link fails</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Use the newest email only. Older verification links can be invalidated after a resend.
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-10 sm:px-10 sm:py-12">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeClass}`}>
              {status === 'loading' ? 'Processing' : status === 'success' ? 'Verified' : 'Action needed'}
            </div>

            <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              {statusIcon}
            </div>

            <h2 className="mt-6 text-3xl font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {message}
            </p>

            {status === 'success' && (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                Redirecting you back to the app in a moment.
              </div>
            )}

            {status === 'error' && (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                If you requested multiple emails, only the most recent verification link will work.
              </div>
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

              {status === 'error' && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Request a new email
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthConfirm
