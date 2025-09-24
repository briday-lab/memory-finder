'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import VideographerDashboard from '@/components/videographer-dashboard'
import CoupleDashboard from '@/components/couple-dashboard'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // For Google OAuth users, check localStorage for user type selection
  const [localUserType, setLocalUserType] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserType = localStorage.getItem('userType')
      setLocalUserType(storedUserType)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  // Route based on user type
  const sessionUserType = (session.user as { userType?: string })?.userType
  const userType = sessionUserType || 'videographer'
  
  // Use localStorage user type if available, otherwise use session userType
  const finalUserType = localUserType || userType
  
  // Debug logging
  console.log('Session user:', session.user)
  console.log('Session userType:', sessionUserType)
  console.log('User type:', userType)
  console.log('Local user type:', localUserType)
  console.log('Final user type:', finalUserType)
  
  // If this is a Google OAuth user (no userType in session) and no localStorage userType,
  // redirect to user type selection
  if (!sessionUserType && !localUserType) {
    console.log('Google OAuth user detected, redirecting to user type selection')
    router.push('/auth/user-type')
    return null
  }
  
  if (finalUserType === 'couple') {
    console.log('Rendering CoupleDashboard')
    return <CoupleDashboard />
  }
  
  console.log('Rendering VideographerDashboard')
  return <VideographerDashboard />
}
