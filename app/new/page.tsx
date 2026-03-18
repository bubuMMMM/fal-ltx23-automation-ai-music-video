'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Music, ArrowLeft, Loader2, Key } from 'lucide-react'
import Link from 'next/link'
import { DEFAULT_CHARACTER_PROMPT, DEFAULT_CHARACTER_STYLE } from '@/lib/constants'

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [characterPrompt, setCharacterPrompt] = useState(DEFAULT_CHARACTER_PROMPT)
  const [characterStyle, setCharacterStyle] = useState(DEFAULT_CHARACTER_STYLE)
  const [speedFactor, setSpeedFactor] = useState(0.75)
  const [variants, setVariants] = useState('3')
  const [falApiKey, setFalApiKey] = useState('')
  
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
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!audioFile) {
      setError('Please upload an MP3 file')
      return
    }
    
    if (!falApiKey.trim()) {
      setError('Please enter your fal.ai API key')
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
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }
      
      const { project } = await response.json()
      
      // Store API key in localStorage (never sent to server for storage)
      localStorage.setItem(`fal-api-key-${project.id}`, falApiKey)
      
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
          
          {/* API Key */}
          <div className="space-y-3">
            <Label htmlFor="falApiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              fal.ai API Key
            </Label>
            <input
              id="falApiKey"
              type="password"
              value={falApiKey}
              onChange={(e) => setFalApiKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="fal-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never saved to our servers.{' '}
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
