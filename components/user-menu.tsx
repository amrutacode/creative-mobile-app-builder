"use client"

import { LogOut } from "lucide-react"

import { signOut } from "@/lib/auth-client"
import type { AppUser } from "@/lib/use-app-user"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SessionUser = { name?: string | null; email?: string | null }

export function UserMenu({
  user,
  appUser,
  onSignOut,
}: {
  user: SessionUser
  appUser: AppUser | null
  onSignOut?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          <AvatarFallback>
            {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.name ?? user.email}</DropdownMenuLabel>
          {appUser && (
            <div className="px-2 pb-1.5">
              <Badge variant="outline">{appUser.credits} credits</Badge>
            </div>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut()
            onSignOut?.()
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
