"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireTenantId, requirePermission } from "@/lib/auth"
import { userRepository } from "@/lib/repositories/user.repository"
import { permissionsFromFormData } from "@/lib/permissions"
import { allowedTabletIdsFromFormData } from "@/lib/tablet-access"
import { sendAccountCreatedEmail } from "@/lib/email/send-account-emails"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { sendAccountCreatedWhatsApp } from "@/lib/whatsapp/send-notifications"
import type { Role } from "@prisma/client"

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "SERVER"]),
  status: z.enum(["active", "inactive"]).optional().default("active"),
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "SERVER"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

function userFieldsFromForm(formData: FormData) {
  const password = formData.get("password")?.toString().trim()
  return {
    name: formData.get("name")?.toString().trim() ?? "",
    email: formData.get("email")?.toString().trim() ?? "",
    role: formData.get("role")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "active",
    ...(password ? { password } : {}),
  }
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage")
    const tenantId = await requireTenantId()
    const parsed = createUserSchema.safeParse(userFieldsFromForm(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }

    const existing = await userRepository.findByEmail(parsed.data.email, tenantId)
    if (existing) {
      return { success: false, error: "A user with this email already exists." }
    }

    const plainPassword = parsed.data.password
    const { permissions } = permissionsFromFormData(formData)
    const { allowedTabletIds } = allowedTabletIdsFromFormData(formData)
    const user = await userRepository.create(
      {
        ...parsed.data,
        role: parsed.data.role as Role,
        status: parsed.data.status,
        permissions:
          permissions === undefined
            ? undefined
            : permissions === null
              ? null
              : permissions,
        ...(allowedTabletIds !== undefined && { allowedTabletIds }),
      },
      tenantId
    )

    const tenant = await tenantRepository.findById(tenantId)
    if (tenant) {
      void sendAccountCreatedEmail({
        to: user.email,
        name: user.name,
        email: user.email,
        password: plainPassword,
        role: user.role,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
      }).catch((e) => console.error("[createUser] welcome email failed:", e))

      void sendAccountCreatedWhatsApp({
        tenantId,
        user: { name: user.name, email: user.email, role: user.role },
        tenant: { name: tenant.name },
      }).catch((e) => console.error("[createUser] whatsapp notification failed:", e))
    }

    revalidatePath("/admin/users")
    return { success: true, data: user }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create user" }
  }
}

export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage")
    const tenantId = await requireTenantId()
    const parsed = updateUserSchema.safeParse(userFieldsFromForm(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    const { permissions } = permissionsFromFormData(formData)
    const { allowedTabletIds } = allowedTabletIdsFromFormData(formData)
    await userRepository.update(
      id,
      {
        ...parsed.data,
        role: parsed.data.role as Role | undefined,
        ...(permissions !== undefined && { permissions }),
        ...(allowedTabletIds !== undefined && { allowedTabletIds }),
      },
      tenantId
    )
    revalidatePath("/admin/users")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update user" }
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    await requirePermission("users.manage")
    const tenantId = await requireTenantId()
    await userRepository.delete(id, tenantId)
    revalidatePath("/admin/users")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete user" }
  }
}
