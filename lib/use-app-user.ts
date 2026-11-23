"use client"

import * as React from "react"

import { authClient, getStoredToken } from "@/lib/auth-client"

export type AppUser = {
  id: string
  email: string
  name: string | null
  credits: number
}

export function useAppUser() {
  const { data: session, isPending } = authClient.useSession()
  const [appUser, setAppUser] = React.useState<AppUser | null>(null)
  const userId = session?.user?.id

  React.useEffect(() => {
    // Clear on every identity change (not just sign-out) so switching
    // accounts never leaves the previous user's data on screen while the
    // new sync request is in flight.
    setAppUser(null)
    if (!userId) return

    let cancelled = false
    const token = getStoredToken()
    if (!token) return

    fetch("/api/auth/sync", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setAppUser(data.user as AppUser)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [userId])

  return {
    session,
    isPending,
    appUser: appUser?.id === userId ? appUser : null,
  }
}
