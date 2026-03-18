import React, { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'

interface ForgotPasswordFormProps {
  onBack: () => void
  onMessage: (type: 'success' | 'error' | 'info', message: string) => void
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack, onMessage }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)

  const { resetPassword } = useAuth()

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address'
    return undefined
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (touched) {
      const emailError = validateEmail(value)
      setError(emailError || '')
    }
    if (error && value.trim()) {
      setError('')
    }
  }

  const handleBlur = () => {
    setTouched(true)
    const emailError = validateEmail(email)
    setError(emailError || '')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      setTouched(true)
      onMessage('error', emailError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await resetPassword(email.trim())

      if (resetError) {
        const errorMessage = resetError.message || 'Failed to send reset email. Please try again.'
        setError(errorMessage)
        onMessage('error', errorMessage)
      } else {
        setSent(true)
        onMessage('success', 'Password reset email sent. Check your inbox.')
      }
    } catch (requestError: any) {
      const errorMessage = requestError.message || 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      onMessage('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleTryAgain = () => {
    setSent(false)
    setEmail('')
    setError('')
    setTouched(false)
  }

  if (sent) {
    return (
      <motion.div
        className="w-full text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.16)]">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-semibold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-slate-300">We sent a password reset link to</p>
          <p className="mt-1 font-semibold text-white">{email}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-left">
            <h3 className="font-semibold text-white">Next steps</h3>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              <li>1. Open the reset email from Codhak.</li>
              <li>2. Use the link to choose a new password.</li>
              <li>3. Return here and sign in to continue your benchmark plan.</li>
            </ol>
          </div>

          <button
            onClick={handleTryAgain}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Try another email
          </button>

          <button
            onClick={onBack}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>

          <div className="rounded-[1.5rem] border border-amber-400/25 bg-amber-400/10 p-4 text-left text-sm leading-6 text-amber-100">
            Did not receive the email? Check spam, promotions, or social tabs, then wait a few minutes before requesting another one.
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full">
      <motion.button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -4 }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </motion.button>

      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.16)]">
          <Mail className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-semibold text-white">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Enter your email and we will send you a secure link to reset your password.
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <p className="leading-6">{error}</p>
          </motion.div>
        )}

        <div className="space-y-2">
          <label htmlFor="reset-email" className="block text-sm font-medium text-slate-200">
            Email address
          </label>
          <div className="relative">
            <Mail className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${error ? 'text-rose-300' : 'text-slate-500'}`} />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              onBlur={handleBlur}
              placeholder="name@company.com"
              className={`w-full rounded-2xl border bg-slate-950/70 px-11 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 ${
                error
                  ? 'border-rose-400/40 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20'
                  : 'border-white/10 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20'
              }`}
              disabled={loading}
              autoComplete="email"
            />
            {!error && email && touched && validateEmail(email) === undefined && (
              <CheckCircle className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300" />
            )}
          </div>
          {error && touched ? (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </motion.p>
          ) : (
            <p className="text-xs text-slate-400">We will only email password reset instructions to this address.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(error) || !email.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sending reset link...</span>
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </motion.form>

      <motion.div
        className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
          <div>
            <h3 className="font-semibold text-white">Security tips</h3>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
              <li>Use a strong, unique password.</li>
              <li>Do not share your password with anyone.</li>
              <li>Use a password manager if possible.</li>
              <li>Keep only the latest reset email if you request multiple links.</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ForgotPasswordForm
