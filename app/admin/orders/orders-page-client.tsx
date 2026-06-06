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
  COMPLETED: "Réglée",
  PENDING: "En attente",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
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
          (o.customerName?.toLowerCase().includes(q) ?? false) ||
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
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} commande{filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters ? ` · ${formatCurrency(filteredTotal)}` : ""}
          </p>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1.5" />
            Réinitialiser les filtres
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher n°, terminal, caissier, client…"
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
              <SelectItem value={ALL}>Tous les terminaux</SelectItem>
              {terminalOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {toTitleCase(t.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cashierFilter} onValueChange={setCashierFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Caissier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les caissiers</SelectItem>
              {cashierOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {toTitleCase(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les paiements</SelectItem>
              {paymentOptions.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les statuts</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Commande</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Terminal</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Caissier</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Paiement</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <span className="font-mono font-medium text-card-foreground">{order.orderNumber}</span>
                    <p className="text-xs text-muted-foreground">
                      {order.itemCount} article{order.itemCount !== 1 ? "s" : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-sm text-card-foreground">{toTitleCase(order.terminalName)}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {order.cashierName ? toTitleCase(order.cashierName) : "Non renseigné"}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {order.customerName ? toTitleCase(order.customerName) : "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{order.paymentMethod}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        order.status === "COMPLETED" && "bg-primary/10 text-primary",
                        order.status === "PENDING" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                        order.status === "CANCELLED" && "bg-destructive/10 text-destructive",
                        order.status === "REFUNDED" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-card-foreground whitespace-nowrap">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                      title="Voir le détail"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">Aucune commande trouvée</p>
            <p className="text-xs mt-1">
              {hasActiveFilters ? "Modifiez les filtres ou la recherche." : "Les commandes apparaîtront ici après les ventes."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
