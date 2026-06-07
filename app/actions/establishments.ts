"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireTenantId, requireTabletManage } from "@/lib/auth"
import { establishmentRepository } from "@/lib/repositories/establishment.repository"

const createEstablishmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  terminalId: z.string().min(1, "Terminal is required"),
})

const updateEstablishmentSchema = createEstablishmentSchema.partial()

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

export async function createEstablishment(formData: FormData): Promise<ActionResult> {
  try {
    await requireTabletManage()
    const tenantId = await requireTenantId()
    const parsed = createEstablishmentSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    const establishment = await establishmentRepository.create(
      { name: parsed.data.name, slug: parsed.data.slug, terminalId: parsed.data.terminalId },
      tenantId
    )
    revalidatePath("/admin/tablet")
    revalidatePath("/pos")
    return { success: true, data: establishment }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create tablet" }
  }
}

export async function updateEstablishment(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireTabletManage()
    const tenantId = await requireTenantId()
    const parsed = updateEstablishmentSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    await establishmentRepository.update(id, parsed.data, tenantId)
    revalidatePath("/admin/tablet")
    revalidatePath("/pos")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update tablet" }
  }
}

export async function deleteEstablishment(id: string): Promise<ActionResult> {
  try {
    await requireTabletManage()
    const tenantId = await requireTenantId()
    await establishmentRepository.delete(id, tenantId)
    revalidatePath("/admin/tablet")
    revalidatePath("/pos")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete tablet" }
  }
}
