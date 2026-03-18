import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject, createJob, updateJob, getProjectOutputDir, getPublicUrl } from '@/lib/storage'
import { VIDEO_EFFECTS } from '@/lib/constants'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import http from 'http'

const execAsync = promisify(exec)

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = require('fs').createWriteStream(outputPath)
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location!, outputPath).then(resolve).catch(reject)
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      require('fs').unlink(outputPath, () => {})
      reject(err)
    })
  })
}

function getEffectFilter(effect: string, duration: number): string {
  const d = duration
  switch (effect) {
    case 'zoom_in':
      return `scale=2*iw:2*ih,zoompan=z='1+0.001*on':x='iw/4':y='ih/4':d=${Math.ceil(d * 25)}:s=1920x1080`
    case 'zoom_out':
      return `scale=2*iw:2*ih,zoompan=z='1.5-0.001*on':x='iw/4':y='ih/4':d=${Math.ceil(d * 25)}:s=1920x1080`
    case 'zoom_in_fast':
      return `scale=2*iw:2*ih,zoompan=z='1+0.002*on':x='iw/4':y='ih/4':d=${Math.ceil(d * 25)}:s=1920x1080`
    case 'center_zoom_in':
      return `scale=2*iw:2*ih,zoompan=z='1+0.0015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(d * 25)}:s=1920x1080`
    case 'center_zoom_out':
      return `scale=2*iw:2*ih,zoompan=z='1.3-0.001*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(d * 25)}:s=1920x1080`
    case 'center_zoom_punch':
      return `scale=2*iw:2*ih,zoompan=z='1+0.003*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(d * 25)}:s=1920x1080`
    case 'shake':
      return `crop=in_w*0.9:in_h*0.9:in_w*0.05+sin(n*0.1)*in_w*0.02:in_h*0.05+cos(n*0.15)*in_h*0.02,scale=1920:1080`
    default:
      return 'scale=1920:1080'
  }
}

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
    
    if (Object.keys(project.videoSelections).length === 0) {
      return NextResponse.json({ error: 'Videos must be selected first' }, { status: 400 })
    }
    
    // Create job for tracking
    const job = await createJob({
      projectId,
      type: 'assemble',
      total: project.segments.length + 5 // segments + final steps
    })
    
    // Update step status
    await updateProject(projectId, {
      currentStep: 7,
      stepStatuses: { ...project.stepStatuses, 7: 'running' },
      status: 'running'
    })
    
    // Start assembly in background
    processAssembly(projectId, job.id, project)
    
    return NextResponse.json({
      success: true,
      jobId: job.id
    })
  } catch (error) {
    console.error('Error starting assembly:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to start assembly' 
    }, { status: 500 })
  }
}

