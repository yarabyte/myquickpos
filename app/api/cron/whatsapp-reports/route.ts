import { NextResponse } from "next/server"
import { tenantRepository, type TenantSettingsJson } from "@/lib/repositories/tenant.repository"
import { sendSalesReportWhatsApp } from "@/lib/whatsapp/send-notifications"
import type { SalesReportPeriod } from "@/lib/whatsapp/sales-report"

const REPORT_TIMEZONE = "Africa/Douala"

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

function nowInDouala(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: REPORT_TIMEZONE }))
}

function getDayOfWeekInDouala(date: Date): number {
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: REPORT_TIMEZONE,
  })
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[weekday] ?? date.getDay()
}

function getDayOfMonthInDouala(date: Date): number {
  return Number(
    date.toLocaleDateString("en-US", { day: "numeric", timeZone: REPORT_TIMEZONE })
  )
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = nowInDouala()
  const dayOfWeek = getDayOfWeekInDouala(now)
  const dayOfMonth = getDayOfMonthInDouala(now)

  const periods: SalesReportPeriod[] = ["daily"]
  if (dayOfWeek === 1) periods.push("weekly")
  if (dayOfMonth === 1) periods.push("monthly")

  const tenants = await tenantRepository.findAllWithSettings()
  const results: Array<{
    tenantId: string
    slug: string
    period: SalesReportPeriod
    sent: boolean
    skipped?: boolean
    periodKey?: string
  }> = []

  for (const tenant of tenants) {
    const settings = (tenant.settings ?? {}) as TenantSettingsJson
    if (!settings.whatsapp?.enabled) continue

    for (const period of periods) {
      const result = await sendSalesReportWhatsApp({
        tenantId: tenant.id,
        period,
        referenceDate: now,
      })
      results.push({
        tenantId: tenant.id,
        slug: tenant.slug,
        period,
        sent: result.sent,
        skipped: result.skipped,
        periodKey: result.periodKey,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    timezone: REPORT_TIMEZONE,
    periods,
    processed: results.length,
    results,
  })
}
