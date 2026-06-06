"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireTenantId } from "@/lib/auth"
import { terminalRepository } from "@/lib/repositories/terminal.repository"
import { toTitleCase } from "@/lib/utils"

const createTerminalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  label: z.string().min(1, "Label is required"),
  storeId: z.string().min(1, "Store is required").optional().nullable(),
  taxRate: z.coerce.number().min(0).max(30).optional().default(8),
  assignedCategories: z.string().optional().transform((s) => {
    if (!s) return undefined
    try {
      const arr = JSON.parse(s) as unknown
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : undefined
    } catch {
      return undefined
    }
  }),
  cashier: z.string().optional(),
})

const updateTerminalSchema = createTerminalSchema
  .extend({
    isActive: z
      .string()
      .optional()
      .transform((s) => (s === "true" ? true : s === "false" ? false : undefined)),
  })
  .partial()

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

export async function createTerminal(formData: FormData): Promise<ActionResult> {
  try {
    const tenantId = await requireTenantId()
    const parsed = createTerminalSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    const terminal = await terminalRepository.create(
      {
        name: toTitleCase(parsed.data.name),
        label: toTitleCase(parsed.data.label),
        storeId: parsed.data.storeId ?? undefined,
        settings: {
          taxRate: parsed.data.taxRate,
          assignedCategories: parsed.data.assignedCategories,
          cashier: parsed.data.cashier,
        },
      },
      tenantId
    )
    revalidatePath("/admin")
    revalidatePath("/admin/terminals")
    revalidatePath("/pos")
    return { success: true, data: terminal }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create terminal" }
  }
}

export async function updateTerminal(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const tenantId = await requireTenantId()
    const parsed = updateTerminalSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }
    const updateData: Parameters<typeof terminalRepository.update>[1] = {}
    if (parsed.data.name !== undefined) updateData.name = toTitleCase(parsed.data.name)
    if (parsed.data.label !== undefined) updateData.label = toTitleCase(parsed.data.label)
    if (parsed.data.storeId !== undefined) updateData.storeId = parsed.data.storeId
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
    if (parsed.data.taxRate !== undefined || parsed.data.assignedCategories !== undefined || parsed.data.cashier !== undefined) {
      updateData.settings = {
        ...(parsed.data.taxRate !== undefined && { taxRate: parsed.data.taxRate }),
        ...(parsed.data.assignedCategories !== undefined && { assignedCategories: parsed.data.assignedCategories }),
        ...(parsed.data.cashier !== undefined && { cashier: parsed.data.cashier }),
      }
    }
    await terminalRepository.update(id, updateData, tenantId)
    revalidatePath("/admin")
    revalidatePath("/admin/terminals")
    revalidatePath("/pos")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update terminal" }
  }
}

export async function deleteTerminal(id: string): Promise<ActionResult> {
  try {
    const tenantId = await requireTenantId()
    await terminalRepository.delete(id, tenantId)
    revalidatePath("/admin")
    revalidatePath("/admin/terminals")
    revalidatePath("/pos")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete terminal" }
  }
}
