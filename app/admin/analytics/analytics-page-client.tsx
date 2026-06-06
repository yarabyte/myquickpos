"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
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
import {
  AnalyticsPeriodPicker,
  analyticsRangeToParams,
} from "@/components/admin/analytics-period-picker"
import {
  getPresetRange,
  type AnalyticsDateRange,
} from "@/lib/analytics-date-range"

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

type AnalyticsBundle = {
  revenueChart: {
    granularity: "hour" | "day" | "month"
    data: Record<string, string | number>[]
    xKey: "hour" | "label" | "month"
  }
  revenueByCategory: ServerData["revenueByCategory"]
  revenueByPaymentMethod: ServerData["revenueByPaymentMethod"]
  topProducts: ServerData["topProducts"]
  conversionByTerminal: ServerData["conversionByTerminal"]
  summary: ServerData["summary"]
}

function serverDataToBundle(serverData: ServerData): AnalyticsBundle {
  const dayChart = serverData.revenueByDay.map((row) => ({
    label: new Date(`${row.day}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    }),
    revenue: row.revenue,
    orders: row.orders,
    avgTicket: row.avgTicket,
  }))
  return {
    revenueChart: {
      granularity: "day",
      data: dayChart,
      xKey: "label",
    },
    revenueByCategory: serverData.revenueByCategory,
    revenueByPaymentMethod: serverData.revenueByPaymentMethod,
    topProducts: serverData.topProducts,
    conversionByTerminal: serverData.conversionByTerminal,
    summary: serverData.summary,
  }
}

export function AnalyticsPageClient({
  currency = "USD",
  serverData,
}: {
  currency?: string
  serverData: ServerData
}) {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() => getPresetRange("last30"))
  const [analytics, setAnalytics] = useState<AnalyticsBundle>(() => serverDataToBundle(serverData))
  const [loading, setLoading] = useState(false)
  const skipInitialFetch = useRef(true)
  const formatCurrency = useCallback((amount: number) => formatWithCurrency(amount, currency), [currency])

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }
    const { from, to } = analyticsRangeToParams(dateRange)
    setLoading(true)
    fetch(`/admin/analytics/data?from=${from}&to=${to}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.revenueChart) setAnalytics(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateRange])

  const chartData = analytics.revenueChart.data
  const revenueXKey = analytics.revenueChart.xKey
  const categorySales = analytics.revenueByCategory
  const payments = analytics.revenueByPaymentMethod

  const totalRevenue = analytics.summary.revenue
  const totalOrders = analytics.summary.totalOrders
  const avgTicket = analytics.summary.avgBasket
  const onlineTerminals = serverData.activeTerminalCount
  const terminalCount = serverData.terminalCount
  const periodSub = dateRange.label

  const chartTitle = useMemo(() => {
    switch (analytics.revenueChart.granularity) {
      case "hour":
        return "Revenus par heure"
      case "month":
        return "Revenus par mois"
      default:
        return "Revenus par jour"
    }
  }, [analytics.revenueChart.granularity])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance des ventes et indicateurs clés</p>
        </div>
        <AnalyticsPeriodPicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires"
          value={formatCurrency(totalRevenue)}
          sub={periodSub}
          change={0}
          icon={DollarSign}
        />
        <StatCard
          label="Commandes"
          value={totalOrders.toString()}
          sub={periodSub}
          change={0}
          icon={ShoppingCart}
        />
        <StatCard
          label="Panier moyen"
          value={formatCurrency(avgTicket)}
          sub="Par transaction"
          change={0}
          icon={TrendingUp}
        />
        <StatCard
          label="Terminaux actifs"
          value={`${onlineTerminals}/${terminalCount}`}
          sub={`${terminalCount - onlineTerminals} hors ligne`}
          change={0}
          icon={Monitor}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-6">
            {chartTitle}
            <span className="ml-2 text-sm font-normal text-muted-foreground">· {periodSub}</span>
          </h2>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Chargement…
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
          <h2 className="text-base font-semibold text-card-foreground mb-1">Ventes par catégorie</h2>
          <p className="text-xs text-muted-foreground mb-6">Revenus par catégorie · {periodSub}</p>
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
                            {(percent).toFixed(1)}% du total
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
          <h2 className="text-base font-semibold text-card-foreground mb-1">Modes de paiement</h2>
          <p className="text-xs text-muted-foreground mb-6">Revenus par type · {periodSub}</p>
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
          <h2 className="text-base font-semibold text-card-foreground mb-4">Produits les plus vendus</h2>
          <div className="space-y-3">
            {analytics.topProducts.slice(0, 5).map((p, i) => (
              <div key={p.product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono w-6">{i + 1}</span>
                  <span className="font-medium text-card-foreground">{toTitleCase(p.product.name)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{p.unitsSold} vendus</span>
                  <span className="font-mono font-semibold text-card-foreground">{formatCurrency(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-card-foreground mb-4">Performance par terminal</h2>
          <div className="space-y-3">
            {analytics.conversionByTerminal.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-card-foreground">{toTitleCase(t.name)}</p>
                  <p className="text-xs text-muted-foreground">{toTitleCase(t.label)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-card-foreground">{formatCurrency(t.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{t.orders} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
