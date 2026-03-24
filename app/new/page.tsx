'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Music, ArrowLeft, Loader2, Key, CheckCircle2, Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { DEFAULT_CHARACTER_PROMPT, DEFAULT_CHARACTER_STYLE } from '@/lib/constants'

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverHasFalKey, setServerHasFalKey] = useState(false)
  
  // Check if server has FAL_KEY configured
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setServerHasFalKey(data.hasFalKey))
      .catch(() => setServerHasFalKey(false))
  }, [])
  
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [characterPrompt, setCharacterPrompt] = useState(DEFAULT_CHARACTER_PROMPT)
  const [characterStyle, setCharacterStyle] = useState(DEFAULT_CHARACTER_STYLE)
  const [speedFactor, setSpeedFactor] = useState(0.75)
  const [variants, setVariants] = useState('3')
  const [falApiKey, setFalApiKey] = useState('')
  const [storyDescription, setStoryDescription] = useState('')
  const [referenceImages, setReferenceImages] = useState<(File | null)[]>([null, null])
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<(string | null)[]>([null, null])
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'audio/mpeg') {
      setAudioFile(file)
      setError(null)
    } else {
      setError('Please upload an MP3 file')
    }
  }, [])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/mpeg': ['.mp3'] },
    maxFiles: 1
  })
  
  function handleReferenceImageChange(index: number, file: File | null) {
    const newImages = [...referenceImages]
    const newPreviews = [...referenceImagePreviews]
    
    newImages[index] = file
    
    // Create preview URL
    if (file) {
      newPreviews[index] = URL.createObjectURL(file)
    } else {
      if (newPreviews[index]) {
        URL.revokeObjectURL(newPreviews[index]!)
      }
      newPreviews[index] = null
    }
    
    setReferenceImages(newImages)
    setReferenceImagePreviews(newPreviews)
  }
  
  function removeReferenceImage(index: number) {
    handleReferenceImageChange(index, null)
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!audioFile) {
      setError('Please upload an MP3 file')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('audioFile', audioFile)
      formData.append('characterPrompt', characterPrompt)
      formData.append('characterStyle', characterStyle)
      formData.append('speedFactor', speedFactor.toString())
      formData.append('variants', variants)
      formData.append('storyDescription', storyDescription)
      
      // Add reference images
      if (referenceImages[0]) {
        formData.append('referenceImage1', referenceImages[0])
      }
      if (referenceImages[1]) {
        formData.append('referenceImage2', referenceImages[1])
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
      
      // Store API key in localStorage if provided (never sent to server for storage)
      if (falApiKey.trim()) {
        localStorage.setItem(`fal-api-key-${project.id}`, falApiKey)
      }
      
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
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : audioFile 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border hover:border-muted-foreground'
              }`}
            >
              <input {...getInputProps()} />
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
          
          {/* Reference Images (up to 2) */}
          <div className="space-y-3">
            <Label>Reference Images (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Upload up to 2 reference images to guide character generation
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map((index) => (
                <div key={index} className="relative">
                  {referenceImagePreviews[index] ? (
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                      <Image
                        src={referenceImagePreviews[index]!}
                        alt={`Reference ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeReferenceImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-muted-foreground transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleReferenceImageChange(index, file)
                        }}
                      />
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="mt-2 text-xs text-muted-foreground">
                        Image {index + 1}
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Character Prompt */}
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
          
          {/* Story Description */}
          <div className="space-y-3">
            <Label htmlFor="storyDescription">Story Description</Label>
            <textarea
              id="storyDescription"
              value={storyDescription}
              onChange={(e) => setStoryDescription(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the story of your music video... e.g., 'A day in the life of a clay character who wakes up in a sneaker house, goes to work at a record shop, and performs at a concert in the evening.'"
            />
            <p className="text-xs text-muted-foreground">
              Describe the narrative arc of your music video. The AI will generate scene descriptions based on this story for each segment.
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
          
          {/* API Key - Optional if FAL_KEY env var is set */}
          <div className="space-y-3">
            <Label htmlFor="falApiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              fal.ai API Key
              {serverHasFalKey && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Server configured
                </span>
              )}
            </Label>
            {serverHasFalKey ? (
              <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3">
                <p className="text-sm text-green-400">
                  Server has FAL_KEY configured. You can skip this field or provide your own key for billing to your account.
                </p>
              </div>
            ) : (
              <input
                id="falApiKey"
                type="password"
                value={falApiKey}
                onChange={(e) => setFalApiKey(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="fal-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {serverHasFalKey 
                ? 'Optional: Provide your own key if you want usage billed to your fal.ai account.'
                : 'Required: Your API key is stored locally and never saved to our servers.'
              }{' '}
              <a 
                href="https://fal.ai/dashboard/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get your key
              </a>
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
