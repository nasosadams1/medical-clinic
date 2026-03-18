import React, { useMemo, useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import LegalLinksInline from '../legal/LegalLinksInline'
import { clearPendingLegalAcceptance, savePendingLegalAcceptance } from '../../lib/legal'

interface SignUpFormProps {
  onToggleForm: () => void
  onEmailVerification: (email: string) => void
  onMessage: (type: 'success' | 'error' | 'info', message: string) => void
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  legal?: string
  general?: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
  colorClassName: string
  label: string
}

const inputClassName = (hasError: boolean) =>
  `w-full rounded-2xl border bg-slate-950/70 px-11 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 ${
    hasError
      ? 'border-rose-400/40 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20'
      : 'border-white/10 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20'
  }`

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.7 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.8-2.7C17.1 3.2 14.8 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.7-4.1 9.7-9.8 0-.7-.1-1.2-.2-1.7H12Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.5l-3.2-2.6c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3l-3.3 2.5C4.6 19.5 8 22 12 22Z" />
    <path fill="#4A90E2" d="M3 7.9l3.3 2.4C7.1 7.8 9.4 6 12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8C17 3.1 14.7 2 12 2 8 2 4.6 4.5 3 7.9Z" />
    <path fill="#FBBC05" d="M6.2 13.6c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6L3 7.9C2.3 9.2 2 10.6 2 12s.3 2.8 1 4.1l3.2-2.5Z" />
  </svg>
)

