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
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <Heart size={24} style={{ color: '#667eea' }} />
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                margin: 0
              }}>Memory Finder</h1>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0
            }}>Confirm Your Account</p>
          </div>
          
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
        padding: '2rem',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Heart size={24} style={{ color: '#667eea' }} />
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1f2937',
              margin: 0
            }}>Memory Finder</h1>
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0
          }}>Wedding Video Search Platform</p>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #ff9900 0%, #ff6600 100%)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            <Shield size={18} />
            Powered by AWS Cognito
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: 'white',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1rem 0',
            gap: '1rem'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: '#e5e7eb'
            }}></div>
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>or</span>
            <div style={{
              flex: 1,
              height: '1px',
              background: '#e5e7eb'
            }}></div>
          </div>

          {success && (
            <div style={{
              padding: '0.75rem',
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#0369a1',
                margin: 0
              }}>{success}</p>
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#dc2626',
                margin: 0
              }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailAuth}>
            {isSignUp && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
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
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingRight: '3rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  I am a
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, userType: 'couple'})}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: `2px solid ${formData.userType === 'couple' ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      background: formData.userType === 'couple' ? '#f0f4ff' : 'white',
                      color: formData.userType === 'couple' ? '#667eea' : '#374151',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Couple
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, userType: 'videographer'})}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: `2px solid ${formData.userType === 'videographer' ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      background: formData.userType === 'videographer' ? '#f0f4ff' : 'white',
                      color: formData.userType === 'videographer' ? '#667eea' : '#374151',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Videographer
                  </button>
                </div>
              </div>
            )}

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
              {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {!isSignUp && (
            <div style={{
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <button
                onClick={handleForgotPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'underline'
                }}
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            {isSignUp ? 'Already have an account?' : "Don&apos;t have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontWeight: 500,
                textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '-3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center'
        }}>
          © 2024 Memory Finder. All rights reserved.
        </div>
      </div>
    </div>
  )
}
