import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns"
import { analyticsRepository } from "@/lib/repositories/analytics.repository"
import { formatDateFr, formatMonthFr, formatPeriodFr, salesReportMessage } from "@/lib/whatsapp/templates/messages"

const REPORT_TIMEZONE = "Africa/Douala"

export type SalesReportPeriod = "daily" | "weekly" | "monthly"

function nowInDouala(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: REPORT_TIMEZONE }))
}

export function getReportDateRange(period: SalesReportPeriod, referenceDate = nowInDouala()) {
  if (period === "daily") {
    const day = subDays(referenceDate, 1)
    return {
      from: startOfDay(day),
      to: endOfDay(day),
      periodKey: day.toLocaleDateString("en-CA", { timeZone: REPORT_TIMEZONE }),
      periodLabel: formatDateFr(day),
    }
  }

  if (period === "weekly") {
    const lastWeekRef = subWeeks(referenceDate, 1)
    const from = startOfWeek(lastWeekRef, { weekStartsOn: 1 })
    const to = endOfWeek(lastWeekRef, { weekStartsOn: 1 })
    const weekNum = getIsoWeekNumber(from)
    const year = from.getFullYear()
    return {
      from,
      to,
      periodKey: `${year}-W${String(weekNum).padStart(2, "0")}`,
      periodLabel: formatPeriodFr(from, to),
    }
  }

  const lastMonthRef = subMonths(referenceDate, 1)
  const from = startOfMonth(lastMonthRef)
  const to = endOfMonth(lastMonthRef)
  return {
    from,
    to,
    periodKey: from.toLocaleDateString("en-CA", { timeZone: REPORT_TIMEZONE }).slice(0, 7),
    periodLabel: formatMonthFr(from),
  }
}

function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export async function buildSalesReportMessage(params: {
  tenantId: string
  storeName: string
  currency: string
  period: SalesReportPeriod
  referenceDate?: Date
}) {
  const range = getReportDateRange(params.period, params.referenceDate)
  const summary = await analyticsRepository.dashboardSummary(params.tenantId, {
    from: range.from,
    to: range.to,
  })

  const text = salesReportMessage({
    period: params.period,
    storeName: params.storeName,
    periodLabel: range.periodLabel,
    totalOrders: summary.totalOrders,
    revenue: summary.revenue,
    avgBasket: summary.avgBasket,
    currency: params.currency,
  })

  return { text, periodKey: range.periodKey, summary }
}

export function getReportLogType(period: SalesReportPeriod): string {
  return `${period}_report`
}
