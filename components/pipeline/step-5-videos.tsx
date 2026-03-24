'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Project, Job } from '@/lib/types'
import { Loader2, Video } from 'lucide-react'

interface Step5Props {
  project: Project
  onUpdate: () => void
  onNext: () => void
}

export function Step5Videos({ project, onUpdate, onNext }: Step5Props) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const isRunning = project.stepStatuses[5] === 'running'
  const isDone = project.stepStatuses[5] === 'done'
  const hasVideos = project.videoResults.length > 0
  
  const completedCount = project.videoResults.filter(v => v.status === 'done').length
  const totalCount = project.segments.length * project.variants
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  
  // Poll for job status
  useEffect(() => {
    if (!jobId || isDone) return
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/job-status/${jobId}`)
        if (response.ok) {
          const { job: updatedJob } = await response.json()
          setJob(updatedJob)
          
          if (updatedJob.status === 'done' || updatedJob.status === 'error') {
            clearInterval(interval)
            onUpdate()
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [jobId, isDone, onUpdate])
  
  // Also poll project for video results
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      onUpdate()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [isRunning, onUpdate])
  
  async function startGeneration() {
    setError(null)
    
    try {
      const response = await fetch('/api/generate-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start generation')
      }
      
      const { jobId: newJobId } = await response.json()
      setJobId(newJobId)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
    }
  }
  
  // Group videos by segment
  const videosBySegment: Record<number, typeof project.videoResults> = {}
  project.videoResults.forEach(video => {
    if (!videosBySegment[video.segmentIndex]) {
      videosBySegment[video.segmentIndex] = []
    }
    videosBySegment[video.segmentIndex].push(video)
  })
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Generate Videos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate {project.variants} video variants for each segment using LTX-2
        </p>
      </div>
      
      {/* Progress */}
      {(isRunning || hasVideos) && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-card-foreground">
              {isDone ? 'Generation complete' : 'Generating videos...'}
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              {completedCount} / {totalCount}
            </p>
          </div>
          <Progress value={progress} className="mt-3" />
          {isRunning && (
            <p className="mt-2 text-xs text-muted-foreground">
              Video generation takes longer than frames. Please be patient.
            </p>
          )}
        </div>
      )}
      
      {/* Start button */}
      {!hasVideos && !isRunning && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Video className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-medium text-foreground">Ready to generate videos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This will generate {totalCount} videos using audio-to-video AI
          </p>
          <Button onClick={startGeneration} className="mt-4">
            Start Generation
          </Button>
        </div>
      )}
      
      {/* Videos grid */}
      {hasVideos && (
        <div className="max-h-[500px] space-y-6 overflow-y-auto pr-2">
          {project.segments.map((segment, segIdx) => {
            const videos = videosBySegment[segIdx] || []
            const doneVideos = videos.filter(v => v.status === 'done')
            
            return (
              <div key={segIdx} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-card-foreground">
                    Segment {segIdx + 1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doneVideos.length} / {project.variants} generated
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: project.variants }).map((_, varIdx) => {
                    const video = videos.find(v => v.variantIndex === varIdx)
                    
                    if (video?.status === 'done' && video.videoUrl) {
                      return (
                        <div key={varIdx} className="relative aspect-video overflow-hidden rounded-md bg-black">
                          <video
                            src={video.videoUrl}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause()
                              e.currentTarget.currentTime = 0
                            }}
                          />
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={varIdx}
                        className="flex aspect-video items-center justify-center rounded-md bg-secondary"
                      >
                        {isRunning ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <Video className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {/* Actions */}
      {isDone && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            Select Videos
          </Button>
        </div>
      )}
    </div>
  )
}
