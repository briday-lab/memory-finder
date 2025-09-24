'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Camera, Users } from 'lucide-react'

export default function UserTypePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const selectUserType = async (userType: string) => {
    console.log('=== USER TYPE SELECTION ===')
    console.log('Selected user type:', userType)
    setIsLoading(true)
    
    try {
      // Store user type in localStorage for this session
      localStorage.setItem('userType', userType)
      console.log('Stored userType in localStorage:', userType)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error setting user type:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-8 w-8 text-pink-600" />
            <h1 className="text-2xl font-bold text-gray-900">Memory Finder</h1>
          </div>
          <p className="text-gray-600">Welcome, {session.user?.name}! Please select your role:</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Videographer Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => selectUserType('videographer')}>
            <CardHeader className="text-center">
              <Camera className="h-16 w-16 text-pink-600 mx-auto mb-4" />
              <CardTitle>I&apos;m a Videographer</CardTitle>
              <CardDescription>
                I create wedding videos and need to upload, manage projects, and deliver content to couples.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Upload wedding videos</li>
                <li>• Manage multiple projects</li>
                <li>• Track processing status</li>
                <li>• Deliver to couples</li>
              </ul>
              <Button className="w-full mt-4 bg-pink-600 hover:bg-pink-700" disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Continue as Videographer'}
              </Button>
            </CardContent>
          </Card>

          {/* Couple Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => selectUserType('couple')}>
            <CardHeader className="text-center">
              <Users className="h-16 w-16 text-pink-600 mx-auto mb-4" />
              <CardTitle>I&apos;m a Couple</CardTitle>
              <CardDescription>
                I&apos;m getting married and want to search through my wedding videos for special moments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Search wedding moments</li>
                <li>• Watch video clips</li>
                <li>• Find special memories</li>
                <li>• Share with family</li>
              </ul>
              <Button className="w-full mt-4 bg-pink-600 hover:bg-pink-700" disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Continue as Couple'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
