"use client"

import * as React from "react"
import { ArrowUp, FileText, Paperclip, X } from "lucide-react"

import { cn } from "cn"
import { authClient } from "@/lib/auth-client"
import { useAuthDialog } from "@/components/providers/auth-dialog-provider"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentDescription,
} from "@/components/ui/attachment"

const SUGGESTIONS = [
  "A habit tracker with streaks and reminders",
  "A recipe app with meal planning",
  "A minimalist expense tracker",
  "A social app for book clubs",
  "A meditation timer with ambient sounds",
  "A local event discovery app",
]

type PendingFile = {
  id: string
  file: File
  previewUrl: string | null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Social sign-in navigates away and back (see signInWithSocial), which
// unmounts this component and loses any selected File objects - they can't
// be persisted the way the text prompt can. This flag records whether files
// were part of the submission that triggered sign-in, so the resume effect
// can tell "lost to a page reload" apart from "there were never any files."
const PENDING_HAD_FILES_KEY = "cloudhike.pendingHadFiles"

function readPendingHadFiles(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(PENDING_HAD_FILES_KEY) === "1"
  } catch {
    return false
  }
}

function writePendingHadFiles(hadFiles: boolean) {
  if (typeof window === "undefined") return
  try {
    if (hadFiles) window.sessionStorage.setItem(PENDING_HAD_FILES_KEY, "1")
    else window.sessionStorage.removeItem(PENDING_HAD_FILES_KEY)
  } catch {
    // sessionStorage unavailable - the resume effect just won't know files
    // were pending, which is the safe default (it won't block a resume).
  }
}

export function PromptComposer() {
  const { data: session } = authClient.useSession()
  const { openSignIn, pendingPrompt, clearPendingPrompt } = useAuthDialog()
  const [prompt, setPrompt] = React.useState("")
  const [files, setFiles] = React.useState<PendingFile[]>([])
  const [attachmentsLostNotice, setAttachmentsLostNotice] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    return () => {
      files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resume the prompt the user was submitting once they finish signing in.
  React.useEffect(() => {
    if (session?.user && pendingPrompt !== null) {
      if (readPendingHadFiles() && files.length === 0) {
        // Files didn't survive the social sign-in redirect - restore the
        // text and ask the user to re-attach rather than silently
        // generating without the assets they intended to include.
        setPrompt(pendingPrompt)
        setAttachmentsLostNotice(true)
      } else {
        runGenerate(pendingPrompt)
      }
      clearPendingPrompt()
      writePendingHadFiles(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, pendingPrompt])

  function handleFilesSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return
    const next: PendingFile[] = Array.from(selected).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }))
    setFiles((prev) => [...prev, ...next])
    setAttachmentsLostNotice(false)
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  function runGenerate(value: string) {
    // TODO: wire up to the app-generation backend.
    setPrompt("")
    files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
    setFiles([])
  }

  function handleSubmit() {
    if (!prompt.trim() && files.length === 0) return
    if (!session?.user) {
      writePendingHadFiles(files.length > 0)
      openSignIn(prompt)
      return
    }
    runGenerate(prompt)
  }

  const canSubmit = prompt.trim().length > 0 || files.length > 0

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-white p-2 shadow-xl shadow-indigo-950/5">
        {files.length > 0 && (
          <AttachmentGroup className="px-2 pt-1 pb-2">
            {files.map(({ id, file, previewUrl }) => (
              <Attachment key={id} size="sm">
                <AttachmentMedia variant={previewUrl ? "image" : "icon"}>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} />
                  ) : (
                    <FileText />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>{formatSize(file.size)}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(id)}
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
        )}

        <InputGroup className="h-auto border-0 focus-within:ring-0">
          <InputGroupTextarea
            placeholder="Describe the app you want to build..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            className="min-h-24 px-2.5 text-base"
          />
          <InputGroupAddon align="block-end" className="justify-between">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files)
                e.target.value = ""
              }}
            />
            <InputGroupButton
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
              Attach
            </InputGroupButton>
            <Button
              size="icon"
              className={cn(
                "rounded-full bg-indigo-600 hover:bg-indigo-500",
                !canSubmit && "opacity-40"
              )}
              disabled={!canSubmit}
              onClick={handleSubmit}
              aria-label="Generate app"
            >
              <ArrowUp />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {attachmentsLostNotice && (
        <p role="alert" className="mt-3 text-center text-sm text-destructive">
          Your attachments couldn&apos;t be carried over after signing in — please re-attach them and send again.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setPrompt(suggestion)}
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
