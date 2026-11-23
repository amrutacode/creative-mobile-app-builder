"use client"

import * as React from "react"

import { authClient, consumeSocialRedirect } from "@/lib/auth-client"
import { SignInDialog } from "@/components/home/sign-in-dialog"

const PENDING_PROMPT_KEY = "cloudhike.pendingPrompt"

function readStoredPrompt(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(PENDING_PROMPT_KEY)
  } catch {
    // sessionStorage can throw (e.g. Safari private browsing) - fall back to in-memory state.
    return null
  }
}

type AuthDialogContextValue = {
  openSignIn: (pendingPrompt?: string) => void
  pendingPrompt: string | null
  clearPendingPrompt: () => void
  socialError: string | null
  clearSocialError: () => void
}

const AuthDialogContext = React.createContext<AuthDialogContextValue | null>(null)

export function AuthDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  // Backed by sessionStorage, not just React state: social sign-in does a full
  // page navigation away and back, which would otherwise wipe the pending prompt.
  const [pendingPrompt, setPendingPromptState] = React.useState<string | null>(readStoredPrompt)
  const [socialError, setSocialError] = React.useState<string | null>(null)
  const { refetch } = authClient.useSession()

  const setPendingPrompt = React.useCallback((prompt: string | null) => {
    setPendingPromptState(prompt)
    if (typeof window === "undefined") return
    try {
      if (prompt === null) window.sessionStorage.removeItem(PENDING_PROMPT_KEY)
      else window.sessionStorage.setItem(PENDING_PROMPT_KEY, prompt)
    } catch {
      // sessionStorage can throw (e.g. Safari private browsing) - in-memory state above still updates.
    }
  }, [])

  const openSignIn = React.useCallback(
    (prompt?: string) => {
      if (prompt !== undefined) setPendingPrompt(prompt)
      setSocialError(null)
      setOpen(true)
    },
    [setPendingPrompt]
  )

  const clearPendingPrompt = React.useCallback(() => setPendingPrompt(null), [setPendingPrompt])
  const clearSocialError = React.useCallback(() => setSocialError(null), [])

  // Runs once on mount to catch the token (or error) CloudHike appends to the
  // URL fragment after a Google/GitHub redirect.
  React.useEffect(() => {
    const result = consumeSocialRedirect()
    if (!result) return
    if (result.token) {
      refetch()
      setOpen(false)
    } else {
      setSocialError("Sign-in was cancelled or failed. Please try again.")
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = React.useMemo(
    () => ({ openSignIn, pendingPrompt, clearPendingPrompt, socialError, clearSocialError }),
    [openSignIn, pendingPrompt, clearPendingPrompt, socialError, clearSocialError]
  )

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <SignInDialog open={open} onOpenChange={setOpen} />
    </AuthDialogContext.Provider>
  )
}

export function useAuthDialog() {
  const ctx = React.useContext(AuthDialogContext)
  if (!ctx) {
    throw new Error("useAuthDialog must be used within an AuthDialogProvider")
  }
  return ctx
}
