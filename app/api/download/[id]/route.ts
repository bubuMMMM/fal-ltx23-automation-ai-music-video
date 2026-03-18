import { NextRequest, NextResponse } from 'next/server'
import { getProject } from '@/lib/storage'
import fs from 'fs/promises'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await getProject(id)
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (!project.finalVideoPath) {
      return NextResponse.json({ error: 'Video not ready' }, { status: 400 })
    }
    
    const videoBuffer = await fs.readFile(project.finalVideoPath)
    
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="music-video-${id.slice(0, 8)}.mp4"`,
        'Content-Length': videoBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error downloading video:', error)
    return NextResponse.json({ error: 'Failed to download video' }, { status: 500 })
  }
}
