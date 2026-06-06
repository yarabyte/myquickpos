"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireTenantId, requirePermission } from "@/lib/auth"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import {
  isPermissionKey,
  type PermissionKey,
  type RolePermissionsMap,
} from "@/lib/permissions"
import type { Role } from "@prisma/client"

const rolePermissionsSchema = z.record(
  z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "SERVER"]),
  z.array(z.string())
)

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

export async function updateTenantRolePermissions(
  rolePermissions: RolePermissionsMap
): Promise<ActionResult> {
  try {
    await requirePermission("users.manage")
    const tenantId = await requireTenantId()

    const sanitized: RolePermissionsMap = {}
    for (const [role, perms] of Object.entries(rolePermissions)) {
      if (!perms?.length) continue
      sanitized[role as Role] = perms.filter(isPermissionKey) as PermissionKey[]
    }

    await tenantRepository.updateRolePermissions(tenantId, sanitized)
    revalidatePath("/admin/users")
    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update role permissions",
    }
  }
}

export async function getTenantRolePermissions(): Promise<RolePermissionsMap | null> {
  const tenantId = await requireTenantId()
  return tenantRepository.getRolePermissions(tenantId)
}
