import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject, createJob, updateJob } from '@/lib/storage'
import { generateFrame } from '@/lib/fal'
import { FrameResult } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    const project = await getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (!project.selectedCharacter) {
      return NextResponse.json({ error: 'Character must be selected first' }, { status: 400 })
    }
    
    if (project.segments.length === 0) {
      return NextResponse.json({ error: 'Segments must be built first' }, { status: 400 })
    }
    
    // Create job for tracking
    const job = await createJob({
      projectId,
      type: 'generate-frames',
      total: project.segments.length * project.variants
    })
    
    // Update step status
    await updateProject(projectId, {
      currentStep: 3,
      stepStatuses: { ...project.stepStatuses, 3: 'running' },
      status: 'running',
      frameResults: []
    })
    
    // Start generation in background
    processFrameGeneration(projectId, job.id, project)
    
    return NextResponse.json({
      success: true,
      jobId: job.id
    })
  } catch (error) {
    console.error('Error starting frame generation:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to start frame generation' 
    }, { status: 500 })
  }
}

async function processFrameGeneration(
  projectId: string,
  jobId: string,
  project: Awaited<ReturnType<typeof getProject>>
) {
  if (!project) return
  
  const results: FrameResult[] = []
  let completed = 0
  const total = project.segments.length * project.variants
  
  // Process in batches of 20 concurrent requests
  const batchSize = 20
  const tasks: Array<{ segmentIndex: number; variantIndex: number }> = []
  
  for (let segIdx = 0; segIdx < project.segments.length; segIdx++) {
    for (let varIdx = 0; varIdx < project.variants; varIdx++) {
      tasks.push({ segmentIndex: segIdx, variantIndex: varIdx })
    }
  }
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    
    const batchResults = await Promise.allSettled(
      batch.map(async ({ segmentIndex, variantIndex }) => {
        const segment = project.segments[segmentIndex]
        
        console.log(`[v0] Generating frame for segment ${segmentIndex}, variant ${variantIndex}`)
        console.log(`[v0] Character image: ${project.selectedCharacter}`)
        console.log(`[v0] Scene: ${segment.scene}`)
        
        try {
          const imageUrl = await generateFrame(
            project.selectedCharacter!,
            segment.scene,
            project.characterStyle,
            project.storyDescription
          )
          
          console.log(`[v0] Frame generated successfully: ${imageUrl}`)
          
          return {
            segmentIndex,
            variantIndex,
            imageUrl,
            status: 'done' as const
          }
        } catch (error) {
          console.error(`[v0] Frame generation failed:`, error)
          return {
            segmentIndex,
            variantIndex,
            imageUrl: '',
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Generation failed'
          }
        }
      })
    )
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
      completed++
    }
    
    // Update job progress
    await updateJob(jobId, {
      progress: completed,
      results: [...results],
      status: 'running'
    })
    
    // Update project with partial results
    await updateProject(projectId, {
      frameResults: [...results]
    })
  }
  
  // Finalize
  const allSuccessful = results.every(r => r.status === 'done')
  
  const updatedProject = await getProject(projectId)
  if (updatedProject) {
    await updateProject(projectId, {
      frameResults: results,
      stepStatuses: { 
        ...updatedProject.stepStatuses, 
        3: allSuccessful ? 'done' : 'error' 
      },
      status: allSuccessful ? 'running' : 'error'
    })
  }
  
  await updateJob(jobId, {
    progress: total,
    results,
    status: allSuccessful ? 'done' : 'error'
  })
}
