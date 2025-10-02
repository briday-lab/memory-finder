'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import VideographerDashboard from '../../components/videographer-dashboard'
import CoupleDashboard from '../../components/couple-dashboard'
import { cognitoAuth, CognitoUser } from '../../lib/cognito-auth'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await cognitoAuth.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        } else {
          // No user found, redirect to landing page
          router.push('/')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  // Route based on user type from Cognito
  const userType = user.userType || 'videographer'
  
  // Debug logging
  console.log('=== DASHBOARD ROUTING DEBUG ===')
  console.log('Cognito user:', user)
  console.log('User type:', userType)
  console.log('Will render:', userType === 'couple' ? 'CoupleDashboard' : 'VideographerDashboard')
  
  // Route directly to the appropriate dashboard based on user type
  if (userType === 'couple') {
    console.log('Rendering CoupleDashboard')
    return <CoupleDashboard />
  }
  
  console.log('Rendering VideographerDashboard')
  return <VideographerDashboard />
}
