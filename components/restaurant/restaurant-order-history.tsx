"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getEstablishmentOrders,
  type EstablishmentOrderSummary,
} from "@/app/actions/table-orders"
import { formatWithCurrency } from "@/lib/format-currency"
import { toTitleCase, cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, RefreshCw, Pencil, Clock, CheckCircle2 } from "lucide-react"

interface RestaurantOrderHistoryProps {
  establishmentSlug: string
  currency: string
  onEditOrder: (order: EstablishmentOrderSummary) => void
  refreshKey?: number
}

type DatePreset = "today" | "yesterday" | "7days" | "custom"

function toDateInputValue(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getPresetRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date()
  switch (preset) {
    case "today":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
      }
    case "yesterday": {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return {
        from: startOfDay(y).toISOString(),
        to: endOfDay(y).toISOString(),
      }
    }
    case "7days": {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      return {
        from: startOfDay(from).toISOString(),
        to: endOfDay(now).toISOString(),
      }
    }
    default:
      return {}
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7days", label: "7 days" },
]

export function RestaurantOrderHistory({
  establishmentSlug,
  currency,
  onEditOrder,
  refreshKey = 0,
}: RestaurantOrderHistoryProps) {
  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, currency),
    [currency]
  )
  const [orders, setOrders] = useState<EstablishmentOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<DatePreset>("today")
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(new Date()))
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()))

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom && !customTo) return {}
      const fromDate = customFrom ? startOfDay(new Date(`${customFrom}T12:00:00`)) : undefined
      const toDate = customTo ? endOfDay(new Date(`${customTo}T12:00:00`)) : undefined
      return {
        from: fromDate?.toISOString(),
        to: toDate?.toISOString(),
      }
    }
    return getPresetRange(preset)
  }, [preset, customFrom, customTo])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const result = await getEstablishmentOrders({
      establishmentSlug,
      ...dateRange,
    })
    if (result.success) {
      setOrders(result.data)
    }
    setLoading(false)
  }, [establishmentSlug, dateRange])

  useEffect(() => {
    loadOrders()
  }, [loadOrders, refreshKey])

  const totals = useMemo(() => {
    let settled = 0
    let unsettled = 0
    let settledCount = 0
    let unsettledCount = 0
    for (const order of orders) {
      if (order.status === "PENDING") {
        unsettled += order.total
        unsettledCount += 1
      } else if (order.status === "COMPLETED") {
        settled += order.total
        settledCount += 1
      }
    }
    return { settled, unsettled, settledCount, unsettledCount }
  }, [orders])

  function handlePresetChange(next: DatePreset) {
    setPreset(next)
    if (next === "custom") {
      const today = toDateInputValue(new Date())
      setCustomFrom(today)
      setCustomTo(today)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">History</h2>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-2 px-3 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetChange(p.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors touch-manipulation",
                preset === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePresetChange("custom")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors touch-manipulation",
              preset === "custom"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Custom
          </button>
        </div>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-0.5">
              <label htmlFor="history-from" className="text-[10px] font-medium text-muted-foreground">
                From
              </label>
              <input
                id="history-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label htmlFor="history-to" className="text-[10px] font-medium text-muted-foreground">
                To
              </label>
              <input
                id="history-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom || undefined}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-medium text-primary">
              <CheckCircle2 className="h-3 w-3" />
              Paid
            </div>
            <p className="mt-1 text-sm font-bold font-mono text-card-foreground">
              {formatCurrency(totals.settled)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {totals.settledCount} order{totals.settledCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Unpaid
            </div>
            <p className="mt-1 text-sm font-bold font-mono text-card-foreground">
              {formatCurrency(totals.unsettled)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {totals.unsettledCount} order{totals.unsettledCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 pb-3">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <RefreshCw className="mb-2 h-8 w-8 animate-spin opacity-40" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <History className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">No orders for this period</p>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {orders.map((order) => {
              const isPending = order.status === "PENDING"
              return (
                <div
                  key={order.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {order.orderLabel
                          ? toTitleCase(order.orderLabel)
                          : order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {order.orderNumber} · {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/15 text-primary"
                      )}
                    >
                      {isPending ? (
                        <>
                          <Clock className="h-3 w-3" />
                          Pending
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {order.items.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-xs text-muted-foreground truncate">
                        {item.quantity}× {toTitleCase(item.productName)}
                      </p>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{order.items.length - 3} item(s)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold font-mono text-card-foreground">
                      {formatCurrency(order.total)}
                    </span>
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onEditOrder(order)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors touch-manipulation"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
