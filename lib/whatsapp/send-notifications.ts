import { tenantRepository, type TenantSettingsJson } from "@/lib/repositories/tenant.repository"
import { whatsappNotificationLogRepository } from "@/lib/repositories/whatsapp-notification-log.repository"
import { buildSalesReportMessage, getReportLogType, type SalesReportPeriod } from "@/lib/whatsapp/sales-report"
import { accountCreatedMessage, testMessage } from "@/lib/whatsapp/templates/messages"
import { normalizePhoneE164, sendTextMessage } from "@/lib/whatsapp/wasender"
import type { Role } from "@prisma/client"

type WhatsAppSettings = NonNullable<TenantSettingsJson["whatsapp"]>

async function getWhatsAppConfig(tenantId: string): Promise<{
  settings: WhatsAppSettings
  storeName: string
  currency: string
} | null> {
  const tenantSettings = await tenantRepository.getSettings(tenantId)
  if (!tenantSettings) return null
  return {
    settings: tenantSettings.whatsapp,
    storeName: tenantSettings.storeName,
    currency: tenantSettings.currency,
  }
}

function canSend(settings: WhatsAppSettings): settings is WhatsAppSettings & { phoneNumber: string } {
  return Boolean(settings.enabled && settings.phoneNumber?.trim())
}

export async function sendAccountCreatedWhatsApp(params: {
  tenantId: string
  user: { name: string; email: string; role: Role }
  tenant: { name: string }
}): Promise<void> {
  const config = await getWhatsAppConfig(params.tenantId)
  if (!config || !canSend(config.settings) || !config.settings.notifyAccountCreated) return

  const text = accountCreatedMessage({
    storeName: params.tenant.name,
    name: params.user.name,
    email: params.user.email,
    role: params.user.role,
  })

  await sendTextMessage({ to: config.settings.phoneNumber, text })
}

export async function sendSalesReportWhatsApp(params: {
  tenantId: string
  period: SalesReportPeriod
  referenceDate?: Date
}): Promise<{ sent: boolean; skipped?: boolean; periodKey?: string }> {
  const config = await getWhatsAppConfig(params.tenantId)
  if (!config || !canSend(config.settings)) return { sent: false, skipped: true }

  const notifyKey = {
    daily: "notifyDailyReport",
    weekly: "notifyWeeklyReport",
    monthly: "notifyMonthlyReport",
  } as const

  if (!config.settings[notifyKey[params.period]]) {
    return { sent: false, skipped: true }
  }

  const { text, periodKey } = await buildSalesReportMessage({
    tenantId: params.tenantId,
    storeName: config.storeName,
    currency: config.currency,
    period: params.period,
    referenceDate: params.referenceDate,
  })

  const logType = getReportLogType(params.period)
  const alreadySent = await whatsappNotificationLogRepository.exists(
    params.tenantId,
    logType,
    periodKey
  )
  if (alreadySent) return { sent: false, skipped: true, periodKey }

  const result = await sendTextMessage({ to: config.settings.phoneNumber, text })

  await whatsappNotificationLogRepository.create({
    tenantId: params.tenantId,
    type: logType,
    periodKey,
    msgId: result?.msgId ?? null,
    status: result ? "sent" : "failed",
  })

  return { sent: Boolean(result), periodKey }
}

export async function sendWhatsAppTest(params: {
  tenantId: string
}): Promise<{ ok: boolean; error?: string }> {
  const config = await getWhatsAppConfig(params.tenantId)
  if (!config) return { ok: false, error: "Paramètres introuvables." }
  if (!config.settings.phoneNumber?.trim()) {
    return { ok: false, error: "Numéro WhatsApp non configuré." }
  }

  const phone = normalizePhoneE164(config.settings.phoneNumber)
  if (!/^\+\d{8,15}$/.test(phone)) {
    return { ok: false, error: "Numéro invalide. Utilisez le format E.164 (ex: +237612345678)." }
  }

  const text = testMessage(config.storeName)
  const result = await sendTextMessage({ to: phone, text })
  if (!result) {
    return {
      ok: false,
      error: "Échec de l'envoi. Vérifiez WASENDER_API_KEY et que la session WhatsApp est connectée.",
    }
  }

  return { ok: true }
}
