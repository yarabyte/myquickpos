import type { Role } from "@prisma/client"

export const PERMISSION_KEYS = [
  "admin.dashboard",
  "admin.orders",
  "admin.terminals",
  "admin.tablet",
  "tablet.manage",
  "admin.stores",
  "admin.users",
  "admin.customers",
  "admin.loyalty",
  "admin.products",
  "admin.stock",
  "admin.analytics",
  "admin.settings",
  "pos.access",
  "restaurant.tablet",
  "users.manage",
  "settings.manage",
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "admin.dashboard": "Dashboard",
  "admin.orders": "Orders",
  "admin.terminals": "Terminals",
  "admin.tablet": "Tablet",
  "tablet.manage": "Manage tablets",
  "admin.stores": "Stores",
  "admin.users": "Users",
  "admin.customers": "Customers",
  "admin.loyalty": "Loyalty",
  "admin.products": "Products",
  "admin.stock": "Stock",
  "admin.analytics": "Analytics",
  "admin.settings": "Settings",
  "pos.access": "POS access",
  "restaurant.tablet": "Restaurant tablet interface",
  "users.manage": "Manage users",
  "settings.manage": "Edit settings",
}

export const PERMISSION_GROUPS: { label: string; keys: PermissionKey[] }[] = [
  {
    label: "Administration",
    keys: [
      "admin.dashboard",
      "admin.orders",
      "admin.terminals",
      "admin.tablet",
      "tablet.manage",
      "admin.stores",
      "admin.users",
      "admin.customers",
      "admin.loyalty",
      "admin.products",
      "admin.stock",
      "admin.analytics",
      "admin.settings",
    ],
  },
  {
    label: "Point of sale",
    keys: ["pos.access", "restaurant.tablet"],
  },
  {
    label: "Sensitive actions",
    keys: ["users.manage", "settings.manage"],
  },
]

export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/admin": "admin.dashboard",
  "/admin/orders": "admin.orders",
  "/admin/terminals": "admin.terminals",
  "/admin/tablet": "admin.tablet",
  "/admin/stores": "admin.stores",
  "/admin/users": "admin.users",
  "/admin/customers": "admin.customers",
  "/admin/loyalty": "admin.loyalty",
  "/admin/products": "admin.products",
  "/admin/stock": "admin.stock",
  "/admin/analytics": "admin.analytics",
  "/admin/settings": "admin.settings",
}

export type RolePermissionsMap = Partial<Record<Role, PermissionKey[]>>

export const BUILTIN_ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  SUPER_ADMIN: [...PERMISSION_KEYS],
  ADMIN: [...PERMISSION_KEYS],
  MANAGER: PERMISSION_KEYS.filter((k) => k !== "settings.manage"),
  CASHIER: ["pos.access"],
  SERVER: ["admin.tablet", "restaurant.tablet"],
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value)
}

export function parsePermissionsJson(value: unknown): PermissionKey[] | null {
  if (value == null) return null
  if (!Array.isArray(value)) return null
  return value.filter(isPermissionKey)
}

export function resolveUserPermissions(input: {
  role: Role
  customPermissions?: PermissionKey[] | null
  tenantRolePermissions?: RolePermissionsMap | null
}): PermissionKey[] {
  if (input.customPermissions != null) {
    return [...new Set(input.customPermissions)]
  }

  const tenantRolePerms = input.tenantRolePermissions?.[input.role]
  if (tenantRolePerms && tenantRolePerms.length > 0) {
    return [...new Set(tenantRolePerms)]
  }

  return [...BUILTIN_ROLE_PERMISSIONS[input.role]]
}

export function hasPermission(
  permissions: PermissionKey[] | undefined | null,
  permission: PermissionKey
): boolean {
  return !!permissions?.includes(permission)
}

export function hasAnyAdminPermission(permissions: PermissionKey[] | undefined | null): boolean {
  return !!permissions?.some((p) => p.startsWith("admin."))
}

export function permissionForPath(pathname: string): PermissionKey | null {
  if (pathname.startsWith("/restaurant")) return "restaurant.tablet"
  if (pathname === "/admin") return ROUTE_PERMISSIONS["/admin"]
  const match = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => route !== "/admin")
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`))
  return match ? ROUTE_PERMISSIONS[match] : null
}

export function firstAllowedAdminRoute(permissions: PermissionKey[]): string | null {
  const order = [
    "/admin",
    "/admin/tablet",
    "/admin/orders",
    "/admin/terminals",
    "/admin/stores",
    "/admin/users",
    "/admin/customers",
    "/admin/loyalty",
    "/admin/products",
    "/admin/stock",
    "/admin/analytics",
    "/admin/settings",
  ]
  for (const route of order) {
    const perm = ROUTE_PERMISSIONS[route]
    if (perm && hasPermission(permissions, perm)) return route
  }
  return null
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Administrator",
  MANAGER: "Manager",
  CASHIER: "POS Cashier",
  SERVER: "Server",
}

export function isStaffRole(role: Role): boolean {
  return role === "MANAGER" || role === "ADMIN" || role === "SUPER_ADMIN"
}

export function permissionsToJson(permissions: PermissionKey[] | null): string {
  return JSON.stringify(permissions ?? [])
}

export function permissionsFromFormData(formData: FormData): {
  permissions?: PermissionKey[] | null
} {
  if (!formData.has("useCustomPermissions")) {
    return {}
  }
  const useCustom = formData.get("useCustomPermissions") === "true"
  if (!useCustom) return { permissions: null }
  const raw = formData.get("permissions")
  if (typeof raw !== "string" || !raw.trim()) return { permissions: [] }
  try {
    const parsed = JSON.parse(raw)
    return { permissions: parsePermissionsJson(parsed) ?? [] }
  } catch {
    return { permissions: [] }
  }
}

/** Fallback for sessions created before permissions were added to JWT */
export function sessionPermissionsFromUser(user: {
  permissions?: PermissionKey[] | null
  role?: string | null
}): PermissionKey[] {
  if (user.permissions?.length) return user.permissions
  if (user.role && user.role in BUILTIN_ROLE_PERMISSIONS) {
    return [...BUILTIN_ROLE_PERMISSIONS[user.role as Role]]
  }
  return []
}
