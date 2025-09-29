'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cognitoAuth } from '@/lib/cognito-auth'
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
  Play,
  Download,
  Sparkles,
  Eye,
  Zap
} from 'lucide-react'
import AnalyticsDashboard from './analytics-dashboard'
import ShareProjectModal from './share-project-modal'

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
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; name?: string; userType?: string } | null>(null)
  const [projects, setProjects] = useState<WeddingProject[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<WeddingProject | null>(null)
  const [projectFiles, setProjectFiles] = useState<File[]>([])
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({})
  const [showFileDetails, setShowFileDetails] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newProject, setNewProject] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    description: ''
  })
  const [editingProject, setEditingProject] = useState<WeddingProject | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showShareProject, setShowShareProject] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showProcessingQueue, setShowProcessingQueue] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<File[]>([])

  const loadProjects = useCallback(async () => {
    if (!user?.email) return

    try {
      // First, ensure user exists in database
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          userType: 'videographer'
        })
      })

      if (userResponse.ok) {
        const { user: dbUser } = await userResponse.json()
        
        // Load projects for this user
        const projectsResponse = await fetch(`/api/projects?userId=${dbUser.id}&userType=videographer`)
        if (projectsResponse.ok) {
          const { projects } = await projectsResponse.json()
          setProjects(projects)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }, [user?.email, user?.name])

  // Load user and projects on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await cognitoAuth.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user, loadProjects])

  const createProject = async () => {
    if (!newProject.bride_name || !newProject.groom_name || !newProject.wedding_date) {
      alert('Please fill in all required fields (Bride name, Groom name, and Wedding date)')
      return
    }

    if (!user?.email) return

    try {
      // Ensure we have a user id
      let userId = currentUserId
      if (!userId) {
        // Create or fetch user via POST to guarantee existence
        const ensureUser = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          userType: 'videographer'
        })
        })
        if (!ensureUser.ok) {
          console.error('Failed to ensure user before creating project')
          alert('Failed to create project. Please try again.')
          return
        }
        const ensured = await ensureUser.json()
        userId = ensured.user?.id || null
        if (!userId) {
          console.error('No user id returned from ensure user')
          alert('Failed to create project. Please try again.')
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
        alert('Event created successfully!')
      } else {
        const errorData = await projectResponse.json()
        console.error('Failed to create project:', errorData)
        alert(`Failed to create project: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    }
  }

  const editProject = async () => {
    if (!editingProject) return
    
    if (!editingProject.bride_name || !editingProject.groom_name || !editingProject.wedding_date) {
      alert('Please fill in all required fields (Bride name, Groom name, and Wedding date)')
      return
    }

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: `${editingProject.bride_name} + ${editingProject.groom_name}`,
          brideName: editingProject.bride_name,
          groomName: editingProject.groom_name,
          weddingDate: editingProject.wedding_date,
          description: editingProject.description
        })
      })

      if (response.ok) {
        const { project } = await response.json()
        setProjects(prev => prev.map(p => p.id === project.id ? project : p))
        setSelectedProject(project)
        setIsEditing(false)
        setEditingProject(null)
        alert('Event updated successfully!')
      } else {
        const errorData = await response.json()
        console.error('Failed to update project:', errorData)
        alert(`Failed to update project: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project. Please try again.')
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      await loadProjects()
      setSelectedProject(null)
      alert('Project deleted successfully!')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


         const shareProject = async (data: { coupleEmail: string; coupleName: string; message: string }) => {
           if (!selectedProject || !currentUserId) {
             throw new Error('No project selected or user not authenticated')
           }

           // Get the current user's access token
           const accessToken = localStorage.getItem('cognito_access_token')
           if (!accessToken) {
             throw new Error('User not authenticated')
           }

           const response = await fetch('/api/projects/share', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${accessToken}`
             },
             body: JSON.stringify({
               projectId: selectedProject.id,
               coupleEmail: data.coupleEmail,
               coupleName: data.coupleName,
               message: data.message,
               videographerId: currentUserId
             })
           })

           if (!response.ok) {
             throw new Error('Failed to share project')
           }

           const result = await response.json()
           await loadProjects()
           
           return {
             success: true,
             emailSent: result.emailSent,
             emailError: result.emailError,
             shareableLink: result.shareableLink,
             invitationToken: result.invitationToken
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

  const startIntelligentProcessing = async (projectId: string) => {
    try {
      const response = await fetch('/api/ai/process-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mode: 'intelligent'
        })
      })

      if (response.ok) {
        alert('Intelligent AI processing started! This may take 5-15 minutes.')
        loadProjects()
      }
    } catch (error) {
      console.error('Error starting intelligent processing:', error)
    }
  }

  const previewCompilation = async (searchQuery: string, projectId: string) => {
    try {
      const response = await fetch('/api/compilation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          projectId
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Show preview of compilation result
        return data
      }
    } catch (error) {
      console.error('Error previewing compilation:', error)
    }
  }

  const checkProcessingStatus = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/status`)
      if (response.ok) {
        const { status } = await response.json()
        setProcessingStatus(prev => ({ ...prev, [fileId]: status }))
      }
    } catch (error) {
      console.error('Error checking processing status:', error)
    }
  }

  const createCompilation = async (searchQuery: string, projectId: string) => {
    try {
      const response = await fetch('/api/compilation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          projectId,
          maxDuration: 300
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert('AI compilation created successfully!')
        return data
      }
    } catch (error) {
      console.error('Error creating compilation:', error)
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
              <span className="text-gray-700">Welcome, {user?.name}</span>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAnalytics(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" /> Analytics
              </Button>

              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  await cognitoAuth.signOut()
                  router.push('/')
                } catch (error) {
                  console.error('Sign out failed:', error)
                }
              }}>
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
                          <span>{projects.length === 0 ? 'Create Your First Event' : 'New Event'}</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{projects.length === 0 ? 'Create Your First Wedding Event' : 'Create New Wedding Event'}</DialogTitle>
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

                    {/* Share Project Modal */}
                    <ShareProjectModal
                      isOpen={showShareProject}
                      onClose={() => setShowShareProject(false)}
                      projectName={selectedProject?.project_name || ''}
                      onShare={shareProject}
                    />

                    {/* Edit Project Modal */}
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Wedding Event</DialogTitle>
                          <DialogDescription>
                            Update the couple&apos;s details for this wedding project
                          </DialogDescription>
                        </DialogHeader>
                        {editingProject && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit_bride_name">Bride&apos;s Name</Label>
                                <Input
                                  id="edit_bride_name"
                                  value={editingProject.bride_name || ''}
                                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, bride_name: e.target.value } : null)}
                                  placeholder="Julia"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_groom_name">Groom&apos;s Name</Label>
                                <Input
                                  id="edit_groom_name"
                                  value={editingProject.groom_name || ''}
                                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, groom_name: e.target.value } : null)}
                                  placeholder="Tom"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit_wedding_date">Wedding Date</Label>
                              <Input
                                id="edit_wedding_date"
                                type="date"
                                value={editingProject.wedding_date || ''}
                                onChange={(e) => setEditingProject(prev => prev ? { ...prev, wedding_date: e.target.value } : null)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit_description">Description (Optional)</Label>
                              <Input
                                id="edit_description"
                                value={editingProject.description || ''}
                                onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                                placeholder="Beautiful outdoor ceremony..."
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => {
                                setIsEditing(false)
                                setEditingProject(null)
                              }}>
                                Cancel
                              </Button>
                              <Button onClick={editProject}>
                                Update Event
                              </Button>
                            </div>
                          </div>
                        )}
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
                              setEditingProject(project)
                              setIsEditing(true)
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

                {/* AI Processing Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <span>AI Intelligence Pipeline</span>
                    </CardTitle>
                    <CardDescription>
                      Intelligent video analysis and smart compilation for couples
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex space-x-4">
                        <Button 
                          onClick={() => startIntelligentProcessing(selectedProject?.id || '')}
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={!selectedProject || projectFiles.length === 0}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Start AI Processing
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setShowProcessingQueue(true)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Queue
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setShowAnalytics(true)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Progress
                        </Button>
                      </div>
                      {selectedProject && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <h4 className="font-semibold text-purple-900 mb-2">Smart Compilations</h4>
                          <div className="space-y-2">
                            {['First Dance', 'Ceremony', 'Getting Ready', 'Reception'].map((comp) => (
                              <div key={comp} className="flex items-center justify-between">
                                <span className="text-sm">{comp}</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => createCompilation(comp.toLowerCase(), selectedProject.id)}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Project Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Summary</CardTitle>
                    <CardDescription>
                      Overview of uploaded content and processing status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Video className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.file_count || 0}</h3>
                        <p className="text-sm text-gray-600">Videos Uploaded</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.file_count - (selectedProject.processed_files || 0)}</h3>
                        <p className="text-sm text-gray-600">AI Processing</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.processed_files || 0}</h3>
                        <p className="text-sm text-gray-600">Ready for Couple</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <h3 className="font-medium text-purple-600">Intelligent</h3>
                        <p className="text-sm text-gray-600">Auto compiled</p>
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
