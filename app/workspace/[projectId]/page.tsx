"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft } from "lucide-react"

import { getStoredToken } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { WorkspaceHeader } from "@/components/workspace/workspace-header"
import { WorkspaceLayout } from "@/components/workspace/workspace-layout"
import { ChatPanel } from "@/components/workspace/chat-panel"
import { CanvasArea } from "@/components/workspace/canvas-area"
import { PreviewPanel } from "@/components/workspace/preview-panel"
import { useAppAgent } from "@/components/workspace/use-app-agent"
import type { CanvasScreen, WorkspaceAsset, WorkspaceProject } from "@/components/workspace/types"

type ProjectResponse = {
  project: WorkspaceProject
  assets: WorkspaceAsset[]
}

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<ProjectResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    const token = getStoredToken()
    if (!token) {
      router.replace("/")
      return
    }

    fetch(`/api/projects/${projectId}`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setError(body?.error ?? "Failed to load this project.")
          return
        }
        setData(body)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server. Check your connection and try again.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, router])

  React.useEffect(() => {
    if (data) document.title = `${data.project.name} · AppForge`
  }, [data])

  if (!isLoading && data) {
    return <Workspace project={data.project} assets={data.assets} />
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <WorkspaceHeader projectName={data?.project.name} status={data?.project.status} isLoading={isLoading} />

      {isLoading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading workspace...
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <p role="alert" className="max-w-sm text-sm text-foreground">
            {error}
          </p>
          <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
            <ArrowLeft />
            Back to home
          </Button>
        </div>
      )}
    </div>
  )
}

const SCREEN_GAP = 340
const VARIANTS: CanvasScreen["variant"][] = ["home", "list", "detail", "profile"]

/** The loaded workspace. Mounting it starts (or resumes) the AI agent automatically. */
function Workspace({ project, assets }: { project: WorkspaceProject; assets: WorkspaceAsset[] }) {
  const agent = useAppAgent(project, assets)
  const { plan, confirmed, screens, generatingId } = agent

  // Screens appear on the canvas once the plan is confirmed: placeholders first,
  // replaced by the real design as each one is generated. While a revised plan
  // awaits confirmation, the screens built so far stay visible.
  const canvasScreens = React.useMemo<CanvasScreen[]>(() => {
    if (!plan) return []
    if (!confirmed) {
      return screens.map((built, i) => ({
        id: built.id,
        name: built.name,
        x: i * SCREEN_GAP,
        y: 0,
        variant: VARIANTS[i % VARIANTS.length],
        html: built.html,
        buildState: "ready",
      }))
    }
    return plan.screens.map((planned, i) => {
      const built = screens.find((s) => s.id === planned.id)
      return {
        id: planned.id,
        name: planned.name,
        x: i * SCREEN_GAP,
        y: 0,
        variant: VARIANTS[i % VARIANTS.length],
        html: built?.html,
        buildState: built ? "ready" : generatingId === planned.id ? "generating" : "queued",
      }
    })
  }, [confirmed, generatingId, plan, screens])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <WorkspaceHeader projectName={project.name} status={agent.status} />
      <WorkspaceLayout
        chat={<ChatPanel agent={agent} />}
        canvas={
          <CanvasArea
            screens={canvasScreens}
            emptyTitle={plan ? "Waiting for your go-ahead" : "Planning your app"}
            emptyDescription={
              plan
                ? "Review the plan in the chat. Screens will appear here one by one once you confirm it."
                : "The agent is reading your request and drafting a screen plan."
            }
          />
        }
        preview={<PreviewPanel screens={screens} />}
      />
    </div>
  )
}
