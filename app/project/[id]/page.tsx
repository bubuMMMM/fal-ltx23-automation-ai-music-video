'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { Project } from '@/lib/types'
import { Stepper } from '@/components/pipeline/stepper'
import { Step1Character } from '@/components/pipeline/step-1-character'
import { Step2Segments } from '@/components/pipeline/step-2-segments'
import { Step3Frames } from '@/components/pipeline/step-3-frames'
import { Step4SelectFrames } from '@/components/pipeline/step-4-select-frames'
import { Step5Videos } from '@/components/pipeline/step-5-videos'
import { Step6SelectVideos } from '@/components/pipeline/step-6-select-videos'
import { Step7Assemble } from '@/components/pipeline/step-7-assemble'
import { Step8Done } from '@/components/pipeline/step-8-done'
import { ArrowLeft, Key, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  
  const { data, error, mutate } = useSWR<{ project: Project }>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher,
    { refreshInterval: 0 }
  )
  
  // Check if server has FAL_KEY configured
  const { data: configData } = useSWR<{ hasFalKey: boolean }>(
    '/api/config',
    fetcher
  )
  
  const [activeStep, setActiveStep] = useState<number>(1)
  const [falApiKey, setFalApiKey] = useState<string>('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  
  const project = data?.project
  const serverHasFalKey = configData?.hasFalKey || false
  
  // Load API key from localStorage - API key is optional if server has FAL_KEY configured
  useEffect(() => {
    if (projectId) {
      const savedKey = localStorage.getItem(`fal-api-key-${projectId}`)
      if (savedKey) {
        setFalApiKey(savedKey)
      }
      // Don't force API key input - server may have FAL_KEY configured
    }
  }, [projectId])
  
  // Sync active step with project state
  useEffect(() => {
    if (project) {
      setActiveStep(project.currentStep)
    }
  }, [project?.currentStep])
  
  const handleUpdate = useCallback(() => {
    mutate()
  }, [mutate])
  
  const handleNext = useCallback(() => {
    if (project && activeStep < 8) {
      setActiveStep(activeStep + 1)
    }
  }, [project, activeStep])
  
  const handleStepClick = useCallback((step: number) => {
    setActiveStep(step)
  }, [])
  
  const saveApiKey = () => {
    if (falApiKey.trim()) {
      localStorage.setItem(`fal-api-key-${projectId}`, falApiKey)
      setShowApiKeyInput(false)
    }
  }
  
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium text-foreground">Project not found</p>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    )
  }
  
  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }
  
  // API Key modal - only show if explicitly requested
  if (showApiKeyInput) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Key className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Configure API Key</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your fal.ai API key or leave empty to use server configuration
          </p>
          <input
            type="password"
            value={falApiKey}
            onChange={(e) => setFalApiKey(e.target.value)}
            placeholder="Leave empty if server has FAL_KEY configured"
            className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Your key is stored locally in your browser.{' '}
            <a
              href="https://fal.ai/dashboard/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Get your key
            </a>
          </p>
          <Button onClick={saveApiKey} className="mt-4 w-full">
            Continue
          </Button>
        </div>
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-muted-foreground">
              {project.id.slice(0, 8)}
            </span>
            {serverHasFalKey && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Key className="h-3 w-3" />
                Server configured
              </span>
            )}
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Key className="h-3 w-3" />
              {falApiKey ? 'Change Key' : 'Set Key'}
            </button>
          </div>
        </div>
      </header>
      
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        {/* Sidebar stepper */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-8">
            <Stepper
              currentStep={activeStep}
              stepStatuses={project.stepStatuses}
              onStepClick={handleStepClick}
            />
          </div>
        </aside>
        
        {/* Mobile stepper */}
        <div className="mb-6 overflow-x-auto lg:hidden">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
              <button
                key={step}
                onClick={() => handleStepClick(step)}
                disabled={project.stepStatuses[step] === 'pending' && step !== activeStep}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  activeStep === step
                    ? 'bg-primary text-primary-foreground'
                    : project.stepStatuses[step] === 'done'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>
        
        {/* Main content */}
        <section className="min-w-0 flex-1">
          {activeStep === 1 && (
            <Step1Character
              project={project}
              falApiKey={falApiKey}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 2 && (
            <Step2Segments
              project={project}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 3 && (
            <Step3Frames
              project={project}
              falApiKey={falApiKey}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 4 && (
            <Step4SelectFrames
              project={project}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 5 && (
            <Step5Videos
              project={project}
              falApiKey={falApiKey}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 6 && (
            <Step6SelectVideos
              project={project}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 7 && (
            <Step7Assemble
              project={project}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          {activeStep === 8 && (
            <Step8Done project={project} />
          )}
        </section>
      </div>
    </main>
  )
}
