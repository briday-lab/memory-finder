'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    
    // For demo purposes, redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
      setIsLoading(false)
    }, 1000)
  }

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // For demo purposes, redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
      setIsLoading(false)
    }, 1000)
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
      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Heart style={{
              width: '2rem',
              height: '2rem',
              color: '#667eea'
            }} />
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

        {/* Auth Form */}
        <div>
          {/* Google Sign-In Button */}
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
              transition: 'all 0.2s',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.backgroundColor = '#f9fafb'
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.backgroundColor = 'white'
              }
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

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: '#e5e7eb'
            }}></div>
            <span style={{
              padding: '0 1rem',
              fontSize: '0.75rem',
              color: '#9ca3af',
              fontWeight: 500
            }}>OR</span>
            <div style={{
              flex: 1,
              height: '1px',
              background: '#e5e7eb'
            }}></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth}>
            {/* Email Input */}
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
              <div style={{ position: 'relative' }}>
                <Mail style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#9ca3af'
                }} />
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#667eea'
                    e.currentTarget.style.outline = 'none'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
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
                <Lock style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#9ca3af'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#667eea'
                    e.currentTarget.style.outline = 'none'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = 'none'
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
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '0.25rem'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
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

            {/* Submit Button */}
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
                transition: 'all 0.2s',
                marginBottom: '1rem',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = '#5a67d8'
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = '#667eea'
                }
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Don&apos;t have an account?{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontWeight: 500,
                textDecoration: 'underline'
              }}
            >
              Sign up
            </button>
          </div>
        </div>

        {/* Footer */}
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
