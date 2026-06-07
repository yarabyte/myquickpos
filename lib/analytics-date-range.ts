import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns"
import { enUS } from "date-fns/locale"

export type AnalyticsPeriodPreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom"

export type ChartGranularity = "hour" | "day" | "month"

export interface AnalyticsDateRange {
  from: Date
  to: Date
  preset: AnalyticsPeriodPreset
  label: string
}

export const ANALYTICS_PERIOD_PRESETS: {
  id: AnalyticsPeriodPreset
  label: string
}[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "7 days" },
  { id: "last30", label: "30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "thisYear", label: "This year" },
]

export function getCurrentMonthLabel(date = new Date()): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function toDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseDateParam(value: string): Date {
  return startOfDay(new Date(`${value}T12:00:00`))
}

export function formatRangeLabel(from: Date, to: Date): string {
  const sameDay = toDateParam(from) === toDateParam(to)
  if (sameDay) {
    return format(from, "d MMM yyyy", { locale: enUS })
  }
  const sameYear = from.getFullYear() === to.getFullYear()
  if (sameYear) {
    return `${format(from, "d MMM", { locale: enUS })} – ${format(to, "d MMM yyyy", { locale: enUS })}`
  }
  return `${format(from, "d MMM yyyy", { locale: enUS })} – ${format(to, "d MMM yyyy", { locale: enUS })}`
}

export function getChartGranularity(from: Date, to: Date): ChartGranularity {
  const days = differenceInCalendarDays(endOfDay(to), startOfDay(from)) + 1
  if (days <= 1) return "hour"
  if (days <= 62) return "day"
  return "month"
}

export function getPresetRange(preset: AnalyticsPeriodPreset): AnalyticsDateRange {
  const now = new Date()
  switch (preset) {
    case "today":
      return {
        from: startOfDay(now),
        to: endOfDay(now),
        preset,
        label: "Today",
      }
    case "yesterday": {
      const day = subDays(now, 1)
      return {
        from: startOfDay(day),
        to: endOfDay(day),
        preset,
        label: "Yesterday",
      }
    }
    case "last7": {
      const from = startOfDay(subDays(now, 6))
      return {
        from,
        to: endOfDay(now),
        preset,
        label: "7 days",
      }
    }
    case "last30": {
      const from = startOfDay(subDays(now, 29))
      return {
        from,
        to: endOfDay(now),
        preset,
        label: "30 days",
      }
    }
    case "thisMonth":
      return {
        from: startOfMonth(now),
        to: endOfDay(now),
        preset,
        label: "This month",
      }
    case "lastMonth": {
      const prev = subMonths(now, 1)
      return {
        from: startOfMonth(prev),
        to: endOfMonth(prev),
        preset,
        label: "Last month",
      }
    }
    case "thisYear":
      return {
        from: startOfYear(now),
        to: endOfDay(now),
        preset,
        label: "This year",
      }
    default:
      return getPresetRange("last30")
  }
}

export function getCustomRange(from: Date, to: Date): AnalyticsDateRange {
  const start = startOfDay(from <= to ? from : to)
  const end = endOfDay(from <= to ? to : from)
  return {
    from: start,
    to: end,
    preset: "custom",
    label: formatRangeLabel(start, end),
  }
}

export function getDayKeysInRange(from: Date, to: Date): string[] {
  return eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) }).map(toDateParam)
}

export function getMonthKeysInRange(from: Date, to: Date): string[] {
  return eachMonthOfInterval({ start: startOfMonth(from), end: startOfMonth(to) }).map(
    (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  )
}
