"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { formatWithCurrency } from "@/lib/format-currency"
import { Receipt, Search, ChevronRight, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn, toTitleCase } from "@/lib/utils"

export interface OrderRow {
  id: string
  orderNumber: string
  createdAt: string
  total: number
  paymentMethod: string
  status: string
  terminalId: string
  terminalName: string
  customerName: string | null
  cashierName: string | null
  itemCount: number
}

const ALL = "__all__"

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "COMPLETED" && "bg-primary/10 text-primary",
        status === "PENDING" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        status === "CANCELLED" && "bg-destructive/10 text-destructive",
        status === "REFUNDED" && "bg-muted text-muted-foreground"
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

export function OrdersPageClient({
  orders,
  currency,
}: {
  orders: OrderRow[]
  currency: string
}) {
  const [search, setSearch] = useState("")
  const [terminalFilter, setTerminalFilter] = useState(ALL)
  const [cashierFilter, setCashierFilter] = useState(ALL)
  const [paymentFilter, setPaymentFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)

  const formatCurrency = (amount: number) => formatWithCurrency(amount, currency)

  const terminalOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of orders) {
      if (!map.has(o.terminalId)) map.set(o.terminalId, o.terminalName)
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [orders])

  const cashierOptions = useMemo(() => {
    const set = new Set<string>()
    for (const o of orders) {
      if (o.cashierName?.trim()) set.add(o.cashierName.trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [orders])

  const paymentOptions = useMemo(() => {
    const set = new Set<string>()
    for (const o of orders) set.add(o.paymentMethod)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [orders])

  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    for (const o of orders) set.add(o.status)
    return [...set].sort()
  }, [orders])

  const hasActiveFilters =
    terminalFilter !== ALL ||
    cashierFilter !== ALL ||
    paymentFilter !== ALL ||
    statusFilter !== ALL ||
    search.trim().length > 0

  const filtered = useMemo(() => {
    let result = orders

    if (terminalFilter !== ALL) {
      result = result.filter((o) => o.terminalId === terminalFilter)
    }
    if (cashierFilter !== ALL) {
      result = result.filter((o) => o.cashierName?.trim() === cashierFilter)
    }
    if (paymentFilter !== ALL) {
      result = result.filter((o) => o.paymentMethod === paymentFilter)
    }
    if (statusFilter !== ALL) {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.terminalName.toLowerCase().includes(q) ||
          (o.cashierName?.toLowerCase().includes(q) ?? false) ||
          o.paymentMethod.toLowerCase().includes(q)
      )
    }

    return result
  }, [orders, search, terminalFilter, cashierFilter, paymentFilter, statusFilter])

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, o) => sum + o.total, 0),
    [filtered]
  )

  const clearFilters = () => {
    setSearch("")
    setTerminalFilter(ALL)
    setCashierFilter(ALL)
    setPaymentFilter(ALL)
    setStatusFilter(ALL)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters ? (
              <>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{formatCurrency(filteredTotal)}</span>
              </>
            ) : null}
          </p>
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="w-full shrink-0 sm:w-auto"
          >
            <X className="mr-1.5 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, terminal, cashier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-card-foreground"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Select value={terminalFilter} onValueChange={setTerminalFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Terminal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All terminals</SelectItem>
              {terminalOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {toTitleCase(t.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cashierFilter} onValueChange={setCashierFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Cashier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All cashiers</SelectItem>
              {cashierOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {toTitleCase(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All payment methods</SelectItem>
              {paymentOptions.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Receipt className="mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm font-medium">No orders found</p>
            <p className="mt-1 text-xs">
              {hasActiveFilters ? "Try adjusting filters or search." : "Orders will appear here after sales."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile / tablet: card list */}
            <div className="divide-y divide-border lg:hidden">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block p-4 transition-colors hover:bg-secondary/30 active:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-card-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="font-mono text-sm font-semibold text-card-foreground">
                        {formatCurrency(order.total)}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{toTitleCase(order.terminalName)}</span>
                    <span>
                      {order.cashierName ? toTitleCase(order.cashierName) : "Not specified"}
                    </span>
                    <span>{order.paymentMethod}</span>
                    <span>
                      {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:px-5">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:px-5">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:px-5">
                      Terminal
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:table-cell xl:px-5">
                      Cashier
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:table-cell xl:px-5">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:px-5">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground xl:px-5">
                      Total
                    </th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 xl:px-5">
                        <span className="font-mono font-medium text-card-foreground">{order.orderNumber}</span>
                        <p className="text-xs text-muted-foreground">
                          {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground xl:px-5">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-card-foreground xl:px-5">
                        {toTitleCase(order.terminalName)}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground xl:table-cell xl:px-5">
                        {order.cashierName ? toTitleCase(order.cashierName) : "Not specified"}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground xl:table-cell xl:px-5">
                        {order.paymentMethod}
                      </td>
                      <td className="px-4 py-3 xl:px-5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-card-foreground xl:px-5">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                          title="View details"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
