import { redirect } from "next/navigation"
import { getTenantId } from "@/lib/auth"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { SettingsPageClient } from "./settings-page-client"

const DEFAULT_SETTINGS = {
  storeName: "MyQuickPOS Demo Store",
  currency: "USD",
  taxRate: 8,
  printer: {
    paperWidth: "80mm" as const,
    autoPrint: false,
    headerHtml: `<p style="text-align: center"><strong>MyQuickPOS Demo Store</strong></p><p style="text-align: center">123 Main Street, Suite 100</p><p style="text-align: center">Tel: (555) 123-4567</p>`,
    footerHtml: `<p style="text-align: center">Thank you for your purchase!</p><p style="text-align: center">Visit us at myquickpos.app</p><p style="text-align: center"><em>Returns accepted within 30 days</em></p>`,
  },
  whatsapp: {
    enabled: false,
    phoneNumber: "",
    notifyAccountCreated: true,
    notifyDailyReport: false,
    notifyWeeklyReport: false,
    notifyMonthlyReport: false,
  },
}

export default async function SettingsPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const settings = await tenantRepository.getSettings(tenantId)
  const initialSettings = settings ?? DEFAULT_SETTINGS

  return <SettingsPageClient initialSettings={initialSettings} />
}
