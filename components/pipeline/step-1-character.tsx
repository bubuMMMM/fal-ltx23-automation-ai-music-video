'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Project } from '@/lib/types'
import { Loader2, Check, Sparkles, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step1Props {
  project: Project
  falApiKey: string
  onUpdate: () => void
  onNext: () => void
}

export function Step1Character({ project, falApiKey, onUpdate, onNext }: Step1Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    project.selectedCharacter 
      ? project.characterImages.indexOf(project.selectedCharacter)
      : null
  )
  const [error, setError] = useState<string | null>(null)
  
  const hasImages = project.characterImages.length > 0
  const isImageMode = project.characterInputMode === 'image'
  const hasReferenceImage = !!project.characterReferenceImage
  
  // Auto-select reference image if in image mode
  useEffect(() => {
    if (isImageMode && hasReferenceImage && !project.selectedCharacter) {
      // Automatically use the reference image
      selectReferenceImage()
    }
  }, [isImageMode, hasReferenceImage, project.selectedCharacter])
  
  async function selectReferenceImage() {
    if (!project.characterReferenceImage) return
    
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedCharacter: project.characterReferenceImage,
          characterImages: [project.characterReferenceImage],
          stepStatuses: { ...project.stepStatuses, 1: 'done' }
        })
      })
      
      onUpdate()
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection')
    }
  }
  
  async function generateCharacter() {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          falApiKey
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate character')
      }
      
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }
  
  async function selectCharacter() {
    if (selectedIndex === null) return
    
    const selectedUrl = project.characterImages[selectedIndex]
    
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedCharacter: selectedUrl,
          stepStatuses: { ...project.stepStatuses, 1: 'done' }
        })
      })
      
      onUpdate()
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection')
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {isImageMode ? 'Character Reference' : 'Generate Character'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isImageMode 
            ? 'Using your uploaded character image as reference' 
            : 'Generate 6 character variants and select your favorite'}
        </p>
      </div>
      
      {/* Image mode - show reference image */}
      {isImageMode && hasReferenceImage && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary">
              <ImageIcon className="h-5 w-5" />
              <span className="font-medium">Using uploaded character image</span>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="relative aspect-square w-64 overflow-hidden rounded-lg border-2 border-primary">
              <Image
                src={project.characterReferenceImage!}
                alt="Character reference"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          {!project.selectedCharacter && (
            <div className="flex justify-center">
              <Button onClick={selectReferenceImage} className="gap-2">
                <Check className="h-4 w-4" />
                Use this character & continue
              </Button>
            </div>
          )}
          
          {project.selectedCharacter && (
            <div className="text-center text-sm text-muted-foreground">
              Character confirmed. Continue to the next step.
            </div>
          )}
        </div>
      )}
      
      {/* Prompt mode - Character prompt preview */}
      {!isImageMode && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Character Prompt</p>
          <p className="mt-1 text-sm text-card-foreground">{project.characterPrompt}</p>
        </div>
      )}
      
      {/* Generation state - only for prompt mode */}
      {!isImageMode && !hasImages && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          {isGenerating ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 font-medium text-foreground">Generating 6 character variants...</p>
              <p className="mt-1 text-sm text-muted-foreground">This may take 1-2 minutes</p>
              <Progress value={33} className="mt-4 w-64" />
            </>
          ) : (
            <>
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium text-foreground">Ready to generate</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click below to create 6 character variants
              </p>
              <Button onClick={generateCharacter} className="mt-4 gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Character
              </Button>
            </>
          )}
        </div>
      )}
      
      {/* Character grid - only for prompt mode */}
      {!isImageMode && hasImages && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {project.characterImages.map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                selectedIndex === index 
                  ? 'border-primary ring-2 ring-primary/50' 
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <Image
                src={url}
                alt={`Character variant ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              {selectedIndex === index && (
                <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {/* Actions - only for prompt mode */}
      {!isImageMode && hasImages && (
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={generateCharacter}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Regenerate'
            )}
          </Button>
          
          <Button
            onClick={selectCharacter}
            disabled={selectedIndex === null}
          >
            Confirm character & continue
          </Button>
        </div>
      )}
    </div>
  )
}
