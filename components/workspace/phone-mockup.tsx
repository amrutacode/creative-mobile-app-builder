"use client"

import * as React from "react"
import { cn } from "cn"
import { Bell, Heart, Home, Search, Settings, User } from "lucide-react"

import type { CanvasScreen } from "./types"

// A device frame, the skeleton UI used while a screen is still being built,
// and the sandboxed renderer for generated screens.

export function PhoneFrame({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[2.25rem] border-[6px] border-neutral-900 bg-white shadow-2xl shadow-indigo-950/15",
        className
      )}
    >
      {/* Status bar + dynamic island */}
      <div className="relative flex h-8 shrink-0 items-center justify-between px-6 text-[10px] font-semibold text-neutral-900">
        <span>9:41</span>
        <span className="absolute top-1.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-[2px] bg-neutral-900" />
        </span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
      {/* Home indicator */}
      <div className="flex h-5 shrink-0 items-center justify-center">
        <span className="h-1 w-24 rounded-full bg-neutral-900/80" />
      </div>
    </div>
  )
}

function Bar({ className }: { className?: string }) {
  return <div className={cn("h-2.5 rounded-full bg-neutral-200", className)} />
}

function TabBar({ active = 0 }: { active?: number }) {
  const icons = [Home, Search, Heart, User]
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-around border-t border-neutral-100 bg-white">
      {icons.map((Icon, i) => (
        <Icon
          key={i}
          className={cn("size-5", i === active ? "text-indigo-600" : "text-neutral-300")}
        />
      ))}
    </div>
  )
}

export function ScreenSkeleton({ variant }: { variant: CanvasScreen["variant"] }) {
  switch (variant) {
    case "home":
      return (
        <div className="h-full px-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Bar className="h-2 w-16" />
              <Bar className="h-4 w-28 bg-neutral-300" />
            </div>
            <Bell className="size-5 text-neutral-300" />
          </div>
          <div className="mt-4 h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 p-4">
            <div className="h-2.5 w-20 rounded-full bg-white/60" />
            <div className="mt-2 h-4 w-32 rounded-full bg-white/90" />
            <div className="mt-6 h-6 w-20 rounded-full bg-white/30" />
          </div>
          <Bar className="mt-5 w-24 bg-neutral-300" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-neutral-100 p-3">
                <div className="size-7 rounded-lg bg-indigo-100" />
                <Bar className="mt-3 w-14" />
                <Bar className="mt-1.5 h-2 w-10 bg-neutral-100" />
              </div>
            ))}
          </div>
          <TabBar active={0} />
        </div>
      )
    case "list":
      return (
        <div className="h-full px-4 pt-2">
          <Bar className="h-4 w-24 bg-neutral-300" />
          <div className="mt-3 flex h-9 items-center gap-2 rounded-xl bg-neutral-100 px-3">
            <Search className="size-3.5 text-neutral-400" />
            <Bar className="h-2 w-20 bg-neutral-200" />
          </div>
          <div className="mt-3 flex gap-2">
            {["w-12 bg-indigo-600", "w-14", "w-10"].map((c, i) => (
              <div key={i} className={cn("h-6 rounded-full bg-neutral-100", c)} />
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-12 shrink-0 rounded-xl bg-neutral-100" />
                <div className="flex-1 space-y-1.5">
                  <Bar className="w-3/4" />
                  <Bar className="h-2 w-1/2 bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
          <TabBar active={1} />
        </div>
      )
    case "detail":
      return (
        <div className="h-full">
          <div className="h-44 bg-gradient-to-br from-violet-200 to-indigo-100" />
          <div className="-mt-5 h-full rounded-t-3xl bg-white px-4 pt-5">
            <Bar className="h-4 w-36 bg-neutral-300" />
            <Bar className="mt-2 h-2 w-20 bg-neutral-100" />
            <div className="mt-4 space-y-2">
              <Bar className="h-2 w-full bg-neutral-100" />
              <Bar className="h-2 w-full bg-neutral-100" />
              <Bar className="h-2 w-2/3 bg-neutral-100" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-neutral-50" />
              ))}
            </div>
            <div className="mt-6 h-11 rounded-xl bg-indigo-600" />
          </div>
        </div>
      )
    case "profile":
      return (
        <div className="h-full px-4 pt-4">
          <div className="flex flex-col items-center">
            <div className="size-16 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            <Bar className="mt-3 h-3 w-24 bg-neutral-300" />
            <Bar className="mt-1.5 h-2 w-16 bg-neutral-100" />
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-100 py-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Bar className="h-3 w-6 bg-neutral-300" />
                <Bar className="h-2 w-10 bg-neutral-100" />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            {[User, Bell, Heart, Settings].map((Icon, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-1 py-2.5">
                <Icon className="size-4 text-neutral-400" />
                <Bar className="w-28" />
              </div>
            ))}
          </div>
          <TabBar active={3} />
        </div>
      )
  }
}

/** Width the agent designs screens for; scaled down to fit the frame. */
const DESIGN_WIDTH = 390

/**
 * Renders agent-generated HTML in a fully sandboxed iframe (no scripts, no
 * same-origin access), scaled from a 390px design width to fit its container.
 */
export function ScreenHtml({
  html,
  title,
  interactive = false,
}: {
  html: string
  title: string
  interactive?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = size.width / DESIGN_WIDTH

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-white">
      {size.width > 0 && (
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          referrerPolicy="no-referrer"
          className={cn("origin-top-left border-0", !interactive && "pointer-events-none")}
          style={{
            width: DESIGN_WIDTH,
            height: size.height / scale,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  )
}
