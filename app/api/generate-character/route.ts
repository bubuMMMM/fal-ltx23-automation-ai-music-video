import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/storage'
import { generateCharacterImages, getFalApiKey, configureFal } from '@/lib/fal'
import { fal } from '@fal-ai/client'
import fs from 'fs/promises'

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
      // Upload reference images to fal storage if they exist
      const referenceImageUrls: string[] = []
      if (project.referenceImages && project.referenceImages.length > 0) {
        configureFal(apiKey)
        
        for (const imagePath of project.referenceImages) {
          try {
            // Read the local file and upload to fal storage
            const fileBuffer = await fs.readFile(imagePath)
            const ext = imagePath.split('.').pop() || 'png'
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
            const blob = new Blob([fileBuffer], { type: mimeType })
            const file = new File([blob], `reference.${ext}`, { type: mimeType })
            
            const uploadedUrl = await fal.storage.upload(file)
            referenceImageUrls.push(uploadedUrl)
          } catch (uploadError) {
            console.error('Failed to upload reference image:', uploadError)
          }
        }
      }
      
      // Generate 6 character variants
      const characterImages = await generateCharacterImages(
        apiKey,
        project.characterPrompt,
        project.characterStyle,
        6,
        referenceImageUrls
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
