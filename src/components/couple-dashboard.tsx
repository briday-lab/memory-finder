'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import VideoPlayer from '@/components/video-player'
import { 
  Heart, 
  Search, 
  LogOut, 
  Sparkles,
  Users
} from 'lucide-react'

interface WeddingProject {
  id: string
  project_name: string
  bride_name: string
  groom_name: string
  wedding_date: string
  description: string
  thumbnail_url?: string
}

interface VideoMoment {
  id: string
  start_time_seconds: number
  end_time_seconds: number
  description: string
  confidence_score: number
  video_file_id: string
  fileName?: string
  fileSize?: number
  lastModified?: Date
}

export default function CoupleDashboard() {
  console.log('CoupleDashboard component loaded')
  const { data: session } = useSession()
  const [project, setProject] = useState<WeddingProject | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VideoMoment[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})

  const loadSharedProjects = useCallback(async () => {
    if (!session?.user?.email) return

    try {
      // First, ensure user exists in database
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name,
          userType: 'couple'
        })
      })

      if (!userResponse.ok) {
        throw new Error('Failed to create/fetch user')
      }

      const userData = await userResponse.json()
      const userId = userData.user.id

      // Fetch projects shared with this couple
      const projectsResponse = await fetch(`/api/projects?userId=${userId}&userType=couple`)
      if (projectsResponse.ok) {
        const { projects } = await projectsResponse.json()
        if (projects.length > 0) {
          setProject(projects[0]) // For now, show the first project
        }
      }
    } catch (error) {
      console.error('Error loading shared projects:', error)
    }
  }, [session])

  // Load shared projects for the couple
  useEffect(() => {
    loadSharedProjects()
  }, [loadSharedProjects])

  const getVideoUrl = async (videoKey: string) => {
    if (videoUrls[videoKey]) return videoUrls[videoKey]
    
    try {
      const response = await fetch('/api/video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: videoKey,
          bucket: 'memory-finder-raw-120915929747-us-east-2'
        })
      })
      
      if (response.ok) {
        const { videoUrl } = await response.json()
        setVideoUrls(prev => ({ ...prev, [videoKey]: videoUrl }))
        return videoUrl
      }
    } catch (error) {
      console.error('Failed to get video URL:', error)
    }
    return null
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !project) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/search-semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          projectId: project.id,
          limit: 20,
          similarityThreshold: 0.7
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const normalized = (data.results || []).map((r: unknown, idx: number) => {
          const result = r as Record<string, unknown>
          return {
            id: result.id || String(idx),
            start_time_seconds: Number(result.start_time_seconds ?? result.startTime ?? 0) || 0,
            end_time_seconds: Number(result.end_time_seconds ?? result.endTime ?? 0) || 0,
            description: result.description ?? result.content ?? searchQuery,
            confidence_score: Number(result.confidence_score ?? result.confidence ?? 0) || 0,
            video_file_id: result.videoKey || result.video_file_id || result.videoId || '',
            fileName: result.fileName,
            fileSize: result.fileSize,
            lastModified: result.lastModified
          }
        })
        setSearchResults(normalized)
        
        // Fetch video URLs for all results
        normalized.forEach(async (moment: VideoMoment) => {
          if (moment.video_file_id) {
            await getVideoUrl(moment.video_file_id)
          }
        })
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const featuredMoments = [
    { title: 'Getting Ready', query: 'getting ready', icon: '👰' },
    { title: 'Ceremony', query: 'ceremony vows', icon: '💒' },
    { title: 'Reception', query: 'reception party', icon: '🎉' },
    { title: 'First Dance', query: 'first dance', icon: '💃' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-pink-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Memory Finder</h1>
                <p className="text-sm text-gray-600">Your Wedding Memories</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {project ? (
          <div className="max-w-4xl mx-auto">
            {/* Project Header */}
            <div className="text-center mb-12">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center">
                <Users className="h-16 w-16 text-pink-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{project.project_name}</h1>
              <p className="text-lg text-gray-600 mb-4">{formatDate(project.wedding_date)}</p>
              <p className="text-gray-500 max-w-2xl mx-auto">{project.description}</p>
            </div>

            {/* Search Section */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <Search className="h-12 w-12 mx-auto mb-4 text-pink-600" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Perfect Moments</h2>
                  <p className="text-gray-600">
                    Search for any moment from your wedding day in plain English
                  </p>
                </div>
                
                <div className="flex space-x-2 mb-6">
                  <Input
                    placeholder="Search for moments... (e.g., 'wedding vows', 'first dance', 'cake cutting')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="text-lg py-3"
                  />
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    size="lg"
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {isSearching ? 'Searching...' : <Search className="h-5 w-5" />}
                  </Button>
                </div>

                {/* Featured Moments */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {featuredMoments.map((moment, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-pink-50 hover:border-pink-200"
                      onClick={() => {
                        setSearchQuery(moment.query)
                        handleSearch()
                      }}
                    >
                      <span className="text-2xl">{moment.icon}</span>
                      <span className="text-sm font-medium">{moment.title}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Found {searchResults.length} moments
                  </h3>
                  <p className="text-gray-600">
                    Click play to watch your special moments
                  </p>
                </div>
                
                <div className="space-y-4">
                  {searchResults.map((moment) => (
                    <VideoPlayer
                      key={moment.id}
                      src={videoUrls[moment.video_file_id] || ''}
                      startTime={moment.start_time_seconds}
                      endTime={moment.end_time_seconds}
                      fileName={moment.fileName}
                      className="max-w-3xl mx-auto"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <Card>
                <CardContent className="text-center py-12">
                  <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-medium mb-2">No moments found</h3>
                  <p className="text-gray-600 mb-6">
                    Try searching for different moments from your wedding day
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {featuredMoments.map((moment, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery(moment.query)
                          handleSearch()
                        }}
                      >
                        {moment.title}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-medium mb-2">Welcome to Memory Finder</h2>
              <p className="text-gray-600">
                Your wedding memories are being prepared. Please check back soon.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
