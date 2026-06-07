import type { Role } from "@prisma/client"
import { hasPermission, isStaffRole, type PermissionKey } from "@/lib/permissions"

export function parseAllowedTabletIds(value: unknown): string[] | null {
  if (value == null) return null
  if (!Array.isArray(value)) return null
  const ids = value.filter((x): x is string => typeof x === "string" && x.length > 0)
  return ids.length > 0 ? ids : []
}

export function allowedTabletIdsToJson(ids: string[] | null): string {
  return JSON.stringify(ids)
}

export function userHasUnrestrictedTabletAccess(
  permissions: PermissionKey[] | undefined | null,
  role?: Role | string | null
): boolean {
  if (role && isStaffRole(role as Role)) return true
  return hasPermission(permissions, "tablet.manage")
}

export function userNeedsTabletScope(
  permissions: PermissionKey[] | undefined | null,
  role?: Role | string | null
): boolean {
  if (!hasPermission(permissions, "restaurant.tablet")) return false
  return !userHasUnrestrictedTabletAccess(permissions, role)
}

export function filterTabletsForUser<T extends { id: string }>(
  tablets: T[],
  allowedTabletIds: string[] | null | undefined,
  permissions: PermissionKey[] | undefined | null,
  role?: Role | string | null
): T[] {
  if (!userNeedsTabletScope(permissions, role)) return tablets
  if (allowedTabletIds == null) return tablets
  if (allowedTabletIds.length === 0) return []
  return tablets.filter((t) => allowedTabletIds.includes(t.id))
}

export function canAccessTabletById(
  establishmentId: string,
  allowedTabletIds: string[] | null | undefined,
  permissions: PermissionKey[] | undefined | null,
  role?: Role | string | null
): boolean {
  if (!userNeedsTabletScope(permissions, role)) return true
  if (allowedTabletIds == null) return true
  return allowedTabletIds.includes(establishmentId)
}

export function allowedTabletIdsFromFormData(formData: FormData): {
  allowedTabletIds?: string[] | null
} {
  if (!formData.has("allowedTabletIds")) return {}
  const raw = formData.get("allowedTabletIds")?.toString()
  if (raw == null || raw === "null" || raw === "") return { allowedTabletIds: null }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { allowedTabletIds: null }
    return {
      allowedTabletIds: parsed.filter((x): x is string => typeof x === "string" && x.length > 0),
    }
  } catch {
    return { allowedTabletIds: null }
  }
}
