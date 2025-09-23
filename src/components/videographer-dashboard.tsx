'use client'

import { useState } from 'react'
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
  Clock
} from 'lucide-react'

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
  video_count: number
  processing_status: 'pending' | 'processing' | 'completed'
}

export default function VideographerDashboard() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<WeddingProject[]>([])
  const [selectedProject, setSelectedProject] = useState<WeddingProject | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProject, setNewProject] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    description: ''
  })

  const createProject = async () => {
    if (!newProject.bride_name || !newProject.groom_name || !newProject.wedding_date) {
      return
    }

    const project: WeddingProject = {
      id: `project-${Date.now()}`,
      project_name: `${newProject.bride_name} + ${newProject.groom_name}`,
      bride_name: newProject.bride_name,
      groom_name: newProject.groom_name,
      wedding_date: newProject.wedding_date,
      description: newProject.description,
      videographer_id: session?.user?.id || '1',
      couple_id: `couple-${Date.now()}`,
      status: 'active',
      created_at: new Date().toISOString(),
      video_count: 0,
      processing_status: 'pending'
    }

    setProjects(prev => [project, ...prev])
    setSelectedProject(project)
    setIsCreatingProject(false)
    setNewProject({ bride_name: '', groom_name: '', wedding_date: '', description: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
                          Enter the couple's details to create a new wedding project
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
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm">{project.project_name}</h3>
                        {getStatusIcon(project.processing_status)}
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {formatDate(project.wedding_date)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Video className="h-3 w-3" />
                          <span>{project.video_count} videos</span>
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
                        {getStatusIcon(selectedProject.processing_status)}
                        <span className="text-sm text-gray-600 capitalize">
                          {selectedProject.processing_status}
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
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">Drop your wedding videos here</h3>
                      <p className="text-gray-600 mb-4">
                        Supports MP4, MOV, AVI files up to 10GB each
                      </p>
                      <Button className="bg-pink-600 hover:bg-pink-700">
                        Choose Files
                      </Button>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Video className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">{selectedProject.video_count}</h3>
                        <p className="text-sm text-gray-600">Videos Uploaded</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">Processing</h3>
                        <p className="text-sm text-gray-600">AI Analysis</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h3 className="font-medium">Ready</h3>
                        <p className="text-sm text-gray-600">For Couple</p>
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
    </div>
  )
}
