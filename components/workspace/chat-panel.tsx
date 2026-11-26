"use client"

import * as React from "react"
import { ArrowUp, Check, Loader2, Paperclip, Sparkles } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import type { ChatMessage } from "./types"

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (state === "active") {
    return <Loader2 className="size-4 animate-spin text-indigo-600" />
  }
  return <span className="size-4 rounded-full border border-dashed border-neutral-300" />
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {message.attachments.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.url}
                alt={a.fileName}
                className="size-14 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm leading-relaxed text-foreground">{message.content}</p>
        {message.steps && (
          <ol className="space-y-2 rounded-xl border border-border bg-neutral-50/70 p-3">
            {message.steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2.5 text-[13px]">
                <StepIcon state={step.state} />
                <span
                  className={cn(
                    step.state === "pending" ? "text-muted-foreground" : "text-foreground",
                    step.state === "active" && "font-medium"
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export function ChatPanel({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = React.useState(initialMessages)
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  // Layout-only: messages are kept locally. The AI agent will be wired in later.
  function send() {
    const content = draft.trim()
    if (!content) return
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, role: "user", content },
      {
        id: `m-${Date.now()}-ai`,
        role: "assistant",
        content: "Thanks! The AI agent isn't connected yet — your message will be handled once building is live.",
      },
    ])
    setDraft("")
  }

  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <h2 className="text-sm font-semibold text-foreground">Chat</h2>
        <span className="text-xs text-muted-foreground">AppForge Agent</span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="shrink-0 p-3 pt-0">
        <div className="rounded-2xl border border-border bg-white p-1.5 shadow-lg shadow-indigo-950/5 transition-colors focus-within:border-indigo-300">
          <InputGroup className="h-auto border-0 focus-within:ring-0 has-disabled:bg-transparent has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupTextarea
              placeholder="Ask for changes, e.g. “Add a dark mode”"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              className="max-h-40 min-h-16 px-2 text-sm"
            />
            <InputGroupAddon align="block-end" className="justify-between">
              <InputGroupButton
                size="icon-sm"
                variant="ghost"
                className="rounded-full text-muted-foreground"
                aria-label="Attach file"
                disabled
              >
                <Paperclip />
              </InputGroupButton>
              <Button
                size="icon-sm"
                className={cn(
                  "rounded-full bg-indigo-600 text-white hover:bg-indigo-500",
                  !draft.trim() && "opacity-40"
                )}
                disabled={!draft.trim()}
                onClick={send}
                aria-label="Send message"
              >
                <ArrowUp />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </section>
  )
}
