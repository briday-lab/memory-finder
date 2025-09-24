'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, Calendar, Users, Heart } from 'lucide-react'

interface InvitationData {
  project: {
    id: string
    project_name: string
    bride_name: string
    groom_name: string
    wedding_date: string
    description: string
  }
  videographer: {
    name: string
    email: string
  }
  invitation: {
    invitation_message: string
    status: string
    created_at: string
  }
}

export default function InvitationPage({ params }: { params: { token: string } }) {
  const { token } = params
  const router = useRouter()
  const { data: session } = useSession()
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (token) {
      fetchInvitationData()
    }
  }, [token, fetchInvitationData])

  const fetchInvitationData = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitationData(data)
      } else {
        setError('Invitation not found or has expired')
      }
    } catch {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!session) {
      // Redirect to sign in with the invitation token
      await signIn('google', { 
        callbackUrl: `/invitation/${token}`,
        redirect: true 
      })
      return
    }

    setAccepting(true)
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: (session.user as { id?: string }).id })
      })

      if (response.ok) {
        // Redirect to couple dashboard
        router.push('/dashboard')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to accept invitation')
      }
    } catch {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading your invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invitation Not Found</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { project, videographer, invitation } = invitationData

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <Heart className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl">Your Wedding Video is Ready!</CardTitle>
            <CardDescription className="text-purple-100">
              {videographer.name} has shared your special day with you
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Project Details */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">
                  {project.project_name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Couple</p>
                      <p className="font-medium">{project.bride_name} + {project.groom_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Wedding Date</p>
                      <p className="font-medium">{project.wedding_date}</p>
                    </div>
                  </div>
                </div>
                
                {project.description && (
                  <div className="mt-4">
                    <p className="text-gray-700">{project.description}</p>
                  </div>
                )}
              </div>

              {/* Personal Message */}
              {invitation.invitation_message && (
                <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                  <h4 className="font-semibold text-blue-800 mb-2">Personal Message</h4>
                  <p className="text-blue-700 italic">&ldquo;{invitation.invitation_message}&rdquo;</p>
                  <p className="text-sm text-blue-600 mt-2">- {videographer.name}</p>
                </div>
              )}

              {/* What You Can Do */}
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-4">✨ What You Can Do:</h4>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">🔍</span>
                    <span><strong>Search your memories:</strong> Find specific moments using natural language like &ldquo;wedding vows&rdquo; or &ldquo;first dance&rdquo;</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">🎬</span>
                    <span><strong>Browse highlights:</strong> Explore curated moments from your special day</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">💝</span>
                    <span><strong>Share favorites:</strong> Create and share your favorite moments with family and friends</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600">⬇️</span>
                    <span><strong>Download clips:</strong> Save your favorite moments to keep forever</span>
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="text-center">
                {!session ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">Sign in to view your wedding video</p>
                    <Button 
                      onClick={handleAcceptInvitation}
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      Sign In with Google
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleAcceptInvitation}
                    disabled={accepting}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Heart className="h-5 w-5 mr-2" />
                        View Your Wedding Video
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Contact Info */}
              <div className="text-center text-sm text-gray-500 border-t pt-4">
                <p>Need help? Contact {videographer.name} at {videographer.email}</p>
                <p className="mt-1">This invitation was sent by Memory Finder - AI-powered wedding video search</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
