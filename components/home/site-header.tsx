"use client"

import { useAppUser } from "@/lib/use-app-user"
import { useAuthDialog } from "@/components/providers/auth-dialog-provider"
import { AppLogo } from "@/components/app-logo"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"

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
        <AppLogo />

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
            <UserMenu user={user} appUser={appUser} />
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
