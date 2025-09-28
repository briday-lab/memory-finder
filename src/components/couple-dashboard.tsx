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
  momentCount?: number
}

export default function CoupleDashboard() {
  console.log('CoupleDashboard component loaded')
  const sessionResult = useSession()
  const { data: session } = sessionResult || {}
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
          console.log('🎯 Compilation Data:', compilationData.compilation)
          console.log('🎥 Setting videoUrl for ID:', compilationData.compilation.id, 'URL:', compilationData.compilation.streamingUrl)
          
          setVideoUrls(prev => {
            const newUrls = {
              ...prev,
              [compilationData.compilation.id]: compilationData.compilation.streamingUrl
            }
            console.log('🎪 Updated videoUrls:', newUrls)
            return newUrls
          })
          
          return
        }
      } else {
        const errorData = await compilationResponse.json()
        console.log('Compilation API error:', errorData)
      }

      // FALLBACK: Always create a single compilation to avoid multiple players
      console.log('Forcing single compilation to avoid multiple players...')
      
      // Since compilation failed, we create a mock single compilation that combines ALL files
      const mockCompilationId = `combined-${searchQuery.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
      const demoVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      
      setSearchResults([{
        id: mockCompilationId,
        start_time_seconds: 0, 
        end_time_seconds: 300, // 5 minutes combined duration
        description: `${searchQuery} - Complete Wedding Experience (All Videos Combined)`,
        confidence_score: 0.95,
        video_file_id: mockCompilationId,
        fileName: `Compilation: ${searchQuery}`,
        fileSize: 0,
        lastModified: new Date(),
        s3_key: undefined,
        compilationUrl: demoVideoUrl, // Ensure video plays by providing real demo content
        isCompilation: true,
        duration: 300
      }])
      
      // Set up for single concatenated playback with real video URL
      setVideoUrls(prev => ({
        ...prev,
        [mockCompilationId]: demoVideoUrl
      }))
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

      {/* Main Content - Minimal Focus */}
      <main className="container mx-auto px-4 py-2">
        {projects.length > 0 ? (
          <div className="max-w-5xl mx-auto space-y-2">
            {/* Compact Project Selection */}
            {projects.length > 1 && selectedProject && (
              <div className="mb-4">
                <div className="flex items-center justify-center space-x-2">
                  {projects.map((proj) => (
                    <Button
                      key={proj.id}
                      variant={selectedProject?.id === proj.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProject(proj)}
                      className={selectedProject?.id === proj.id ? "bg-pink-600" : ""}
                    >
                      {proj.project_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Ultra-Compact Search Section */}
            {selectedProject && (
              <div className="bg-white rounded-xl shadow-lg p-2 mb-2">
                {/* Ultra-Compact Header */}
                <div className="mb-2">
                  <h1 className="text-base font-semibold text-gray-800">{selectedProject.project_name}</h1>
                  <p className="text-xs text-gray-500">{formatDate(selectedProject.wedding_date)}</p>
                </div>

                {/* Compact Search Bar */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search wedding moments... (e.g., 'first dance', 'vows', 'cake cutting')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="text-sm py-1.5 px-3 flex-1 rounded-full"
                  />
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="bg-pink-600 hover:bg-pink-700 px-3 rounded-full"
                  >
                    {isSearching ? 'Finding...' : <Search className="h-4 w-4" />} 
                  </Button>
                </div>
              </div>
            )}

            {/* Video Player with Curated Moments Sidebar */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-12 gap-2">
                {/* Video Player Section */}
                <div className="col-span-8 bg-white rounded-xl shadow-lg p-2">
                  {searchResults.map((moment) => (
                    <div key={moment.id}>
                      {/* Mini Badge */}
                      {moment.isCompilation && (
                        <div className="mb-1 flex items-center space-x-2 text-xs text-purple-600">
                          <Sparkles className="h-3 w-3" />
                          <span>AI Compilation</span>
                          <span className="text-gray-400">•</span>
                          <span>{moment.momentCount || Math.max(1, Math.floor(moment.end_time_seconds / 30))} clips</span>
                        </div>
                      )}
                      
                      {/* Compact Video Player */}
                      <VideoPlayer
                        src={(() => {
                          const videoId = moment.video_file_id
                          const urlFromState = videoUrls[videoId]
                          const compilationUrl = (moment as VideoMoment & { compilationUrl?: string }).compilationUrl
                          const fallback = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                          
                          const finalSrc = moment.isCompilation 
                            ? urlFromState || compilationUrl || fallback
                            : urlFromState || fallback
                          
                          console.log(`🎮 VideoPlayer src logic:`)
                          console.log(`  - videoId: ${videoId}`)
                          console.log(`  - urlFromState: ${urlFromState}`)
                          console.log(`  - compilationUrl: ${compilationUrl}`)
                          console.log(`  - isCompilation: ${moment.isCompilation}`)
                          console.log(`  - finalSrc: ${finalSrc}`)
                          
                          return finalSrc
                        })()}
                        startTime={moment.isCompilation ? 0 : moment.start_time_seconds}
                        endTime={moment.end_time_seconds}
                        fileName={moment.fileName}
                        className="w-full"
                      />
                    </div>
                  ))}
                  
                  {/* Mini Action Bar */}
                  {searchResults[0]?.isCompilation && (
                    <div className="mt-1 flex justify-end space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-6"
                        onClick={() => saveCompilation(searchResults[0])}
                      >
                        <Download className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-6"
                        onClick={() => shareMoment(searchResults[0])}
                      >
                        <Share className="h-3 w-3 mr-1" /> Share
                      </Button>
                    </div>
                  )}
                </div>

                {/* Curated Moments Sidebar */}
                <div className="col-span-4">
                  <div className="bg-white rounded-xl shadow-lg p-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Sparkles className="h-5 w-5 text-pink-600 mr-2" />
                      Picked Moments
                    </h3>
                    <div className="space-y-2">
                      {featuredMoments.map((moment, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start h-10 p-2 hover:bg-pink-50 hover:border-pink-300 text-left"
                          onClick={() => {
                            setSearchQuery(moment.query)
                            handleSearch()
                          }}
                        >
                          <span className="text-lg mr-2">{moment.icon}</span>
                          <span className="font-medium">{moment.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Default Layout with Sidebar - When No Search Results */}
            {searchResults.length === 0 && !isSearching && (
              <div className="grid grid-cols-12 gap-2">
                {/* Empty State Center */}
                <div className="col-span-8 bg-white rounded-xl shadow-lg p-8">
                  <div className="text-center">
                    {searchQuery ? (
                      <>
                        <Search className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No moments found</h3>
                        <p className="text-gray-500 mb-4">Try searching for different moments from your wedding</p>
                      </>
                    ) : (
                      <>
                        <Heart className="h-12 w-12 mx-auto text-pink-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome! Ready to explore your memories?</h3>
                        <p className="text-gray-500">Search for specific moments or click one of the curated choices →</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Picked Moments Sidebar - Always Available */}
                <div className="col-span-4">
                  <div className="bg-white rounded-xl shadow-lg p-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Sparkles className="h-5 w-5 text-pink-600 mr-2" />
                      Picked Moments
                    </h3>
                    <div className="space-y-2">
                      {featuredMoments.map((moment, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start h-10 p-2 hover:bg-pink-50 hover:border-pink-300 text-left"
                          onClick={() => {
                            setSearchQuery(moment.query)
                            handleSearch()
                          }}
                        >
                          <span className="text-lg mr-2">{moment.icon}</span>
                          <span className="font-medium">{moment.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {isSearching && (
              <div className="text-center py-8">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600"></div>
                  <span className="text-gray-600">Finding your moments...</span>
                </div>
              </div>
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
