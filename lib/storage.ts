// Storage utilities for project and job management
import { Project, Job } from './types'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.data')
const PROJECTS_DIR = path.join(DATA_DIR, 'projects')
const JOBS_DIR = path.join(DATA_DIR, 'jobs')
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')
const OUTPUTS_DIR = path.join(process.cwd(), 'public', 'outputs')

async function ensureDir(dir: string) {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function initStorage() {
  await ensureDir(DATA_DIR)
  await ensureDir(PROJECTS_DIR)
  await ensureDir(JOBS_DIR)
  await ensureDir(UPLOADS_DIR)
  await ensureDir(OUTPUTS_DIR)
}

// Project operations
export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'currentStep' | 'stepStatuses' | 'status' | 'characterImages' | 'selectedCharacter' | 'segments' | 'frameResults' | 'frameSelections' | 'videoResults' | 'videoSelections' | 'finalVideoPath' | 'finalVideoUrl' | 'referenceImages' | 'referenceImageUrls'> & { referenceImages?: string[]; referenceImageUrls?: string[] }): Promise<Project> {
  await initStorage()
  
  const project: Project = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...data,
    referenceImages: data.referenceImages || [],
    referenceImageUrls: data.referenceImageUrls || [],
    currentStep: 1,
    stepStatuses: {
      1: 'pending',
      2: 'pending',
      3: 'pending',
      4: 'pending',
      5: 'pending',
      6: 'pending',
      7: 'pending',
      8: 'pending'
    },
    status: 'idle',
    characterImages: [],
    selectedCharacter: null,
    segments: [],
    frameResults: [],
    frameSelections: {},
    videoResults: [],
    videoSelections: {},
    finalVideoPath: null,
    finalVideoUrl: null
  }
  
  await fs.writeFile(
    path.join(PROJECTS_DIR, `${project.id}.json`),
    JSON.stringify(project, null, 2)
  )
  
  return project
}

export async function getProject(id: string): Promise<Project | null> {
  await initStorage()
  
  try {
    const data = await fs.readFile(path.join(PROJECTS_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(data) as Project
  } catch {
    return null
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  const project = await getProject(id)
  if (!project) return null
  
  const updated = { ...project, ...updates }
  await fs.writeFile(
    path.join(PROJECTS_DIR, `${id}.json`),
    JSON.stringify(updated, null, 2)
  )
  
  return updated
}

export async function listProjects(): Promise<Project[]> {
  await initStorage()
  
  try {
    const files = await fs.readdir(PROJECTS_DIR)
    const projects: Project[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8')
        projects.push(JSON.parse(data) as Project)
      }
    }
    
    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

// Job operations
export async function createJob(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'progress' | 'results' | 'logs'>): Promise<Job> {
  await initStorage()
  
  const job: Job = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending',
    progress: 0,
    results: [],
    logs: [],
    ...data
  }
  
  await fs.writeFile(
    path.join(JOBS_DIR, `${job.id}.json`),
    JSON.stringify(job, null, 2)
  )
  
  return job
}

export async function getJob(id: string): Promise<Job | null> {
  await initStorage()
  
  try {
    const data = await fs.readFile(path.join(JOBS_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(data) as Job
  } catch {
    return null
  }
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const job = await getJob(id)
  if (!job) return null
  
  const updated = { ...job, ...updates, updatedAt: new Date().toISOString() }
  await fs.writeFile(
    path.join(JOBS_DIR, `${id}.json`),
    JSON.stringify(updated, null, 2)
  )
  
  return updated
}

// File operations
export async function saveUploadedFile(file: File, projectId: string): Promise<string> {
  await initStorage()
  
  const projectUploadDir = path.join(UPLOADS_DIR, projectId)
  await ensureDir(projectUploadDir)
  
  const filename = `audio_${Date.now()}.mp3`
  const filepath = path.join(projectUploadDir, filename)
  
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filepath, buffer)
  
  return filepath
}

export function getPublicUrl(filepath: string): string {
  // Convert absolute path to public URL
  const publicPath = filepath.replace(process.cwd(), '').replace(/\\/g, '/')
  return publicPath.startsWith('/public') ? publicPath.replace('/public', '') : publicPath
}

export async function saveUploadedImage(file: File, projectId: string, index: number): Promise<string> {
  await initStorage()
  
  const projectUploadDir = path.join(UPLOADS_DIR, projectId)
  await ensureDir(projectUploadDir)
  
  // Get file extension
  const ext = file.name.split('.').pop() || 'png'
  const filename = `reference_${index}_${Date.now()}.${ext}`
  const filepath = path.join(projectUploadDir, filename)
  
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filepath, buffer)
  
  return filepath
}

export async function getProjectOutputDir(projectId: string): Promise<string> {
  const dir = path.join(OUTPUTS_DIR, projectId)
  await ensureDir(dir)
  return dir
}
