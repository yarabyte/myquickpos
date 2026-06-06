import { prisma } from "@/lib/db"
import {
  getChartGranularity,
  getDayKeysInRange,
  getMonthKeysInRange,
  parseDateParam,
} from "@/lib/analytics-date-range"
import { endOfDay, startOfDay } from "date-fns"

type DateRange = { from: Date; to: Date }

const CHART_FILLS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function completedOrderWhere(tenantId: string, range: DateRange) {
  return {
    tenantId,
    status: "COMPLETED" as const,
    createdAt: { gte: range.from, lte: range.to },
  }
}

export const analyticsRepository = {
  revenueByDay: async (tenantId: string, days: number) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    return analyticsRepository.revenueByDayRange(tenantId, { from, to: new Date() })
  },

  revenueByDayRange: async (tenantId: string, range: DateRange) => {
    const orders = await prisma.order.findMany({
      where: completedOrderWhere(tenantId, range),
      select: { total: true, createdAt: true },
    })
    const byDay = new Map<string, { revenue: number; orders: number }>()
    for (const key of getDayKeysInRange(range.from, range.to)) {
      byDay.set(key, { revenue: 0, orders: 0 })
    }
    for (const o of orders) {
      const d = o.createdAt.toISOString().slice(0, 10)
      const prev = byDay.get(d)
      if (!prev) continue
      prev.revenue += Number(o.total)
      prev.orders += 1
      byDay.set(d, prev)
    }
    return Array.from(byDay.entries()).map(([day, v]) => ({
      day,
      label: new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      revenue: v.revenue,
      orders: v.orders,
      avgTicket: v.orders ? v.revenue / v.orders : 0,
    }))
  },

  revenueByHour: async (tenantId: string) => {
    const now = new Date()
    return analyticsRepository.revenueByHourForDate(tenantId, now)
  },

  revenueByHourForDate: async (tenantId: string, date: Date) => {
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    const orders = await prisma.order.findMany({
      where: completedOrderWhere(tenantId, { from: dayStart, to: dayEnd }),
      select: { total: true, createdAt: true },
    })
    const byHour = new Map<number, { revenue: number; orders: number }>()
    for (let h = 0; h < 24; h++) byHour.set(h, { revenue: 0, orders: 0 })
    for (const o of orders) {
      const h = o.createdAt.getHours()
      const prev = byHour.get(h) ?? { revenue: 0, orders: 0 }
      prev.revenue += Number(o.total)
      prev.orders += 1
      byHour.set(h, prev)
    }
    const labels = Array.from({ length: 24 }, (_, i) =>
      i < 12 ? `${i === 0 ? 12 : i}h` : i === 12 ? "12h" : `${i - 12}h`
    )
    return labels.map((hour, i) => {
      const v = byHour.get(i) ?? { revenue: 0, orders: 0 }
      return { hour, revenue: v.revenue, orders: v.orders, avgTicket: v.orders ? v.revenue / v.orders : 0 }
    })
  },

  revenueByMonth: async (tenantId: string, year: number) => {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    return analyticsRepository.revenueByMonthRange(tenantId, { from: start, to: end })
  },

  revenueByMonthRange: async (tenantId: string, range: DateRange) => {
    const orders = await prisma.order.findMany({
      where: completedOrderWhere(tenantId, range),
      select: { total: true, createdAt: true },
    })
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const byMonth = new Map<string, { revenue: number; orders: number }>()
    for (const key of getMonthKeysInRange(range.from, range.to)) {
      byMonth.set(key, { revenue: 0, orders: 0 })
    }
    for (const o of orders) {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`
      const prev = byMonth.get(key)
      if (!prev) continue
      prev.revenue += Number(o.total)
      prev.orders += 1
      byMonth.set(key, prev)
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [, monthStr] = key.split("-")
        const monthIndex = Number(monthStr) - 1
        return {
          month: monthNames[monthIndex] ?? key,
          revenue: v.revenue,
          orders: v.orders,
          avgTicket: v.orders ? v.revenue / v.orders : 0,
        }
      })
  },

  async revenueChartForRange(tenantId: string, range: DateRange) {
    const granularity = getChartGranularity(range.from, range.to)
    if (granularity === "hour") {
      const data = await analyticsRepository.revenueByHourForDate(tenantId, range.from)
      return { granularity, data, xKey: "hour" as const }
    }
    if (granularity === "day") {
      const data = await analyticsRepository.revenueByDayRange(tenantId, range)
      return { granularity, data, xKey: "label" as const }
    }
    const data = await analyticsRepository.revenueByMonthRange(tenantId, range)
    return { granularity, data, xKey: "month" as const }
  },

  topProducts: async (tenantId: string, limit: number, range?: DateRange) => {
    const items = await prisma.orderItem.findMany({
      where: {
        order: range
          ? completedOrderWhere(tenantId, range)
          : { tenantId, status: "COMPLETED" },
      },
      include: { product: true },
    })
    const agg = new Map<
      string,
      { product: { id: string; name: string; price: unknown }; unitsSold: number; revenue: number }
    >()
    for (const item of items) {
      const pid = item.productId
      const prev = agg.get(pid)
      const revenue = Number(item.total)
      const unitsSold = item.quantity
      if (prev) {
        prev.unitsSold += unitsSold
        prev.revenue += revenue
      } else {
        agg.set(pid, { product: item.product, unitsSold, revenue })
      }
    }
    return Array.from(agg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((p) => ({
        product: { id: p.product.id, name: p.product.name, price: Number(p.product.price) },
        unitsSold: p.unitsSold,
        revenue: p.revenue,
      }))
  },

  /** Today's revenue and order count per terminal (for dashboard/terminal cards) */
  todayStatsByTerminal: async (tenantId: string) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const orders = await prisma.order.groupBy({
      by: ["terminalId"],
      where: {
        tenantId,
        status: "COMPLETED",
        createdAt: { gte: startOfDay },
      },
      _sum: { total: true },
      _count: true,
    })
    return orders.map((o) => ({
      terminalId: o.terminalId,
      revenue: Number(o._sum.total ?? 0),
      orders: o._count,
    }))
  },

  conversionByTerminal: async (tenantId: string, range?: DateRange) => {
    const terminals = await prisma.terminal.findMany({
      where: { tenantId },
      include: { _count: { select: { orders: true } } },
    })
    const orders = await prisma.order.groupBy({
      by: ["terminalId"],
      where: range
        ? completedOrderWhere(tenantId, range)
        : { tenantId, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    })
    const ordersMap = new Map(orders.map((o) => [o.terminalId, { count: o._count, revenue: Number(o._sum.total ?? 0) }]))
    return terminals.map((t) => ({
      id: t.id,
      name: t.name,
      label: t.label,
      orders: ordersMap.get(t.id)?.count ?? 0,
      revenue: ordersMap.get(t.id)?.revenue ?? 0,
    }))
  },

  revenueByCategory: async (tenantId: string, days: number = 30, range?: DateRange) => {
    const dateRange =
      range ??
      (() => {
        const from = new Date()
        from.setDate(from.getDate() - days)
        return { from, to: new Date() }
      })()
    const items = await prisma.orderItem.findMany({
      where: { order: completedOrderWhere(tenantId, dateRange) },
      include: { product: { select: { categoryId: true } } },
    })
    const byCategory = new Map<string, { revenue: number; orders: number }>()
    for (const item of items) {
      const cid = item.product.categoryId
      const prev = byCategory.get(cid) ?? { revenue: 0, orders: 0 }
      prev.revenue += Number(item.total)
      prev.orders += 1
      byCategory.set(cid, prev)
    }
    const categoryIds = Array.from(byCategory.keys())
    if (categoryIds.length === 0) return []
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, tenantId },
      select: { id: true, name: true },
    })
    const nameById = new Map(categories.map((c) => [c.id, c.name]))
    return Array.from(byCategory.entries())
      .map(([id, v]) => ({ name: nameById.get(id) ?? id, revenue: v.revenue, orders: v.orders }))
      .sort((a, b) => b.revenue - a.revenue)
  },

  revenueByPaymentMethod: async (tenantId: string, days: number = 30, range?: DateRange) => {
    const dateRange =
      range ??
      (() => {
        const from = new Date()
        from.setDate(from.getDate() - days)
        return { from, to: new Date() }
      })()
    const orders = await prisma.order.findMany({
      where: completedOrderWhere(tenantId, dateRange),
      select: { total: true, paymentMethod: true },
    })
    const byMethod = new Map<string, { amount: number; count: number }>()
    for (const o of orders) {
      const m = o.paymentMethod?.trim() || "Other"
      const prev = byMethod.get(m) ?? { amount: 0, count: 0 }
      prev.amount += Number(o.total)
      prev.count += 1
      byMethod.set(m, prev)
    }
    return Array.from(byMethod.entries())
      .map(([method, v]) => ({ method, amount: v.amount, count: v.count }))
      .sort((a, b) => b.amount - a.amount)
  },

  dashboardSummary: async (tenantId: string, range?: DateRange) => {
    const dateRange =
      range ??
      (() => {
        const from = new Date()
        from.setDate(from.getDate() - 30)
        return { from, to: new Date() }
      })()
    const [orderCount, orderSum, customerCount, lowStockIds] = await Promise.all([
      prisma.order.count({
        where: completedOrderWhere(tenantId, dateRange),
      }),
      prisma.order.aggregate({
        where: completedOrderWhere(tenantId, dateRange),
        _sum: { total: true },
      }),
      prisma.customer.count({ where: { tenantId } }),
      import("@/lib/repositories/product.repository").then(({ productRepository }) =>
        productRepository.getLowStockProductIds(tenantId)
      ),
    ])
    const lowStock = lowStockIds.size
    const revenue = Number(orderSum._sum.total ?? 0)
    const avgBasket = orderCount ? revenue / orderCount : 0
    return {
      totalOrders: orderCount,
      revenue,
      avgBasket,
      customerCount,
      stockAlerts: lowStock,
    }
  },

  async analyticsBundleForRange(tenantId: string, fromParam: string, toParam: string) {
    const range = {
      from: parseDateParam(fromParam),
      to: endOfDay(parseDateParam(toParam)),
    }
    const [
      revenueChart,
      revenueByCategory,
      revenueByPaymentMethod,
      topProducts,
      conversionByTerminal,
      summary,
    ] = await Promise.all([
      analyticsRepository.revenueChartForRange(tenantId, range),
      analyticsRepository.revenueByCategory(tenantId, 30, range),
      analyticsRepository.revenueByPaymentMethod(tenantId, 30, range),
      analyticsRepository.topProducts(tenantId, 10, range),
      analyticsRepository.conversionByTerminal(tenantId, range),
      analyticsRepository.dashboardSummary(tenantId, range),
    ])

    const categorySalesWithFill = revenueByCategory.map((c, i) => ({
      ...c,
      fill: CHART_FILLS[i % CHART_FILLS.length],
    }))
    const paymentWithFill = revenueByPaymentMethod.map((p, i) => ({
      ...p,
      fill: CHART_FILLS[i % CHART_FILLS.length],
    }))
    const terminalConversion = conversionByTerminal.map((t) => {
      const orderCount = typeof t.orders === "number" ? t.orders : 0
      return {
        id: t.id,
        name: t.name,
        label: t.label,
        revenue: t.revenue,
        orders: orderCount,
        avgTicket: orderCount > 0 ? t.revenue / orderCount : 0,
        status: "online" as const,
      }
    })
    const topProductsForClient = topProducts.map((p) => ({
      product: p.product,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
    }))

    return {
      rangeLabel: `${fromParam}_${toParam}`,
      revenueChart,
      revenueByCategory: categorySalesWithFill,
      revenueByPaymentMethod: paymentWithFill,
      topProducts: topProductsForClient,
      conversionByTerminal: terminalConversion,
      summary,
    }
  },

  stockAlerts: async (tenantId: string) => {
    const { productRepository } = await import("@/lib/repositories/product.repository")
    return productRepository.getLowStock(tenantId)
  },
}
