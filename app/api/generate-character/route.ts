import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/storage'
import { generateCharacterImages } from '@/lib/fal'

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
    
    // Update step status
    await updateProject(projectId, {
      currentStep: 1,
      stepStatuses: { ...project.stepStatuses, 1: 'running' },
      status: 'running'
    })
    
    try {
      const characterImages = await generateCharacterImages(
        project.characterPrompt,
        project.characterStyle,
        6
      )
      
      // Update project with results
      const updatedProject = await updateProject(projectId, {
        characterImages,
        stepStatuses: { ...project.stepStatuses, 1: 'done' }
      })
      
      return NextResponse.json({ 
        success: true,
        characterImages,
        project: updatedProject
      })
    } catch (error) {
      await updateProject(projectId, {
        stepStatuses: { ...project.stepStatuses, 1: 'error' },
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate character'
      })
      throw error
    }
  } catch (error) {
    console.error('Error generating character:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate character' 
    }, { status: 500 })
  }
}
