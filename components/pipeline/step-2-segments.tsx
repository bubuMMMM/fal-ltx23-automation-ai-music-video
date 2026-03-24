'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Project } from '@/lib/types'
import { Loader2, Clock, Edit2, ChevronDown, ChevronUp, BookOpen, Sparkles } from 'lucide-react'
import { formatTime } from '@/lib/audio'

interface Step2Props {
  project: Project
  onUpdate: () => void
  onNext: () => void
}

export function Step2Segments({ project, onUpdate, onNext }: Step2Props) {
  const [isBuilding, setIsBuilding] = useState(false)
  const [sceneOverrides, setSceneOverrides] = useState<Record<number, string>>({})
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const hasSegments = project.segments.length > 0
  
  useEffect(() => {
    // Initialize scene overrides from existing segments
    if (hasSegments) {
      const overrides: Record<number, string> = {}
      project.segments.forEach((seg, idx) => {
        overrides[idx] = seg.scene
      })
      setSceneOverrides(overrides)
    }
  }, [hasSegments, project.segments])
  
  async function buildSegments() {
    setIsBuilding(true)
    setError(null)
    
    try {
      const response = await fetch('/api/build-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sceneOverrides: Object.keys(sceneOverrides).length > 0 ? sceneOverrides : undefined
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to build segments')
      }
      
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build segments')
    } finally {
      setIsBuilding(false)
    }
  }
  
  async function proceedToFrames() {
    // Save any scene overrides
    if (Object.keys(sceneOverrides).length > 0) {
      const updatedSegments = project.segments.map((seg, idx) => ({
        ...seg,
        scene: sceneOverrides[idx] || seg.scene
      }))
      
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: updatedSegments,
          currentStep: 3,
          stepStatuses: { ...project.stepStatuses, 2: 'done' }
        })
      })
      
      onUpdate()
    }
    
    onNext()
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Build Segments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Split your audio into segments and assign scene prompts
        </p>
      </div>
      
      {/* Story description preview */}
      {project.storyDescription && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-card-foreground">Story Description</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                {project.storyDescription}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Audio info */}
      {project.audioDuration && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-card-foreground">
              Audio Duration: {formatTime(project.audioDuration)}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasSegments ? `${project.segments.length} segments created` : 'Not yet segmented'}
            </p>
          </div>
        </div>
      )}
      
      {/* Build button */}
      {!hasSegments && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          {isBuilding ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 font-medium text-foreground">
                {project.storyDescription ? 'Generating AI scenes from your story...' : 'Analyzing audio...'}
              </p>
              {project.storyDescription && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Creating scenes based on your narrative
                </p>
              )}
            </>
          ) : (
            <>
              <Sparkles className="h-12 w-12 text-primary" />
              <p className="mt-4 font-medium text-foreground">Ready to generate scenes</p>
              <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
                {project.storyDescription 
                  ? 'AI will generate scene descriptions based on your story to match each audio segment'
                  : 'Split audio into 1-4 second segments with default scenes (add a story description for AI-generated scenes)'
                }
              </p>
              <Button onClick={buildSegments} className="mt-4 gap-2">
                <Sparkles className="h-4 w-4" />
                {project.storyDescription ? 'Generate AI Scenes' : 'Build Segments'}
              </Button>
            </>
          )}
        </div>
      )}
      
      {/* Segments list */}
      {hasSegments && (
        <div className="max-h-[500px] space-y-2 overflow-y-auto pr-2">
          {project.segments.map((segment, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-card"
            >
              <button
                onClick={() => setExpandedSegment(expandedSegment === idx ? null : idx)}
                className="flex w-full items-center gap-4 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                  {idx + 1}
                </span>
                <div className="flex-1 text-left">
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)} ({segment.duration.toFixed(2)}s)
                  </p>
                  <p className="mt-1 text-sm text-card-foreground line-clamp-1">
                    {sceneOverrides[idx] || segment.scene}
                  </p>
                </div>
                {expandedSegment === idx ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              {expandedSegment === idx && (
                <div className="border-t border-border p-4">
                  <div className="flex items-start gap-2">
                    <Edit2 className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <textarea
                      value={sceneOverrides[idx] || segment.scene}
                      onChange={(e) => setSceneOverrides(prev => ({
                        ...prev,
                        [idx]: e.target.value
                      }))}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {/* Actions */}
      {hasSegments && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={buildSegments} disabled={isBuilding}>
            {isBuilding ? 'Rebuilding...' : 'Rebuild Segments'}
          </Button>
          
          <Button onClick={proceedToFrames}>
            Generate Frames
          </Button>
        </div>
      )}
    </div>
  )
}
