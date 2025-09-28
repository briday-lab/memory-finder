'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Video, Search, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('signin')

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // For demo purposes, just redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
      setIsLoading(false)
    }, 1000)
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // For demo purposes, just redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      lineHeight: 1.6,
      color: '#1f2937',
      background: 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 50%, #f3e8ff 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Heart style={{
            width: '2rem',
            height: '2rem',
            color: '#db2777'
          }} />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827'
          }}>Memory Finder</h1>
        </div>
        <a href="#features" style={{
          display: 'none',
          padding: '0.5rem 1rem',
          border: '1px solid #d1d5db',
          background: 'white',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#374151',
          textDecoration: 'none',
          transition: 'all 0.2s'
        }}>
          Learn More
        </a>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '4rem 1rem',
        textAlign: 'center'
      }}>
        <div>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '1.5rem',
            lineHeight: 1.1
          }}>
            Find Your Perfect{' '}
            <span style={{ color: '#db2777' }}>Wedding Moments</span>
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            marginBottom: '2rem',
            maxWidth: '32rem',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Upload your wedding videos and find any moment instantly with AI-powered search. 
            From vows to first dance, discover every precious memory.
          </p>
          
          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Video style={{
                width: '3rem',
                height: '3rem',
                color: '#db2777',
                margin: '0 auto 1rem'
              }} />
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#111827'
              }}>Upload Videos</h3>
              <p style={{ color: '#6b7280' }}>Videographers upload wedding footage securely</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Search style={{
                width: '3rem',
                height: '3rem',
                color: '#db2777',
                margin: '0 auto 1rem'
              }} />
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#111827'
              }}>AI Search</h3>
              <p style={{ color: '#6b7280' }}>Search in plain English for any moment</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Sparkles style={{
                width: '3rem',
                height: '3rem',
                color: '#db2777',
                margin: '0 auto 1rem'
              }} />
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#111827'
              }}>Instant Clips</h3>
              <p style={{ color: '#6b7280' }}>Get perfectly edited video clips instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section className="auth-section">
        <div className="auth-container">
          <div className="tabs-container">
            <div className="tabs-list">
              <button 
                className={`tab-button ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => setActiveTab('signin')}
              >
                Sign In
              </button>
              <button 
                className={`tab-button ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => setActiveTab('signup')}
              >
                Sign Up
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'signin' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Welcome Back</h3>
                    <p className="card-description">
                      Sign in to access your wedding projects
                    </p>
                  </div>
                  <div className="card-content">
                    <form onSubmit={handleSignIn} className="form">
                      <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="your@email.com"
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          className="form-input"
                          required
                        />
                      </div>
                      {error && (
                        <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
                      )}
                      <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
              
              {activeTab === 'signup' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Create Account</h3>
                    <p className="card-description">
                      Join Memory Finder to start organizing your wedding memories
                    </p>
                  </div>
                  <div className="card-content">
                    <form onSubmit={handleSignUp} className="form">
                      <div className="form-group">
                        <label htmlFor="fullName" className="form-label">Full Name</label>
                        <input
                          id="fullName"
                          name="fullName"
                          placeholder="Your full name"
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="your@email.com"
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="role" className="form-label">I am a</label>
                        <select
                          id="role"
                          name="role"
                          className="form-input"
                          required
                        >
                          <option value="">Select your role</option>
                          <option value="videographer">Videographer</option>
                          <option value="couple">Couple</option>
                        </select>
                      </div>
                      {error && (
                        <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
                      )}
                      <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2024 Memory Finder. Making wedding memories searchable.</p>
      </footer>
    </div>
  )
}
