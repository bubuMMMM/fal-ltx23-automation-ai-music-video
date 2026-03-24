import { fal } from '@fal-ai/client'

export function configureFal(apiKey?: string) {
  // Use provided API key or fallback to environment variable
  const key = apiKey || process.env.FAL_KEY
  if (key) {
    fal.config({
      credentials: key
    })
  }
}

export function getFalApiKey(providedKey?: string): string {
  const key = providedKey || process.env.FAL_KEY
  if (!key) {
    throw new Error('FAL API key is required. Set FAL_KEY environment variable or provide the key.')
  }
  return key
}

export interface GenerateImageResult {
  images: Array<{
    url: string
    width: number
    height: number
    content_type: string
  }>
}

export interface GenerateVideoResult {
  video: {
    url: string
    content_type: string
    file_name: string
    file_size: number
  }
}

export interface NanoBanana2Result {
  images: Array<{
    url: string
    content_type: string
    file_name: string
  }>
  description: string
}

export async function generateCharacterImages(
  apiKey: string,
  prompt: string,
  style: string,
  count: number = 6,
  referenceImageUrls: string[] = []
): Promise<string[]> {
  configureFal(apiKey)
  
  const fullPrompt = `${prompt}. ${style}. Full body portrait, centered composition, studio lighting.`
  
  // Generate images in parallel (up to count)
  const promises = Array.from({ length: count }, async () => {
    // If reference images are provided, use nano-banana-2/edit
    if (referenceImageUrls.length > 0) {
      const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
        input: {
          prompt: fullPrompt,
          image_url: referenceImageUrls[0], // nano-banana-2/edit takes single image_url
          num_images: 1,
          output_format: "png",
          aspect_ratio: "1:1"
        }
      }) as { data: NanoBanana2Result }
      
      return result.data.images[0]?.url
    } else {
      // No reference images, use nano-banana-2 text-to-image
      const result = await fal.subscribe('fal-ai/nano-banana-2', {
        input: {
          prompt: fullPrompt,
          num_images: 1,
          output_format: "png",
          aspect_ratio: "1:1"
        }
      }) as { data: NanoBanana2Result }
      
      return result.data.images[0]?.url
    }
  })
  
  const images = await Promise.all(promises)
  return images.filter((url): url is string => !!url)
}

export async function generateFrame(
  apiKey: string,
  characterImageUrl: string,
  scene: string,
  style: string
): Promise<string> {
  configureFal(apiKey)
  
  const prompt = `Place this exact character into a fun scene. ${scene}. ${style}, character face clearly visible and expressive, 16:9 widescreen.`
  
  const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
    input: {
      image_url: characterImageUrl,
      prompt,
      num_images: 1,
      output_format: "png",
      aspect_ratio: "16:9"
    }
  }) as { data: NanoBanana2Result }
  
  const imageUrl = result.data.images[0]?.url
  if (!imageUrl) throw new Error('No image generated')
  
  return imageUrl
}

export async function generateVideo(
  apiKey: string,
  imageUrl: string,
  audioUrl: string,
  scene: string,
  style: string
): Promise<string> {
  configureFal(apiKey)
  
  const prompt = `Claymation stop motion music video. The clay character is singing, mouth open and moving with the music, head bobbing to the beat. ${scene}. ${style}. Face clearly visible.`
  
  const result = await fal.subscribe('fal-ai/ltx-2/v2.3/audio-to-video', {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt,
      negative_prompt: "blurry, low quality, static, frozen, no movement",
      num_inference_steps: 30,
      guidance_scale: 7,
      fps: 25,
      resolution: "1080p"
    }
  }) as { data: GenerateVideoResult }
  
  const videoUrl = result.data.video?.url
  if (!videoUrl) throw new Error('No video generated')
  
  return videoUrl
}

export async function uploadToFal(apiKey: string, buffer: Buffer, filename: string): Promise<string> {
  configureFal(apiKey)
  
  const blob = new Blob([buffer], { type: 'audio/mpeg' })
  const file = new File([blob], filename, { type: 'audio/mpeg' })
  
  const url = await fal.storage.upload(file)
  return url
}