async function processAssembly(
  projectId: string,
  jobId: string,
  project: Awaited<ReturnType<typeof getProject>>
) {
  if (!project) return
  
  const outputDir = await getProjectOutputDir(projectId)
  const logs: string[] = []
  let progress = 0
  
  const log = async (message: string) => {
    logs.push(`[${new Date().toISOString()}] ${message}`)
    await updateJob(jobId, { logs: [...logs] })
  }
  
  try {
    await log('Starting video assembly pipeline...')
    
    const random = seededRandom(456)
    const processedClips: string[] = []
    
    // Download and process each video clip
    for (let i = 0; i < project.segments.length; i++) {
      const segment = project.segments[i]
      const videoUrl = project.videoSelections[i]
      
      if (!videoUrl) {
        await log(`Skipping segment ${i}: no video selected`)
        continue
      }
      
      await log(`Processing clip ${i + 1}/${project.segments.length}...`)
      
      // Download video
      const inputPath = path.join(outputDir, `input_${i}.mp4`)
      const outputPath = path.join(outputDir, `processed_${i}.mp4`)
      
      await downloadFile(videoUrl, inputPath)
      
      // Select random effect
      const effect = VIDEO_EFFECTS[Math.floor(random() * VIDEO_EFFECTS.length)]
      const effectFilter = getEffectFilter(effect, segment.duration)
      
      // Build filter chain
      const filters: string[] = [
        `fps=25`,
        effectFilter,
        `setpts=PTS-STARTPTS`,
        `trim=duration=${segment.duration}`
      ]
      
      // Apply random effects
      if (random() > 0.7) {
        filters.push('eq=brightness=0.1:saturation=1.2')
      }
      
      // B&W snap every 4th clip
      if (i % 4 === 3) {
        filters.push('hue=s=0')
      }
      
      // Negate every 5th clip (briefly)
      if (i % 5 === 4 && random() > 0.5) {
        filters.push('negate')
      }
      
      // Contrast pop
      if (random() > 0.6) {
        filters.push('eq=contrast=1.1')
      }
      
      const filterChain = filters.join(',')
      
      try {
        await execAsync(
          `ffmpeg -y -i "${inputPath}" -vf "${filterChain}" -c:v libx264 -preset fast -crf 23 -an "${outputPath}"`,
          { maxBuffer: 50 * 1024 * 1024 }
        )
        processedClips.push(outputPath)
        await log(`Processed clip ${i + 1} with effect: ${effect}`)
      } catch (error) {
        await log(`Warning: clip ${i + 1} processing failed, using original`)
        // Try to just normalize without effects
        try {
          await execAsync(
            `ffmpeg -y -i "${inputPath}" -vf "fps=25,scale=1920:1080" -c:v libx264 -preset fast -crf 23 -an "${outputPath}"`,
            { maxBuffer: 50 * 1024 * 1024 }
          )
          processedClips.push(outputPath)
        } catch {
          await log(`Error: clip ${i + 1} completely failed`)
        }
      }
      
      progress++
      await updateJob(jobId, { progress })
    }
    
    if (processedClips.length === 0) {
      throw new Error('No clips were processed successfully')
    }
    
    await log('Concatenating clips...')
    
    // Create concat file
    const concatFile = path.join(outputDir, 'concat.txt')
    const concatContent = processedClips.map(p => `file '${p}'`).join('\n')
    await fs.writeFile(concatFile, concatContent)
    
    // Concat videos
    const concatOutput = path.join(outputDir, 'concat_output.mp4')
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -preset fast -crf 23 "${concatOutput}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    )
    
    progress++
    await updateJob(jobId, { progress })
    await log('Clips concatenated successfully')
    
    // Mux with audio
    await log('Adding audio track...')
    const withAudio = path.join(outputDir, 'with_audio.mp4')
    await execAsync(
      `ffmpeg -y -i "${concatOutput}" -i "${project.audioFile}" -c:v copy -c:a aac -shortest "${withAudio}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    )
    
    progress++
    await updateJob(jobId, { progress })
    await log('Audio added successfully')
    
    // Apply speed factor
    await log(`Applying speed factor: ${project.speedFactor}...`)
    const finalOutput = path.join(outputDir, 'final_video.mp4')
    
    if (project.speedFactor !== 1.0) {
      const pts = 1 / project.speedFactor
      const atempo = project.speedFactor
      await execAsync(
        `ffmpeg -y -i "${withAudio}" -filter_complex "[0:v]setpts=${pts}*PTS[v];[0:a]atempo=${atempo}[a]" -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 23 -c:a aac "${finalOutput}"`,
        { maxBuffer: 50 * 1024 * 1024 }
      )
    } else {
      await fs.copyFile(withAudio, finalOutput)
    }
    
    progress++
    await updateJob(jobId, { progress })
    await log('Speed adjustment complete')
    
    // Update project with final video
    const finalVideoUrl = getPublicUrl(finalOutput)
    
    const updatedProject = await getProject(projectId)
    if (updatedProject) {
      await updateProject(projectId, {
        finalVideoPath: finalOutput,
        finalVideoUrl,
        currentStep: 8,
        stepStatuses: {
          ...updatedProject.stepStatuses,
          7: 'done',
          8: 'done'
        },
        status: 'done'
      })
    }
    
    await log('Assembly complete!')
    
    await updateJob(jobId, {
      progress: project.segments.length + 5,
      status: 'done',
      logs
    })
    
  } catch (error) {
    await log(`Error: ${error instanceof Error ? error.message : 'Assembly failed'}`)
    
    const updatedProject = await getProject(projectId)
    if (updatedProject) {
      await updateProject(projectId, {
        stepStatuses: {
          ...updatedProject.stepStatuses,
          7: 'error'
        },
        status: 'error',
        error: error instanceof Error ? error.message : 'Assembly failed'
      })
    }
    
    await updateJob(jobId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Assembly failed',
      logs
    })
  }
}
