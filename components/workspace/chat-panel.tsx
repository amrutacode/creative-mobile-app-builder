"use client"

import * as React from "react"
import {
  AlertCircle,
  ArrowUp,
  Brain,
  Check,
  ChevronDown,
  Loader2,
  Paperclip,
  Pencil,
  RotateCw,
  Smartphone,
  Sparkles,
  Square,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import type { AppPlan } from "@/lib/agent-protocol"
import type { ChatMessage } from "./types"
import type { AppAgent } from "./use-app-agent"

/* -------------------------------------------------------------------------- */
/*                              Tiny Markdown view                            */
/* -------------------------------------------------------------------------- */

function renderInline(text: string): React.ReactNode[] {
  // **bold** and `code` only; everything else stays plain text (no HTML injection).
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[12px]">{part.slice(1, -1)}</code>
    }
    return part
  })
}

function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n")
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0])
          const List = ordered ? "ol" : "ul"
          return (
            <List key={i} className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
              ))}
            </List>
          )
        }
        const heading = block.match(/^#{1,4}\s+(.*)$/)
        if (heading && lines.length === 1) {
          return <p key={i} className="font-semibold">{renderInline(heading[1])}</p>
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block)}
          </p>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Pieces                                    */
/* -------------------------------------------------------------------------- */

type StepState = "done" | "active" | "pending"

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (state === "active") return <Loader2 className="size-4 shrink-0 animate-spin text-indigo-600" />
  return <span className="size-4 shrink-0 rounded-full border border-dashed border-neutral-300" />
}

function StatusLine({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin text-indigo-600" />
      <span className="animate-pulse">{label}</span>
    </div>
  )
}

