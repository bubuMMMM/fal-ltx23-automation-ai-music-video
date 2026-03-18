'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Project } from '@/lib/types'
import { Check, Play, Pause, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/audio'

interface Step4Props {
  project: Project
  onUpdate: () => void
  onNext: () => void
}

export function Step4SelectFrames({ project, onUpdate, onNext }: Step4Props) {
  const [selections, setSelections] = useState<Record<number, string>>(
    project.frameSelections || {}
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const selectedCount = Object.keys(selections).length
  const totalCount = project.segments.length
  const allSelected = selectedCount === totalCount
  
  // Find current segment based on audio time
  const currentSegmentIndex = project.segments.findIndex(
    seg => currentTime >= seg.startTime && currentTime < seg.endTime
  )
  
  // Group frames by segment
  const framesBySegment: Record<number, typeof project.frameResults> = {}
  project.frameResults.forEach(frame => {
    if (!framesBySegment[frame.segmentIndex]) {
      framesBySegment[frame.segmentIndex] = []
    }
    framesBySegment[frame.segmentIndex].push(frame)
  })
  
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [])
  
  function selectFrame(segmentIndex: number, imageUrl: string) {
    setSelections(prev => ({
      ...prev,
      [segmentIndex]: imageUrl
    }))
  }
  
  async function saveSelections() {
    setError(null)
    
    try {
      const response = await fetch('/api/select-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          selections
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save selections')
      }
      
      onUpdate()
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selections')
    }
  }
  
  function togglePlay() {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }
  
  function seekToSegment(segmentIndex: number) {
    if (audioRef.current && project.segments[segmentIndex]) {
      audioRef.current.currentTime = project.segments[segmentIndex].startTime
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Select Frames</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose one frame per segment for video generation
        </p>
      </div>
      
      {/* Audio player */}
      <div className="sticky top-0 z-10 rounded-lg border border-border bg-card p-4">
        <audio ref={audioRef} src={project.audioUrl} />
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">
                {formatTime(currentTime)}
              </span>
              <span className="text-muted-foreground">
                {selectedCount} / {totalCount} selected
              </span>
              <span className="font-mono text-muted-foreground">
                {formatTime(project.audioDuration || 0)}
              </span>
            </div>
            
            {/* Timeline */}
            <div className="relative mt-2 h-2 rounded-full bg-secondary">
              <div
                className="absolute h-full rounded-full bg-primary transition-all"
                style={{ width: `${((currentTime / (project.audioDuration || 1)) * 100)}%` }}
              />
              {/* Segment markers */}
              {project.segments.map((seg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'absolute top-0 h-full border-l transition-colors',
                    currentSegmentIndex === idx ? 'border-primary' : 'border-muted-foreground/30'
                  )}
                  style={{ left: `${(seg.startTime / (project.audioDuration || 1)) * 100}%` }}
                />
              ))}
            </div>
          </div>
          
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Segments with frame selection */}
      <div className="max-h-[500px] space-y-4 overflow-y-auto pr-2">
        {project.segments.map((segment, segIdx) => {
          const frames = (framesBySegment[segIdx] || []).filter(f => f.status === 'done')
          const isCurrentSegment = currentSegmentIndex === segIdx
          const selectedUrl = selections[segIdx]
          
          return (
            <div
              key={segIdx}
              className={cn(
                'rounded-lg border bg-card p-4 transition-colors',
                isCurrentSegment ? 'border-primary' : 'border-border'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => seekToSegment(segIdx)}
                  className="flex items-center gap-2 text-left hover:text-primary"
                >
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isCurrentSegment 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                  )}>
                    {segIdx + 1}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </span>
                </button>
                
                {selectedUrl && (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" />
                    Selected
                  </span>
                )}
              </div>
              
              <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
                {segment.scene}
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                {frames.map((frame, frameIdx) => (
                  <button
                    key={frameIdx}
                    onClick={() => selectFrame(segIdx, frame.imageUrl)}
                    className={cn(
                      'relative aspect-video overflow-hidden rounded-md border-2 transition-all',
                      selectedUrl === frame.imageUrl
                        ? 'border-primary ring-2 ring-primary/50'
                        : 'border-transparent hover:border-muted-foreground'
                    )}
                  >
                    <Image
                      src={frame.imageUrl}
                      alt={`Frame ${frameIdx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {selectedUrl === frame.imageUrl && (
                      <div className="absolute right-1 top-1 rounded-full bg-primary p-0.5">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={saveSelections} disabled={!allSelected}>
          {allSelected ? 'Generate Videos' : `Select ${totalCount - selectedCount} more`}
        </Button>
      </div>
    </div>
  )
}
