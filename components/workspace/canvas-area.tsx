"use client"

import * as React from "react"
import {
  Copy,
  Hand,
  LayoutGrid,
  Loader2,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PHONE_HEIGHT, PHONE_WIDTH } from "./dummy-data"
import { PhoneFrame, ScreenHtml, ScreenSkeleton } from "./phone-mockup"
import type { CanvasScreen } from "./types"

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2
const GRID_SIZE = 20
const LABEL_HEIGHT = 28 // space above each frame for its name
const FIT_PADDING = 80

type Tool = "select" | "hand"
type View = { x: number; y: number; zoom: number }
type DragState =
  | { kind: "pan"; startX: number; startY: number; origX: number; origY: number }
  | { kind: "screen"; id: string; startX: number; startY: number; origX: number; origY: number }

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

function fitView(screens: CanvasScreen[], width: number, height: number): View {
  if (screens.length === 0 || width === 0 || height === 0) return { x: 0, y: 0, zoom: 1 }
  const minX = Math.min(...screens.map((s) => s.x))
  const minY = Math.min(...screens.map((s) => s.y)) - LABEL_HEIGHT
  const maxX = Math.max(...screens.map((s) => s.x + PHONE_WIDTH))
  const maxY = Math.max(...screens.map((s) => s.y + PHONE_HEIGHT))
  const zoom = clampZoom(
    Math.min(
      (width - FIT_PADDING * 2) / (maxX - minX),
      (height - FIT_PADDING * 2) / (maxY - minY),
      1
    )
  )
  return {
    zoom,
    x: (width - (maxX - minX) * zoom) / 2 - minX * zoom,
    y: (height - (maxY - minY) * zoom) / 2 - minY * zoom,
  }
}

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={cn(active && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-700")}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        {shortcut && <span className="ml-1.5 opacity-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Merge agent-provided screens into the canvas while keeping the user's local
 * edits: positions, renames, duplicates and deletions.
 */
function mergeScreens(prev: CanvasScreen[], incoming: CanvasScreen[], known: Set<string>) {
  const byId = new Map(incoming.map((s) => [s.id, s]))
  const next = prev
    .filter((s) => s.userCreated || byId.has(s.id))
    .map((s) => {
      const fresh = byId.get(s.id)
      if (!fresh) return s
      return { ...fresh, x: s.x, y: s.y, name: s.renamed ? s.name : fresh.name, renamed: s.renamed }
    })
  for (const s of incoming) {
    if (known.has(s.id)) continue
    known.add(s.id)
    next.push(s)
  }
  return next
}

export function CanvasArea({
  screens: incomingScreens,
  emptyTitle = "No screens yet",
  emptyDescription = "Generated screens will appear here. Ask the agent in the chat to design one.",
}: {
  screens: CanvasScreen[]
  emptyTitle?: string
  emptyDescription?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<DragState | null>(null)
  const knownIdsRef = React.useRef(new Set(incomingScreens.map((s) => s.id)))
  const [screens, setScreens] = React.useState<CanvasScreen[]>(incomingScreens)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [view, setView] = React.useState<View>({ x: 0, y: 0, zoom: 1 })
  const [tool, setTool] = React.useState<Tool>("select")
  const [spaceHeld, setSpaceHeld] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)

  const effectiveTool: Tool = spaceHeld ? "hand" : tool

  const fitToScreen = React.useCallback((target: CanvasScreen[] = screens) => {
    const el = containerRef.current
    if (!el) return
    setView(fitView(target, el.clientWidth, el.clientHeight))
  }, [screens])

  // Pull in screens as the agent plans and builds them.
  React.useEffect(() => {
    setScreens((prev) => mergeScreens(prev, incomingScreens, knownIdsRef.current))
  }, [incomingScreens])

  // Frame all screens once the container first gets a real size (panels lay
  // out after mount, so the initial clientWidth can still be 0), and again
  // whenever the agent adds new screens.
  const screenCount = screens.length
  const screensRef = React.useRef(screens)
  screensRef.current = screens
  React.useEffect(() => {
    const el = containerRef.current
    if (!el || screenCount === 0) return
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === 0 || el.clientHeight === 0) return
      setView(fitView(screensRef.current, el.clientWidth, el.clientHeight))
      observer.disconnect()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [screenCount])

  const zoomAt = React.useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Keep the point under the cursor (or the viewport center) stationary.
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top
    setView((v) => {
      const zoom = clampZoom(nextZoom)
      const scale = zoom / v.zoom
      return { zoom, x: px - (px - v.x) * scale, y: py - (py - v.y) * scale }
    })
  }, [])

  // Wheel needs a non-passive listener so we can stop the page from scrolling.
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpads also arrives as ctrl+wheel.
        setView((v) => {
          const rect = el!.getBoundingClientRect()
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          const zoom = clampZoom(v.zoom * Math.exp(-e.deltaY * 0.01))
          const scale = zoom / v.zoom
          return { zoom, x: px - (px - v.x) * scale, y: py - (py - v.y) * scale }
        })
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  function startPan(e: React.PointerEvent) {
    dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y }
    containerRef.current?.setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  function handleBackgroundPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.button !== 1) return
    containerRef.current?.focus({ preventScroll: true })
    setSelectedId(null)
    setRenamingId(null)
    startPan(e)
  }

  function handleScreenPointerDown(e: React.PointerEvent, screen: CanvasScreen) {
    if (e.button !== 0) return
    e.stopPropagation()
    containerRef.current?.focus({ preventScroll: true })
    if (effectiveTool === "hand") {
      startPan(e)
      return
    }
    setSelectedId(screen.id)
    dragRef.current = {
      kind: "screen",
      id: screen.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: screen.x,
      origY: screen.y,
    }
    containerRef.current?.setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (drag.kind === "pan") {
      setView((v) => ({ ...v, x: drag.origX + dx, y: drag.origY + dy }))
    } else {
      setScreens((prev) =>
        prev.map((s) =>
          s.id === drag.id ? { ...s, x: drag.origX + dx / view.zoom, y: drag.origY + dy / view.zoom } : s
        )
      )
    }
  }

  function endDrag(e: React.PointerEvent) {
    if (!dragRef.current) return
    dragRef.current = null
    setIsDragging(false)
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId)
    }
  }

  function duplicateScreen(id: string) {
    const source = screens.find((s) => s.id === id)
    if (!source) return
    const copy: CanvasScreen = {
      ...source,
      id: `${source.id}-copy-${Date.now()}`,
      name: `${source.name} copy`,
      userCreated: true,
      x: source.x + 40,
      y: source.y + 40,
    }
    setScreens((prev) => [...prev, copy])
    setSelectedId(copy.id)
  }

  function deleteScreen(id: string) {
    setScreens((prev) => prev.filter((s) => s.id !== id))
    setSelectedId(null)
  }

  function renameScreen(id: string, name: string) {
    const trimmed = name.trim()
    if (trimmed) {
      setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, name: trimmed, renamed: true } : s)))
    }
    setRenamingId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "INPUT") return
    if (e.key === " ") {
      e.preventDefault()
      setSpaceHeld(true)
    } else if (e.key === "v" || e.key === "V") setTool("select")
    else if (e.key === "h" || e.key === "H") setTool("hand")
    else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) deleteScreen(selectedId)
    else if (e.key === "Escape") setSelectedId(null)
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selectedId) {
      e.preventDefault()
      duplicateScreen(selectedId)
    } else if (e.shiftKey && e.key === "!") fitToScreen()
  }

  const cursor = isDragging
    ? dragRef.current?.kind === "pan"
      ? "cursor-grabbing"
      : "cursor-move"
    : effectiveTool === "hand"
      ? "cursor-grab"
      : "cursor-default"

  return (
    <section aria-label="Canvas" className="relative flex h-full min-h-0 flex-col bg-neutral-50">
      {/* Top bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 bg-white px-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Canvas</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {screens.length} {screens.length === 1 ? "screen" : "screens"}
          </span>
        </div>
        <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
          <Plus />
          Add screen
        </Button>
      </div>

      {/* Infinite canvas viewport */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label="Screen canvas. Drag to pan, Ctrl or Cmd plus scroll to zoom."
        className={cn("relative min-h-0 flex-1 touch-none overflow-hidden outline-none select-none", cursor)}
        style={{
          backgroundImage: "radial-gradient(circle, rgb(212 212 216) 1px, transparent 1px)",
          backgroundSize: `${GRID_SIZE * view.zoom}px ${GRID_SIZE * view.zoom}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.key === " " && setSpaceHeld(false)}
        onBlur={() => setSpaceHeld(false)}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          {screens.map((screen) => {
            const selected = screen.id === selectedId
            return (
              <div
                key={screen.id}
                className="absolute"
                style={{ left: screen.x, top: screen.y - LABEL_HEIGHT, width: PHONE_WIDTH }}
              >
                {/* Label row */}
                <div className="flex items-center justify-between" style={{ height: LABEL_HEIGHT }}>
                  {renamingId === screen.id ? (
                    <input
                      autoFocus
                      defaultValue={screen.name}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={(e) => renameScreen(screen.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameScreen(screen.id, e.currentTarget.value)
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      className="h-6 w-40 rounded-md border border-indigo-300 bg-white px-1.5 text-xs font-medium outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onPointerDown={(e) => handleScreenPointerDown(e, screen)}
                      onDoubleClick={() => setRenamingId(screen.id)}
                      title="Double-click to rename"
                      className={cn(
                        "truncate text-xs font-medium",
                        selected ? "text-indigo-600" : "text-muted-foreground"
                      )}
                    >
                      {screen.name}
                    </button>
                  )}

                  {selected && !isDragging && (
                    <div
                      className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-0.5 shadow-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <ToolButton label="Edit with AI" onClick={() => {}}>
                        <Wand2 />
                      </ToolButton>
                      <ToolButton label="Duplicate" shortcut="⌘D" onClick={() => duplicateScreen(screen.id)}>
                        <Copy />
                      </ToolButton>
                      <ToolButton label="Delete" shortcut="⌫" onClick={() => deleteScreen(screen.id)}>
                        <Trash2 />
                      </ToolButton>
                    </div>
                  )}
                </div>

                {/* Device */}
                <div
                  onPointerDown={(e) => handleScreenPointerDown(e, screen)}
                  className={cn(
                    "rounded-[2.6rem] ring-offset-4 ring-offset-neutral-50 transition-shadow",
                    selected ? "ring-2 ring-indigo-500" : "hover:ring-2 hover:ring-indigo-200"
                  )}
                  style={{ height: PHONE_HEIGHT }}
                >
                  <PhoneFrame className="pointer-events-none h-full">
                    {screen.html ? (
                      <ScreenHtml html={screen.html} title={`${screen.name} screen`} />
                    ) : (
                      <>
                        <div className={cn(screen.buildState === "generating" ? "animate-pulse" : "opacity-50", "h-full")}>
                          <ScreenSkeleton variant={screen.variant} />
                        </div>
                        {screen.buildState && (
                          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-3 py-1.5 text-xs font-medium shadow-sm">
                              {screen.buildState === "generating" ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin text-indigo-600" />
                                  Designing…
                                </>
                              ) : (
                                <span className="text-muted-foreground">Queued</span>
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </PhoneFrame>
                </div>
              </div>
            )
          })}
        </div>

        {screens.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <Sparkles className="size-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{emptyDescription}</p>
          </div>
        )}

        {/* Floating toolbar */}
        <div
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-white p-1 shadow-lg shadow-indigo-950/5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ToolButton label="Select" shortcut="V" active={effectiveTool === "select"} onClick={() => setTool("select")}>
            <MousePointer2 />
          </ToolButton>
          <ToolButton label="Hand" shortcut="H / Space" active={effectiveTool === "hand"} onClick={() => setTool("hand")}>
            <Hand />
          </ToolButton>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolButton label="Zoom out" onClick={() => zoomAt(view.zoom / 1.2)}>
            <Minus />
          </ToolButton>
          <button
            type="button"
            onClick={() => zoomAt(1)}
            title="Reset to 100%"
            className="h-7 w-12 rounded-md text-xs font-medium text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <ToolButton label="Zoom in" onClick={() => zoomAt(view.zoom * 1.2)}>
            <Plus />
          </ToolButton>
          <ToolButton label="Fit to screen" shortcut="⇧1" onClick={() => fitToScreen()}>
            <Maximize />
          </ToolButton>
        </div>
      </div>
    </section>
  )
}
