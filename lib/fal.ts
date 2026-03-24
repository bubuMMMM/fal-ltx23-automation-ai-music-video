import { fal } from '@fal-ai/client'

// Configure fal client once using server-side env variable
fal.config({
  credentials: process.env.FAL_KEY
})

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

export async function generateCharacterImages(
  prompt: string,
  style: string,
  count: number = 6
): Promise<string[]> {
  const fullPrompt = `${prompt}. ${style}. Full body portrait, centered composition, studio lighting.`

  const promises = Array.from({ length: count }, async () => {
    const result = await fal.subscribe('fal-ai/nano-banana-pro', {
      input: {
        prompt: fullPrompt,
        negative_prompt: 'blurry, low quality, distorted, ugly, deformed',
        num_inference_steps: 28,
        guidance_scale: 7,
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'png',
        image_size: {
          width: 1024,
          height: 1024,
        },
      },
    }) as { data: GenerateImageResult }

    return result.data.images[0]?.url
  })

  const images = await Promise.all(promises)
  return images.filter((url): url is string => !!url)
}

export async function generateFrame(
  characterImageUrl: string,
  scene: string,
  style: string
): Promise<string> {
  const prompt = `Place this exact claymation character into a fun scene. ${scene}. ${style}, character face clearly visible and expressive, 16:9 widescreen.`

  const result = await fal.subscribe('fal-ai/nano-banana-pro/edit', {
    input: {
      image_urls: [characterImageUrl],
      prompt,
      negative_prompt: 'blurry, low quality, distorted, ugly, deformed, wrong face',
      num_inference_steps: 28,
      guidance_scale: 7,
      num_images: 1,
      enable_safety_checker: false,
      output_format: 'png',
      image_size: 'landscape_16_9',
    },
  }) as { data: GenerateImageResult }

  const imageUrl = result.data.images[0]?.url
  if (!imageUrl) throw new Error('No image generated')

  return imageUrl
}

export async function generateVideo(
  imageUrl: string,
  audioUrl: string,
  scene: string,
  style: string
): Promise<string> {
  const prompt = `Claymation stop motion music video. The clay character is singing, mouth open and moving with the music, head bobbing to the beat. ${scene}. ${style}. Face clearly visible.`

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
  }) as { data: GenerateVideoResult }

  const videoUrl = result.data.video?.url
  if (!videoUrl) throw new Error('No video generated')

  return videoUrl
}

export async function uploadToFal(buffer: Buffer, filename: string): Promise<string> {
  const blob = new Blob([buffer], { type: 'audio/mpeg' })
  const file = new File([blob], filename, { type: 'audio/mpeg' })

  const url = await fal.storage.upload(file)
  return url
}
