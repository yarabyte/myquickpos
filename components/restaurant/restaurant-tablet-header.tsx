"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, UtensilsCrossed, User } from "lucide-react"
import {
  ROLE_LABELS,
  hasPermission,
  sessionPermissionsFromUser,
} from "@/lib/permissions"
import type { Role } from "@prisma/client"
import { toTitleCase } from "@/lib/utils"

interface RestaurantTabletHeaderProps {
  establishmentName: string
  subtitle?: React.ReactNode
  tableName?: string
}

export function RestaurantTabletHeader({
  establishmentName,
  subtitle,
  tableName,
}: RestaurantTabletHeaderProps) {
  const { data: session } = useSession()
  const user = session?.user as
    | { name?: string; email?: string; role?: Role }
    | undefined
  const permissions = sessionPermissionsFromUser(user ?? {})
  const showBack = !!session?.user && hasPermission(permissions, "admin.tablet")
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : null

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
      {showBack && (
        <Link
          href="/admin/tablet"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Retour</span>
        </Link>
      )}

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UtensilsCrossed className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-card-foreground">
          {toTitleCase(establishmentName)}
        </h1>
        {tableName ? (
          <p className="truncate text-sm text-muted-foreground">Table {tableName}</p>
        ) : subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}

        {user?.name && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="font-medium text-card-foreground">{user.name}</span>
            </span>
            {roleLabel && (
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                {roleLabel}
              </span>
            )}
            {user.email && (
              <span className="truncate hidden sm:inline">{user.email}</span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
