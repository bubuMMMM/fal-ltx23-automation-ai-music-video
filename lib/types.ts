export interface Segment {
  index: number
  startTime: number
  endTime: number
  duration: number
  scene: string
}

export interface FrameResult {
  segmentIndex: number
  variantIndex: number
  imageUrl: string
  status: 'pending' | 'generating' | 'done' | 'error'
  error?: string
}

export interface VideoResult {
  segmentIndex: number
  variantIndex: number
  videoUrl: string
  status: 'pending' | 'generating' | 'done' | 'error'
  error?: string
}

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export type CharacterInputMode = 'prompt' | 'image'

export interface Project {
  id: string
  createdAt: string
  audioFile: string
  audioUrl?: string
  audioDuration?: number
  characterPrompt: string
  characterStyle: string
  characterInputMode: CharacterInputMode
  characterReferenceImage?: string // URL of uploaded reference image
  speedFactor: number
  variants: number
  
  // Step outputs
  characterImages: string[]
  selectedCharacter: string | null
  segments: Segment[]
  frameResults: FrameResult[]
  frameSelections: Record<number, string>
  videoResults: VideoResult[]
  videoSelections: Record<number, string>
  finalVideoPath: string | null
  finalVideoUrl: string | null
  
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  stepStatuses: Record<number, StepStatus>
  status: 'idle' | 'running' | 'done' | 'error'
  error?: string
}

export interface Job {
  id: string
  projectId: string
  type: 'generate-frames' | 'generate-videos' | 'assemble'
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  total: number
  results: (FrameResult | VideoResult)[]
  logs: string[]
  error?: string
  createdAt: string
  updatedAt: string
}
