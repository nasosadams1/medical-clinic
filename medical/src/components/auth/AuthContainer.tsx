import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'
import ForgotPasswordForm from './ForgotPassword'
import { Code, X, AlertCircle, CheckCircle, Mail, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type AuthView = 'login' | 'signup' | 'forgot-password' | 'email-verification'

interface AuthContainerProps {
  open: boolean
  onClose: () => void
}

const AuthContainer: React.FC<AuthContainerProps> = ({ open, onClose }) => {
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [globalMessage, setGlobalMessage] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const { user, confirmUser } = useAuth()

  useEffect(() => {
    if (user) {
      setGlobalMessage({
        type: 'success',
        message: 'Welcome to Codhak. Your account is ready.'
      })
      setTimeout(() => {
        onClose()
        setGlobalMessage(null)
      }, 1600)
    }
  }, [user, onClose])

  useEffect(() => {
    if (!open) {
      setCurrentView('login')
      setEmail('')
      setGlobalMessage(null)
      setIsResending(false)
      setResendCooldown(0)
    }
  }, [open])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

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
      message: 'Verification email sent. Confirm your address to activate your account and finish setup.'
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
        handleGlobalMessage('success', `A new verification email was sent to ${email}.`)
      }
    } catch (error: any) {
      handleGlobalMessage('error', error?.message || 'We could not resend the verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.2
      }
    }
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-2 sm:p-4 overflow-y-auto"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full relative overflow-hidden my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-0"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <button
            onClick={onClose}
            className="sticky top-2 sm:top-4 right-2 sm:right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 ml-auto block"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center pt-4 pb-6 px-4 sm:px-8 bg-gradient-to-br from-blue-50 to-purple-50">
            <motion.div
              className="flex items-center justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Code className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </motion.div>
            <motion.h2
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Codhak
            </motion.h2>
            <motion.p
              className="text-gray-600 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Learn coding through interactive lessons
            </motion.p>
          </div>

          <AnimatePresence>
            {globalMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 sm:px-8"
              >
                <div className={`p-4 rounded-lg mb-4 flex items-center space-x-3 ${
                  globalMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
                  globalMessage.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  {globalMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  {globalMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                  {globalMessage.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                  <p className={`text-sm font-medium ${
                    globalMessage.type === 'success' ? 'text-green-800' :
                    globalMessage.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {globalMessage.message}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 sm:px-8 pb-8 overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentView === 'login' && (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <LoginForm onToggleForm={handleToggleForm} onForgotPassword={handleForgotPassword} onMessage={handleGlobalMessage} />
                </motion.div>
              )}

              {currentView === 'signup' && (
                <motion.div key="signup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <SignUpForm onToggleForm={handleToggleForm} onEmailVerification={handleEmailVerification} onMessage={handleGlobalMessage} />
                </motion.div>
              )}

              {currentView === 'forgot-password' && (
                <motion.div key="forgot-password" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <ForgotPasswordForm onBack={handleBackToLogin} onMessage={handleGlobalMessage} />
                </motion.div>
              )}

              {currentView === 'email-verification' && (
                <motion.div key="email-verification" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                        <Mail className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Check your email</h3>
                      <p className="mt-2 text-sm text-gray-600">
                        We sent a verification link to <span className="font-semibold text-gray-900">{email}</span>.
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                        <div className="text-sm text-gray-700">
                          <p className="font-medium text-gray-900">Finish setup securely</p>
                          <p className="mt-1">Open the email on this device and use the confirmation link. If you do not see it, check spam, promotions, or social tabs.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={isResending || resendCooldown > 0}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                        <span>
                          {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend verification email'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentView('signup')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Use a different email</span>
                      </button>
                    </div>

                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                      The link can expire. If it does, request a fresh email here and use the newest one only.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {user && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Setting up your account...</p>
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


