import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Monitor,
  ShoppingBag,
  Warehouse,
  Store,
  Settings,
  BarChart3,
  Users,
  UserCircle,
  Gift,
  Receipt,
  Tablet,
} from "lucide-react"
import { ROUTE_PERMISSIONS, type PermissionKey } from "@/lib/permissions"

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  permission: PermissionKey
}

export type AdminNavGroup = {
  id: string
  label?: string
  items: AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: ROUTE_PERMISSIONS["/admin"],
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        icon: Receipt,
        permission: ROUTE_PERMISSIONS["/admin/orders"],
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: ROUTE_PERMISSIONS["/admin/analytics"],
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      {
        href: "/admin/products",
        label: "Products",
        icon: ShoppingBag,
        permission: ROUTE_PERMISSIONS["/admin/products"],
      },
      {
        href: "/admin/stock",
        label: "Stock",
        icon: Warehouse,
        permission: ROUTE_PERMISSIONS["/admin/stock"],
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/admin/stores",
        label: "Stores",
        icon: Store,
        permission: ROUTE_PERMISSIONS["/admin/stores"],
      },
      {
        href: "/admin/terminals",
        label: "Terminals",
        icon: Monitor,
        permission: ROUTE_PERMISSIONS["/admin/terminals"],
      },
      {
        href: "/admin/tablet",
        label: "Tablet",
        icon: Tablet,
        permission: ROUTE_PERMISSIONS["/admin/tablet"],
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      {
        href: "/admin/customers",
        label: "Customers",
        icon: UserCircle,
        permission: ROUTE_PERMISSIONS["/admin/customers"],
      },
      {
        href: "/admin/loyalty",
        label: "Loyalty Programs",
        icon: Gift,
        permission: ROUTE_PERMISSIONS["/admin/loyalty"],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        permission: ROUTE_PERMISSIONS["/admin/users"],
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        permission: ROUTE_PERMISSIONS["/admin/settings"],
      },
    ],
  },
]

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href))
}
