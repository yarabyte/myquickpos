"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn, toTitleCase } from "@/lib/utils"
import { formatWithCurrency } from "@/lib/format-currency"
import { addRestock, addAdjustment, addQuickDelta, addTransferBatch } from "@/app/actions/stock"
import { getCategoryIcon } from "@/lib/category-icons"
import {
  Search,
  Warehouse,
  PackagePlus,
  ClipboardCheck,
  AlertTriangle,
  PackageX,
  DollarSign,
  Layers,
  Plus,
  Minus,
  ArrowRight,
  Truck,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const INVENTORY_PAGE_SIZE = 15
const MOVEMENTS_PAGE_SIZE = 15

type Tab = "inventory" | "movements"
type StatusFilter = "all" | "ok" | "low" | "out"
type MovementFilter = "all" | "IN" | "OUT" | "ADJUSTMENT"

interface ProductRow {
  id: string
  name: string
  price: number
  category: string
  image?: string
  stock: number
  stockByStore?: Record<string, number>
  minStock: number
}

interface MovementRow {
  id: string
  type: "IN" | "OUT" | "ADJUSTMENT"
  productId: string
  productName: string
  quantity: number
  reason: string
  fromLocation?: string
  toLocation?: string
  fromStoreName?: string
  toStoreName?: string
  date: string
}

interface StoreOption {
  id: string
  name: string
  isCentral: boolean
}

interface StockPageClientProps {
  currency?: string
  products: ProductRow[]
  categories: Map<string, { id: string; name: string; icon: string | null; parentId: string | null }>
  movements: MovementRow[]
  stores: StoreOption[]
  centralStoreId: string | null
  kpis: {
    totalSkus: number
    totalUnits: number
    lowCount: number
    outCount: number
    totalValue: number
  }
}

export function StockPageClient({
  currency = "USD",
  products: initialProducts,
  categories,
  movements: initialMovements,
  stores,
  centralStoreId,
  kpis: initialKpis,
}: StockPageClientProps) {
  const router = useRouter()
  const formatCurrency = (amount: number) => formatWithCurrency(amount, currency)
  const [products, setProducts] = useState(initialProducts)
  const [movements, setMovements] = useState(initialMovements)
  const [kpis, setKpis] = useState(initialKpis)
  const [tab, setTab] = useState<Tab>("inventory")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all")
  const [restockOpen, setRestockOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [storeFilterId, setStoreFilterId] = useState<string>("")
  const [inventoryPage, setInventoryPage] = useState(1)
  const [movementsPage, setMovementsPage] = useState(1)
  const adjustmentStoreId = storeFilterId || (centralStoreId ?? stores[0]?.id ?? "")

  useEffect(() => {
    setProducts(initialProducts)
    setMovements(initialMovements)
    setKpis(initialKpis)
  }, [initialProducts, initialMovements, initialKpis])

  const getStatus = (stock: number, minStock: number): "ok" | "low" | "out" => {
    if (stock <= 0) return "out"
    if (stock <= minStock) return "low"
    return "ok"
  }

  const inventoryRows = useMemo(() => {
    return products.map((p) => {
      const cat = categories.get(p.category)
      const effectiveStock = storeFilterId
        ? (p.stockByStore?.[storeFilterId] ?? 0)
        : p.stock
      const status = getStatus(effectiveStock, p.minStock)
      return {
        ...p,
        stock: effectiveStock,
        categoryInfo: cat,
        status,
      }
    })
  }, [products, categories, storeFilterId])

  const getDescendantCategoryIds = useCallback(
    (categoryId: string): string[] => {
      const ids: string[] = [categoryId]
      for (const c of categories.values()) {
        if (c.parentId === categoryId) {
          ids.push(...getDescendantCategoryIds(c.id))
        }
      }
      return ids
    },
    [categories]
  )

  const filteredInventory = useMemo(() => {
    let rows = inventoryRows
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (categoryFilter !== "all") {
      const allowedIds = new Set(getDescendantCategoryIds(categoryFilter))
      rows = rows.filter((r) => allowedIds.has(r.category))
    }
    return rows
  }, [inventoryRows, search, statusFilter, categoryFilter, getDescendantCategoryIds])

  const filteredMovements = useMemo(() => {
    let mvs = movements
    if (movementFilter !== "all") {
      mvs = mvs.filter((m) => m.type === movementFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      mvs = mvs.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          (m.reason || "").toLowerCase().includes(q)
      )
    }
    return mvs
  }, [movements, movementFilter, search])

  useEffect(() => {
    setInventoryPage(1)
  }, [search, statusFilter, categoryFilter, storeFilterId])

  useEffect(() => {
    setMovementsPage(1)
  }, [search, movementFilter])

  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventory.length / INVENTORY_PAGE_SIZE))
  const totalMovementsPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENTS_PAGE_SIZE))

  const paginatedInventory = useMemo(() => {
    const start = (inventoryPage - 1) * INVENTORY_PAGE_SIZE
    return filteredInventory.slice(start, start + INVENTORY_PAGE_SIZE)
  }, [filteredInventory, inventoryPage])

  const paginatedMovements = useMemo(() => {
    const start = (movementsPage - 1) * MOVEMENTS_PAGE_SIZE
    return filteredMovements.slice(start, start + MOVEMENTS_PAGE_SIZE)
  }, [filteredMovements, movementsPage])

  const categoryTree = useMemo(() => {
    const list = Array.from(categories.values()).filter((c) => c.id !== "all")
    const roots = list.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name))
    const byParent = new Map<string | null, typeof list>()
    for (const c of list) {
      const key = c.parentId ?? null
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key)!.push(c)
    }
    return roots.map((root) => ({
      ...root,
      children: (byParent.get(root.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }))
  }, [categories])

  const handleQuickDelta = useCallback(
    async (productId: string, delta: number) => {
      if (!adjustmentStoreId) return
      const r = await addQuickDelta(
        productId,
        adjustmentStoreId,
        delta,
        delta > 0 ? "Quick add" : "Quick deduct"
      )
      if (r.success) router.refresh()
    },
    [router, adjustmentStoreId]
  )

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    )
  }

  const statusBadge = (status: "ok" | "low" | "out") => {
    const map = {
      ok: "bg-emerald-500/10 text-emerald-500",
      low: "bg-yellow-500/10 text-yellow-500",
      out: "bg-red-500/10 text-red-500",
    }
    const label = { ok: "In Stock", low: "Low Stock", out: "Out of Stock" }
    return (
      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", map[status])}>
        {label[status]}
      </span>
    )
  }

  const movementBadge = (type: "IN" | "OUT" | "ADJUSTMENT") => {
    const map = {
      IN: "bg-emerald-500/10 text-emerald-500",
      OUT: "bg-blue-500/10 text-blue-500",
      ADJUSTMENT: "bg-yellow-500/10 text-yellow-500",
    }
    const label = { IN: "Restock", OUT: "Sale", ADJUSTMENT: "Adjust" }
    return (
      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", map[type])}>
        {label[type]}
      </span>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Stock Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Product inventory and movements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setRestockOpen(true)}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <PackagePlus className="h-4 w-4" />
            Restock (central)
          </Button>
          <Button
            onClick={() => setTransferOpen(true)}
            variant="outline"
            className="gap-2 border-border text-card-foreground hover:bg-secondary"
          >
            <ArrowRight className="h-4 w-4" />
            Transfer
          </Button>
          <Button
            onClick={() => setAdjustOpen(true)}
            variant="outline"
            className="gap-2 border-border text-card-foreground hover:bg-secondary"
          >
            <ClipboardCheck className="h-4 w-4" />
            Adjust
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total SKUs", value: kpis.totalSkus.toString(), icon: Layers, color: "text-primary" },
          { label: "Units in Stock", value: kpis.totalUnits.toLocaleString(), icon: Warehouse, color: "text-primary" },
          {
            label: "Low Stock Alerts",
            value: kpis.lowCount.toString(),
            icon: AlertTriangle,
            color: kpis.lowCount > 0 ? "text-yellow-500" : "text-muted-foreground",
          },
          {
            label: "Out of Stock",
            value: kpis.outCount.toString(),
            icon: PackageX,
            color: kpis.outCount > 0 ? "text-red-500" : "text-muted-foreground",
          },
          {
            label: "Total Value",
            value: formatCurrency(kpis.totalValue),
            icon: DollarSign,
            color: "text-primary",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <kpi.icon className={cn("h-5 w-5", kpi.color)} />
            <p className={cn("text-xl font-bold font-mono", kpi.color)} suppressHydrationWarning>
              {kpi.value}
            </p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/20 p-1">
        {[
          { id: "inventory" as Tab, label: "Inventory" },
          { id: "movements" as Tab, label: "Movements" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all",
              tab === t.id
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "inventory" ? "Search products..." : "Search movements..."}
            className="pl-10 bg-secondary border-border text-card-foreground"
          />
        </div>
        {tab === "inventory" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Boutique</span>
              <select
                value={storeFilterId}
                onChange={(e) => setStoreFilterId(e.target.value)}
                className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
                title="Filter inventory by store"
              >
                <option value="">All stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.isCentral ? " (central)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
            >
              <option value="all">All Status</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
              title="Filter by category and subcategory"
            >
              <option value="all">All Categories</option>
              {categoryTree.map((root) => (
                <optgroup key={root.id} label={toTitleCase(root.name)}>
                  <option value={root.id}>
                    {toTitleCase(root.name)} (all)
                  </option>
                  {root.children.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {"\u00A0\u00A0"} {toTitleCase(sub.name)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </>
        )}
        {tab === "movements" && (
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value as MovementFilter)}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
          >
            <option value="all">All Types</option>
            <option value="IN">Restock</option>
            <option value="OUT">Sale</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        )}
      </div>

      {tab === "inventory" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Min</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedInventory.map((row) => {
                  const CatIcon = row.categoryInfo ? getCategoryIcon(row.categoryInfo.icon ?? "grid") : null
                  const isLow = row.status === "low"
                  const isOut = row.status === "out"
                  return (
                    <tr key={row.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
                            {row.image ? (
                              <img src={row.image} alt={toTitleCase(row.name)} className="h-full w-full object-cover" />
                            ) : (
                              <Warehouse className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-card-foreground">{toTitleCase(row.name)}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(row.price)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {CatIcon && row.categoryInfo && (
                          <div className="flex items-center gap-1.5">
                            <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{toTitleCase(row.categoryInfo.name)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "font-mono text-sm font-semibold",
                            isOut ? "text-red-500" : isLow ? "text-yellow-500" : "text-card-foreground"
                          )}
                        >
                          {row.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs text-muted-foreground">{row.minStock}</span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(row.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleQuickDelta(row.id, -1)}
                            disabled={row.stock <= 0}
                            className="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleQuickDelta(row.id, 1)}
                            className="p-1 rounded hover:bg-secondary transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredInventory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Warehouse className="h-8 w-8 mb-2" />
                <p className="text-sm">No inventory found</p>
              </div>
            )}
          </div>
          {filteredInventory.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-secondary/30">
              <p className="text-xs text-muted-foreground">
                Showing {(inventoryPage - 1) * INVENTORY_PAGE_SIZE + 1}–
                {Math.min(inventoryPage * INVENTORY_PAGE_SIZE, filteredInventory.length)} of {filteredInventory.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                  disabled={inventoryPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
                  Page {inventoryPage} of {totalInventoryPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInventoryPage((p) => Math.min(totalInventoryPages, p + 1))}
                  disabled={inventoryPage >= totalInventoryPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "movements" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">From / To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedMovements.map((mv) => (
                  <tr key={mv.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">{movementBadge(mv.type)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-card-foreground">{mv.productName}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold",
                          mv.quantity < 0 ? "text-red-500" : "text-emerald-500"
                        )}
                      >
                        {mv.quantity > 0 ? "+" : ""}
                        {mv.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(mv.fromStoreName || mv.toStoreName) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{mv.fromStoreName ?? mv.fromLocation ?? "—"}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{mv.toStoreName ?? mv.toLocation ?? "—"}</span>
                        </div>
                      )}
                      {!mv.fromStoreName && !mv.toStoreName && mv.fromLocation && mv.toLocation && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{mv.fromLocation}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{mv.toLocation}</span>
                        </div>
                      )}
                      {!mv.fromStoreName && !mv.toStoreName && mv.type === "IN" && mv.toLocation && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <Truck className="h-3 w-3" />
                          <span>{mv.toLocation}</span>
                        </div>
                      )}
                      {!mv.fromStoreName && !mv.toStoreName && (mv.type === "OUT" || mv.type === "ADJUSTMENT") && mv.fromLocation && (
                        <span className="text-xs text-muted-foreground">{mv.fromLocation}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{formatDate(mv.date)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{mv.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMovements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mb-2" />
                <p className="text-sm">No movements found</p>
              </div>
            )}
          </div>
          {filteredMovements.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-secondary/30">
              <p className="text-xs text-muted-foreground">
                Showing {(movementsPage - 1) * MOVEMENTS_PAGE_SIZE + 1}–
                {Math.min(movementsPage * MOVEMENTS_PAGE_SIZE, filteredMovements.length)} of {filteredMovements.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                  disabled={movementsPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
                  Page {movementsPage} of {totalMovementsPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMovementsPage((p) => Math.min(totalMovementsPages, p + 1))}
                  disabled={movementsPage >= totalMovementsPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <RestockModal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        onRestock={async (items, supplier, note) => {
          for (const it of items) {
            await addRestock(it.productId, it.quantity, note || `Restock from ${supplier}`)
          }
          router.refresh()
          setRestockOpen(false)
        }}
        products={products}
        categories={categories}
        categoryTree={categoryTree}
        formatCurrency={formatCurrency}
      />

      <AdjustModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onAdjust={async (productId, storeId, newCount, note) => {
          const r = await addAdjustment(productId, storeId, newCount, note)
          if (r.success) {
            router.refresh()
            setAdjustOpen(false)
          }
        }}
        products={products}
        stores={stores}
        defaultStoreId={(adjustmentStoreId || centralStoreId) ?? undefined}
        categories={categories}
        categoryTree={categoryTree}
      />

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onTransfer={async (fromStoreId, toStoreId, items) => {
          const r = await addTransferBatch(fromStoreId, toStoreId, items)
          if (r.success) {
            router.refresh()
            setTransferOpen(false)
          }
          return r
        }}
        products={products}
        stores={stores}
        categories={categories}
        categoryTree={categoryTree}
      />
    </div>
  )
}

type CategoryTreeNode = {
  id: string
  name: string
  icon: string | null
  parentId: string | null
  children: { id: string; name: string; icon: string | null; parentId: string | null }[]
}

function getDescendantCategoryIds(
  categoryId: string,
  categories: Map<string, { id: string; name: string; icon: string | null; parentId: string | null }>
): string[] {
  const ids: string[] = [categoryId]
  for (const c of categories.values()) {
    if (c.parentId === categoryId) ids.push(...getDescendantCategoryIds(c.id, categories))
  }
  return ids
}

function RestockModal({
  open,
  onClose,
  onRestock,
  products,
  categories,
  categoryTree,
  formatCurrency,
}: {
  open: boolean
  onClose: () => void
  onRestock: (
    items: { productId: string; quantity: number }[],
    supplier: string,
    note: string
  ) => Promise<void>
  products: ProductRow[]
  categories: Map<string, { id: string; name: string; icon: string | null; parentId: string | null }>
  categoryTree: CategoryTreeNode[]
  formatCurrency: (amount: number) => string
}) {
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 0 },
  ])
  const [supplier, setSupplier] = useState("")
  const [note, setNote] = useState("")
  const [categoryId, setCategoryId] = useState("")

  const productsByCategory = useMemo(() => {
    if (!categoryId) return products
    const allowedIds = new Set(getDescendantCategoryIds(categoryId, categories))
    return products.filter((p) => allowedIds.has(p.category))
  }, [products, categoryId, categories])

  function addItem() {
    setItems([...items, { productId: "", quantity: 0 }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: "productId" | "quantity", value: string | number) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = items.filter((it) => it.productId && it.quantity > 0)
    if (valid.length === 0 || !supplier.trim()) return
    await onRestock(valid, supplier.trim(), note.trim() || "Supplier delivery")
    setItems([{ productId: "", quantity: 0 }])
    setSupplier("")
    setNote("")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-emerald-600" />
            Restock from Supplier
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add stock to inventory from external supplier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="supplier" className="text-sm font-medium text-card-foreground">
              Supplier Name
            </Label>
            <Input
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Fresh Foods Co."
              className="bg-secondary border-border text-card-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">Products to Restock</Label>
            <div className="space-y-2">
              <Label htmlFor="restock-category" className="text-xs text-muted-foreground">
                Category (optional)
              </Label>
              <select
                id="restock-category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setItems((prev) => prev.map((it) => ({ ...it, productId: "" })))
                }}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
              >
                <option value="">All categories</option>
                {categoryTree.map((root) =>
                  root.children.length === 0 ? (
                    <option key={root.id} value={root.id}>
                      {toTitleCase(root.name)}
                    </option>
                  ) : (
                    <optgroup key={root.id} label={toTitleCase(root.name)}>
                      {root.children.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {toTitleCase(ch.name)}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-secondary/20 p-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                    className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
                    required
                  >
                    <option value="">
                      {categoryId ? "Select product..." : "Select category (optional) then product..."}
                    </option>
                    {productsByCategory.map((p) => (
                      <option key={p.id} value={p.id}>
                        {toTitleCase(p.name)} ({formatCurrency(p.price)})
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-24 bg-secondary border-border text-card-foreground"
                    required
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 rounded hover:bg-secondary text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-1">
              <Plus className="h-3 w-3" />
              Add Product
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium text-card-foreground">
              Note (optional)
            </Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Delivery notes..."
              className="bg-secondary border-border text-card-foreground"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700">
              Confirm Restock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AdjustModal({
  open,
  onClose,
  onAdjust,
  products,
  stores,
  defaultStoreId,
  categories,
  categoryTree,
}: {
  open: boolean
  onClose: () => void
  onAdjust: (productId: string, storeId: string, newCount: number, note: string) => Promise<void>
  products: ProductRow[]
  stores: StoreOption[]
  defaultStoreId?: string
  categories: Map<string, { id: string; name: string; icon: string | null; parentId: string | null }>
  categoryTree: CategoryTreeNode[]
}) {
  const [storeId, setStoreId] = useState(defaultStoreId ?? "")
  const [categoryId, setCategoryId] = useState("")
  const [productId, setProductId] = useState("")
  const [newCount, setNewCount] = useState(0)
  const [note, setNote] = useState("")

  const productsByCategory = useMemo(() => {
    if (!categoryId) return products
    const allowedIds = new Set(getDescendantCategoryIds(categoryId, categories))
    return products.filter((p) => allowedIds.has(p.category))
  }, [products, categoryId, categories])

  const currentProduct = productsByCategory.find((p) => p.id === productId)
  const currentStock = currentProduct?.stock ?? 0
  const diff = newCount - currentStock

  useEffect(() => {
    if (open && stores.length && !storeId) setStoreId(defaultStoreId ?? stores[0].id)
  }, [open, defaultStoreId, stores, storeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !storeId || !note.trim()) return
    await onAdjust(productId, storeId, newCount, note.trim())
    setProductId("")
    setNewCount(0)
    setNote("")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-yellow-600" />
            Inventory Count Adjustment
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Correct stock quantity after physical count
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">Store</Label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
              required
            >
              <option value="">Select store...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isCentral ? " (central)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">Category</Label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setProductId("")
                setNewCount(0)
              }}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
            >
              <option value="">All categories</option>
              {categoryTree.map((root) =>
                root.children.length === 0 ? (
                  <option key={root.id} value={root.id}>
                    {toTitleCase(root.name)}
                  </option>
                ) : (
                  <optgroup key={root.id} label={toTitleCase(root.name)}>
                    {root.children.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {toTitleCase(ch.name)}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">Product</Label>
            <select
              value={productId}
              onChange={(e) => {
                const val = e.target.value
                setProductId(val)
                const p = productsByCategory.find((x) => x.id === val)
                setNewCount(p?.stock ?? 0)
              }}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
              required
            >
              <option value="">Select product...</option>
              {productsByCategory.map((p) => (
                <option key={p.id} value={p.id}>
                  {toTitleCase(p.name)}
                </option>
              ))}
            </select>
          </div>

          {currentProduct && (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Count:</span>
                <span className="font-mono font-semibold text-card-foreground">{currentStock}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New Count:</span>
                <Input
                  type="number"
                  min="0"
                  value={newCount}
                  onChange={(e) => setNewCount(parseInt(e.target.value) || 0)}
                  className="w-24 text-right bg-secondary border-border"
                  required
                />
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Difference:</span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"
                  )}
                >
                  {diff > 0 ? "+" : ""}
                  {diff}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adjust-note" className="text-sm font-medium text-card-foreground">
              Reason
            </Label>
            <Input
              id="adjust-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Physical inventory count"
              className="bg-secondary border-border text-card-foreground"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700">
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TransferModal({
  open,
  onClose,
  onTransfer,
  products,
  stores,
  categories,
  categoryTree,
}: {
  open: boolean
  onClose: () => void
  onTransfer: (
    fromStoreId: string,
    toStoreId: string,
    items: { productId: string; quantity: number }[]
  ) => Promise<{ success: boolean; error?: string }>
  products: ProductRow[]
  stores: StoreOption[]
  categories: Map<string, { id: string; name: string; icon: string | null; parentId: string | null }>
  categoryTree: CategoryTreeNode[]
}) {
  const [fromStoreId, setFromStoreId] = useState("")
  const [toStoreId, setToStoreId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 0 },
  ])
  const [error, setError] = useState("")

  const productsByCategory = useMemo(() => {
    if (!categoryId) return products
    const allowedIds = new Set(getDescendantCategoryIds(categoryId, categories))
    return products.filter((p) => allowedIds.has(p.category))
  }, [products, categoryId, categories])

  function addItem() {
    setItems([...items, { productId: "", quantity: 0 }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: "productId" | "quantity", value: string | number) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!fromStoreId || !toStoreId || fromStoreId === toStoreId) {
      setError("Select different source and destination stores")
      return
    }
    const valid = items.filter((it) => it.productId && it.quantity > 0)
    if (valid.length === 0) {
      setError("Add at least one product with quantity")
      return
    }
    const r = await onTransfer(fromStoreId, toStoreId, valid)
    if (r.success) {
      setFromStoreId("")
      setToStoreId("")
      setCategoryId("")
      setItems([{ productId: "", quantity: 0 }])
    } else {
      setError(r.error ?? "Transfer failed")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Transfer Between Stores
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Move stock from one store to another. Add multiple products per transfer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-card-foreground">From store</Label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
                required
              >
                <option value="">Select source...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.isCentral ? " (central)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-card-foreground">To store</Label>
              <select
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
                required
              >
                <option value="">Select destination...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.isCentral ? " (central)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">Products to transfer</Label>
            <div className="space-y-2">
              <Label htmlFor="transfer-category" className="text-xs text-muted-foreground">
                Category (optional)
              </Label>
              <select
                id="transfer-category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setItems((prev) => prev.map((it) => ({ ...it, productId: "" })))
                }}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
              >
                <option value="">All categories</option>
                {categoryTree.map((root) =>
                  root.children.length === 0 ? (
                    <option key={root.id} value={root.id}>
                      {toTitleCase(root.name)}
                    </option>
                  ) : (
                    <optgroup key={root.id} label={toTitleCase(root.name)}>
                      {root.children.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {toTitleCase(ch.name)}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-secondary/20 p-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                    className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-card-foreground"
                    required
                  >
                    <option value="">
                      {categoryId ? "Select product..." : "Select category (optional) then product..."}
                    </option>
                    {productsByCategory.map((p) => (
                      <option key={p.id} value={p.id}>
                        {toTitleCase(p.name)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-24 bg-secondary border-border text-card-foreground"
                    required
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 rounded hover:bg-secondary text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-1">
              <Plus className="h-3 w-3" />
              Add product line
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Transfer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
