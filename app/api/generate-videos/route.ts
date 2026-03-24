import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject, createJob, updateJob, getProjectOutputDir } from '@/lib/storage'
import { generateVideo, uploadToFal } from '@/lib/fal'
import { VideoResult } from '@/lib/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

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
    
    if (Object.keys(project.frameSelections).length === 0) {
      return NextResponse.json({ error: 'Frames must be selected first' }, { status: 400 })
    }
    
    // Create job for tracking
    const job = await createJob({
      projectId,
      type: 'generate-videos',
      total: project.segments.length * project.variants
    })
    
    // Update step status
    await updateProject(projectId, {
      currentStep: 5,
      stepStatuses: { ...project.stepStatuses, 5: 'running' },
      status: 'running',
      videoResults: []
    })
    
    // Start generation in background
    processVideoGeneration(projectId, job.id, project)
    
    return NextResponse.json({
      success: true,
      jobId: job.id
    })
  } catch (error) {
    console.error('Error starting video generation:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to start video generation' 
    }, { status: 500 })
  }
}

async function sliceAudio(
  audioPath: string,
  outputDir: string,
  startTime: number,
  duration: number,
  segmentIndex: number
): Promise<string> {
  const outputPath = path.join(outputDir, `segment_${segmentIndex}.mp3`)
  
  try {
    await execAsync(
      `ffmpeg -y -i "${audioPath}" -ss ${startTime} -t ${duration} -c:a libmp3lame -q:a 2 "${outputPath}"`
    )
    return outputPath
  } catch (error) {
    console.error('FFmpeg slice error:', error)
    throw new Error(`Failed to slice audio segment ${segmentIndex}`)
  }
}

async function processVideoGeneration(
  projectId: string,
  jobId: string,
  project: Awaited<ReturnType<typeof getProject>>
) {
  if (!project) return
  
  const outputDir = await getProjectOutputDir(projectId)
  const results: VideoResult[] = []
  let completed = 0
  const total = project.segments.length * project.variants
  
  // First, slice all audio segments
  const audioSlices: Map<number, string> = new Map()
  
  for (const segment of project.segments) {
    try {
      const slicePath = await sliceAudio(
        project.audioFile,
        outputDir,
        segment.startTime,
        segment.duration,
        segment.index
      )
      
      // Upload slice to fal storage
      const sliceBuffer = await fs.readFile(slicePath)
      const audioUrl = await uploadToFal(sliceBuffer, `segment_${segment.index}.mp3`)
      audioSlices.set(segment.index, audioUrl)
    } catch (error) {
      console.error(`Failed to prepare audio for segment ${segment.index}:`, error)
    }
  }
  
  // Process videos in batches
  const batchSize = 10
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
        const imageUrl = project.frameSelections[segmentIndex]
        const audioUrl = audioSlices.get(segmentIndex)
        
        if (!imageUrl || !audioUrl) {
          return {
            segmentIndex,
            variantIndex,
            videoUrl: '',
            status: 'error' as const,
            error: 'Missing image or audio'
          }
        }
        
        try {
          const videoUrl = await generateVideo(
            imageUrl,
            audioUrl,
            segment.scene,
            project.characterStyle
          )
          
          return {
            segmentIndex,
            variantIndex,
            videoUrl,
            status: 'done' as const
          }
        } catch (error) {
          return {
            segmentIndex,
            variantIndex,
            videoUrl: '',
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
      videoResults: [...results]
    })
  }
  
  // Finalize
  const allSuccessful = results.every(r => r.status === 'done')
  
  const updatedProject = await getProject(projectId)
  if (updatedProject) {
    await updateProject(projectId, {
      videoResults: results,
      stepStatuses: {
        ...updatedProject.stepStatuses,
        5: allSuccessful ? 'done' : 'error'
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