function Thinking({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const expanded = open || streaming
  return (
    <div className="rounded-lg border border-border/70 bg-neutral-50/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
        aria-expanded={expanded}
      >
        <Brain className="size-3.5" />
        {streaming ? "Thinking…" : "Thought process"}
        <ChevronDown className={cn("ml-auto size-3.5 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <p className="max-h-40 overflow-y-auto px-2.5 pb-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {text}
        </p>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  variant,
  screenStates,
  onConfirm,
  onRequestChanges,
}: {
  plan: AppPlan
  /** active: awaiting confirmation · approved: build started · superseded: an older plan */
  variant: "active" | "approved" | "superseded" | "draft"
  screenStates: Record<string, StepState>
  onConfirm: () => void
  onRequestChanges: () => void
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const swatches = [plan.theme.primaryColor, plan.theme.accentColor, plan.theme.backgroundColor, plan.theme.textColor]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white",
        variant === "superseded" ? "border-border opacity-60" : "border-indigo-200 shadow-sm shadow-indigo-950/5"
      )}
    >
      <div className="border-b border-border/70 bg-gradient-to-br from-indigo-50/80 to-white px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{plan.appName}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              variant === "approved" && "bg-emerald-100 text-emerald-700",
              variant === "active" && "bg-amber-100 text-amber-700",
              variant === "superseded" && "bg-muted text-muted-foreground",
              variant === "draft" && "bg-indigo-100 text-indigo-700"
            )}
          >
            {variant === "approved" ? "Approved" : variant === "active" ? "Needs review" : variant === "superseded" ? "Previous plan" : "Draft"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex -space-x-1">
            {swatches.map((c, i) => (
              <span key={i} className="size-4 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
            ))}
          </div>
          <span className="truncate text-[11px] text-muted-foreground">
            {plan.theme.fontFamily} · {plan.theme.style}
          </span>
        </div>
      </div>

      <div className="px-3.5 py-3">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {plan.screens.length} screens
        </p>
        <ol className="space-y-1">
          {plan.screens.map((screen, i) => {
            const isOpen = expanded === screen.id
            const state = screenStates[screen.id]
            return (
              <li key={screen.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : screen.id)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-muted/60"
                  aria-expanded={isOpen}
                >
                  {state ? (
                    <span className="mt-0.5"><StepIcon state={state} /></span>
                  ) : (
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                      {i + 1}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground">{screen.name}</span>
                    <span className={cn("block text-xs text-muted-foreground", !isOpen && "line-clamp-1")}>
                      {screen.purpose}
                    </span>
                  </span>
                  <ChevronDown className={cn("mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <ul className="mt-1 mb-1.5 ml-8 list-disc space-y-0.5 pl-3 text-xs text-muted-foreground">
                    {screen.keyElements.map((el) => (
                      <li key={el}>{el}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
        <p className="mt-2.5 border-t border-border/70 pt-2.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Navigation:</span> {plan.navigation}
        </p>
      </div>

      {variant === "active" && (
        <div className="flex gap-2 border-t border-border/70 bg-neutral-50/70 p-2.5">
          <Button size="sm" className="flex-1 bg-indigo-600 text-white hover:bg-indigo-500" onClick={onConfirm}>
            <Check />
            Confirm & build
          </Button>
          <Button size="sm" variant="outline" onClick={onRequestChanges}>
            <Pencil />
            Request changes
          </Button>
        </div>
      )}
    </div>
  )
}

function ScreenBuildMessage({ message, name, index, total }: { message: ChatMessage; name: string; index: number; total: number }) {
  const done = Boolean(message.summary)
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
          <Smartphone className="size-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{name}</p>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {index + 1}/{total}
        </span>
        {done ? <StepIcon state="done" /> : message.streaming ? <StepIcon state="active" /> : null}
      </div>
      {message.content && <p className="mt-2 text-[13px] leading-relaxed text-foreground">{message.content}</p>}
      {message.streaming && message.progressChars ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
          Writing markup · {(message.progressChars / 1000).toFixed(1)}k characters
        </p>
      ) : null}
      {done && <p className="mt-1.5 text-xs text-emerald-700">Ready on the canvas: {message.summary}</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Messages                                  */
/* -------------------------------------------------------------------------- */

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {message.attachments.map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.id} src={a.url} alt={a.fileName} className="size-14 rounded-lg border border-border object-cover" />
          ))}
        </div>
      )}
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
        {message.content}
      </div>
    </div>
  )
}

function AssistantMessage({
  message,
  agent,
  onRequestChanges,
  isLast,
}: {
  message: ChatMessage
  agent: AppAgent
  onRequestChanges: () => void
  isLast: boolean
}) {
  const { plan, planMessageId, confirmed, phase, screens, generatingId } = agent
  const screenIndex = message.screenId ? (plan?.screens.findIndex((s) => s.id === message.screenId) ?? -1) : -1

  const screenStates = React.useMemo(() => {
    const states: Record<string, StepState> = {}
    if (!confirmed || !plan) return states
    for (const s of plan.screens) {
      states[s.id] = screens.some((x) => x.id === s.id) ? "done" : generatingId === s.id ? "active" : "pending"
    }
    return states
  }, [confirmed, generatingId, plan, screens])

  const planVariant =
    message.id !== planMessageId
      ? "superseded"
      : message.streaming
        ? "draft"
        : confirmed
          ? "approved"
          : phase === "awaiting_confirmation"
            ? "active"
            : "draft"

  const canRetry = isLast && phase !== "planning" && phase !== "generating"

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {message.thinking && <Thinking text={message.thinking} streaming={message.streaming && !message.content} />}

        {message.screenId && plan ? (
          <ScreenBuildMessage
            message={message}
            name={plan.screens[screenIndex]?.name ?? "Screen"}
            index={Math.max(screenIndex, 0)}
            total={plan.screens.length}
          />
        ) : (
          message.content && <Markdown text={message.content} />
        )}

        {message.plan && (
          <PlanCard
            plan={message.plan}
            variant={planVariant}
            screenStates={message.id === planMessageId ? screenStates : {}}
            onConfirm={agent.confirmPlan}
            onRequestChanges={onRequestChanges}
          />
        )}

        {message.footer?.trim() && <Markdown text={message.footer} />}

        {message.streaming && message.status && <StatusLine label={message.status} />}

        {message.error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{message.error}</span>
            {canRetry && (
              <button type="button" onClick={agent.retry} className="inline-flex items-center gap-1 font-medium hover:underline">
                <RotateCw className="size-3.5" />
                {phase === "paused" ? "Resume" : "Retry"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    Panel                                   */
/* -------------------------------------------------------------------------- */

const PLACEHOLDERS: Record<AppAgent["phase"], string> = {
  idle: "Describe what you'd like to build…",
  planning: "The agent is planning…",
  awaiting_confirmation: "Reply with changes, or confirm the plan above…",
  generating: "The agent is building your screens…",
  paused: "Ask for changes, or resume the build…",
  ready: "Ask for changes, e.g. “Add a settings screen”",
}

export function ChatPanel({ agent }: { agent: AppAgent }) {
  const { messages, phase, isBusy } = agent
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const stickToBottom = React.useRef(true)

  // Follow streaming output unless the user scrolled up to read something.
  const last = messages[messages.length - 1]
  const followKey = `${messages.length}:${last?.content.length}:${last?.footer?.length}:${last?.thinking?.length}:${last?.status}:${last?.plan ? 1 : 0}`
  React.useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight })
  }, [followKey])

  function send() {
    const content = draft.trim()
    if (!content || isBusy) return
    stickToBottom.current = true
    agent.send(content)
    setDraft("")
  }

  function requestChanges() {
    inputRef.current?.focus()
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id

  return (
    <section aria-label="Chat" className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <h2 className="text-sm font-semibold text-foreground">Chat</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", isBusy ? "animate-pulse bg-indigo-500" : "bg-emerald-500")} />
          AppForge Agent
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5"
      >
        {messages.map((m) =>
          m.role === "user" ? (
            <UserBubble key={m.id} message={m} />
          ) : (
            <AssistantMessage
              key={m.id}
              message={m}
              agent={agent}
              onRequestChanges={requestChanges}
              isLast={m.id === lastAssistantId}
            />
          )
        )}
      </div>

      <div className="shrink-0 p-3 pt-0">
        <div className="rounded-2xl border border-border bg-white p-1.5 shadow-lg shadow-indigo-950/5 transition-colors focus-within:border-indigo-300">
          <InputGroup className="h-auto border-0 focus-within:ring-0 has-disabled:bg-transparent has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupTextarea
              ref={inputRef}
              placeholder={PLACEHOLDERS[phase]}
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
              {isBusy ? (
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={agent.stop}
                  aria-label="Stop the agent"
                >
                  <Square className="size-3 fill-current" />
                </Button>
              ) : (
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
              )}
            </InputGroupAddon>
          </InputGroup>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {isBusy ? "The agent is working. Press stop to interrupt." : "Enter to send · Shift + Enter for a new line"}
        </p>
      </div>
    </section>
  )
}
