import { NextRequest, NextResponse } from 'next/server'
import { createProject, listProjects, saveUploadedFile, saveUploadedImage, getPublicUrl } from '@/lib/storage'
import { DEFAULT_CHARACTER_PROMPT, DEFAULT_CHARACTER_STYLE } from '@/lib/constants'

export async function GET() {
  try {
    const projects = await listProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error listing projects:', error)
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const audioFile = formData.get('audioFile') as File | null
    const characterPrompt = formData.get('characterPrompt') as string || DEFAULT_CHARACTER_PROMPT
    const characterStyle = formData.get('characterStyle') as string || DEFAULT_CHARACTER_STYLE
    const speedFactor = parseFloat(formData.get('speedFactor') as string) || 0.75
    const variants = parseInt(formData.get('variants') as string) || 3
    const storyDescription = formData.get('storyDescription') as string || ''
    
    // Get reference images (up to 2)
    const referenceImage1 = formData.get('referenceImage1') as File | null
    const referenceImage2 = formData.get('referenceImage2') as File | null
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }
    
    // Create project first to get ID
    const project = await createProject({
      audioFile: '', // Will update after saving
      characterPrompt,
      characterStyle,
      speedFactor,
      variants,
      storyDescription
    })
    
    // Save audio file
    const audioPath = await saveUploadedFile(audioFile, project.id)
    const audioUrl = getPublicUrl(audioPath)
    
    // Save reference images if provided
    const referenceImages: string[] = []
    const referenceImageUrls: string[] = []
    
    if (referenceImage1 && referenceImage1.size > 0) {
      const imagePath = await saveUploadedImage(referenceImage1, project.id, 1)
      referenceImages.push(imagePath)
      referenceImageUrls.push(getPublicUrl(imagePath))
    }
    
    if (referenceImage2 && referenceImage2.size > 0) {
      const imagePath = await saveUploadedImage(referenceImage2, project.id, 2)
      referenceImages.push(imagePath)
      referenceImageUrls.push(getPublicUrl(imagePath))
    }
    
    // Update project with audio path and reference images
    const { updateProject } = await import('@/lib/storage')
    await updateProject(project.id, { 
      audioFile: audioPath, 
      audioUrl,
      referenceImages,
      referenceImageUrls
    })
    
    return NextResponse.json({ 
      project: { ...project, audioFile: audioPath, audioUrl, referenceImages, referenceImageUrls } 
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
