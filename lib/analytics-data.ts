import type { Product } from "./pos-data"
import { products as defaultProducts, categories as defaultCategories } from "./pos-data"

// ── Seed-based pseudo-random for stable data ────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface HourlyData {
  hour: string
  revenue: number
  orders: number
}

export interface DailyData {
  day: string
  revenue: number
  orders: number
  avgTicket: number
}

export interface CategorySales {
  name: string
  revenue: number
  orders: number
  fill: string
}

export interface TopProduct {
  product: Product
  unitsSold: number
  revenue: number
}

export interface PaymentBreakdown {
  method: string
  amount: number
  count: number
  fill: string
}

export interface TerminalPerf {
  id: string
  name: string
  location: string
  revenue: number
  orders: number
  avgTicket: number
  status: "online" | "offline" | "maintenance"
}

export interface HourlyHeatmapRow {
  day: string
  hours: number[]
}

// ── Generator ───────────────────────────────────────────────────────────────

const CHART_FILLS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142, 71%, 55%)",
  "hsl(199, 89%, 60%)",
]

export function generateHourlyData(): HourlyData[] {
  const rand = seededRandom(2026)
  return Array.from({ length: 14 }, (_, i) => {
    const hour = i + 8
    const label = hour < 12 ? `${hour}AM` : hour === 12 ? "12PM" : `${hour - 12}PM`
    // Simulate realistic peaks: lunch (11-1), dinner (5-7)
    let multiplier = 1
    if (hour >= 11 && hour <= 13) multiplier = 2.5
    else if (hour >= 17 && hour <= 19) multiplier = 2.0
    else if (hour >= 14 && hour <= 16) multiplier = 0.6
    else if (hour >= 20) multiplier = 0.8

    const orders = Math.round((rand() * 12 + 4) * multiplier)
    const revenue = Math.round(orders * (rand() * 8 + 10) * 100) / 100
    return { hour: label, revenue, orders }
  })
}

export function generateWeeklyData(): DailyData[] {
  const rand = seededRandom(7777)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return days.map((day, i) => {
    // Weekends are busier
    const mult = i >= 5 ? 1.6 : 1
    const orders = Math.round((rand() * 40 + 50) * mult)
    const revenue = Math.round(orders * (rand() * 6 + 12) * 100) / 100
    const avgTicket = Math.round((revenue / orders) * 100) / 100
    return { day, revenue, orders, avgTicket }
  })
}

export function generateLast30Days(): DailyData[] {
  const rand = seededRandom(3030)
  const result: DailyData[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const mult = isWeekend ? 1.5 : 1
    const orders = Math.round((rand() * 45 + 40) * mult)
    const revenue = Math.round(orders * (rand() * 7 + 11) * 100) / 100
    const avgTicket = Math.round((revenue / orders) * 100) / 100
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    result.push({ day: label, revenue, orders, avgTicket })
  }
  return result
}

export function generateCategorySales(): CategorySales[] {
  const rand = seededRandom(5555)
  const roots = defaultCategories.filter((c) => c.id !== "all" && c.parentId === null)
  return roots.map((cat, i) => {
    const orders = Math.round(rand() * 80 + 20)
    const revenue = Math.round(orders * (rand() * 10 + 8) * 100) / 100
    return {
      name: cat.name,
      revenue,
      orders,
      fill: CHART_FILLS[i % CHART_FILLS.length],
    }
  })
}

export function generateTopProducts(): TopProduct[] {
  const rand = seededRandom(1234)
  return defaultProducts
    .map((p) => ({
      product: p,
      unitsSold: Math.round(rand() * 60 + 5),
      revenue: 0,
    }))
    .map((item) => ({
      ...item,
      revenue: Math.round(item.unitsSold * item.product.price * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
}

export function generatePaymentBreakdown(): PaymentBreakdown[] {
  return [
    { method: "Card", amount: 3842.50, count: 142, fill: CHART_FILLS[0] },
    { method: "Cash", amount: 1265.75, count: 68, fill: CHART_FILLS[1] },
    { method: "Mobile Pay", amount: 892.30, count: 34, fill: CHART_FILLS[2] },
    { method: "Gift Card", amount: 214.00, count: 12, fill: CHART_FILLS[3] },
  ]
}

// ── User / Cashier Performance ──────────────────────────────────────────────

export interface UserPerformance {
  userId: string
  name: string
  email: string
  status: "active" | "inactive"
  totalRevenue: number
  totalOrders: number
  avgTicket: number
  itemsPerOrder: number
  avgHandleTime: number // seconds
  refunds: number
  topProduct: string
  hourlyRevenue: { hour: string; revenue: number }[]
  weekdayRevenue: { day: string; revenue: number }[]
}

export function generateUserPerformance(): UserPerformance[] {
  const rand = seededRandom(4242)

  const cashiers = [
    { id: "user-02", name: "Alex Johnson", email: "alex@myquickpos.app", status: "active" as const },
    { id: "user-03", name: "Maria Garcia", email: "maria@myquickpos.app", status: "active" as const },
    { id: "user-04", name: "James Lee", email: "james@myquickpos.app", status: "active" as const },
  ]

  const topProducts = ["Classic Burger", "Pepperoni", "Fries", "Cola", "Margherita", "Cheese Burger"]

  return cashiers.map((cashier) => {
    const orders = Math.round(rand() * 80 + 40)
    const revenue = Math.round(orders * (rand() * 8 + 10) * 100) / 100
    const avgTicket = Math.round((revenue / orders) * 100) / 100
    const itemsPerOrder = Math.round((rand() * 2.5 + 1.5) * 10) / 10
    const avgHandleTime = Math.round(rand() * 90 + 45)
    const refunds = Math.round(rand() * 4)
    const topProduct = topProducts[Math.floor(rand() * topProducts.length)]

    const hourlyRevenue = Array.from({ length: 14 }, (_, i) => {
      const h = i + 8
      const label = h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`
      let mult = 1
      if (h >= 11 && h <= 13) mult = 2.5
      else if (h >= 17 && h <= 19) mult = 2.0
      else if (h >= 14 && h <= 16) mult = 0.5
      return { hour: label, revenue: Math.round((rand() * 40 + 10) * mult * 100) / 100 }
    })

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const weekdayRevenue = days.map((day, di) => ({
      day,
      revenue: Math.round((rand() * 200 + 80) * (di >= 5 ? 1.5 : 1) * 100) / 100,
    }))

    return {
      userId: cashier.id,
      name: cashier.name,
      email: cashier.email,
      status: cashier.status,
      totalRevenue: revenue,
      totalOrders: orders,
      avgTicket,
      itemsPerOrder,
      avgHandleTime,
      refunds,
      topProduct,
      hourlyRevenue,
      weekdayRevenue,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export function generateHeatmapData(): HourlyHeatmapRow[] {
  const rand = seededRandom(9999)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return days.map((day, di) => {
    const isWeekend = di >= 5
    const hours = Array.from({ length: 14 }, (_, hi) => {
      const hour = hi + 8
      let base = rand() * 8 + 2
      if (hour >= 11 && hour <= 13) base *= 2.5
      else if (hour >= 17 && hour <= 19) base *= 2.0
      else if (hour >= 14 && hour <= 16) base *= 0.5
      if (isWeekend) base *= 1.4
      return Math.round(base)
    })
    return { day, hours }
  })
}
