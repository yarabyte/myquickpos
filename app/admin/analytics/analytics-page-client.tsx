"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
} from "lucide-react"
import { cn, toTitleCase } from "@/lib/utils"
import { formatWithCurrency } from "@/lib/format-currency"

type Period = "today" | "week" | "month"

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "By Month" },
]

function ChartTooltip({
  active,
  payload,
  label,
  formatCurrency,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: string
  formatCurrency: (amount: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-card-foreground font-mono">
            {p.dataKey === "revenue" || p.dataKey === "avgTicket" ? formatCurrency(Number(p.value)) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  change,
  icon: Icon,
}: {
  label: string
  value: string
  sub: string
  change: number
  icon: React.ElementType
}) {
  const isPositive = change >= 0
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-card-foreground font-mono">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}

const CHART_FILLS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]
const CHART_FILLS_FALLBACK = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"]

export interface ServerData {
  revenueByDay: { day: string; revenue: number; orders: number; avgTicket: number }[]
  revenueByHour: { hour: string; revenue: number; orders: number }[]
  revenueByCategory: { name: string; revenue: number; orders: number; fill: string }[]
  revenueByPaymentMethod: { method: string; amount: number; count: number; fill: string }[]
  topProducts: { product: { id: string; name: string; price: number }; unitsSold: number; revenue: number }[]
  conversionByTerminal: { id: string; name: string; label: string; revenue: number; orders: number; avgTicket: number; status: string }[]
  summary: { revenue: number; totalOrders: number; avgBasket: number; customerCount: number; stockAlerts: number }
  terminalCount: number
  activeTerminalCount: number
}

export function AnalyticsPageClient({
  currency = "USD",
  serverData,
}: {
  currency?: string
  serverData: ServerData
}) {
  const [period, setPeriod] = useState<Period>("month")
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; orders: number; avgTicket: number }[]>([])
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const formatCurrency = useCallback((amount: number) => formatWithCurrency(amount, currency), [currency])

  const weeklyFromServer = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const byDay = new Map(serverData.revenueByDay.map((r) => [r.day, r]))
    const result: { day: string; revenue: number; orders: number; avgTicket: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const row = byDay.get(iso)
      const dayLabel = dayNames[d.getDay()]
      result.push({
        day: dayLabel,
        revenue: row?.revenue ?? 0,
        orders: row?.orders ?? 0,
        avgTicket: row?.avgTicket ?? 0,
      })
    }
    return result
  }, [serverData.revenueByDay])

  useEffect(() => {
    if (period !== "month") return
    setMonthlyLoading(true)
    fetch(`/admin/analytics/revenue-by-month?year=${selectedYear}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMonthlyData(Array.isArray(data) ? data : []))
      .catch(() => setMonthlyData([]))
      .finally(() => setMonthlyLoading(false))
  }, [period, selectedYear])

  const chartData =
    period === "today"
      ? serverData.revenueByHour
      : period === "week"
        ? weeklyFromServer
        : period === "month"
          ? monthlyData
          : serverData.revenueByDay
  const revenueXKey = period === "today" ? "hour" : period === "month" ? "month" : "day"
  const categorySales = serverData.revenueByCategory
  const payments = serverData.revenueByPaymentMethod

  const totalRevenue = serverData.summary.revenue
  const totalOrders = serverData.summary.totalOrders
  const avgTicket = serverData.summary.avgBasket
  const onlineTerminals = serverData.activeTerminalCount
  const terminalCount = serverData.terminalCount

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Sales performance and business insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-1 gap-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  period === p.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-card-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "month" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          sub="Last 30 days"
          change={0}
          icon={DollarSign}
        />
        <StatCard
          label="Total Orders"
          value={totalOrders.toString()}
          sub="Last 30 days"
          change={0}
          icon={ShoppingCart}
        />
        <StatCard
          label="Avg. Ticket"
          value={formatCurrency(avgTicket)}
          sub="Per transaction"
          change={0}
          icon={TrendingUp}
        />
        <StatCard
          label="Active Terminals"
          value={`${onlineTerminals}/${terminalCount}`}
          sub={`${terminalCount - onlineTerminals} offline`}
          change={0}
          icon={Monitor}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-6">
            Revenue
            {period === "month" && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">by month · {selectedYear}</span>
            )}
          </h2>
          {period === "month" && monthlyLoading ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey={revenueXKey} className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={(props) => <ChartTooltip {...props} formatCurrency={formatCurrency} />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="url(#fillRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-1">Sales by Category</h2>
          <p className="text-xs text-muted-foreground mb-6">Revenue per category</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-full sm:w-[55%] min-h-[260px] h-[260px]">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={categorySales}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={2}
                  >
                    {categorySales.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={entry.fill ?? CHART_FILLS_FALLBACK[i % CHART_FILLS_FALLBACK.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0].payload as { name: string; revenue: number }
                      const total = categorySales.reduce((s, c) => s + c.revenue, 0)
                      const percent = total > 0 ? (p.revenue / total) * 100 : 0
                      return (
                        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
                          <p className="text-sm font-semibold text-card-foreground">{toTitleCase(p.name)}</p>
                          <p className="text-lg font-bold text-primary font-mono mt-0.5">
                            {formatCurrency(p.revenue)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(percent).toFixed(1)}% of total
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-[45%] space-y-2">
              {categorySales.map((entry, i) => {
                const total = categorySales.reduce((s, c) => s + c.revenue, 0)
                const percent = total > 0 ? (entry.revenue / total) * 100 : 0
                return (
                  <div
                    key={entry.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.fill ?? CHART_FILLS_FALLBACK[i % CHART_FILLS_FALLBACK.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{toTitleCase(entry.name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(entry.revenue)} · {(percent).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-1">Payment Methods</h2>
          <p className="text-xs text-muted-foreground mb-6">Revenue by payment type</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={payments}
              margin={{ top: 24, right: 24, left: 24, bottom: 8 }}
              barCategoryGap="20%"
              barGap={8}
            >
              <defs>
                {payments.map((entry, i) => (
                  <linearGradient key={i} id={`paymentBar-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                    <stop offset="100%" stopColor={entry.fill} stopOpacity={0.75} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
              <XAxis
                dataKey="method"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                className="text-xs"
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as { method: string; amount: number; count: number }
                  return (
                    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
                      <p className="text-sm font-semibold text-card-foreground">{p.method}</p>
                      <p className="text-lg font-bold text-primary font-mono mt-0.5">
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{p.count} transactions</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={72}>
                <LabelList
                  dataKey="amount"
                  position="top"
                  formatter={(v: number) => formatCurrency(v)}
                  content={({ x, y, width, value }) => {
                    if (value == null) return null
                    const text = formatCurrency(Number(value))
                    const padding = 6
                    const lineHeight = 14
                    const boxWidth = Math.max(width, text.length * 7 + padding * 2)
                    const boxHeight = lineHeight + padding * 2
                    const gap = 4
                    return (
                      <g transform={`translate(${x + width / 2},${y})`}>
                        <rect
                          x={-boxWidth / 2}
                          y={-boxHeight - gap}
                          width={boxWidth}
                          height={boxHeight}
                          rx={6}
                          ry={6}
                          fill="hsl(var(--card))"
                          stroke="hsl(var(--border))"
                          strokeWidth={1}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          y={-gap - boxHeight / 2}
                          style={{ fontSize: 12, fontWeight: 600 }}
                          fill="hsl(var(--card-foreground))"
                        >
                          {text}
                        </text>
                      </g>
                    )
                  }}
                />
                {payments.map((entry, i) => (
                  <Cell key={entry.method} fill={`url(#paymentBar-${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-4">Top Products</h2>
          <div className="space-y-3">
            {serverData.topProducts.slice(0, 5).map((p, i) => (
              <div key={p.product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono w-6">{i + 1}</span>
                  <span className="font-medium text-card-foreground">{toTitleCase(p.product.name)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{p.unitsSold} sold</span>
                  <span className="font-mono font-semibold text-card-foreground">{formatCurrency(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-4">Terminal Performance</h2>
          <div className="space-y-3">
            {serverData.conversionByTerminal.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-card-foreground">{toTitleCase(t.name)}</p>
                  <p className="text-xs text-muted-foreground">{toTitleCase(t.label)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-card-foreground">{formatCurrency(t.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{t.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
