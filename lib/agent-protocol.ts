// Wire protocol between the workspace UI and /api/projects/[projectId]/agent.
// Shared by client and server, so keep this file free of server-only imports.

export type PlannedScreen = {
  id: string
  name: string
  purpose: string
  keyElements: string[]
}

export type AppTheme = {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
  style: string
}

export type AppPlan = {
  appName: string
  summary: string
  targetUsers: string
  coreFeatures: string[]
  navigation: string
  theme: AppTheme
  screens: PlannedScreen[]
}

export type GeneratedScreen = {
  id: string
  name: string
  summary: string
  html: string
}

/** A prior chat turn, as plain text. The server never trusts client-sent tool calls. */
export type TranscriptMessage = { role: "user" | "assistant"; content: string }

export type AgentRequest =
  | {
      /** Planning conversation: initial plan (empty transcript) or plan revisions. */
      mode: "chat"
      transcript: TranscriptMessage[]
      plan: AppPlan | null
    }
  | {
      /** Generate exactly one screen from a confirmed plan. */
      mode: "screen"
      plan: AppPlan
      screenId: string
      completed: { name: string; summary: string }[]
    }

/** Newline-delimited JSON events streamed back by the agent route. */
export type AgentEvent =
  | { type: "status"; label: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "text_delta"; delta: string }
  | { type: "plan"; plan: AppPlan }
  | { type: "confirmed" }
  | { type: "screen_progress"; chars: number }
  | { type: "screen"; screen: GeneratedScreen }
  | { type: "error"; message: string }
  | { type: "done" }

export type ProjectStatus =
  | "pending"
  | "planning"
  | "awaiting_confirmation"
  | "generating"
  | "ready"
  | "failed"
