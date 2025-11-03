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
      const redirectTo = `${window.location.origin}/reset-password`
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
  const hasRecoveryParams = (
    typeParamForRender === 'recovery' ||
    !!mergedParamsForRender.get('token_hash') ||
    !!mergedParamsForRender.get('access_token') ||
    !!mergedParamsForRender.get('code')
  )

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 w-12 rounded" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-white">
          Reset Password
        </h2>

        {isInitializing ? (
          <p className="mt-4 text-center text-skyblue-300">Preparing your reset session...</p>
        ) : !(isAuthedForRecovery || hasRecoveryParams) ? (
          <div className="mt-6 bg-navy-900 border border-navy-700 rounded-lg p-6">
            {hasSentEmail ? (
              <div className="flex flex-col items-center text-center">
                <svg className="h-14 w-14 text-success-400 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="mt-3 text-white font-semibold">Check your email</p>
                <p className="mt-1 text-skyblue-200 text-sm">We've sent a password reset link to <span className="font-medium">{email}</span>. Redirecting to sign in…</p>
              </div>
            ) : (
              <>
                <p className="text-skyblue-200 text-sm mb-4">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-skyblue-200">Email address</label>
                    <input
                      id="email"
                      type="email"
                      className="mt-1 input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-secondary-400 text-sm">{errorMessage}</p>
                  )}
                  {successMessage && (
                    <p className="text-success-400 text-sm">{successMessage}</p>
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
          <div className="mt-6 bg-navy-900 border border-navy-700 rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-skyblue-200">New password</label>
                <input
                  id="new-password"
                  type="password"
                  className="mt-1 input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-skyblue-200">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="mt-1 input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-secondary-400 text-sm">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="text-success-400 text-sm">{successMessage}</p>
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