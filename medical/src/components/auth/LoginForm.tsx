import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'

interface LoginFormProps {
  onToggleForm: () => void
  onForgotPassword: () => void
  onMessage: (type: 'success' | 'error' | 'info', message: string) => void
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

const inputClassName = (hasError: boolean) =>
  `w-full rounded-2xl border bg-slate-950/70 px-11 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 ${
    hasError
      ? 'border-rose-400/40 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20'
      : 'border-white/10 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20'
  }`

const helperMessageClassName = (tone: 'error' | 'muted' = 'muted') =>
  tone === 'error' ? 'text-rose-300' : 'text-slate-400'

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.7 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.8-2.7C17.1 3.2 14.8 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.7-4.1 9.7-9.8 0-.7-.1-1.2-.2-1.7H12Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.5l-3.2-2.6c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3l-3.3 2.5C4.6 19.5 8 22 12 22Z" />
    <path fill="#4A90E2" d="M3 7.9l3.3 2.4C7.1 7.8 9.4 6 12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8C17 3.1 14.7 2 12 2 8 2 4.6 4.5 3 7.9Z" />
    <path fill="#FBBC05" d="M6.2 13.6c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6L3 7.9C2.3 9.2 2 10.6 2 12s.3 2.8 1 4.1l3.2-2.5Z" />
  </svg>
)

const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm, onForgotPassword, onMessage }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  })

  const { signIn, signInWithGoogle } = useAuth()

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address'
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 6) return 'Password must be at least 6 characters'
    return undefined
  }

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {}

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError) nextErrors.email = emailError
    if (passwordError) nextErrors.password = passwordError

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value)
      if (touched.email) {
        setErrors((prev) => ({ ...prev, email: validateEmail(value) }))
      }
    } else {
      setPassword(value)
      if (touched.password) {
        setErrors((prev) => ({ ...prev, password: validatePassword(value) }))
      }
    }

    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }))
    }
  }

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }))
    } else {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }))
    }
  }

  const getErrorMessage = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
      'Email not confirmed': 'Please verify your email address before signing in.',
      'Too many requests': 'Too many login attempts. Please wait a few minutes before trying again.',
      'User not found': 'No account found with this email address.',
      'Invalid email or password': 'The email or password you entered is incorrect.',
      'Network error': 'Connection failed. Please check your internet connection and try again.',
      'Signup disabled': 'New registrations are temporarily disabled. Please try again later.',
      'Failed to fetch': 'Connection failed. Please check your internet connection and try again.',
    }

    return errorMap[error] || error || 'An unexpected error occurred. Please try again.'
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const isValid = validateForm()
    if (!isValid) {
      onMessage('error', 'Please fix the errors below and try again.')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const result = await signIn(email.trim(), password)

      if (result?.error) {
        const friendlyMessage = getErrorMessage(result.error.message)
        setErrors({ general: friendlyMessage })
        onMessage('error', friendlyMessage)
      }
    } catch (error: any) {
      const friendlyMessage = getErrorMessage(error.message)
      setErrors({ general: friendlyMessage })
      onMessage('error', friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setErrors({})

    try {
      const result = await signInWithGoogle()
      if (result?.error) {
        const friendlyMessage = getErrorMessage(result.error.message)
        setErrors({ general: friendlyMessage })
        onMessage('error', friendlyMessage)
      }
    } catch (error: any) {
      const friendlyMessage = 'Google sign-in failed. Please try again or use email and password.'
      setErrors({ general: friendlyMessage })
      onMessage('error', friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = Boolean(email.trim() && password && !errors.email && !errors.password)

  return (
    <div className="w-full">
      <motion.div
        className="mb-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Sign in to save benchmark reports, practice history, duel outcomes, and team access.
        </p>
      </motion.div>

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark />
          <span>Continue with Google</span>
        </button>
      </motion.div>

      <div className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        <div className="h-px flex-1 bg-white/10" />
        <span>Email</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <p className="leading-6">{errors.general}</p>
          </motion.div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-200">
            Email address
          </label>
          <div className="relative">
            <Mail className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${errors.email ? 'text-rose-300' : 'text-slate-500'}`} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => handleInputChange('email', event.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="name@company.com"
              className={inputClassName(Boolean(errors.email))}
              disabled={loading}
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email ? (
            <motion.p
              id="email-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 text-sm ${helperMessageClassName('error')}`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>{errors.email}</span>
            </motion.p>
          ) : (
            <p className={`text-xs ${helperMessageClassName()}`}>Use the email attached to your Codhak workspace.</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-200">
            Password
          </label>
          <div className="relative">
            <Lock className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${errors.password ? 'text-rose-300' : 'text-slate-500'}`} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => handleInputChange('password', event.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder="Enter your password"
              className={inputClassName(Boolean(errors.password))}
              disabled={loading}
              autoComplete="current-password"
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password ? (
            <motion.p
              id="password-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 text-sm ${helperMessageClassName('error')}`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>{errors.password}</span>
            </motion.p>
          ) : (
            <p className={`text-xs ${helperMessageClassName()}`}>Use at least 6 characters.</p>
          )}
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            disabled={loading}
          >
            Forgot your password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </motion.form>

      <motion.div
        className="mt-8 text-center text-sm text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24 }}
      >
        <p>
          Need an account to save your roadmap?{' '}
          <button
            onClick={onToggleForm}
            className="font-medium text-cyan-300 transition hover:text-cyan-200"
            disabled={loading}
          >
            Create one now
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default LoginForm
