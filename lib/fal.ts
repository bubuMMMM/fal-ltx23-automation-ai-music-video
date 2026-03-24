import { fal } from '@fal-ai/client'

// Configure fal client using FAL_KEY environment variable
fal.config({
  credentials: process.env.FAL_KEY
})

export interface GenerateImageResult {
  images: Array<{
    url: string
    width?: number
    height?: number
    content_type?: string
  }>
  description?: string
}

export interface GenerateVideoResult {
  video: {
    url: string
    content_type: string
    file_name: string
    file_size: number
  }
}

// Generate character images using nano-banana-2 (text-to-image)
export async function generateCharacterImages(
  prompt: string,
  style: string,
  count: number = 6
): Promise<string[]> {
  const fullPrompt = `${prompt}. ${style}. Full body portrait, centered composition, studio lighting.`

  const promises = Array.from({ length: count }, async () => {
    const result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: {
        prompt: fullPrompt,
        num_images: 1,
        output_format: 'png',
        aspect_ratio: '1:1',
        resolution: '1K',
        safety_tolerance: '4',
      },
    })

    // Result is returned directly, not in a data property
    const data = result.data || result
    return (data as GenerateImageResult).images?.[0]?.url
  })

  const images = await Promise.all(promises)
  return images.filter((url): url is string => !!url)
}

// Generate character variations from a reference image using nano-banana-2/edit
export async function generateCharacterFromImage(
  referenceImageUrl: string,
  prompt: string,
  style: string,
  count: number = 6
): Promise<string[]> {
  const fullPrompt = `Create variations of this character. ${prompt}. ${style}. Full body portrait, centered composition, studio lighting, same character different poses.`

  const promises = Array.from({ length: count }, async () => {
    const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
      input: {
        image_urls: [referenceImageUrl],
        prompt: fullPrompt,
        num_images: 1,
        output_format: 'png',
        aspect_ratio: '1:1',
        resolution: '1K',
        safety_tolerance: '4',
      },
    })

    const data = result.data || result
    return (data as GenerateImageResult).images?.[0]?.url
  })

  const images = await Promise.all(promises)
  return images.filter((url): url is string => !!url)
}

// Generate a scene frame with the character using nano-banana-2/edit
export async function generateFrame(
  characterImageUrl: string,
  scene: string,
  style: string,
  storyDescription?: string
): Promise<string> {
  const storyContext = storyDescription ? `. Story context: ${storyDescription}` : ''
  const prompt = `Place this exact character into a scene. ${scene}${storyContext}. ${style}. Character face clearly visible and expressive, cinematic composition.`

  console.log('[v0] generateFrame called with:', { characterImageUrl, scene, style, storyDescription })

  const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
    input: {
      image_urls: [characterImageUrl],
      prompt,
      num_images: 1,
      output_format: 'png',
      aspect_ratio: '16:9',
      resolution: '1K',
      safety_tolerance: '4',
    },
  })

  console.log('[v0] generateFrame result:', JSON.stringify(result, null, 2))

  const data = result.data || result
  const imageUrl = (data as GenerateImageResult).images?.[0]?.url
  if (!imageUrl) {
    console.log('[v0] No image URL found in result')
    throw new Error('No image generated')
  }

  console.log('[v0] generateFrame success, imageUrl:', imageUrl)
  return imageUrl
}

// Generate video from image + audio using LTX-2 v2.3
export async function generateVideo(
  imageUrl: string,
  audioUrl: string,
  scene: string,
  style: string,
  storyDescription?: string
): Promise<string> {
  const storyContext = storyDescription ? `. Story: ${storyDescription}` : ''
  const prompt = `Music video. The character is singing, mouth moving with the music, head bobbing to the beat. ${scene}${storyContext}. ${style}. Face clearly visible, expressive performance.`

  const result = await fal.subscribe('fal-ai/ltx-2/v2.3/audio-to-video', {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt,
      negative_prompt: 'blurry, low quality, static, frozen, no movement',
      num_inference_steps: 30,
      guidance_scale: 7,
      fps: 25,
      resolution: '1080p',
    },
  })

  const data = result.data || result
  const videoUrl = (data as GenerateVideoResult).video?.url
  if (!videoUrl) throw new Error('No video generated')

  return videoUrl
}

// Upload file to fal storage
export async function uploadToFal(buffer: Buffer, filename: string, mimeType: string = 'audio/mpeg'): Promise<string> {
  const blob = new Blob([buffer], { type: mimeType })
  const file = new File([blob], filename, { type: mimeType })

  const url = await fal.storage.upload(file)
  return url
}

// Upload image buffer to fal storage
export async function uploadImageToFal(buffer: Buffer, filename: string): Promise<string> {
  const mimeType = filename.endsWith('.png') ? 'image/png' : 
                   filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  const blob = new Blob([buffer], { type: mimeType })
  const file = new File([blob], filename, { type: mimeType })

  const url = await fal.storage.upload(file)
  return url
}
