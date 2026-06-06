"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Monitor,
  ShoppingBag,
  Warehouse,
  Store,
  Settings,
  BarChart3,
  ChevronRight,
  Users,
  LogOut,
  UserCircle,
  Gift,
  Receipt,
  Tablet,
} from "lucide-react"
import { ROUTE_PERMISSIONS, sessionPermissionsFromUser, type PermissionKey } from "@/lib/permissions"

const navItems: {
  href: string
  label: string
  icon: React.ElementType
  permission: PermissionKey
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: ROUTE_PERMISSIONS["/admin"] },
  { href: "/admin/orders", label: "Orders", icon: Receipt, permission: ROUTE_PERMISSIONS["/admin/orders"] },
  { href: "/admin/terminals", label: "Terminals", icon: Monitor, permission: ROUTE_PERMISSIONS["/admin/terminals"] },
  { href: "/admin/tablet", label: "Tablet", icon: Tablet, permission: ROUTE_PERMISSIONS["/admin/tablet"] },
  { href: "/admin/stores", label: "Stores", icon: Store, permission: ROUTE_PERMISSIONS["/admin/stores"] },
  { href: "/admin/users", label: "Users", icon: Users, permission: ROUTE_PERMISSIONS["/admin/users"] },
  { href: "/admin/customers", label: "Customers", icon: UserCircle, permission: ROUTE_PERMISSIONS["/admin/customers"] },
  { href: "/admin/loyalty", label: "Loyalty Programs", icon: Gift, permission: ROUTE_PERMISSIONS["/admin/loyalty"] },
  { href: "/admin/products", label: "Products", icon: ShoppingBag, permission: ROUTE_PERMISSIONS["/admin/products"] },
  { href: "/admin/stock", label: "Stock", icon: Warehouse, permission: ROUTE_PERMISSIONS["/admin/stock"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: ROUTE_PERMISSIONS["/admin/analytics"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: ROUTE_PERMISSIONS["/admin/settings"] },
]

export function AdminSidebar() {
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
  const visibleNav = navItems.filter((item) => permissions.includes(item.permission))

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
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
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">
            {user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email ?? "admin@myquickpos.com"}
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
