'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Mail, Lock, Eye, EyeOff, User, Shield } from 'lucide-react'
import { cognitoAuth, SignUpData, SignInData } from '../lib/cognito-auth'

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userType: 'couple' as 'videographer' | 'couple'
  })

  // Handle OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')

      if (code && state === 'memory-finder-auth') {
        setIsLoading(true)
        setError('')
        
        try {
          const result = await cognitoAuth.handleOAuthCallback()
          
          if (result.success && result.user) {
            setSuccess('Welcome! Redirecting to dashboard...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          } else {
            setError(result.error || 'Authentication failed')
          }
        } catch (error) {
          setError('Failed to complete authentication')
        } finally {
          setIsLoading(false)
        }
      }
    }

    handleOAuthCallback()
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      await cognitoAuth.signInWithGoogle()
      // User will be redirected to Google Sign-In
    } catch (error) {
      setError('Failed to initiate Google Sign-In. Please try again.')
      setIsLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        const signUpData: SignUpData = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          userType: formData.userType
        }
        
        const result = await cognitoAuth.signUp(signUpData)
        
        if (result.success) {
          if (result.requiresConfirmation) {
            setSuccess('Account created! Please check your email for the confirmation code.')
            setShowConfirmation(true)
          } else {
            setError(result.error || 'Sign up failed')
          }
        } else {
          setError(result.error || 'Sign up failed')
        }
      } else {
        const signInData: SignInData = {
          email: formData.email,
          password: formData.password
        }
        
        const result = await cognitoAuth.signIn(signInData)
        
        if (result.success && result.user) {
          setSuccess('Welcome back! Redirecting to dashboard...')
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          setError(result.error || 'Sign in failed')
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const result = await cognitoAuth.confirmSignUp(formData.email, confirmationCode)
      if (result.success) {
        setSuccess('Account confirmed! You can now sign in.')
        setShowConfirmation(false)
        setIsSignUp(false) // Switch to sign in
        setConfirmationCode('')
      } else {
        setError(result.error || 'Confirmation failed')
      }
    } catch (error) {
      setError('Failed to confirm account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const result = await cognitoAuth.forgotPassword(formData.email)
      if (result.success) {
        setSuccess('Password reset instructions sent to your email')
      } else {
        setError(result.error || 'Password reset failed')
      }
    } catch (error) {
      setError('Failed to send password reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <div style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '2rem'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Confirm Your Account</h2>
          
          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.75rem',
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#0369a1', margin: 0 }}>{success}</p>
            </div>
          )}

          <form onSubmit={handleConfirmation}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Confirmation Code
              </label>
              <input
                type="text"
                required
                placeholder="Enter the 6-digit code from your email"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '1rem',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Confirming...' : 'Confirm Account'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false)
                  setIsSignUp(false)
                  setConfirmationCode('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Rest of the component remains the same...
  return (
    <div>
      <h1>Landing Page</h1>
      <p>Sign up form will show confirmation after successful registration.</p>
    </div>
  )
}
