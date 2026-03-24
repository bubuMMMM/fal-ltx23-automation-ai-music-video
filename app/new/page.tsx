'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Music, ArrowLeft, Loader2, ImageIcon, Type, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { DEFAULT_CHARACTER_PROMPT, DEFAULT_CHARACTER_STYLE } from '@/lib/constants'
import { CharacterInputMode } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [characterInputMode, setCharacterInputMode] = useState<CharacterInputMode>('prompt')
  const [characterImage, setCharacterImage] = useState<File | null>(null)
  const [characterImagePreview, setCharacterImagePreview] = useState<string | null>(null)
  const [characterPrompt, setCharacterPrompt] = useState(DEFAULT_CHARACTER_PROMPT)
  const [characterStyle, setCharacterStyle] = useState(DEFAULT_CHARACTER_STYLE)
  const [speedFactor, setSpeedFactor] = useState(0.75)
  const [variants, setVariants] = useState('3')
  
  const onDropAudio = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'audio/mpeg') {
      setAudioFile(file)
      setError(null)
    } else {
      setError('Please upload an MP3 file')
    }
  }, [])
  
  const onDropImage = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type.startsWith('image/')) {
      setCharacterImage(file)
      setCharacterImagePreview(URL.createObjectURL(file))
      setError(null)
    } else {
      setError('Please upload an image file (PNG, JPG, etc.)')
    }
  }, [])
  
  const removeCharacterImage = useCallback(() => {
    if (characterImagePreview) {
      URL.revokeObjectURL(characterImagePreview)
    }
    setCharacterImage(null)
    setCharacterImagePreview(null)
  }, [characterImagePreview])
  
  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onDropAudio,
    accept: { 'audio/mpeg': ['.mp3'] },
    maxFiles: 1
  })
  
  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onDropImage,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1
  })
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!audioFile) {
      setError('Please upload an MP3 file')
      return
    }
    
    if (characterInputMode === 'image' && !characterImage) {
      setError('Please upload a character reference image')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('characterInputMode', characterInputMode)
      formData.append('characterPrompt', characterPrompt)
      formData.append('characterStyle', characterStyle)
      formData.append('speedFactor', speedFactor.toString())
      formData.append('variants', variants)
      
      if (characterInputMode === 'image' && characterImage) {
        formData.append('characterImage', characterImage)
      }
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }
      
      const { project } = await response.json()
      router.push(`/project/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
          New Project
        </h1>
        <p className="mt-2 text-muted-foreground">
          Configure your AI music video settings
        </p>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Audio Upload */}
          <div className="space-y-3">
            <Label>Audio File</Label>
            <div
              {...getAudioRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isAudioDragActive 
                  ? 'border-primary bg-primary/5' 
                  : audioFile 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border hover:border-muted-foreground'
              }`}
            >
              <input {...getAudioInputProps()} />
              {audioFile ? (
                <>
                  <Music className="h-12 w-12 text-primary" />
                  <p className="mt-4 font-medium text-foreground">{audioFile.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Click or drag to replace
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-medium text-foreground">
                    Drop your MP3 file here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse
                  </p>
                </>
              )}
            </div>
          </div>
          
          {/* Character Input Mode Toggle */}
          <div className="space-y-3">
            <Label>Character Reference</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCharacterInputMode('prompt')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                  characterInputMode === 'prompt'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                )}
              >
                <Type className="h-4 w-4" />
                Text Prompt
              </button>
              <button
                type="button"
                onClick={() => setCharacterInputMode('image')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                  characterInputMode === 'image'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                )}
              >
                <ImageIcon className="h-4 w-4" />
                Upload Image
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose how to define your character: describe with text or upload an existing image
            </p>
          </div>
          
          {/* Character Image Upload */}
          {characterInputMode === 'image' && (
            <div className="space-y-3">
              <Label>Character Image</Label>
              {characterImagePreview ? (
                <div className="relative">
                  <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-primary/50 bg-primary/5">
                    <Image
                      src={characterImagePreview}
                      alt="Character reference"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeCharacterImage}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="mt-2 text-sm text-foreground">{characterImage?.name}</p>
                  <p className="text-xs text-muted-foreground">Click the X to remove and upload a different image</p>
                </div>
              ) : (
                <div
                  {...getImageRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    isImageDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <input {...getImageInputProps()} />
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-medium text-foreground">
                    Drop your character image here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PNG, JPG, WEBP supported
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload an image of your character. This will be used as the base for all generated scenes.
              </p>
            </div>
          )}
          
          {/* Character Prompt - only show in prompt mode */}
          {characterInputMode === 'prompt' && (
            <div className="space-y-3">
              <Label htmlFor="characterPrompt">Character Prompt</Label>
              <textarea
                id="characterPrompt"
                value={characterPrompt}
                onChange={(e) => setCharacterPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe your character..."
              />
              <p className="text-xs text-muted-foreground">
                Describe the main character that will appear in all scenes
              </p>
            </div>
          )}
          
          {/* Character Style */}
          <div className="space-y-3">
            <Label htmlFor="characterStyle">Character Style</Label>
            <textarea
              id="characterStyle"
              value={characterStyle}
              onChange={(e) => setCharacterStyle(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the visual style..."
            />
            <p className="text-xs text-muted-foreground">
              Define the artistic style (claymation, stop-motion, etc.)
            </p>
          </div>
          
          {/* Speed Factor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Speed Factor</Label>
              <span className="text-sm font-mono text-muted-foreground">{speedFactor.toFixed(2)}x</span>
            </div>
            <Slider
              value={[speedFactor]}
              onValueChange={([value]) => setSpeedFactor(value)}
              min={0.5}
              max={1.0}
              step={0.05}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground">
              Slow down the final video (0.5x = half speed, 1.0x = normal)
            </p>
          </div>
          
          {/* Variants */}
          <div className="space-y-3">
            <Label>Variants per Segment</Label>
            <Select value={variants} onValueChange={setVariants}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 variant</SelectItem>
                <SelectItem value="2">2 variants</SelectItem>
                <SelectItem value="3">3 variants (recommended)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              More variants = more choices, but longer generation time
            </p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            size="lg" 
            className="w-full"
            disabled={isSubmitting || !audioFile}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Project...
              </>
            ) : (
              'Start Pipeline'
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}
