import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import db, { supabase } from '../../lib/supabase'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [isAuthedForRecovery, setIsAuthedForRecovery] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [successMessage, setSuccessMessage] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [isSendingEmail, setIsSendingEmail] = React.useState(false)
  const [isValidatingEmail, setIsValidatingEmail] = React.useState(false)
  const [hasSentEmail, setHasSentEmail] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  React.useEffect(() => {
    const initFromAuthRedirect = async () => {
      try {
        // Merge hash and search params
        const hash = location.hash || window.location.hash
        const search = location.search || window.location.search
        const mergedParams = new URLSearchParams(
          `${hash?.startsWith('#') ? hash.slice(1) : hash}${hash && search ? '&' : ''}${search?.startsWith('?') ? search.slice(1) : search}`
        )

        // Path A: token_hash flow
        const tokenHash = mergedParams.get('token_hash')
        const typeParam = mergedParams.get('type')
        const emailParam = mergedParams.get('email')
        if (typeParam === 'recovery' && tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash, email: emailParam || undefined })
          if (error) throw error
          setIsAuthedForRecovery(!!data?.session)
          return
        }

        // Path B: hash tokens (access_token/refresh_token)
        const accessToken = mergedParams.get('access_token')
        const refreshToken = mergedParams.get('refresh_token')
        if (typeParam === 'recovery' && accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          setIsAuthedForRecovery(true)
          return
        }

        // Path C: PKCE code flow (?code=...)
        const code = mergedParams.get('code')
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setIsAuthedForRecovery(!!data?.session)
          return
        }

        // Path D: maybe session already set by detectSessionInUrl
        const { data } = await supabase.auth.getSession()
        setIsAuthedForRecovery(!!data.session)
      } catch (error) {
        console.error('Failed to initialize password recovery session:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initFromAuthRedirect()
  }, [location.hash, location.search])

  // React if Supabase sets session after our first render
  React.useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setIsAuthedForRecovery(true)
      }
    })
    return () => {
      subscription.subscription?.unsubscribe()
    }
  }, [])

  const validatePassword = (password) => {
    // Basic policy: at least 8 chars; include a number and a letter
    const hasMinLength = password.length >= 8
    const hasLetter = /[A-Za-z]/.test(password)
    const hasNumber = /\d/.test(password)
    return hasMinLength && hasLetter && hasNumber
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    if (!validatePassword(newPassword)) {
      setErrorMessage('Use at least 8 characters with letters and numbers.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        throw error
      }
      setSuccessMessage('Your password has been updated. Redirecting to sign in...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      console.error('Password update failed:', error)
      setErrorMessage(error.message || 'Failed to update password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendResetEmail = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Enter a valid email address.')
      return
    }

    setIsValidatingEmail(true)
    try {
      // Check if email exists in our users table
      const isAvailable = await db.checkEmailAvailability(email.trim())
      if (isAvailable) {
        setErrorMessage("We couldn't find an account with that email.")
        return
      }
    } catch (error) {
      console.error('Email validation failed:', error)
      setErrorMessage('Unable to validate email at the moment. Please try again later.')
      return
    } finally {
      setIsValidatingEmail(false)
    }

    setIsSendingEmail(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password?recover=1`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setHasSentEmail(true)
      // Briefly show success then redirect
      setTimeout(() => navigate('/login'), 2000)
    } catch (error) {
      console.error('Failed to send reset email:', error)
      setErrorMessage(error.message || 'Failed to send reset link. Please try again later.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Determine if URL already indicates a recovery flow so we can show the right UI immediately
  const mergedParamsForRender = React.useMemo(() => {
    const hash = location.hash || window.location.hash
    const search = location.search || window.location.search
    return new URLSearchParams(
      `${hash?.startsWith('#') ? hash.slice(1) : hash}${hash && search ? '&' : ''}${search?.startsWith('?') ? search.slice(1) : search}`
    )
  }, [location.hash, location.search])
  const typeParamForRender = mergedParamsForRender.get('type')
  const recoverParamRaw = mergedParamsForRender.get('recover')
  const recoverFlag = mergedParamsForRender.has('recover') || (recoverParamRaw ? recoverParamRaw.startsWith('1') : false)
  const hasRecoveryParams = (
    typeParamForRender === 'recovery' ||
    !!mergedParamsForRender.get('token_hash') ||
    !!mergedParamsForRender.get('access_token') ||
    !!mergedParamsForRender.get('code') ||
    recoverFlag
  )

  // Error handling for expired/invalid links (e.g., error=access_denied&error_code=otp_expired)
  const errorParam = mergedParamsForRender.get('error')
  const errorCodeParam = mergedParamsForRender.get('error_code')
  const isOtpExpired = errorParam === 'access_denied' && errorCodeParam === 'otp_expired'

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <Link to="/" aria-label="Go to homepage" className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-skyblue-500 rounded">
            <img src="/hopelinklogo.png" alt="HopeLink logo" className="h-20 w-32 sm:h-24 sm:w-36 rounded" />
          </Link>
          {isAuthedForRecovery || hasRecoveryParams ? (
            <>
              <h1 className="mt-5 text-center text-2xl sm:text-3xl font-semibold text-white tracking-tight">Set a new password</h1>
              <p className="mt-2 text-center text-skyblue-300 text-sm sm:text-base max-w-prose">Choose a strong password to protect your account.</p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-center text-2xl sm:text-3xl font-semibold text-white tracking-tight">Reset your password</h1>
              <p className="mt-2 text-center text-skyblue-300 text-sm sm:text-base max-w-prose">Enter your email and we’ll send you a reset link.</p>
            </>
          )}
        </div>

        {isInitializing ? (
          <p className="mt-4 text-center text-skyblue-300">Preparing your reset session...</p>
        ) : isOtpExpired ? (
          <div className="mt-6 bg-navy-900/80 backdrop-blur-sm border border-amber-600/40 rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <h2 className="text-white font-semibold">Your reset link has expired</h2>
                <p className="mt-1 text-skyblue-200 text-sm">For your security, reset links expire after a short time. Request a new email to continue.</p>
              </div>
            </div>
            <form onSubmit={handleSendResetEmail} className="space-y-4 mt-4" noValidate>
              <div>
                <label htmlFor="email-expired" className="block text-sm font-medium text-skyblue-200">Email address</label>
                <input
                  id="email-expired"
                  type="email"
                  className="mt-1 input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isSendingEmail || isValidatingEmail}>
                {isValidatingEmail ? 'Checking…' : isSendingEmail ? 'Sending…' : 'Send a new reset link'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-skyblue-400 hover:text-skyblue-300">Back to Sign In</Link>
              </div>
            </form>
          </div>
        ) : !(isAuthedForRecovery || hasRecoveryParams) ? (
          <div className="mt-6 bg-navy-900/80 backdrop-blur-sm border border-navy-700 rounded-xl p-6 shadow-xl">
            {hasSentEmail ? (
              <div className="flex flex-col items-center text-center">
                <svg className="h-12 w-12 text-success-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" role="img" aria-label="Email sent">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="mt-3 text-white font-semibold">Check your email</p>
                <p className="mt-1 text-skyblue-200 text-sm">We've sent a password reset link to <span className="font-medium">{email}</span>. Redirecting to sign in…</p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSendResetEmail} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-skyblue-200">Email address</label>
                    <input
                      id="email"
                      type="email"
                      className="mt-1 input w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      aria-required="true"
                      autoComplete="email"
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-secondary-400 text-sm" role="alert" aria-live="polite">{errorMessage}</p>
                  )}
                  {successMessage && (
                    <p className="text-success-400 text-sm" role="status" aria-live="polite">{successMessage}</p>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSendingEmail || isValidatingEmail}
                  >
                    {isValidatingEmail ? 'Checking…' : isSendingEmail ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <Link to="/login" className="text-skyblue-400 hover:text-skyblue-300">Back to Sign In</Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 bg-navy-900/80 backdrop-blur-sm border border-navy-700 rounded-xl p-6 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-skyblue-200">New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="mt-1 input w-full pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    aria-required="true"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-2 text-skyblue-300 hover:text-skyblue-200 focus:outline-none focus:ring-2 focus:ring-skyblue-500 rounded"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3-11-8 1.02-2.76 2.99-5 5.5-6.42" />
                        <path d="M22 12c-.23.65-.52 1.27-.88 1.85" />
                        <path d="M6.06 6.06A10.94 10.94 0 0 1 12 4c5 0 9.27 3 11 8a11.66 11.66 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-skyblue-300">Use at least 8 characters, including letters and numbers.</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-skyblue-200">Confirm password</label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="mt-1 input w-full pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    aria-required="true"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-2 text-skyblue-300 hover:text-skyblue-200 focus:outline-none focus:ring-2 focus:ring-skyblue-500 rounded"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3-11-8 1.02-2.76 2.99-5 5.5-6.42" />
                        <path d="M22 12c-.23.65-.52 1.27-.88 1.85" />
                        <path d="M6.06 6.06A10.94 10.94 0 0 1 12 4c5 0 9.27 3 11 8a11.66 11.66 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="text-secondary-400 text-sm" role="alert" aria-live="polite">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="text-success-400 text-sm" role="status" aria-live="polite">{successMessage}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Set new password'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-skyblue-400 hover:text-skyblue-300">Back to Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage