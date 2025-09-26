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
  Users,
  Play,
  Download,
  Share,
  Zap,
  Eye,
  Clock,
  Volume,
  Mic
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
  s3_key?: string
  compilationUrl?: string
  isCompilation?: boolean
  duration?: number
  tags?: string[]
  emotion?: string
  scene_type?: string
}

export default function CoupleDashboard() {
  console.log('CoupleDashboard component loaded')
  const { data: session } = useSession()
  const [projects, setProjects] = useState<WeddingProject[]>([])
  const [selectedProject, setSelectedProject] = useState<WeddingProject | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VideoMoment[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [savedCompilations, setSavedCompilations] = useState<VideoMoment[]>([])
  const [showTranscripts, setShowTranscripts] = useState(false)
  const [activeMoment, setActiveMoment] = useState<VideoMoment | null>(null)

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
              setProjects(projects)
              if (projects.length > 0) {
                setSelectedProject(projects[0]) // Select the first project by default
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

  const getVideoUrl = async (fileId: string, s3Key?: string) => {
    if (videoUrls[fileId]) return videoUrls[fileId]
    
    try {
      const response = await fetch('/api/video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: s3Key,
          bucket: 'memory-finder-raw-120915929747-us-east-2',
          fileId: fileId
        })
      })
      
      if (response.ok) {
        const { videoUrl } = await response.json()
        setVideoUrls(prev => ({ ...prev, [fileId]: videoUrl }))
        return videoUrl
      }
    } catch (error) {
      console.error('Failed to get video URL:', error)
    }
    return null
  }

  const loadAllVideos = async () => {
    if (!selectedProject) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/search-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'all videos',
          projectId: selectedProject.id,
          limit: 50
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const normalized = (data.results || []).map((r: unknown, idx: number) => {
          const result = r as Record<string, unknown>
          return {
            id: result.id || String(idx),
            start_time_seconds: Number(result.startTime ?? 0) || 0,
            end_time_seconds: Number(result.endTime ?? result.duration ?? 30) || 30,
            description: result.description ?? result.content ?? 'Wedding video',
            confidence_score: Number(result.confidence ?? 0.9) || 0.9,
            video_file_id: result.fileId || result.file_id || '',
            fileName: result.fileName,
            fileSize: result.fileSize,
            lastModified: result.lastModified,
            s3_key: result.videoUrl || result.s3_key
          }
        })
        setSearchResults(normalized)
        
        // Fetch video URLs for all results
        normalized.forEach(async (moment: VideoMoment) => {
          if (moment.video_file_id) {
            await getVideoUrl(moment.video_file_id, (moment as VideoMoment & { s3_key?: string }).s3_key)
          }
        })
      }
    } catch (error) {
      console.error('Error loading videos:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedProject) return
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(q => q !== searchQuery)]
      return updated.slice(0, 5) // Keep last 5 searches
    })

    setIsSearching(true)
    try {
      // Try intelligent compilation first, fallback to simple search
      const compilationResponse = await fetch('/api/compilation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          projectId: selectedProject.id,
          maxDuration: 300 // 5 minutes max
        }),
      })

      console.log('Compilation response status:', compilationResponse.status)
      
      if (compilationResponse.ok) {
        const compilationData = await compilationResponse.json()
        console.log('Compilation data:', compilationData)
        
        if (compilationData.compilation) {
          // Show the intelligent compilation
          setSearchResults([{
            id: compilationData.compilation.id,
            start_time_seconds: 0,
            end_time_seconds: compilationData.compilation.duration,
            description: `${searchQuery} - Complete Experience (${compilationData.compilation.momentCount} moments)`,
            confidence_score: 0.95,
            video_file_id: compilationData.compilation.id,
            fileName: compilationData.compilation.name,
            fileSize: 0,
            lastModified: new Date(),
            s3_key: compilationData.compilation.s3Key,
            compilationUrl: compilationData.compilation.streamingUrl,
            isCompilation: true
          }])
          
          // Set the compilation URL for playback
          setVideoUrls(prev => ({
            ...prev,
            [compilationData.compilation.id]: compilationData.compilation.streamingUrl
          }))
          
          return
        }
      } else {
        const errorData = await compilationResponse.json()
        console.log('Compilation API error:', errorData)
      }

      // Fallback to simple search if compilation fails
      const response = await fetch('/api/search-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          projectId: selectedProject.id,
          limit: 20
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const normalized = (data.results || []).map((r: unknown, idx: number) => {
          const result = r as Record<string, unknown>
          return {
            id: result.id || String(idx),
            start_time_seconds: Number(result.startTime ?? 0) || 0,
            end_time_seconds: Number(result.endTime ?? result.duration ?? 30) || 30,
            description: result.description ?? result.content ?? searchQuery,
            confidence_score: Number(result.confidence ?? 0.9) || 0.9,
            video_file_id: result.fileId || result.file_id || '',
            fileName: result.fileName,
            fileSize: result.fileSize,
            lastModified: result.lastModified,
            s3_key: result.videoUrl || result.s3_key, // For video URL generation
            duration: result.duration,
            tags: result.tags || [],
            emotion: result.emotion,
            scene_type: result.scene_type
          }
        })
        setSearchResults(normalized)
        
        // Fetch video URLs for all results
        normalized.forEach(async (moment: VideoMoment) => {
          if (moment.video_file_id) {
            await getVideoUrl(moment.video_file_id, (moment as VideoMoment & { s3_key?: string }).s3_key)
          }
        })
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const saveCompilation = (moment: VideoMoment) => {
    if (!savedCompilations.find(saved => saved.id === moment.id)) {
      setSavedCompilations(prev => [...prev, moment])
    }
  }

  const shareMoment = async (moment: VideoMoment) => {
    // Implementation for sharing a video moment
    const shareableData = {
      url: videoUrls[moment.video_file_id],
      text: `${moment.description} - ${moment.start_time_seconds}s - ${moment.end_time_seconds}s`
    }
    
    if (navigator.share) {
      await navigator.share(shareableData)
    } else {
      // Fallback for copy to clipboard
      await navigator.clipboard.writeText(shareableData.text)
      alert('Moment details copied to clipboard!')
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
        {projects.length > 0 ? (
          <div className="max-w-4xl mx-auto">
            {/* Project Selection */}
            {projects.length > 1 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Project</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((proj) => (
                    <Card 
                      key={proj.id}
                      className={`cursor-pointer transition-all ${
                        selectedProject?.id === proj.id 
                          ? 'ring-2 ring-pink-500 bg-pink-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedProject(proj)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{proj.project_name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{formatDate(proj.wedding_date)}</p>
                        <p className="text-xs text-gray-500">{proj.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Project Header */}
            {selectedProject && (
              <div className="text-center mb-12">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center">
                  <Users className="h-16 w-16 text-pink-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{selectedProject.project_name}</h1>
                <p className="text-lg text-gray-600 mb-4">{formatDate(selectedProject.wedding_date)}</p>
                <p className="text-gray-500 max-w-2xl mx-auto">{selectedProject.description}</p>
              </div>
            )}

            {/* Search Section */}
            {selectedProject && (
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
                  <Button 
                    onClick={loadAllVideos} 
                    disabled={isSearching}
                    size="lg"
                    variant="outline"
                    className="border-pink-300 text-pink-700 hover:bg-pink-50"
                  >
                    {isSearching ? 'Loading...' : 'Show All Videos'}
                  </Button>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSearchQuery(search)
                            handleSearch()
                          }}
                        >
                          {search}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

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
            )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {searchResults[0]?.isCompilation 
                          ? `Found Complete ${searchQuery} Experience`
                          : `Found ${searchResults.length} moments`
                        }
                      </h3>
                      <p className="text-gray-600">
                        {searchResults[0]?.isCompilation
                          ? `Intelligently compiled from multiple video sources`
                          : `Click play to watch your special moments`
                        }
                      </p>
                      {searchResults[0]?.isCompilation && (
                        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-pink-100 text-pink-800">
                          <Sparkles className="h-4 w-4 mr-1" />
                          AI-Powered Compilation
                        </div>
                      )}
                    </div>
                
                <div className="space-y-4">
                  {searchResults.map((moment) => (
                    <div key={moment.id} className="space-y-2">
                      {/* Video Moment Controls */}
                      <div className="flex items-center justify-between bg-pink-50 rounded-lg p-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-pink-900">{moment.description}</h4>
                          <p className="text-sm text-pink-600">
                            {moment.fileName && `from ${moment.fileName} • `}
                            {moment.duration && `${Math.floor(moment.duration)} seconds`}
                            {moment.emotion && ` • ${moment.emotion}`}
                            {moment.scene_type && ` • ${moment.scene_type}`}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {moment.isCompilation ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-600 hover:text-purple-700"
                                onClick={() => saveCompilation(moment)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-600 hover:text-purple-700"
                                onClick={() => shareMoment(moment)}
                              >
                                <Share className="h-4 w-4 mr-1" />
                                Share
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm"
                                variant="ghost"
                                className="text-pink-600"
                                onClick={() => saveCompilation(moment)}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm"
                                variant="ghost"
                                className="text-pink-600"
                                onClick={() => shareMoment(moment)}
                              >
                                <Share className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <VideoPlayer
                        src={videoUrls[moment.video_file_id] || ''}
                        startTime={moment.start_time_seconds}
                        endTime={moment.end_time_seconds}
                        fileName={moment.fileName}
                        className="max-w-3xl mx-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Compilations */}
            {savedCompilations.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Saved Moments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedCompilations.map((moment) => (
                      <div key={moment.id} className="bg-pink-50 rounded-lg p-4">
                        <h4 className="font-semibold text-pink-900 mb-2">{moment.description}</h4>
                        <p className="text-sm text-pink-600 mb-3">
                          Duration: {moment.end_time_seconds - moment.start_time_seconds}s
                          {moment.emotion && ` • ${moment.emotion}`}
                        </p>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => shareMoment(moment)}
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
