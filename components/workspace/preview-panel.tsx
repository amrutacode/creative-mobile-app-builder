"use client"

import * as React from "react"
import {
  ChevronRight,
  Code2,
  ExternalLink,
  FileCode2,
  FileJson,
  Folder,
  FolderOpen,
  QrCode,
  RotateCw,
  Smartphone,
  Sparkles,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "@/components/ui/code-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_OPEN_FILE, DUMMY_FILE_TREE } from "./dummy-data"
import { PhoneFrame, ScreenHtml } from "./phone-mockup"
import type { GeneratedScreen } from "@/lib/agent-protocol"
import type { FileNode } from "./types"

/* -------------------------------------------------------------------------- */
/*                                 QR / Expo                                  */
/* -------------------------------------------------------------------------- */

// Decorative placeholder QR - NOT scannable. Replace with a real QR of the
// Expo dev-server URL (e.g. via the `qrcode` package) once builds are live.
function PlaceholderQr({ size = 176 }: { size?: number }) {
  const n = 25
  const cells = React.useMemo(() => {
    const out: [number, number][] = []
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
    let seed = 7
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (inFinder(x, y)) continue
        seed = (seed * 9301 + 49297) % 233280
        if (seed / 233280 > 0.52) out.push([x, y])
      }
    }
    return out
  }, [])
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} rx={1.6} fill="currentColor" />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={1.1} fill="white" />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.7} fill="currentColor" />
    </g>
  )
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} className="text-neutral-900" aria-hidden>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.2} fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  )
}

function ExpoQrDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500" />
        }
      >
        <QrCode />
        Scan QR
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run on your device</DialogTitle>
          <DialogDescription>
            Scan the QR code with Expo Go to open a live build of this app on your phone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0 rounded-2xl border border-border bg-white p-3">
            <div className="opacity-25 blur-[1.5px]">
              <PlaceholderQr size={150} />
            </div>
            <div className="absolute inset-3 flex flex-col items-center justify-center gap-1 rounded-lg bg-white/75 text-center">
              <Sparkles className="size-4 text-indigo-600" />
              <span className="px-4 text-xs font-medium text-foreground">
                Available after your first build
              </span>
            </div>
          </div>

          <ol className="space-y-3 text-sm">
            {[
              { title: "Install Expo Go", body: "Free on the App Store and Google Play." },
              { title: "Scan the code", body: "iOS: use the Camera app. Android: scan from Expo Go." },
              { title: "Test live", body: "Changes you make here reload on your device." },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
          <Smartphone className="size-3.5 shrink-0" />
          <span className="truncate">exp://— link will appear here —</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Preview                                   */
/* -------------------------------------------------------------------------- */

function AppPreview({ screens }: { screens: GeneratedScreen[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = screens.find((s) => s.id === selectedId) ?? screens[0]

  return (
    <div className="flex h-full min-h-0 flex-col">
      {screens.length > 0 && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border/70 bg-white px-3 py-2">
          {screens.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              aria-pressed={s.id === selected?.id}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                s.id === selected?.id
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5">
        <PhoneFrame className="aspect-[9/19] h-full max-h-[620px] w-auto max-w-full">
          {selected ? (
            <ScreenHtml key={selected.id} html={selected.html} title={`${selected.name} preview`} interactive />
          ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold text-neutral-900">Preview coming soon</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Your interactive app preview will run here once it&apos;s generated.
            </p>
          </div>
          )}
        </PhoneFrame>
      </div>

      {/* Test on device */}
      <div className="shrink-0 border-t border-border/70 bg-white p-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br from-indigo-50/60 to-white p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600">
            <Smartphone className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Test on your device</p>
            <p className="truncate text-xs text-muted-foreground">Scan with the Expo Go app</p>
          </div>
          <ExpoQrDialog />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    Code                                    */
/* -------------------------------------------------------------------------- */

function findFile(nodes: FileNode[], path: string): Extract<FileNode, { type: "file" }> | null {
  for (const node of nodes) {
    if (node.type === "file" && node.path === path) return node
    if (node.type === "folder") {
      const hit = findFile(node.children, path)
      if (hit) return hit
    }
  }
  return null
}

function collectFolders(nodes: FileNode[]): string[] {
  return nodes.flatMap((n) => (n.type === "folder" ? [n.path, ...collectFolders(n.children)] : []))
}

function sortNodes(nodes: FileNode[]) {
  // Folders first, then files, each alphabetical - like VS Code.
  return [...nodes].sort((a, b) =>
    a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name)
  )
}

function FileTree({
  nodes,
  depth = 0,
  openFolders,
  toggleFolder,
  activePath,
  onOpenFile,
}: {
  nodes: FileNode[]
  depth?: number
  openFolders: Set<string>
  toggleFolder: (path: string) => void
  activePath: string
  onOpenFile: (path: string) => void
}) {
  return (
    <ul role={depth === 0 ? "tree" : "group"}>
      {sortNodes(nodes).map((node) => {
        const padding = { paddingLeft: 8 + depth * 12 }
        if (node.type === "folder") {
          const open = openFolders.has(node.path)
          return (
            <li key={node.path} role="treeitem" aria-expanded={open}>
              <button
                type="button"
                onClick={() => toggleFolder(node.path)}
                style={padding}
                className="flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[13px] text-foreground hover:bg-muted"
              >
                <ChevronRight
                  className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
                />
                {open ? (
                  <FolderOpen className="size-4 shrink-0 text-indigo-500" />
                ) : (
                  <Folder className="size-4 shrink-0 text-indigo-500" />
                )}
                <span className="truncate">{node.name}</span>
              </button>
              {open && (
                <FileTree
                  nodes={node.children}
                  depth={depth + 1}
                  openFolders={openFolders}
                  toggleFolder={toggleFolder}
                  activePath={activePath}
                  onOpenFile={onOpenFile}
                />
              )}
            </li>
          )
        }
        const active = node.path === activePath
        const Icon = node.language === "json" ? FileJson : FileCode2
        return (
          <li key={node.path} role="treeitem" aria-selected={active}>
            <button
              type="button"
              onClick={() => onOpenFile(node.path)}
              style={{ paddingLeft: 8 + depth * 12 + 20 }}
              className={cn(
                "flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[13px]",
                active
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", node.language === "json" ? "text-amber-500" : "text-sky-500")} />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CodeView() {
  const [activePath, setActivePath] = React.useState(DEFAULT_OPEN_FILE)
  const [openFolders, setOpenFolders] = React.useState(() => new Set(collectFolders(DUMMY_FILE_TREE)))
  const file = findFile(DUMMY_FILE_TREE, activePath)

  function toggleFolder(path: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-48 shrink-0 flex-col border-r border-border/70 bg-neutral-50/60">
        <div className="flex h-9 shrink-0 items-center px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Files
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          <FileTree
            nodes={DUMMY_FILE_TREE}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activePath={activePath}
            onOpenFile={setActivePath}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {file ? (
          <>
            <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/70 px-3 text-xs text-muted-foreground">
              {file.path.split("/").map((part, i, arr) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="size-3 opacity-60" />}
                  <span className={cn(i === arr.length - 1 && "font-medium text-foreground")}>{part}</span>
                </React.Fragment>
              ))}
            </div>
            <CodeBlock size="sm" className="min-h-0 flex-1 rounded-none border-0">
              <CodeBlockActions>
                <CodeBlockCopyButton value={file.content} />
              </CodeBlockActions>
              <CodeBlockContent lineNumbers className="h-full text-[12px]">
                {file.content}
              </CodeBlockContent>
            </CodeBlock>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a file to view its code
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

// Placeholder actions - disabled until the live preview exists.
function IconAction({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} disabled className="text-muted-foreground">
      {children}
    </Button>
  )
}

export function PreviewPanel({ screens = [] }: { screens?: GeneratedScreen[] }) {
  return (
    <section aria-label="App preview" className="flex h-full min-h-0 flex-col bg-neutral-50">
      <Tabs defaultValue="preview" className="h-full min-h-0 gap-0">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 bg-white px-2">
          <TabsList variant="line" className="h-full">
            <TabsTrigger value="preview" className="px-2.5 data-active:text-indigo-700 after:bg-indigo-600!">
              <Smartphone />
              App Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="px-2.5 data-active:text-indigo-700 after:bg-indigo-600!">
              <Code2 />
              Code
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center">
            <IconAction label="Reload preview">
              <RotateCw />
            </IconAction>
            <IconAction label="Open in new tab">
              <ExternalLink />
            </IconAction>
          </div>
        </div>

        <TabsContent value="preview" className="min-h-0">
          <AppPreview screens={screens} />
        </TabsContent>
        <TabsContent value="code" className="min-h-0 bg-white">
          <CodeView />
        </TabsContent>
      </Tabs>
    </section>
  )
}
