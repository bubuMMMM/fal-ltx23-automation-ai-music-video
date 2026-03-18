'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Project } from '@/lib/types'
import { Download, Share2, CheckCircle2, Clock, Layers, Sparkles, Copy, Check } from 'lucide-react'
import { formatTime } from '@/lib/audio'

interface Step8Props {
  project: Project
}

export function Step8Done({ project }: Step8Props) {
  const [copied, setCopied] = useState(false)
  
  const totalGenerationTime = project.createdAt 
    ? Math.round((Date.now() - new Date(project.createdAt).getTime()) / 1000 / 60)
    : 0
  
  async function copyShareLink() {
    const url = `${window.location.origin}/project/${project.id}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  function downloadVideo() {
    if (project.finalVideoUrl) {
      const link = document.createElement('a')
      link.href = project.finalVideoUrl
      link.download = `music-video-${project.id.slice(0, 8)}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Video is Ready!</h2>
          <p className="text-sm text-muted-foreground">
            AI music video generation complete
          </p>
        </div>
      </div>
      
      {/* Video player */}
      {project.finalVideoUrl && (
        <div className="overflow-hidden rounded-lg border border-border">
          <video
            src={project.finalVideoUrl}
            controls
            autoPlay
            className="w-full"
          />
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Segments"
          value={project.segments.length.toString()}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Duration"
          value={formatTime(project.audioDuration || 0)}
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Speed"
          value={`${project.speedFactor}x`}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Generation Time"
          value={`~${totalGenerationTime} min`}
        />
      </div>
      
      {/* Models used */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-card-foreground">Models Used</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            fal-ai/nano-banana-pro
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            fal-ai/nano-banana-pro/edit
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            fal-ai/ltx-2/v2.3/audio-to-video
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            FFmpeg
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={downloadVideo} className="flex-1 gap-2">
          <Download className="h-4 w-4" />
          Download Video
        </Button>
        <Button variant="outline" onClick={copyShareLink} className="flex-1 gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Share Link
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode
  label: string
  value: string 
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-card-foreground">{value}</p>
    </div>
  )
}
