"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireTenantId, requireTabletManage } from "@/lib/auth"
import { tableRepository } from "@/lib/repositories/table.repository"

const createTableSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  establishmentId: z.string().min(1, "Establishment is required"),
})

const updateTableSchema = createTableSchema.partial()

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

export async function createTable(formData: FormData): Promise<ActionResult> {
  try {
    await requireTabletManage()
    const tenantId = await requireTenantId()
    const parsed = createTableSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    const table = await tableRepository.create(
      { name: parsed.data.name, slug: parsed.data.slug, establishmentId: parsed.data.establishmentId },
      tenantId
    )
    revalidatePath("/admin/tablet")
    revalidatePath("/pos")
    return { success: true, data: table }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create table" }
  }
}

export async function updateTable(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireTabletManage()
    const tenantId = await requireTenantId()
    const parsed = updateTableSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    await tableRepository.update(id, parsed.data, tenantId)
    revalidatePath("/admin/tablet")
    revalidatePath("/pos")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update table" }
  }
}

export async function deleteTable(id: string): Promise<ActionResult> {
  try {
    await requireTabletManage()
    const tenantId = await requireTenantId()
    await tableRepository.delete(id, tenantId)
    revalidatePath("/admin/tablet")
    revalidatePath("/pos")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete table" }
  }
}
