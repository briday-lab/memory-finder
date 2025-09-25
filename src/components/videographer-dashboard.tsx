'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Heart, 
  Camera, 
  Plus, 
  LogOut, 
  Upload,
  Users,
  Video,
  CheckCircle,
  Clock,
  RefreshCw,
  Share2,
  BarChart3,
  Trash2,
  Edit3,
  Settings,
  MoreVertical
} from 'lucide-react'
import AnalyticsDashboard from './analytics-dashboard'

interface WeddingProject {
  id: string
  project_name: string
  bride_name: string
  groom_name: string
  wedding_date: string
  description: string
  videographer_id: string
  couple_id: string
  status: 'active' | 'completed' | 'archived'
  created_at: string
  file_count: number
  processed_files: number
}

interface File {
  id: string
  filename: string
  file_size: number
  file_type: string
  status: string
  created_at: string
}

export default function VideographerDashboard() {
  console.log('VideographerDashboard component loaded')
  const { data: session } = useSession()
  const [projects, setProjects] = useState<WeddingProject[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<WeddingProject | null>(null)
  const [projectFiles, setProjectFiles] = useState<File[]>([])
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newProject, setNewProject] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    description: ''
  })
  const [showShareProject, setShowShareProject] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [shareForm, setShareForm] = useState({
    coupleEmail: '',
    coupleName: '',
    message: ''
  })

  const loadProjects = useCallback(async () => {
    if (!session?.user?.email) return

    try {
      // First, ensure user exists in database
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name,
          userType: 'videographer'
        })
      })

      if (userResponse.ok) {
        const { user } = await userResponse.json()
        
        // Load projects for this user
        const projectsResponse = await fetch(`/api/projects?userId=${user.id}&userType=videographer`)
        if (projectsResponse.ok) {
          const { projects } = await projectsResponse.json()
          setProjects(projects)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }, [session?.user?.email, session?.user?.name])

  // Load projects on component mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const createProject = async () => {
    if (!newProject.bride_name || !newProject.groom_name || !newProject.wedding_date) {
      return
    }

    if (!session?.user?.email) return

    try {
      // Ensure we have a user id
      let userId = currentUserId
      if (!userId) {
        // Create or fetch user via POST to guarantee existence
        const ensureUser = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.user.email,
            name: session.user.name,
            userType: 'videographer'
          })
        })
        if (!ensureUser.ok) {
          console.error('Failed to ensure user before creating project')
          return
        }
        const ensured = await ensureUser.json()
        userId = ensured.user?.id || null
        if (!userId) {
          console.error('No user id returned from ensure user')
          return
        }
        setCurrentUserId(userId)
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videographerId: userId,
          projectName: `${newProject.bride_name} + ${newProject.groom_name}`,
          brideName: newProject.bride_name,
          groomName: newProject.groom_name,
          weddingDate: newProject.wedding_date,
          description: newProject.description
        })
      })

      if (projectResponse.ok) {
        const { project } = await projectResponse.json()
        setProjects(prev => [project, ...prev])
        setSelectedProject(project)
        setIsCreatingProject(false)
        setNewProject({ bride_name: '', groom_name: '', wedding_date: '', description: '' })
      }
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      await loadProjects()
      alert('Project deleted successfully!')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  const updateProject = async (projectId: string, updates: Partial<WeddingProject>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      await loadProjects()
      alert('Project updated successfully!')
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project')
    }
  }

  const shareProject = async () => {
    if (!selectedProject || !shareForm.coupleEmail) {
      alert('Please select a project and enter couple email')
      return
    }

    try {
      const response = await fetch('/api/projects/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          coupleEmail: shareForm.coupleEmail,
          coupleName: shareForm.coupleName,
          message: shareForm.message
        })
      })

      if (!response.ok) {
        throw new Error('Failed to share project')
      }

      const result = await response.json()
      
      setShareForm({ coupleEmail: '', coupleName: '', message: '' })
      setShowShareProject(false)
      await loadProjects()
      
      // Show success message with shareable link
      const message = result.emailSent 
        ? `Project shared successfully! Email sent to ${shareForm.coupleEmail}`
        : `Project shared successfully! Email failed to send, but you can share this link: ${result.shareableLink}`
      
      alert(message)
      
      // Copy link to clipboard if available
      if (result.shareableLink && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(result.shareableLink)
          console.log('Shareable link copied to clipboard')
        } catch (clipboardError) {
          console.log('Could not copy to clipboard:', clipboardError)
        }
      }
    } catch (error) {
      console.error('Error sharing project:', error)
      alert('Failed to share project')
    }
  }

  const loadProjectFiles = async (projectId: string) => {
    try {
      const response = await fetch(`/api/files?projectId=${projectId}`)
      if (response.ok) {
        const { files } = await response.json()
        setProjectFiles(files)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !selectedProject) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Get presigned URL from our API
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            projectId: selectedProject.id,
            fileSize: file.size
          }),
        })

        if (response.ok) {
          const { presignedUrl } = await response.json()
          
          // Upload file directly to S3
          const uploadResponse = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })

          if (uploadResponse.ok) {
            setUploadProgress((i + 1) / files.length * 100)
          } else {
            console.error('Upload failed for:', file.name)
          }
        }
      }
      
      // Reload project files after upload
      await loadProjectFiles(selectedProject.id)
      await loadProjects() // Refresh project list to update file counts
      
      alert('Files uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

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
                <p className="text-sm text-gray-600">Videographer Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAnalytics(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" /> Analytics
              </Button>

              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Projects */}
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Events</span>
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={loadProjects}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="flex items-center space-x-1">
                          <Plus className="h-4 w-4" />
                          <span>New Event</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Wedding Event</DialogTitle>
                          <DialogDescription>
                            Enter the couple&apos;s details to create a new wedding project
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="bride_name">Bride&apos;s Name</Label>
                              <Input
                                id="bride_name"
                                value={newProject.bride_name}
                                onChange={(e) => setNewProject(prev => ({ ...prev, bride_name: e.target.value }))}
                                placeholder="Julia"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="groom_name">Groom&apos;s Name</Label>
                              <Input
                                id="groom_name"
                                value={newProject.groom_name}
                                onChange={(e) => setNewProject(prev => ({ ...prev, groom_name: e.target.value }))}
                                placeholder="Tom"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wedding_date">Wedding Date</Label>
                            <Input
                              id="wedding_date"
                              type="date"
                              value={newProject.wedding_date}
                              onChange={(e) => setNewProject(prev => ({ ...prev, wedding_date: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                              id="description"
                              value={newProject.description}
                              onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Beautiful outdoor ceremony..."
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsCreatingProject(false)}>
                              Cancel
                            </Button>
                            <Button onClick={createProject}>
                              Create Event
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Share Project Dialog */}
                    <Dialog open={showShareProject} onOpenChange={setShowShareProject}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Share Project with Couple</DialogTitle>
                          <DialogDescription>
                            Invite the couple to view their wedding project
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {selectedProject && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium">{selectedProject.project_name}</p>
                              <p className="text-sm text-gray-600">
                                {selectedProject.bride_name} + {selectedProject.groom_name}
                              </p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="couple_email">Couple&apos;s Email *</Label>
                            <Input
                              id="couple_email"
                              type="email"
                              value={shareForm.coupleEmail}
                              onChange={(e) => setShareForm(prev => ({ ...prev, coupleEmail: e.target.value }))}
                              placeholder="julia.tom@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="couple_name">Couple&apos;s Names (Optional)</Label>
                            <Input
                              id="couple_name"
                              value={shareForm.coupleName}
                              onChange={(e) => setShareForm(prev => ({ ...prev, coupleName: e.target.value }))}
                              placeholder="Julia & Tom"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="message">Personal Message (Optional)</Label>
                            <textarea
                              id="message"
                              className="w-full p-2 border border-gray-300 rounded-md resize-none"
                              rows={3}
                              value={shareForm.message}
                              onChange={(e) => setShareForm(prev => ({ ...prev, message: e.target.value }))}
                              placeholder="Hi! Your wedding videos are ready to view..."
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowShareProject(false)}>
                              Cancel
                            </Button>
                            <Button onClick={shareProject}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share Project
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
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
                      onClick={() => {
                        setSelectedProject(project)
                        loadProjectFiles(project.id)
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm">{project.project_name}</h3>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProject(project)
                              setShowShareProject(true)
                            }}
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Add edit project functionality
                              alert('Edit project functionality coming soon!')
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteProject(project.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {getStatusIcon(project.status)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {formatDate(project.wedding_date)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Video className="h-3 w-3" />
                          <span>{project.file_count || 0} videos</span>
                        </span>
                        <span className="capitalize">{project.status}</span>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No events yet</p>
                      <p className="text-xs">Create your first wedding event</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content Area */}
          <section className="lg:col-span-3">
            {selectedProject ? (
              <div className="space-y-6">
                {/* Project Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Users className="h-5 w-5" />
                          <span>{selectedProject.project_name}</span>
                        </CardTitle>
                        <CardDescription>
                          {formatDate(selectedProject.wedding_date)} • {selectedProject.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(selectedProject.status)}
                        <span className="text-sm text-gray-600 capitalize">
                          {selectedProject.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Wedding Videos</span>
                    </CardTitle>
                    <CardDescription>
                      Upload your wedding footage. Large files are supported and will be processed automatically.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors cursor-pointer"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">Drop your wedding videos here</h3>
                      <p className="text-gray-600 mb-4">
                        Supports MP4, MOV, AVI files up to 10GB each
                      </p>
                      <Button 
                        className="bg-pink-600 hover:bg-pink-700"
                        disabled={isUploading}
                      >
                        {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Choose Files'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                      {isUploading && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Uploaded Files */}
                {projectFiles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Uploaded Files</CardTitle>
                      <CardDescription>
                        Files uploaded to this project
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {projectFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Video className="h-5 w-5 text-gray-600" />
                              <div>
                                <p className="font-medium text-sm">{file.filename}</p>
                                <p className="text-xs text-gray-600">
                                  {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(file.status)}
                              <span className="text-xs text-gray-600 capitalize">{file.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Project Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Summary</CardTitle>
                    <CardDescription>
                      Overview of uploaded content and processing status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Video className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.file_count || 0}</h3>
                        <p className="text-sm text-gray-600">Videos Uploaded</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.file_count - (selectedProject.processed_files || 0)}</h3>
                        <p className="text-sm text-gray-600">Processing</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.processed_files || 0}</h3>
                        <p className="text-sm text-gray-600">Ready for Couple</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-medium mb-2">Welcome to Memory Finder</h2>
                  <p className="text-gray-600 mb-6">
                    Create your first wedding event to get started
                  </p>
                  <Button onClick={() => setIsCreatingProject(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analytics Dashboard</DialogTitle>
            <DialogDescription>
              Track your project performance and search analytics
            </DialogDescription>
          </DialogHeader>
          <AnalyticsDashboard />
        </DialogContent>
      </Dialog>
    </div>
  )
}
