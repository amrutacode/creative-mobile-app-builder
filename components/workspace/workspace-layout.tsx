"use client"

import * as React from "react"
import { LayoutGrid, MessageSquare, Smartphone } from "lucide-react"
import { cn } from "cn"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TooltipProvider } from "@/components/ui/tooltip"

const DESKTOP_QUERY = "(min-width: 1024px)"

function subscribe(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function useIsDesktop() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true // SSR: assume desktop; this page is client-rendered after auth anyway
  )
}

type Pane = "chat" | "canvas" | "preview"

const PANES: { id: Pane; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "canvas", label: "Canvas", icon: LayoutGrid },
  { id: "preview", label: "Preview", icon: Smartphone },
]

export function WorkspaceLayout({
  chat,
  canvas,
  preview,
}: {
  chat: React.ReactNode
  canvas: React.ReactNode
  preview: React.ReactNode
}) {
  const isDesktop = useIsDesktop()
  const [mobilePane, setMobilePane] = React.useState<Pane>("chat")

  if (!isDesktop) {
    const panes = { chat, canvas, preview }
    return (
      <TooltipProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          {/* All panes stay mounted so local state (chat draft, canvas) survives tab switches. */}
          {PANES.map(({ id }) => (
            <div key={id} className={cn("min-h-0 flex-1", mobilePane !== id && "hidden")}>
              {panes[id]}
            </div>
          ))}
          <nav
            aria-label="Workspace sections"
            className="grid shrink-0 grid-cols-3 border-t border-border/70 bg-white"
          >
            {PANES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobilePane(id)}
                aria-current={mobilePane === id ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  mobilePane === id ? "text-indigo-600" : "text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel id="chat" defaultSize="24%" minSize={300} maxSize="36%">
          {chat}
        </ResizablePanel>
        <ResizableHandle className="transition-colors hover:bg-indigo-300 data-[separator=active]:bg-indigo-500" />
        <ResizablePanel id="canvas" minSize="30%">
          {canvas}
        </ResizablePanel>
        <ResizableHandle className="transition-colors hover:bg-indigo-300 data-[separator=active]:bg-indigo-500" />
        <ResizablePanel id="preview" defaultSize="28%" minSize={360} maxSize="42%">
          {preview}
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
