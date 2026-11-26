"use client"

import * as React from "react"

import { getStoredToken } from "@/lib/auth-client"
import type {
  AgentEvent,
  AgentRequest,
  AppPlan,
  GeneratedScreen,
  PlannedScreen,
  ProjectStatus,
  TranscriptMessage,
} from "@/lib/agent-protocol"
import type { ChatMessage, WorkspaceAsset, WorkspaceProject } from "./types"

export type AgentPhase =
  | "idle"
  | "planning" // agent is writing / revising the plan
  | "awaiting_confirmation" // plan shown, waiting for the user
  | "generating" // building screens one by one
  | "paused" // build stopped by the user or by an error
  | "ready" // every planned screen is built

type StoredScreen = GeneratedScreen & { signature: string }

type AgentState = {
  messages: ChatMessage[]
  plan: AppPlan | null
  /** Message that holds the most recent plan card (the only one with actions). */
  planMessageId: string | null
  confirmed: boolean
  screens: StoredScreen[]
  generatingId: string | null
  phase: AgentPhase
}

const INITIAL_STATE: AgentState = {
  messages: [],
  plan: null,
  planMessageId: null,
  confirmed: false,
  screens: [],
  generatingId: null,
  phase: "idle",
}

const storageKey = (projectId: string) => `appforge:agent:v1:${projectId}`
const newId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** A screen is rebuilt after a plan revision only if its spec or the theme changed. */
function screenSignature(plan: AppPlan, screen: PlannedScreen) {
  return JSON.stringify([plan.theme, plan.navigation, screen.name, screen.purpose, screen.keyElements])
}

/* ------------------------------ Persistence ------------------------------ */

function loadState(projectId: string): AgentState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId))
    if (!raw) return null
    const saved = JSON.parse(raw) as AgentState
    // Anything mid-stream when the page closed is no longer streaming.
    const messages = saved.messages
      .map((m) => (m.streaming ? { ...m, streaming: false, status: undefined } : m))
      .filter((m) => m.role === "user" || m.content || m.footer || m.plan || m.summary || m.error)
    return { ...INITIAL_STATE, ...saved, messages, generatingId: null }
  } catch {
    return null
  }
}

function saveState(projectId: string, state: AgentState) {
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(state))
  } catch {
    // Storage full or blocked: the session still works, it just won't survive a reload.
  }
}

/* -------------------------------- Network -------------------------------- */

