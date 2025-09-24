'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import VideographerDashboard from '@/components/videographer-dashboard'
import CoupleDashboard from '@/components/couple-dashboard'

export default function DashboardPage() {
  const { data: session, status } = useSession()
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

  // Route based on user type
  const userType = (session.user as { userType?: string })?.userType || 'videographer'
  
  // For Google OAuth users, check localStorage for user type selection
  const [localUserType, setLocalUserType] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserType = localStorage.getItem('userType')
      setLocalUserType(storedUserType)
    }
  }, [])
  
  // Use localStorage user type if available, otherwise use session userType
  const finalUserType = localUserType || userType
  
  // Debug logging
  console.log('Session user:', session.user)
  console.log('User type:', userType)
  console.log('Local user type:', localUserType)
  console.log('Final user type:', finalUserType)
  
  if (finalUserType === 'couple') {
    console.log('Rendering CoupleDashboard')
    return <CoupleDashboard />
  }
  
  console.log('Rendering VideographerDashboard')
  return <VideographerDashboard />
}
