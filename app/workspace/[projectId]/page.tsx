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
import { buildInitialMessages } from "@/components/workspace/dummy-data"
import type { WorkspaceAsset, WorkspaceProject } from "@/components/workspace/types"

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

  const initialMessages = React.useMemo(() => {
    if (!data) return []
    const [first, ...rest] = buildInitialMessages(data.project.prompt)
    return [{ ...first, attachments: data.assets }, ...rest]
  }, [data])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <WorkspaceHeader
        projectName={data?.project.name}
        status={data?.project.status}
        isLoading={isLoading}
      />

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

      {!isLoading && data && (
        <WorkspaceLayout
          chat={<ChatPanel initialMessages={initialMessages} />}
          canvas={<CanvasArea />}
          preview={<PreviewPanel />}
        />
      )}
    </div>
  )
}
