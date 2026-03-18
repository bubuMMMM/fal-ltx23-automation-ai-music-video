'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Project, Job } from '@/lib/types'
import { Loader2, Film, Terminal } from 'lucide-react'

interface Step7Props {
  project: Project
  onUpdate: () => void
  onNext: () => void
}

export function Step7Assemble({ project, onUpdate, onNext }: Step7Props) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logsRef = useRef<HTMLDivElement>(null)
  
  const isRunning = project.stepStatuses[7] === 'running'
  const isDone = project.stepStatuses[7] === 'done'
  
  const totalSteps = project.segments.length + 5
  const progress = job ? (job.progress / totalSteps) * 100 : 0
  
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
  
  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [job?.logs])
  
  async function startAssembly() {
    setError(null)
    
    try {
      const response = await fetch('/api/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start assembly')
      }
      
      const { jobId: newJobId } = await response.json()
      setJobId(newJobId)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assembly')
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Assemble Video</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Combine all clips with effects, sync audio, and apply speed factor
        </p>
      </div>
      
      {/* Progress */}
      {(isRunning || job) && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-card-foreground">
              {isDone ? 'Assembly complete!' : 'Assembling video...'}
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              {job?.progress || 0} / {totalSteps} steps
            </p>
          </div>
          <Progress value={progress} className="mt-3" />
        </div>
      )}
      
      {/* Start button */}
      {!job && !isRunning && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Film className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-medium text-foreground">Ready to assemble</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            This will process {project.segments.length} clips with effects,
            <br />add audio, and apply {project.speedFactor}x speed
          </p>
          <Button onClick={startAssembly} className="mt-4">
            Start Assembly
          </Button>
        </div>
      )}
      
      {/* Terminal logs */}
      {job && job.logs.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">Assembly Log</span>
          </div>
          <div
            ref={logsRef}
            className="terminal-console max-h-64 overflow-y-auto p-4 font-mono text-xs"
          >
            {job.logs.map((log, idx) => (
              <div key={idx} className="py-0.5">
                {log}
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 py-0.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Preview when done */}
      {isDone && project.finalVideoUrl && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium text-card-foreground">Preview</p>
          <video
            src={project.finalVideoUrl}
            controls
            className="w-full rounded-lg"
          />
        </div>
      )}
      
      {/* Error */}
      {(error || job?.error) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || job?.error}
        </div>
      )}
      
      {/* Actions */}
      {isDone && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            View Final Video
          </Button>
        </div>
      )}
    </div>
  )
}
