import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/storage'
import { parseAudioDuration, buildSegmentsWithTimings } from '@/lib/audio'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const ScenesSchema = z.object({
  scenes: z.array(z.object({
    index: z.number(),
    scene: z.string().describe('A detailed visual description for this scene, suitable for AI image generation')
  }))
})

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
      
      // Build segments with timings
      let segments = buildSegmentsWithTimings(duration, 123)
      
      // If we have a story description, generate AI-based scenes
      if (project.storyDescription && project.storyDescription.trim()) {
        const generatedScenes = await generateScenesFromStory(
          project.storyDescription,
          project.characterPrompt,
          project.characterStyle,
          segments.length
        )
        
        // Map generated scenes to segments
        segments = segments.map((seg, idx) => ({
          ...seg,
          scene: generatedScenes[idx] || seg.scene
        }))
      }
      
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

async function generateScenesFromStory(
  storyDescription: string,
  characterPrompt: string,
  characterStyle: string,
  segmentCount: number
): Promise<string[]> {
  try {
    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({ schema: ScenesSchema }),
      prompt: `You are a creative director for an AI-generated music video. 
      
Your task is to create ${segmentCount} scene descriptions that tell a visual story based on the following narrative:

STORY: ${storyDescription}

CHARACTER: ${characterPrompt}

VISUAL STYLE: ${characterStyle}

Generate exactly ${segmentCount} scene descriptions. Each scene should:
1. Be a detailed visual description (2-3 sentences) suitable for AI image generation
2. Follow the narrative arc of the story
3. Feature the character in various situations related to the story
4. Include specific visual details like camera angle (close-up, wide shot, medium shot), lighting, and environment
5. Be consistent with the visual style mentioned
6. Progress naturally through the story from beginning to end

The scenes should flow like a music video - dynamic, visually interesting, and emotionally engaging.

Return an array of ${segmentCount} scenes, numbered from 0 to ${segmentCount - 1}.`
    })
    
    if (result.output && result.output.scenes) {
      // Sort by index and extract scene descriptions
      const sortedScenes = result.output.scenes
        .sort((a, b) => a.index - b.index)
        .map(s => s.scene)
      
      // Pad with default scenes if needed
      while (sortedScenes.length < segmentCount) {
        sortedScenes.push(`Wide shot, ${characterPrompt} in an expressive pose, ${characterStyle}`)
      }
      
      return sortedScenes.slice(0, segmentCount)
    }
    
    throw new Error('Failed to generate scenes')
  } catch (error) {
    console.error('Error generating scenes from story:', error)
    // Return default scenes on error
    return Array.from({ length: segmentCount }, (_, i) => 
      `Scene ${i + 1}: Wide shot of the character in an expressive pose`
    )
  }
}
