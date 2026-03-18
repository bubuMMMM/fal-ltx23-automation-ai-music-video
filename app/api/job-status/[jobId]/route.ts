import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const job = await getJob(jobId)
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 })
  }
}