const strengthTone = (score: number) => {
  if (score <= 1) return { colorClassName: 'bg-rose-400', label: 'Weak' }
  if (score <= 3) return { colorClassName: 'bg-amber-400', label: 'Fair' }
  if (score === 4) return { colorClassName: 'bg-sky-400', label: 'Good' }
  return { colorClassName: 'bg-emerald-400', label: 'Strong' }
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onToggleForm, onEmailVerification, onMessage }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{
    name: boolean
    email: boolean
    password: boolean
    confirmPassword: boolean
  }>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  })

  const { signUp, signInWithGoogle } = useAuth()

  const checkPasswordStrength = (value: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []

    if (value.length >= 8) score += 1
    else feedback.push('At least 8 characters')

    if (/[a-z]/.test(value)) score += 1
    else feedback.push('One lowercase letter')

    if (/[A-Z]/.test(value)) score += 1
    else feedback.push('One uppercase letter')

    if (/\d/.test(value)) score += 1
    else feedback.push('One number')

    if (/[^a-zA-Z0-9]/.test(value)) score += 1
    else feedback.push('One special character')

    return {
      score,
      feedback,
      ...strengthTone(score),
    }
  }

  const validateName = (value: string): string | undefined => {
    if (!value.trim()) return 'Username is required'
    if (value.trim().length < 4) return 'Username must be at least 4 characters'
    if (value.trim().length > 16) return 'Username must be 16 characters or less'
    if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) return 'Username can only contain letters, numbers, and underscores'
    return undefined
  }

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address'
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'

    const strength = checkPasswordStrength(value)
    if (strength.score < 3) return 'Password is too weak'

    return undefined
  }

  const validateConfirmPassword = (value: string, currentPassword: string): string | undefined => {
    if (!value) return 'Please confirm your password'
    if (value !== currentPassword) return 'Passwords do not match'
    return undefined
  }

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {}

    const nameError = validateName(name)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password)

    if (nameError) nextErrors.name = nameError
    if (emailError) nextErrors.email = emailError
    if (passwordError) nextErrors.password = passwordError
    if (confirmPasswordError) nextErrors.confirmPassword = confirmPasswordError
    if (!acceptedLegal) nextErrors.legal = 'You must accept the Terms of Service, Privacy Policy, and Refund Policy.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleInputChange = (field: keyof FormErrors, value: string) => {
    switch (field) {
      case 'name':
        setName(value)
        if (touched.name) {
          setErrors((prev) => ({ ...prev, name: validateName(value) }))
        }
        break
      case 'email':
        setEmail(value)
        if (touched.email) {
          setErrors((prev) => ({ ...prev, email: validateEmail(value) }))
        }
        break
      case 'password':
        setPassword(value)
        if (touched.password) {
          setErrors((prev) => ({ ...prev, password: validatePassword(value) }))
        }
        if (touched.confirmPassword && confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, value) }))
        }
        break
      case 'confirmPassword':
        setConfirmPassword(value)
        if (touched.confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(value, password) }))
        }
        break
      default:
        break
    }

    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }))
    }
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    switch (field) {
      case 'name':
        setErrors((prev) => ({ ...prev, name: validateName(name) }))
        break
      case 'email':
        setErrors((prev) => ({ ...prev, email: validateEmail(email) }))
        break
      case 'password':
        setErrors((prev) => ({ ...prev, password: validatePassword(password) }))
        break
      case 'confirmPassword':
        setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, password) }))
        break
      default:
        break
    }
  }

  const getErrorMessage = (error: string): string => {
    const errorMap: Record<string, string> = {
      'User already registered': 'An account with this email already exists. Try signing in instead.',
      'Username already taken': 'This username is already taken. Please choose a different one.',
      'Email rate limit exceeded': 'Too many signup attempts. Please wait a few minutes before trying again.',
      'Signup disabled': 'New registrations are temporarily disabled. Please try again later.',
      'Invalid email': 'Please enter a valid email address.',
      'Weak password': 'Password is too weak. Please choose a stronger password.',
      'Network error': 'Connection failed. Please check your internet connection and try again.',
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
      savePendingLegalAcceptance('signup')
      const result = await signUp(email.trim(), password, name.trim())

      if (result?.error) {
        clearPendingLegalAcceptance()
        const friendlyMessage = getErrorMessage(result.error.message)
        setErrors({ general: friendlyMessage })
        onMessage('error', friendlyMessage)
      } else if (result?.needsConfirmation) {
        onEmailVerification(email.trim())
        onMessage('success', 'Account created. Check your inbox to verify your email and finish setup.')
      } else {
        onMessage('success', 'Account created successfully.')
      }
    } catch (error: any) {
      clearPendingLegalAcceptance()
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
        clearPendingLegalAcceptance()
        const friendlyMessage = getErrorMessage(result.error.message)
        setErrors({ general: friendlyMessage })
        onMessage('error', friendlyMessage)
      }
    } catch (error: any) {
      clearPendingLegalAcceptance()
      const friendlyMessage = 'Google sign-up failed. Please try again or use email and password.'
      setErrors({ general: friendlyMessage })
      onMessage('error', friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = useMemo(() => (password ? checkPasswordStrength(password) : null), [password])

  const isFormValid = Boolean(
    name.trim() &&
    email.trim() &&
    password &&
    confirmPassword &&
    acceptedLegal &&
    !errors.name &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword &&
    !errors.legal
  )

  return (
    <div className="w-full">
      <motion.div
        className="mb-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <h1 className="text-3xl font-semibold text-white">Create your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Save benchmark reports, unlock your roadmap, and keep your progress history across practice and duels.
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
          <label htmlFor="name" className="block text-sm font-medium text-slate-200">
            Username
          </label>
          <div className="relative">
            <User className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${errors.name ? 'text-rose-300' : 'text-slate-500'}`} />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => handleInputChange('name', event.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Choose a unique username"
              className={inputClassName(Boolean(errors.name))}
              disabled={loading}
              autoComplete="username"
              maxLength={16}
            />
            {!errors.name && name && touched.name && (
              <CheckCircle className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300" />
            )}
          </div>
          {errors.name ? (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.name}</span>
            </motion.p>
          ) : (
            <p className="text-xs text-slate-400">This becomes your display name and can be changed later in your profile.</p>
          )}
        </div>

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
            />
            {!errors.email && email && touched.email && (
              <CheckCircle className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300" />
            )}
          </div>
          {errors.email && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.email}</span>
            </motion.p>
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
              placeholder="Create a strong password"
              className={inputClassName(Boolean(errors.password))}
              disabled={loading}
              autoComplete="new-password"
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

          {passwordStrength && (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.colorClassName}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-300">{passwordStrength.label}</span>
              </div>
              {passwordStrength.feedback.length > 0 && (
                <p className="text-xs text-slate-400">Missing: {passwordStrength.feedback.join(', ')}</p>
              )}
            </div>
          )}

          {errors.password && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.password}</span>
            </motion.p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
            Confirm password
          </label>
          <div className="relative">
            <Lock className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${errors.confirmPassword ? 'text-rose-300' : 'text-slate-500'}`} />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Confirm your password"
              className={inputClassName(Boolean(errors.confirmPassword))}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            {!errors.confirmPassword && confirmPassword && password && confirmPassword === password && (
              <CheckCircle className="pointer-events-none absolute right-12 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300" />
            )}
          </div>
          {errors.confirmPassword && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.confirmPassword}</span>
            </motion.p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(event) => {
                const isChecked = event.target.checked
                setAcceptedLegal(isChecked)
                setErrors((prev) => ({ ...prev, legal: isChecked ? undefined : prev.legal }))
              }}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400 focus:ring-cyan-400"
              disabled={loading}
            />
            <span className="text-sm leading-6 text-slate-300">
              I agree to the <LegalLinksInline />.
            </span>
          </label>
          {errors.legal && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.legal}</span>
            </motion.p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            'Create account'
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
          Already have an account?{' '}
          <button
            onClick={onToggleForm}
            className="font-medium text-cyan-300 transition hover:text-cyan-200"
            disabled={loading}
          >
            Sign in here
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default SignUpForm
