"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

import { getStoredToken } from "@/lib/auth-client"
import { SiteHeader } from "@/components/home/site-header"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

type ProjectResponse = {
  project: { id: string; prompt: string; status: string; createdAt: string }
  assets: { id: string; fileName: string; url: string }[]
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

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-14">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
            <Spinner />
            Loading project...
          </div>
        )}

        {!isLoading && error && (
          <p role="alert" className="py-24 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {!isLoading && data && (
          <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Your project
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Created {new Date(data.project.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {data.project.status}
              </Badge>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5">
              <h2 className="text-sm font-medium text-muted-foreground">Prompt</h2>
              <p className="mt-2 text-base text-foreground">{data.project.prompt}</p>
            </div>

            {data.assets.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Reference assets</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.assets.map((asset) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={asset.id}
                      src={asset.url}
                      alt={asset.fileName}
                      className="aspect-square w-full rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-sm text-indigo-700">
              <Sparkles className="size-4 shrink-0" />
              AI build execution is coming soon — your project has been saved and is queued.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
