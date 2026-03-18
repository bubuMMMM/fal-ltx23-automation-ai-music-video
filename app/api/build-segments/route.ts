import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/storage'
import { parseAudioDuration, buildSegments } from '@/lib/audio'

export async function POST(request: NextRequest) {
  try {
    const { projectId, sceneOverrides } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    const project = await getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Update step status
    await updateProject(projectId, {
      currentStep: 2,
      stepStatuses: { ...project.stepStatuses, 2: 'running' }
    })
    
    try {
      // Parse audio duration
      const duration = await parseAudioDuration(project.audioFile)
      
      // Build segments
      let segments = buildSegments(duration, 123)
      
      // Apply scene overrides if provided
      if (sceneOverrides && typeof sceneOverrides === 'object') {
        segments = segments.map((seg, idx) => ({
          ...seg,
          scene: sceneOverrides[idx] || seg.scene
        }))
      }
      
      // Update project
      const updatedProject = await updateProject(projectId, {
        audioDuration: duration,
        segments,
        stepStatuses: { ...project.stepStatuses, 2: 'done' }
      })
      
      return NextResponse.json({
        success: true,
        duration,
        segments,
        project: updatedProject
      })
    } catch (error) {
      await updateProject(projectId, {
        stepStatuses: { ...project.stepStatuses, 2: 'error' },
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to build segments'
      })
      throw error
    }
  } catch (error) {
    console.error('Error building segments:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to build segments' 
    }, { status: 500 })
  }
}
