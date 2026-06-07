"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { ArrowLeft, LogOut, User, Wifi } from "lucide-react"
import {
  ROLE_LABELS,
  hasPermission,
  sessionPermissionsFromUser,
} from "@/lib/permissions"
import { clearRememberedLogin } from "@/lib/remember-login"
import type { Role } from "@prisma/client"
import { cn, toTitleCase } from "@/lib/utils"
import { useEffect, useState } from "react"

interface RestaurantTabletHeaderProps {
  establishmentName: string
  tableName?: string
  pendingCount?: number
}

function useStandalonePwa() {
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const check = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    setStandalone(check())
    const mq = window.matchMedia("(display-mode: standalone)")
    const onChange = () => setStandalone(check())
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return standalone
}

export function SwitchServerButton({
  className,
  iconOnly = false,
}: {
  className?: string
  iconOnly?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  if (!session?.user) return null

  async function handleSwitchServer() {
    setLoading(true)
    try {
      clearRememberedLogin()
      await signOut({ redirect: false })
      const callback = encodeURIComponent(pathname || "/admin/tablet")
      router.push(`/login?callbackUrl=${callback}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSwitchServer}
      disabled={loading}
      title="Switch server"
      aria-label="Switch server"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60",
        iconOnly ? "h-9 w-9" : "gap-1.5 px-3 py-2 text-sm font-medium",
        className
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {!iconOnly && <span>Switch server</span>}
    </button>
  )
}

export function RestaurantTabletHeader({
  establishmentName,
  tableName,
  pendingCount = 0,
}: RestaurantTabletHeaderProps) {
  const { data: session } = useSession()
  const user = session?.user as
    | { name?: string; email?: string; role?: Role }
    | undefined
  const permissions = sessionPermissionsFromUser(user ?? {})
  const showBack = !!session?.user && hasPermission(permissions, "admin.tablet")
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : null
  const isStandalone = useStandalonePwa()
  const showUserRow = !!user?.name || isStandalone

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        {showBack && (
          <Link
            href="/admin/tablet"
            title="Back"
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground sm:text-base">
            {toTitleCase(establishmentName)}
          </h1>
          {tableName && (
            <p className="mt-0.5 text-xs text-muted-foreground">Table {tableName}</p>
          )}
        </div>

        <SwitchServerButton iconOnly />
      </div>

      {showUserRow && (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-1.5 sm:px-4">
          {user?.name ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium text-card-foreground">
                {user.name}
              </span>
              {roleLabel && (
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary sm:text-xs sm:normal-case sm:tracking-normal">
                  {roleLabel}
                </span>
              )}
            </div>
          ) : (
            <span />
          )}

          {isStandalone && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-primary sm:text-xs">
              <Wifi className="h-3 w-3" />
              Tablet mode
            </span>
          )}
        </div>
      )}

      {pendingCount > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-400 sm:px-4">
          {pendingCount} order{pendingCount > 1 ? "s" : ""} pending sync
        </div>
      )}
    </header>
  )
}
