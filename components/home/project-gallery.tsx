import { Plus, Smartphone } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const COMMUNITY_APPS = [
  {
    title: "Pulse",
    description: "A fitness tracker with streaks, goals, and weekly recaps.",
    author: "Maya R.",
    category: "Health",
    gradient: "from-rose-400 to-orange-300",
  },
  {
    title: "Brewlog",
    description: "A coffee journal for tracking beans, brews, and tasting notes.",
    author: "Dev K.",
    category: "Lifestyle",
    gradient: "from-amber-400 to-yellow-300",
  },
  {
    title: "Wanderly",
    description: "Collaborative trip planning with shared itineraries.",
    author: "Alex T.",
    category: "Travel",
    gradient: "from-sky-400 to-cyan-300",
  },
  {
    title: "Nimbus",
    description: "Minimal weather widgets with hyperlocal forecasts.",
    author: "Sam O.",
    category: "Utilities",
    gradient: "from-indigo-400 to-blue-300",
  },
  {
    title: "Petly",
    description: "Keep track of feeding schedules, vet visits, and walks.",
    author: "Jordan P.",
    category: "Lifestyle",
    gradient: "from-emerald-400 to-teal-300",
  },
  {
    title: "FocusFlow",
    description: "A study timer with ambient sounds and session stats.",
    author: "Riya S.",
    category: "Productivity",
    gradient: "from-violet-400 to-purple-300",
  },
] as const

const MY_PROJECTS = [
  {
    title: "Untitled Project",
    description: "Last edited 2 hours ago · Draft",
    category: "Draft",
    gradient: "from-indigo-400 to-violet-300",
  },
  {
    title: "Grocery Planner",
    description: "Last edited yesterday · 4 screens",
    category: "In progress",
    gradient: "from-emerald-400 to-teal-300",
  },
] as const

function ProjectPreview({ gradient }: { gradient: string }) {
  return (
    <div
      className={`flex aspect-video items-center justify-center bg-gradient-to-br ${gradient}`}
    >
      <Smartphone className="size-10 text-white/90" strokeWidth={1.5} />
    </div>
  )
}

function CommunityCard({ app }: { app: (typeof COMMUNITY_APPS)[number] }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg hover:shadow-indigo-950/5">
      <ProjectPreview gradient={app.gradient} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">{app.title}</h3>
          <Badge variant="outline" className="shrink-0">
            {app.category}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{app.description}</p>
        <div className="mt-4 flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{app.author.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{app.author}</span>
        </div>
      </div>
    </div>
  )
}

function MyProjectCard({ project }: { project: (typeof MY_PROJECTS)[number] }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg hover:shadow-indigo-950/5">
      <ProjectPreview gradient={project.gradient} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">{project.title}</h3>
          <Badge variant="outline" className="shrink-0">
            {project.category}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{project.description}</p>
      </div>
    </div>
  )
}

function NewProjectCard() {
  return (
    <button
      type="button"
      className="flex aspect-[4/3.1] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-white text-muted-foreground transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Plus className="size-5" />
      </span>
      <span className="text-sm font-medium">New project</span>
    </button>
  )
}

export function ProjectGallery({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {isSignedIn ? "Your projects" : "Explore community creations"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignedIn
              ? "Pick up where you left off, or start something new."
              : "See what builders are shipping with AppForge."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isSignedIn ? (
          <>
            <NewProjectCard />
            {MY_PROJECTS.map((project) => (
              <MyProjectCard key={project.title} project={project} />
            ))}
          </>
        ) : (
          COMMUNITY_APPS.map((app) => <CommunityCard key={app.title} app={app} />)
        )}
      </div>
    </section>
  )
}
