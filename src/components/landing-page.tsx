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
    <div>
      {/* Header */}
      <header className="header">
        <div className="logo-container">
          <Heart className="logo-icon" />
          <h1 className="logo-text">Memory Finder</h1>
        </div>
        <a href="#features" className="learn-more-btn">
          Learn More
        </a>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div>
          <h2 className="hero-title">
            Find Your Perfect{' '}
            <span className="hero-highlight">Wedding Moments</span>
          </h2>
          <p className="hero-description">
            Upload your wedding videos and find any moment instantly with AI-powered search. 
            From vows to first dance, discover every precious memory.
          </p>
          
          {/* Features */}
          <div className="features-grid">
            <div className="feature-card">
              <Video className="feature-icon" />
              <h3 className="feature-title">Upload Videos</h3>
              <p className="feature-description">Videographers upload wedding footage securely</p>
            </div>
            <div className="feature-card">
              <Search className="feature-icon" />
              <h3 className="feature-title">AI Search</h3>
              <p className="feature-description">Search in plain English for any moment</p>
            </div>
            <div className="feature-card">
              <Sparkles className="feature-icon" />
              <h3 className="feature-title">Instant Clips</h3>
              <p className="feature-description">Get perfectly edited video clips instantly</p>
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
