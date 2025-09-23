'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Video, 
  Heart, 
  LogOut, 
  Plus,
  Play
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
}

interface WeddingProject {
  id: string
  project_name: string
  wedding_date: string
  description: string
}

interface VideoFile {
  id: string
  filename: string
  duration_seconds: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

interface VideoMoment {
  id: string
  start_time_seconds: number
  end_time_seconds: number
  description: string
  confidence_score: number
  video_file_id: string
}

export default function Dashboard({ user }: { user: User }) {
  const [projects] = useState<WeddingProject[]>([
    {
      id: 'project-1',
      project_name: 'Sarah & Michael Wedding',
      wedding_date: '2024-06-15',
      description: 'Beautiful outdoor wedding ceremony'
    }
  ])
  const [selectedProject] = useState<WeddingProject>({
    id: 'project-1',
    project_name: 'Sarah & Michael Wedding',
    wedding_date: '2024-06-15',
    description: 'Beautiful outdoor wedding ceremony'
  })
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [, setMoments] = useState<VideoMoment[]>([
    {
      id: 'moment-1',
      start_time_seconds: 300,
      end_time_seconds: 360,
      description: 'Wedding vows',
      confidence_score: 0.95,
      video_file_id: 'video-1'
    },
    {
      id: 'moment-2',
      start_time_seconds: 1200,
      end_time_seconds: 1260,
      description: 'First dance',
      confidence_score: 0.92,
      video_file_id: 'video-2'
    }
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<VideoMoment[]>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedProject) return

    setIsUploading(true)
    try {
      // Get presigned URL from our API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          projectId: selectedProject.id,
        }),
      })

      if (response.ok) {
        const { presignedUrl } = await response.json()
        
        // Upload file directly to S3
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (uploadResponse.ok) {
          alert('File uploaded successfully!')
          // Refresh the list from S3
          await refreshFiles()
        } else {
          const errorText = await uploadResponse.text()
          console.error('S3 upload error:', uploadResponse.status, errorText)
          alert(`Upload failed: ${uploadResponse.status} - ${errorText}`)
        }
      } else {
        const errorData = await response.json()
        console.error('API error:', response.status, errorData)
        alert(`Failed to get upload URL: ${response.status} - ${errorData.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const refreshFiles = async () => {
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id })
      })
      if (!response.ok) return
      const data = await response.json()
      const items: Array<{ key?: string; fileName?: string; lastModified?: string | Date; size?: number }> = data.items || []
      const mapped: VideoFile[] = items.map((it, idx) => ({
        id: it.key || String(idx),
        filename: it.fileName || 'unknown',
        duration_seconds: 0,
        processing_status: 'completed',
        created_at: (it.lastModified ? new Date(it.lastModified).toISOString() : new Date().toISOString()),
      }))
      setVideoFiles(mapped)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Refresh files error:', e)
    }
  }

  // Initial load
  useEffect(() => {
    if (selectedProject) {
      refreshFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedProject) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          projectId: selectedProject.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const normalized = (data.results || []).map((r: any, idx: number) => ({
          id: r.id || String(idx),
          // Map potential API shapes to expected seconds-based fields
          start_time_seconds: Number(r.start_time_seconds ?? r.startTime ?? 0) || 0,
          end_time_seconds: Number(r.end_time_seconds ?? r.endTime ?? 0) || 0,
          description: r.description ?? r.content ?? searchQuery,
          confidence_score: Number(r.confidence_score ?? r.confidence ?? 0) || 0,
          video_file_id: r.video_file_id || r.videoId || '',
          fileName: r.fileName,
          fileSize: r.fileSize,
          lastModified: r.lastModified
        }))
        setSearchResults(normalized)
      } else {
        console.error('Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-pink-600" />
              <h1 className="text-2xl font-bold text-gray-900">Memory Finder</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedProject?.id === project.id
                          ? 'bg-pink-50 border border-pink-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <h3 className="font-medium text-gray-900">{project.project_name}</h3>
                      <p className="text-sm text-gray-600">{project.wedding_date}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="videos" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>

              <TabsContent value="videos">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Videos</CardTitle>
                    <CardDescription>
                      Upload wedding videos to {selectedProject?.project_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload">Choose Video File</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept="video/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </div>
                      {isUploading && (
                        <p className="text-sm text-blue-600">Uploading...</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={refreshFiles}>
                          Refresh List
                        </Button>
                        <span className="text-sm text-gray-500">Project ID: {selectedProject?.id}</span>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Uploaded Videos</h3>
                      <div className="space-y-2">
                        {videoFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Video className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium">{file.filename}</p>
                                <p className="text-sm text-gray-600">
                                  {Math.floor(file.duration_seconds / 60)} minutes • 
                                  {file.processing_status === 'completed' ? ' Ready' : ' Processing...'}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <Play className="h-4 w-4 mr-2" />
                              Play
                            </Button>
                          </div>
                        ))}
                        {videoFiles.length === 0 && (
                          <p className="text-sm text-gray-500">No uploads found. Use the Refresh button after uploading.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="search">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Moments</CardTitle>
                    <CardDescription>
                      Find specific moments in your wedding videos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Search for moments... (e.g., 'wedding vows', 'first dance')"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={isSearching}>
                          <Search className="h-4 w-4 mr-2" />
                          {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                          <div className="space-y-3">
                            {searchResults.map((moment) => (
                              <div key={moment.id} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{moment.description}</p>
                                    <p className="text-sm text-gray-600">
                                      {Math.floor(moment.start_time_seconds / 60)}:{(moment.start_time_seconds % 60).toString().padStart(2, '0')} - 
                                      {Math.floor(moment.end_time_seconds / 60)}:{(moment.end_time_seconds % 60).toString().padStart(2, '0')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Confidence: {Math.round(moment.confidence_score * 100)}%
                                    </p>
                                  </div>
                                  <Button size="sm">
                                    <Play className="h-4 w-4 mr-2" />
                                    Play Clip
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchQuery && searchResults.length === 0 && !isSearching && (
                        <div className="text-center py-8 text-gray-500">
                          No moments found for &quot;{searchQuery}&quot;
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}