"use client"

import { useRouter } from "next/navigation"
import {
  ChevronDown,
  Code2,
  Download,
  Github,
  Globe,
  Link2,
  Rocket,
  Share2,
  Smartphone,
  UserPlus,
} from "lucide-react"
import { cn } from "cn"

import { useAppUser } from "@/lib/use-app-user"
import { AppLogo } from "@/components/app-logo"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STATUS_STYLES: Record<string, { label: string; dot: string; pill: string }> = {
  pending: { label: "Queued", dot: "bg-amber-500", pill: "border-amber-200 bg-amber-50 text-amber-700" },
  generating: { label: "Generating", dot: "bg-indigo-500 animate-pulse", pill: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  ready: { label: "Ready", dot: "bg-emerald-500", pill: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", dot: "bg-red-500", pill: "border-red-200 bg-red-50 text-red-700" },
}

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    dot: "bg-neutral-400",
    pill: "border-border bg-muted text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium capitalize",
        style.pill
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  )
}

export function WorkspaceHeader({
  projectName,
  status,
  isLoading,
}: {
  projectName?: string
  status?: string
  isLoading?: boolean
}) {
  const router = useRouter()
  const { session, appUser } = useAppUser()
  const user = session?.user

  return (
    <header className="relative z-30 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/70 bg-white px-3 sm:px-4">
      {/* Left: brand */}
      <div className="flex min-w-0 items-center gap-3">
        <AppLogo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
      </div>

      {/* Center: project name */}
      <div className="flex min-w-0 items-center justify-center gap-2">
        {isLoading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <>
            <h1
              className="max-w-[40vw] truncate text-sm font-semibold text-foreground sm:max-w-xs"
              title={projectName}
            >
              {projectName}
            </h1>
            {status && <StatusPill status={status} />}
          </>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="hidden md:inline-flex" />}
          >
            <Share2 />
            Share
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Share project</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <Link2 />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <UserPlus />
                Invite collaborators
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Globe />
                Publish to gallery
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="hidden sm:inline-flex" />}
          >
            <Download />
            Export
            <ChevronDown className="opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Export project</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <Code2 />
                Download source (.zip)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Github />
                Push to GitHub
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Build</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <Smartphone />
                Build APK / IPA with EAS
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500" disabled>
          <Rocket />
          <span className="hidden sm:inline">Publish</span>
        </Button>

        {user && (
          <>
            <Separator orientation="vertical" className="mx-1.5 h-5" />
            <UserMenu user={user} appUser={appUser} onSignOut={() => router.replace("/")} />
          </>
        )}
      </div>
    </header>
  )
}
