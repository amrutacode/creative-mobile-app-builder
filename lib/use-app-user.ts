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
    if (!userId) {
      setAppUser(null)
      return
    }

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

  return { session, isPending, appUser }
}
