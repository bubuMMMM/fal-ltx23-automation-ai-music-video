import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const { projectId, selections } = await request.json()
    
    if (!projectId || !selections) {
      return NextResponse.json({ error: 'Project ID and selections are required' }, { status: 400 })
    }
    
    const project = await getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Validate all segments have a selection
    const segmentCount = project.segments.length
    const selectionCount = Object.keys(selections).length
    
    if (selectionCount !== segmentCount) {
      return NextResponse.json({ 
        error: `All ${segmentCount} segments must have a selection` 
      }, { status: 400 })
    }
    
    // Update project
    const updatedProject = await updateProject(projectId, {
      videoSelections: selections,
      currentStep: 6,
      stepStatuses: { ...project.stepStatuses, 6: 'done' }
    })
    
    return NextResponse.json({
      success: true,
      project: updatedProject
    })
  } catch (error) {
    console.error('Error saving video selections:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save selections' 
    }, { status: 500 })
  }
}
