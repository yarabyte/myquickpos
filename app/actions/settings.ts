"use server"

import { revalidatePath } from "next/cache"
import { getTenantId, requirePermission } from "@/lib/auth"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { sendWhatsAppTest } from "@/lib/whatsapp/send-notifications"
import { getSessionStatus, isWhatsAppConfigured } from "@/lib/whatsapp/wasender"

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

  const whatsappEnabled = formData.get("whatsappEnabled") === "true"
  const whatsappPhoneNumber = formData.get("whatsappPhoneNumber")?.toString()
  const whatsappNotifyAccountCreated = formData.get("whatsappNotifyAccountCreated") === "true"
  const whatsappNotifyDailyReport = formData.get("whatsappNotifyDailyReport") === "true"
  const whatsappNotifyWeeklyReport = formData.get("whatsappNotifyWeeklyReport") === "true"
  const whatsappNotifyMonthlyReport = formData.get("whatsappNotifyMonthlyReport") === "true"

  const printer =
    paperWidth != null || headerHtml !== undefined || footerHtml !== undefined
      ? {
          ...(paperWidth && { paperWidth }),
          autoPrint,
          ...(headerHtml !== undefined && { headerHtml }),
          ...(footerHtml !== undefined && { footerHtml }),
        }
      : undefined

  const whatsapp = {
    enabled: whatsappEnabled,
    ...(whatsappPhoneNumber !== undefined && { phoneNumber: whatsappPhoneNumber }),
    notifyAccountCreated: whatsappNotifyAccountCreated,
    notifyDailyReport: whatsappNotifyDailyReport,
    notifyWeeklyReport: whatsappNotifyWeeklyReport,
    notifyMonthlyReport: whatsappNotifyMonthlyReport,
  }

  try {
    await tenantRepository.updateSettings(tenantId, {
      ...(storeName !== undefined && { storeName }),
      ...(currency !== undefined && { currency }),
      ...(taxRate !== undefined && !Number.isNaN(taxRate) && { taxRate }),
      ...(printer && { printer }),
      whatsapp,
    })

    revalidatePath("/admin/settings")
    return { ok: true as const }
  } catch (error) {
    console.error("[updateTenantSettings]", error)
    return {
      ok: false as const,
      error: "Impossible d'enregistrer les paramètres. Réessayez.",
    }
  }
}

export async function getWhatsAppSessionStatus(): Promise<{
  configured: boolean
  status: string | null
}> {
  try {
    await requirePermission("settings.manage")
  } catch {
    return { configured: false, status: null }
  }

  if (!isWhatsAppConfigured()) {
    return { configured: false, status: null }
  }

  const status = await getSessionStatus()
  return { configured: true, status }
}

export async function sendWhatsAppTestMessage(
  phoneNumber?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePermission("settings.manage")
  } catch {
    return { ok: false, error: "Accès refusé." }
  }

  const tenantId = await getTenantId()
  if (!tenantId) return { ok: false, error: "Non authentifié." }

  return sendWhatsAppTest({ tenantId, phoneNumber })
}
