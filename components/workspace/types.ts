// Shared workspace types. Placeholder data lives in ./dummy-data.ts until the
// AI build pipeline produces real screens, files and chat history.

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
  /** Optional build plan rendered as a checklist under an assistant message. */
  steps?: { label: string; state: "done" | "active" | "pending" }[]
  attachments?: WorkspaceAsset[]
}

export type CanvasScreen = {
  id: string
  name: string
  x: number
  y: number
  /** Which placeholder layout to draw until real screens are generated. */
  variant: "home" | "list" | "detail" | "profile"
}

export type FileNode =
  | { type: "folder"; name: string; path: string; children: FileNode[] }
  | { type: "file"; name: string; path: string; language: string; content: string }
