// Dashboard page - lists all projects
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Video, Clock, CheckCircle2 } from 'lucide-react'
import { listProjects } from '@/lib/storage'
import { STEP_LABELS } from '@/lib/constants'

export default async function DashboardPage() {
  const projects = await listProjects()
  
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            AI Music Video Generator
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            100% automated claymation-style music videos. Upload your MP3, configure your character, 
            and let AI create a stunning visual experience.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/new">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Projects Section */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-xl font-semibold text-foreground">Your Projects</h2>
        
        {projects.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Video className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No projects yet</p>
            <Link href="/new" className="mt-4">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/project/${project.id}`}
                className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {project.id.slice(0, 8)}
                    </p>
                    <h3 className="mt-2 font-medium text-card-foreground line-clamp-2">
                      {project.characterPrompt.slice(0, 60)}...
                    </h3>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Step {project.currentStep}: {STEP_LABELS[project.currentStep]}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(project.currentStep / 8) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    idle: 'bg-secondary text-secondary-foreground',
    running: 'bg-primary/20 text-primary',
    done: 'bg-green-500/20 text-green-400',
    error: 'bg-destructive/20 text-destructive'
  }
  
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.idle}`}>
      {status === 'done' && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
      {status}
    </span>
  )
}
