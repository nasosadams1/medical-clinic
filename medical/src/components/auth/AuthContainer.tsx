import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'
import ForgotPasswordForm from './ForgotPassword'
import {
  X,
  AlertCircle,
  CheckCircle,
  Mail,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Trophy,
  Target,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import BrandLockup from '../branding/BrandLockup'

export type AuthView = 'login' | 'signup' | 'forgot-password' | 'email-verification'

interface AuthContainerProps {
  open: boolean
  onClose: () => void
  initialView?: AuthView
}

const messageToneClasses = {
  success: {
    wrapper: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
    icon: 'text-emerald-300',
    Icon: CheckCircle,
  },
  error: {
    wrapper: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
    icon: 'text-rose-300',
    Icon: AlertCircle,
  },
  info: {
    wrapper: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100',
    icon: 'text-cyan-300',
    Icon: AlertCircle,
  },
} as const

const authBenefits = [
  { icon: Target, label: 'Save benchmark reports' },
  { icon: Sparkles, label: 'Keep your roadmap synced' },
  { icon: Trophy, label: 'Track duel progress' },
]

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 18,
    transition: {
      duration: 0.18,
    },
  },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const AuthContainer: React.FC<AuthContainerProps> = ({ open, onClose, initialView = 'login' }) => {
  const [currentView, setCurrentView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState('')
  const [globalMessage, setGlobalMessage] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const { user, confirmUser } = useAuth()

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!user) return undefined

    setGlobalMessage({
      type: 'success',
      message: 'Workspace ready. Your reports, practice history, and duel data are now synced.',
    })

    const timer = window.setTimeout(() => {
      onClose()
      setGlobalMessage(null)
    }, 1600)

    return () => window.clearTimeout(timer)
  }, [user, onClose])

  useEffect(() => {
    if (open) {
      setCurrentView(initialView)
    }
  }, [initialView, open])

  useEffect(() => {
    if (!open) {
      setCurrentView(initialView)
      setEmail('')
      setGlobalMessage(null)
      setIsResending(false)
      setResendCooldown(0)
    }
  }, [initialView, open])

  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  const activeMessageTone = useMemo(() => {
    if (!globalMessage) return null
    return messageToneClasses[globalMessage.type]
  }, [globalMessage])

  if (!open) return null

  const handleToggleForm = () => {
    setCurrentView(currentView === 'login' ? 'signup' : 'login')
    setGlobalMessage(null)
  }

  const handleForgotPassword = () => {
    setCurrentView('forgot-password')
    setGlobalMessage(null)
  }

  const handleBackToLogin = () => {
    setCurrentView('login')
    setGlobalMessage(null)
  }

  const handleEmailVerification = (userEmail: string) => {
    setEmail(userEmail)
    setCurrentView('email-verification')
    setGlobalMessage({
      type: 'info',
      message: 'Verification email sent. Confirm your address to activate your Codhak workspace.',
    })
  }

  const handleGlobalMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setGlobalMessage({ type, message })
  }

  const handleResendConfirmation = async () => {
    if (!email || isResending || resendCooldown > 0) return

    setIsResending(true)
    setGlobalMessage(null)

    try {
      const { error } = await confirmUser(email)
      if (error) {
        handleGlobalMessage('error', error.message || 'We could not resend the verification email. Please try again.')
      } else {
        setResendCooldown(30)
        handleGlobalMessage('success', `A fresh verification email was sent to ${email}.`)
      }
    } catch (error: any) {
      handleGlobalMessage('error', error?.message || 'We could not resend the verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-md sm:p-6"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose()
          }
        }}
      >
        <motion.div
          className="relative my-4 w-full max-w-[34rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.98)_100%)] shadow-[0_32px_120px_rgba(2,6,23,0.72)]"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative overflow-hidden border-b border-white/10 px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
            <div className="absolute left-6 top-10 h-24 w-24 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute right-0 top-6 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />

            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <BrandLockup
                mascot="learn"
                title="Codhak"
                subtitle="Save reports, sync your roadmap, and keep your skills history in one benchmark-first workspace."
                className="flex-col items-start gap-3 text-left sm:flex-row sm:items-center"
                iconWrapperClassName="h-20 w-20 sm:h-24 sm:w-24"
                titleClassName="text-3xl text-white sm:text-[2.2rem]"
                subtitleClassName="max-w-md text-sm text-slate-300"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {authBenefits.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur"
                  >
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="font-medium leading-5">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {globalMessage && activeMessageTone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 pt-5 sm:px-8"
              >
                <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${activeMessageTone.wrapper}`}>
                  <activeMessageTone.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${activeMessageTone.icon}`} />
                  <p className="leading-6">{globalMessage.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-h-[65vh] overflow-y-auto px-5 pb-6 pt-5 sm:px-8 sm:pb-8">
            <AnimatePresence mode="wait">
              {currentView === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.24 }}
                >
                  <LoginForm
                    onToggleForm={handleToggleForm}
                    onForgotPassword={handleForgotPassword}
                    onMessage={handleGlobalMessage}
                  />
                </motion.div>
              )}

              {currentView === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.24 }}
                >
                  <SignUpForm
                    onToggleForm={handleToggleForm}
                    onEmailVerification={handleEmailVerification}
                    onMessage={handleGlobalMessage}
                  />
                </motion.div>
              )}

              {currentView === 'forgot-password' && (
                <motion.div
                  key="forgot-password"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.24 }}
                >
                  <ForgotPasswordForm onBack={handleBackToLogin} onMessage={handleGlobalMessage} />
                </motion.div>
              )}

              {currentView === 'email-verification' && (
                <motion.div
                  key="email-verification"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.24 }}
                >
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
                        <Mail className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-semibold text-white">Check your email</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        We sent a verification link to <span className="font-semibold text-white">{email}</span>.
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                        <div className="text-sm leading-6 text-slate-300">
                          <p className="font-semibold text-white">Finish setup securely</p>
                          <p className="mt-1">
                            Open the email on this device and use the confirmation link. If you do not see it,
                            check spam, promotions, or social tabs.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={isResending || resendCooldown > 0}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                      >
                        <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                        <span>
                          {isResending
                            ? 'Sending...'
                            : resendCooldown > 0
                              ? `Resend available in ${resendCooldown}s`
                              : 'Resend verification email'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentView('signup')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Use a different email</span>
                      </button>
                    </div>

                    <div className="rounded-[1.5rem] border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                      The link can expire. If it does, request a fresh email here and use the newest one only.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-cyan-300/40 border-t-cyan-300 animate-spin" />
                  <p className="font-medium text-slate-200">Finalizing your workspace...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AuthContainer
