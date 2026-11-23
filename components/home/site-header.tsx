"use client"

import Link from "next/link"
import { LogOut, Sparkles } from "lucide-react"

import { signOut } from "@/lib/auth-client"
import { useAppUser } from "@/lib/use-app-user"
import { useAuthDialog } from "@/components/providers/auth-dialog-provider"
import { Button } from "@/components/ui/button"
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

const NAV_LINKS = [
  { label: "Showcase", href: "#showcase" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
]

export function SiteHeader() {
  const { session, appUser } = useAppUser()
  const { openSignIn } = useAuthDialog()
  const user = session?.user

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            AppForge
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar>
                  <AvatarFallback>
                    {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate">
                    {user.name ?? user.email}
                  </DropdownMenuLabel>
                  {appUser && (
                    <div className="px-2 pb-1.5">
                      <Badge variant="outline">{appUser.credits} credits</Badge>
                    </div>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => openSignIn()}>
                Sign in
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500"
                onClick={() => openSignIn()}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
