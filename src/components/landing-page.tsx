'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, Video, Search, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-600" />
            <h1 className="text-2xl font-bold text-gray-900">Memory Finder</h1>
          </div>
          <Button variant="outline" className="hidden sm:inline-flex">
            Learn More
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Find Your Perfect{' '}
            <span className="text-pink-600">Wedding Moments</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your wedding videos and find any moment instantly with AI-powered search. 
            From vows to first dance, discover every precious memory.
          </p>
          
          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <Video className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Videos</h3>
              <p className="text-gray-600">Videographers upload wedding footage securely</p>
            </div>
            <div className="text-center">
              <Search className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI Search</h3>
              <p className="text-gray-600">Search in plain English for any moment</p>
            </div>
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Instant Clips</h3>
              <p className="text-gray-600">Get perfectly edited video clips instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to access your wedding projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join Memory Finder to start organizing your wedding memories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">I am a</Label>
                      <select
                        id="role"
                        name="role"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select your role</option>
                        <option value="videographer">Videographer</option>
                        <option value="couple">Couple</option>
                      </select>
                    </div>
                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>&copy; 2024 Memory Finder. Making wedding memories searchable.</p>
      </footer>
    </div>
  )
}
