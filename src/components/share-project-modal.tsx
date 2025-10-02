'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { 
  Share2, 
  Mail, 
  Copy, 
  Check,
  ExternalLink,
  AlertCircle
} from 'lucide-react'

interface ShareProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  onShare: (data: { coupleEmail: string; coupleName: string; message: string }) => Promise<{
    success: boolean
    emailSent: boolean
    emailError?: string
    shareableLink?: string
    invitationToken?: string
  }>
}

export default function ShareProjectModal({ 
  isOpen, 
  onClose, 
  projectName, 
  onShare 
}: ShareProjectModalProps) {
  const [formData, setFormData] = useState({
    coupleEmail: '',
    coupleName: '',
    message: ''
  })
  const [isSharing, setIsSharing] = useState(false)
  const [shareResult, setShareResult] = useState<{
    success: boolean
    emailSent: boolean
    emailError?: string
    shareableLink?: string
    invitationToken?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.coupleEmail) return

    setIsSharing(true)
    try {
      const result = await onShare(formData)
      setShareResult(result)
      
      if (result.success && result.shareableLink) {
        // Auto-copy link to clipboard
        try {
          await navigator.clipboard.writeText(result.shareableLink)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (clipboardError) {
          console.log('Could not copy to clipboard:', clipboardError)
        }
      }
    } catch (error) {
      console.error('Error sharing project:', error)
      setShareResult({
        success: false,
        emailSent: false,
        emailError: 'Failed to share project'
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareResult?.shareableLink) return
    
    try {
      await navigator.clipboard.writeText(shareResult.shareableLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Could not copy to clipboard:', error)
    }
  }

  const handleClose = () => {
    setFormData({ coupleEmail: '', coupleName: '', message: '' })
    setShareResult(null)
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-pink-600" />
            <span>Share Project: {projectName}</span>
          </DialogTitle>
          <DialogDescription>
            Invite the couple to access their wedding video project
          </DialogDescription>
        </DialogHeader>

        {!shareResult ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="coupleEmail" className="text-sm font-medium">
                  Couple&apos;s Email Address *
                </Label>
                <Input
                  id="coupleEmail"
                  type="email"
                  placeholder="couple@example.com"
                  value={formData.coupleEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, coupleEmail: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="coupleName" className="text-sm font-medium">
                  Couple&apos;s Names (Optional)
                </Label>
                <Input
                  id="coupleName"
                  placeholder="Sarah & John"
                  value={formData.coupleName}
                  onChange={(e) => setFormData(prev => ({ ...prev, coupleName: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-sm font-medium">
                  Personal Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message for the couple..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSharing || !formData.coupleEmail}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {isSharing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Project
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {shareResult.success ? (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-800 flex items-center space-x-2">
                    <Check className="h-5 w-5" />
                    <span>Project Shared Successfully!</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shareResult.emailSent ? (
                    <div className="flex items-center space-x-2 text-green-700">
                      <Mail className="h-4 w-4" />
                      <span>Email sent successfully to {formData.coupleEmail}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        <span>Email failed to send, but you can share the link manually</span>
                      </div>
                      {shareResult.emailError && (
                        <p className="text-sm text-gray-600">Error: {shareResult.emailError}</p>
                      )}
                    </div>
                  )}

                  {shareResult.shareableLink && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Shareable Link:</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={shareResult.shareableLink}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyLink}
                          className="flex items-center space-x-1"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(shareResult.shareableLink, '_blank')}
                          className="flex items-center space-x-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open Link</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Next Steps:</strong> The couple can now access their wedding video project 
                      using the link above. They&apos;ll be able to search through their memories using 
                      natural language like &quot;wedding vows&quot; or &quot;first dance&quot;.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-800 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Failed to Share Project</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700">
                    {shareResult.emailError || 'An unexpected error occurred while sharing the project.'}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {shareResult.success && (
                <Button 
                  onClick={() => {
                    setShareResult(null)
                    setFormData({ coupleEmail: '', coupleName: '', message: '' })
                  }}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  Share Another Project
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
