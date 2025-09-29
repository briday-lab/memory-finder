'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import VideographerDashboard from '@/components/videographer-dashboard'
import CoupleDashboard from '@/components/couple-dashboard'

export default function DashboardPage() {
  const sessionResult = useSession()
  const { data: session, status } = sessionResult || {}
  const router = useRouter()
  
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

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

  // Route based on user type from Cognito
  const sessionUserType = (session.user as { userType?: string })?.userType
  const userType = sessionUserType || 'videographer'
  
  // Debug logging
  console.log('=== DASHBOARD ROUTING DEBUG ===')
  console.log('Session user:', session.user)
  console.log('Session userType:', sessionUserType)
  console.log('Final user type:', userType)
  console.log('Will render:', userType === 'couple' ? 'CoupleDashboard' : 'VideographerDashboard')
  
  // Route directly to the appropriate dashboard based on user type
  if (userType === 'couple') {
    console.log('Rendering CoupleDashboard')
    return <CoupleDashboard />
  }
  
  console.log('Rendering VideographerDashboard')
  return <VideographerDashboard />
}
