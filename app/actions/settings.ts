"use server"

import { revalidatePath } from "next/cache"
import { getTenantId, requirePermission } from "@/lib/auth"
import { tenantRepository } from "@/lib/repositories/tenant.repository"

export async function updateTenantSettings(formData: FormData) {
  try {
    await requirePermission("settings.manage")
  } catch {
    return { ok: false, error: "Forbidden: Insufficient permissions" }
  }
  const tenantId = await getTenantId()
  if (!tenantId) return { ok: false, error: "Unauthorized" }

  const storeName = formData.get("storeName")?.toString()
  const currency = formData.get("currency")?.toString()
  const taxRateRaw = formData.get("taxRate")?.toString()
  const taxRate = taxRateRaw != null ? parseFloat(taxRateRaw) : undefined
  const paperWidth = formData.get("paperWidth") as "58mm" | "80mm" | null
  const autoPrint = formData.get("autoPrint") === "true"
  const headerHtml = formData.get("headerHtml")?.toString()
  const footerHtml = formData.get("footerHtml")?.toString()

  const printer =
    paperWidth != null || headerHtml !== undefined || footerHtml !== undefined
      ? {
          ...(paperWidth && { paperWidth }),
          autoPrint,
          ...(headerHtml !== undefined && { headerHtml }),
          ...(footerHtml !== undefined && { footerHtml }),
        }
      : undefined

  await tenantRepository.updateSettings(tenantId, {
    ...(storeName !== undefined && { storeName }),
    ...(currency !== undefined && { currency }),
    ...(taxRate !== undefined && !Number.isNaN(taxRate) && { taxRate }),
    ...(printer && { printer }),
  })

  revalidatePath("/admin/settings")
  return { ok: true }
}
