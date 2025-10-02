'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  startTime?: number
  endTime?: number
  fileName?: string
  className?: string
}

export default function VideoPlayer({ 
  src, 
  startTime = 0, 
  endTime, 
  fileName,
  className = '' 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [segmentDuration, setSegmentDuration] = useState(0)

  // Debug video source
  useEffect(() => {
    console.log('VideoPlayer src:', src)
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      video.currentTime = startTime
      
      // Calculate segment duration
      const segment = endTime ? endTime - startTime : video.duration - startTime
      setSegmentDuration(segment)
    }

    const handleTimeUpdate = () => {
      // Calculate current time relative to segment start
      const segmentCurrentTime = video.currentTime - startTime
      setCurrentTime(Math.max(0, segmentCurrentTime))
      
      // Auto-stop at end time if specified
      if (endTime && video.currentTime >= endTime) {
        video.pause()
        setIsPlaying(false)
        video.currentTime = startTime
        setCurrentTime(0)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [startTime, endTime])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const seekTime = parseFloat(e.target.value) + startTime
    video.currentTime = seekTime
    setCurrentTime(parseFloat(e.target.value))
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = segmentDuration > 0 ? (currentTime / segmentDuration) * 100 : 0

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-2"> 
        <div className="space-y-2">
          {fileName && (
            <h4 className="font-medium text-sm text-gray-600 truncate">
              {fileName}
            </h4>
          )}
          
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9", maxHeight: "40vh" }}>
            {src ? (
              <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-cover min-h-0"
                preload="metadata"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎬</div>
                  <div className="text-sm">Loading video...</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {fileName || 'Video file'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                
                <div className="flex-1 text-white text-xs">
                  {formatTime(currentTime)} / {formatTime(segmentDuration)}
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => videoRef.current?.requestFullscreen()}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
              <input
                type="range"
                min="0"
                max={segmentDuration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${progress}%, rgba(255,255,255,0.3) ${progress}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
              </div>
            </div>
          </div>
          
          {/* Time Range Info */}
          {(startTime > 0 || endTime) && (
            <div className="text-xs text-gray-500 text-center">
              {startTime > 0 && `Start: ${formatTime(startTime)}`}
              {startTime > 0 && endTime && ' • '}
              {endTime && `End: ${formatTime(endTime)}`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
