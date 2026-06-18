"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession, signOut } from "next-auth/react"
import { Monitor, ChevronRight, LogOut } from "lucide-react"
import { sessionPermissionsFromUser, type PermissionKey } from "@/lib/permissions"
import {
  ADMIN_NAV_GROUPS,
  isAdminNavItemActive,
  type AdminNavItem,
} from "@/lib/admin-nav"

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem
  pathname: string
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const isActive = isAdminNavItemActive(pathname, item.href)

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
        {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
      </Link>
    </li>
  )
}

export function AdminSidebar({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as {
    name?: string
    email?: string
    permissions?: PermissionKey[]
    role?: string
  } | undefined
  const permissions = sessionPermissionsFromUser(user ?? {})

  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0)

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <aside className={cn("flex h-full w-64 shrink-0 flex-col border-r border-border bg-card", className)}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Monitor className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-card-foreground leading-none">MyQuickPOS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.id} className={groupIndex > 0 ? "mt-1" : undefined}>
            {group.label && (
              <p
                className={cn(
                  "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                  groupIndex === 0 ? "pt-2" : "pt-4"
                )}
              >
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">
            {user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email ?? "admin@myquickpos.app"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
