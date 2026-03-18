'use client'

import { cn } from '@/lib/utils'
import { STEP_LABELS } from '@/lib/constants'
import { StepStatus } from '@/lib/types'
import { Check, Loader2, AlertCircle, Circle } from 'lucide-react'

interface StepperProps {
  currentStep: number
  stepStatuses: Record<number, StepStatus>
  onStepClick?: (step: number) => void
}

export function Stepper({ currentStep, stepStatuses, onStepClick }: StepperProps) {
  return (
    <nav className="flex flex-col gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => {
        const status = stepStatuses[step]
        const isActive = currentStep === step
        const isClickable = status === 'done' || isActive
        
        return (
          <button
            key={step}
            onClick={() => isClickable && onStepClick?.(step)}
            disabled={!isClickable}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
              isActive && 'bg-primary/10',
              isClickable && !isActive && 'hover:bg-accent',
              !isClickable && 'cursor-not-allowed opacity-50'
            )}
          >
            <StepIcon status={status} isActive={isActive} />
            <div className="flex-1">
              <p className={cn(
                'text-sm font-medium',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                Step {step}
              </p>
              <p className={cn(
                'text-xs',
                isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'
              )}>
                {STEP_LABELS[step]}
              </p>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

function StepIcon({ status, isActive }: { status: StepStatus; isActive: boolean }) {
  const baseClass = 'h-6 w-6 shrink-0'
  
  switch (status) {
    case 'done':
      return <Check className={cn(baseClass, 'text-green-500')} />
    case 'running':
      return <Loader2 className={cn(baseClass, 'animate-spin text-primary')} />
    case 'error':
      return <AlertCircle className={cn(baseClass, 'text-destructive')} />
    default:
      return (
        <Circle 
          className={cn(
            baseClass,
            isActive ? 'text-primary' : 'text-muted-foreground/50'
          )} 
        />
      )
  }
}
