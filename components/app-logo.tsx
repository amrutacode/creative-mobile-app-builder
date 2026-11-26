import Link from "next/link"
import { Sparkles } from "lucide-react"
import { cn } from "cn"

export function AppLogo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)} aria-label="AppForge home">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
        <Sparkles className="size-4" />
      </span>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-foreground">AppForge</span>
      )}
    </Link>
  )
}
