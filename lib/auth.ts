import { auth } from "@/auth"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import type { PermissionKey } from "@/lib/permissions"
import { hasPermission, sessionPermissionsFromUser } from "@/lib/permissions"

export async function getSession() {
  return auth()
}

export async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return (session?.user as { tenantId?: string } | undefined)?.tenantId ?? null
}

export async function getTenantSlug(): Promise<string | null> {
  const session = await auth()
  return (session?.user as { tenantSlug?: string } | undefined)?.tenantSlug ?? null
}

export async function getTenant() {
  const tenantId = await getTenantId()
  if (!tenantId) return null
  return tenantRepository.findById(tenantId)
}

export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId()
  if (!tenantId) {
    throw new Error("Unauthorized: No tenant in session")
  }
  return tenantId
}

export async function getSessionPermissions(): Promise<PermissionKey[]> {
  const session = await auth()
  const user = session?.user as { permissions?: PermissionKey[]; role?: string } | undefined
  return sessionPermissionsFromUser(user ?? {})
}

export async function getSessionAllowedTabletIds(): Promise<string[] | null> {
  const session = await auth()
  const ids = (session?.user as { allowedTabletIds?: string[] | null } | undefined)
    ?.allowedTabletIds
  if (ids == null) return null
  return ids
}

export async function getSessionRole(): Promise<string | null> {
  const session = await auth()
  return (session?.user as { role?: string } | undefined)?.role ?? null
}

export async function requireRole(allowedRoles: string[]) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Forbidden: Insufficient permissions")
  }
}

export async function requirePermission(permission: PermissionKey) {
  const permissions = await getSessionPermissions()
  if (!hasPermission(permissions, permission)) {
    throw new Error("Forbidden: Insufficient permissions")
  }
}

export async function requireTabletManage() {
  const permissions = await getSessionPermissions()
  if (hasPermission(permissions, "tablet.manage")) return

  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (
    role !== "SERVER" &&
    role !== "CASHIER" &&
    hasPermission(permissions, "admin.tablet")
  ) {
    return
  }

  throw new Error("Forbidden: Insufficient permissions")
}
