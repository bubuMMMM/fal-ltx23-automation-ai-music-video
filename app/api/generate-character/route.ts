import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/storage'
import { generateCharacterImages, getFalApiKey } from '@/lib/fal'

export async function POST(request: NextRequest) {
  try {
    const { projectId, falApiKey: providedKey } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    // Use provided key or environment variable
    let apiKey: string
    try {
      apiKey = getFalApiKey(providedKey)
    } catch {
      return NextResponse.json({ error: 'FAL API key is required' }, { status: 400 })
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
      // Generate 6 character variants
      const characterImages = await generateCharacterImages(
        apiKey,
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