async function streamAgent(
  projectId: string,
  body: AgentRequest,
  signal: AbortSignal,
  onEvent: (event: AgentEvent) => void
) {
  const token = getStoredToken()
  const res = await fetch(`/api/projects/${projectId}/agent`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token ?? ""}` },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? "Couldn't reach the AI agent. Please try again.")
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  let finished = false
  const handleLine = (line: string) => {
    if (!line.trim()) return
    const event = JSON.parse(line) as AgentEvent
    if (event.type === "done" || event.type === "error") finished = true
    onEvent(event)
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let newline: number
    while ((newline = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
    }
  }
  handleLine(buffer)
  if (!finished && !signal.aborted) {
    onEvent({ type: "error", message: "The connection to the agent was interrupted. Please try again." })
  }
}

function toTranscript(messages: ChatMessage[]): TranscriptMessage[] {
  const out: TranscriptMessage[] = []
  for (const m of messages) {
    if (m.screenId || m.error) continue
    let content = m.content.trim()
    if (m.plan) {
      content += `\n\n[Presented plan "${m.plan.appName}" with screens: ${m.plan.screens
        .map((s) => s.name)
        .join(", ")}]`
    }
    if (m.footer) content += `\n\n${m.footer.trim()}`
    if (content.trim()) out.push({ role: m.role, content: content.trim().slice(0, 8000) })
  }
  return out.slice(-60)
}

/* ---------------------------------- Hook ---------------------------------- */

export function useAppAgent(project: WorkspaceProject, assets: WorkspaceAsset[]) {
  const [state, setState] = React.useState<AgentState>(() => loadState(project.id) ?? INITIAL_STATE)
  // The ref is the source of truth so async loops always read the latest state;
  // React state mirrors it for rendering.
  const stateRef = React.useRef(state)
  const abortRef = React.useRef<AbortController | null>(null)

  const update = React.useCallback((fn: (s: AgentState) => AgentState) => {
    const next = fn(stateRef.current)
    stateRef.current = next
    setState(next)
  }, [])

  const patchMessage = React.useCallback(
    (id: string, fn: (m: ChatMessage) => Partial<ChatMessage>) => {
      update((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, ...fn(m) } : m)) }))
    },
    [update]
  )

  /* ------------------------------ Build loop ------------------------------ */

  const build = React.useCallback(async () => {
    const plan = stateRef.current.plan
    if (!plan || stateRef.current.phase === "generating") return

    // Keep screens whose spec didn't change; rebuild changed/new ones; drop removed ones.
    update((s) => ({
      ...s,
      confirmed: true,
      phase: "generating",
      screens: s.screens.filter((done) => {
        const planned = plan.screens.find((p) => p.id === done.id)
        return planned && screenSignature(plan, planned) === done.signature
      }),
    }))

    for (const [index, screen] of plan.screens.entries()) {
      if (stateRef.current.screens.some((s) => s.id === screen.id)) continue

      const controller = new AbortController()
      abortRef.current = controller
      const messageId = newId()
      update((s) => ({
        ...s,
        generatingId: screen.id,
        messages: [
          ...s.messages,
          {
            id: messageId,
            role: "assistant",
            content: "",
            screenId: screen.id,
            streaming: true,
            status: `Starting ${screen.name} (${index + 1}/${plan.screens.length})…`,
          },
        ],
      }))

      let failed: string | null = null
      try {
        const completed = plan.screens
          .map((p) => stateRef.current.screens.find((s) => s.id === p.id))
          .filter((s): s is StoredScreen => Boolean(s))
          .map((s) => ({ name: s.name, summary: s.summary }))

        await streamAgent(
          project.id,
          { mode: "screen", plan, screenId: screen.id, completed },
          controller.signal,
          (event) => {
            switch (event.type) {
              case "status":
                patchMessage(messageId, () => ({ status: event.label }))
                break
              case "thinking_delta":
                patchMessage(messageId, (m) => ({ thinking: (m.thinking ?? "") + event.delta }))
                break
              case "text_delta":
                patchMessage(messageId, (m) => ({ content: m.content + event.delta }))
                break
              case "screen_progress":
                patchMessage(messageId, () => ({ progressChars: event.chars }))
                break
              case "screen":
                update((s) => ({
                  ...s,
                  screens: [
                    ...s.screens.filter((x) => x.id !== event.screen.id),
                    { ...event.screen, signature: screenSignature(plan, screen) },
                  ],
                }))
                patchMessage(messageId, () => ({ summary: event.screen.summary }))
                break
              case "error":
                failed = event.message
                break
            }
          }
        )
      } catch (err) {
        if (!controller.signal.aborted) failed = (err as Error).message
      }

      const stopped = controller.signal.aborted
      patchMessage(messageId, () => ({
        streaming: false,
        status: undefined,
        error: failed ?? (stopped ? "Stopped." : undefined),
      }))
      if (failed || stopped || !stateRef.current.screens.some((s) => s.id === screen.id)) {
        if (!failed && !stopped) {
          patchMessage(messageId, () => ({ error: `The ${screen.name} screen wasn't saved. Try again.` }))
        }
        update((s) => ({ ...s, phase: "paused", generatingId: null }))
        return
      }
    }

    update((s) => ({
      ...s,
      phase: "ready",
      generatingId: null,
      messages: [
        ...s.messages,
        {
          id: newId(),
          role: "assistant",
          content: `All ${plan.screens.length} screens of **${plan.appName}** are ready on the canvas. Tell me if you'd like to change anything, for example a new screen, a different color scheme or a layout tweak.`,
        },
      ],
    }))
  }, [patchMessage, project.id, update])

  /* ---------------------------- Planning chat ----------------------------- */

  const chat = React.useCallback(
    async (userText?: string) => {
      const current = stateRef.current
      if (current.phase === "planning" || current.phase === "generating") return

      const userMessage: ChatMessage | null = userText
        ? { id: newId(), role: "user", content: userText }
        : null
      const transcript = toTranscript(userMessage ? [...current.messages, userMessage] : current.messages)
      const assistantId = newId()
      const controller = new AbortController()
      abortRef.current = controller

      update((s) => ({
        ...s,
        phase: "planning",
        messages: [
          ...s.messages,
          ...(userMessage ? [userMessage] : []),
          { id: assistantId, role: "assistant", content: "", streaming: true, status: "Connecting to the agent…" },
        ],
      }))

      let confirmed = false
      let failed: string | null = null
      try {
        await streamAgent(
          project.id,
          { mode: "chat", transcript, plan: current.plan },
          controller.signal,
          (event) => {
            switch (event.type) {
              case "status":
                patchMessage(assistantId, () => ({ status: event.label }))
                break
              case "thinking_delta":
                patchMessage(assistantId, (m) => ({ thinking: (m.thinking ?? "") + event.delta }))
                break
              case "text_delta":
                // Text after the plan card (e.g. "Confirm to start building") goes below it.
                patchMessage(assistantId, (m) =>
                  m.plan ? { footer: (m.footer ?? "") + event.delta } : { content: m.content + event.delta }
                )
                break
              case "plan":
                update((s) => ({ ...s, plan: event.plan, planMessageId: assistantId, confirmed: false }))
                patchMessage(assistantId, () => ({ plan: event.plan, status: "Plan ready" }))
                break
              case "confirmed":
                confirmed = true
                break
              case "error":
                failed = event.message
                break
            }
          }
        )
      } catch (err) {
        if (!controller.signal.aborted) failed = (err as Error).message
      }

      const stopped = controller.signal.aborted
      patchMessage(assistantId, () => ({
        streaming: false,
        status: undefined,
        error: failed ?? (stopped ? "Stopped." : undefined),
      }))
      const s = stateRef.current
      const nextPhase: AgentPhase = !s.plan
        ? "idle"
        : s.confirmed && s.screens.length === s.plan.screens.length
          ? "ready"
          : "awaiting_confirmation"
      update((prev) => ({ ...prev, phase: nextPhase }))

      if (confirmed && !failed && !stopped) void build()
    },
    [build, patchMessage, project.id, update]
  )

  /* ------------------------------- Actions -------------------------------- */

  const confirmPlan = React.useCallback(() => {
    const s = stateRef.current
    if (!s.plan || s.phase !== "awaiting_confirmation") return
    update((prev) => ({
      ...prev,
      messages: [...prev.messages, { id: newId(), role: "user", content: "Looks good, start building!" }],
    }))
    void build()
  }, [build, update])

  const stop = React.useCallback(() => abortRef.current?.abort(), [])

  const retry = React.useCallback(() => {
    const s = stateRef.current
    if (s.phase === "paused" && s.plan) void build()
    else if (s.phase === "idle" || s.phase === "awaiting_confirmation" || s.phase === "ready") {
      // Re-run the last planning turn: drop the failed reply and the user message that caused it.
      const lastUserIndex = s.messages.findLastIndex((m) => m.role === "user")
      const lastUser = lastUserIndex >= 0 ? s.messages[lastUserIndex] : null
      update((prev) => ({
        ...prev,
        messages: lastUser ? prev.messages.slice(0, lastUserIndex) : prev.messages.filter((m) => !m.error),
      }))
      void chat(lastUser?.content)
    }
  }, [build, chat, update])

  const send = React.useCallback(
    (text: string) => {
      const content = text.trim()
      if (content) void chat(content)
    },
    [chat]
  )

  /* -------------------------- Boot & persistence -------------------------- */

  // Kick off (or resume) the agent once when the workspace opens.
  const bootedRef = React.useRef(false)
  React.useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    const s = stateRef.current
    if (s.messages.length === 0 && !s.plan) void chat()
    else if (s.phase === "planning") {
      update((prev) => ({ ...prev, phase: prev.plan ? "awaiting_confirmation" : "idle" }))
      if (!s.plan) void chat()
    } else if (s.phase === "generating") {
      update((prev) => ({ ...prev, phase: "paused" }))
      void build()
    }
  }, [build, chat, update])

  // Abort in-flight work on real unmount (deferred so StrictMode's dev remount doesn't abort it).
  const mountedRef = React.useRef(false)
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      setTimeout(() => {
        if (!mountedRef.current) abortRef.current?.abort()
      }, 0)
    }
  }, [])

  // Persist at meaningful checkpoints rather than on every streamed token.
  const isStreaming = state.phase === "planning" || state.phase === "generating"
  React.useEffect(() => {
    saveState(project.id, stateRef.current)
  }, [project.id, state.phase, state.plan, state.screens.length, state.messages.length, isStreaming])

  /* -------------------------------- Output -------------------------------- */

  const messages = React.useMemo<ChatMessage[]>(
    () => [
      {
        id: "m-initial-prompt",
        role: "user",
        content: project.prompt || "Build me a mobile app.",
        attachments: assets,
      },
      ...state.messages,
    ],
    [assets, project.prompt, state.messages]
  )

  const status: ProjectStatus | "paused" =
    state.phase === "idle"
      ? "pending"
      : state.phase === "paused"
        ? "paused"
        : state.phase

  return {
    messages,
    plan: state.plan,
    planMessageId: state.planMessageId,
    confirmed: state.confirmed,
    screens: state.screens as GeneratedScreen[],
    generatingId: state.generatingId,
    phase: state.phase,
    status,
    isBusy: isStreaming,
    send,
    confirmPlan,
    stop,
    retry,
  }
}

export type AppAgent = ReturnType<typeof useAppAgent>
