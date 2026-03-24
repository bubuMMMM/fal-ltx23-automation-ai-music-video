'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Project, Job } from '@/lib/types'
import { Loader2, ImageIcon } from 'lucide-react'

interface Step3Props {
  project: Project
  onUpdate: () => void
  onNext: () => void
}

export function Step3Frames({ project, onUpdate, onNext }: Step3Props) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const isRunning = project.stepStatuses[3] === 'running'
  const isDone = project.stepStatuses[3] === 'done'
  const hasFrames = project.frameResults.length > 0
  
  const completedCount = project.frameResults.filter(f => f.status === 'done').length
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
    }, 2000)
    
    return () => clearInterval(interval)
  }, [jobId, isDone, onUpdate])
  
  // Also poll project for frame results
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      onUpdate()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [isRunning, onUpdate])
  
  async function startGeneration() {
    setError(null)
    
    try {
      const response = await fetch('/api/generate-frames', {
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
  
  // Group frames by segment
  const framesBySegment: Record<number, typeof project.frameResults> = {}
  project.frameResults.forEach(frame => {
    if (!framesBySegment[frame.segmentIndex]) {
      framesBySegment[frame.segmentIndex] = []
    }
    framesBySegment[frame.segmentIndex].push(frame)
  })
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Generate Frames</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate {project.variants} frame variants for each of {project.segments.length} segments
        </p>
      </div>
      
      {/* Progress */}
      {(isRunning || hasFrames) && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-card-foreground">
              {isDone ? 'Generation complete' : 'Generating frames...'}
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              {completedCount} / {totalCount}
            </p>
          </div>
          <Progress value={progress} className="mt-3" />
        </div>
      )}
      
      {/* Start button */}
      {!hasFrames && !isRunning && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-medium text-foreground">Ready to generate frames</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This will generate {totalCount} images ({project.variants} per segment)
          </p>
          <Button onClick={startGeneration} className="mt-4">
            Start Generation
          </Button>
        </div>
      )}
      
      {/* Frames grid */}
      {hasFrames && (
        <div className="max-h-[500px] space-y-6 overflow-y-auto pr-2">
          {project.segments.map((segment, segIdx) => {
            const frames = framesBySegment[segIdx] || []
            const doneFrames = frames.filter(f => f.status === 'done')
            
            return (
              <div key={segIdx} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-card-foreground">
                    Segment {segIdx + 1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doneFrames.length} / {project.variants} generated
                  </p>
                </div>
                <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
                  {segment.scene}
                </p>
                
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: project.variants }).map((_, varIdx) => {
                    const frame = frames.find(f => f.variantIndex === varIdx)
                    
                    if (frame?.status === 'done' && frame.imageUrl) {
                      return (
                        <div key={varIdx} className="relative aspect-video overflow-hidden rounded-md">
                          <Image
                            src={frame.imageUrl}
                            alt={`Segment ${segIdx + 1} variant ${varIdx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
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
                          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
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
            Select Frames
          </Button>
        </div>
      )}
    </div>
  )
}
