// Shared workspace types. The code view still uses placeholder files from
// ./dummy-data.ts; chat, plan and screens come from the AI agent.

import type { AppPlan } from "@/lib/agent-protocol"

export type WorkspaceProject = {
  id: string
  name: string
  prompt: string
  status: string
  createdAt: string
}

export type WorkspaceAsset = { id: string; fileName: string; url: string }

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  attachments?: WorkspaceAsset[]
  /** Plan presented by the agent in this message (rendered as a plan card). */
  plan?: AppPlan
  /** Text the agent streamed after presenting the plan (rendered below the card). */
  footer?: string
  /** Streamed reasoning summary, shown in a collapsible "thought process". */
  thinking?: string
  /** Live status label while the agent works on this message. */
  status?: string
  streaming?: boolean
  error?: string
  /** Set on per-screen build messages. */
  screenId?: string
  /** Characters of screen markup written so far (screen messages). */
  progressChars?: number
  /** Summary of a finished screen (screen messages). */
  summary?: string
}

export type ScreenBuildState = "queued" | "generating" | "ready"

export type CanvasScreen = {
  id: string
  name: string
  x: number
  y: number
  /** Which placeholder layout to draw until the real screen exists. */
  variant: "home" | "list" | "detail" | "profile"
  /** Generated HTML mockup, once available. */
  html?: string
  buildState?: ScreenBuildState
  /** Added by the user (e.g. duplicated) rather than by the agent. */
  userCreated?: boolean
  renamed?: boolean
}

export type FileNode =
  | { type: "folder"; name: string; path: string; children: FileNode[] }
  | { type: "file"; name: string; path: string; language: string; content: string }
