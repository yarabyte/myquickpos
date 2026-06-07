"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TerminalCard } from "@/components/admin/terminal-card"
import { CreateTerminalModal } from "@/components/admin/create-terminal-modal"
import { createTerminal, deleteTerminal, updateTerminal } from "@/app/actions/terminals"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { formatWithCurrency } from "@/lib/format-currency"

export interface CategoryInfo {
  id: string
  name: string
  icon: string
  parentId?: string | null
}

export interface UserInfo {
  id: string
  name: string
  email: string
  status: string
}

interface TerminalInfo {
  id: string
  name: string
  label: string
  location: string
  status: "online" | "offline" | "maintenance"
  cashier: string
  taxRate?: number
  assignedCategories: string[]
  todaySales: number
  todayOrders: number
  storeId?: string
  storeName?: string
}

interface StoreOption {
  id: string
  name: string
  isCentral: boolean
}

const statusFilters = ["all", "online", "offline", "maintenance"] as const

export function TerminalsPageClient({
  initialTerminals,
  stores,
  categories,
  users,
  currency = "USD",
  periodLabel,
}: {
  initialTerminals: TerminalInfo[]
  stores: StoreOption[]
  categories: { roots: CategoryInfo[]; selectable: { id: string; name: string; icon: string }[] }
  users: UserInfo[]
  currency?: string
  periodLabel: string
}) {
  const router = useRouter()
  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, currency),
    [currency]
  )
  const [terminals, setTerminals] = useState(initialTerminals)
  useEffect(() => {
    setTerminals(initialTerminals)
  }, [initialTerminals])
  const [createOpen, setCreateOpen] = useState(false)
  const [editTerminal, setEditTerminal] = useState<TerminalInfo | null>(null)
  const [deleteTerminalId, setDeleteTerminalId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = useMemo(() => {
    let result = terminals
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.cashier.toLowerCase().includes(q)
      )
    }
    return result
  }, [terminals, statusFilter, searchQuery])

  const handleRemove = useCallback(async (id: string) => {
    const r = await deleteTerminal(id)
    if (r.success) {
      router.refresh()
      setTerminals((prev) => prev.filter((t) => t.id !== id))
      setDeleteTerminalId(null)
    }
  }, [router])

  const handleToggleStatus = useCallback(async (id: string) => {
    const terminal = terminals.find((t) => t.id === id)
    if (!terminal) return
    const fd = new FormData()
    fd.set("name", terminal.name)
    fd.set("label", terminal.label)
    fd.set("isActive", String(terminal.status !== "online"))
    if (terminal.storeId) fd.set("storeId", terminal.storeId)
    const r = await updateTerminal(id, fd)
    if (r.success) {
      router.refresh()
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: t.status === "online" ? ("offline" as const) : ("online" as const) }
            : t
        )
      )
    }
  }, [terminals, router])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Terminals</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor all POS terminals</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Terminal
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terminals..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 rounded-lg bg-card border border-border p-1">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                statusFilter === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((terminal) => (
          <TerminalCard
            key={terminal.id}
            terminal={terminal}
            formatCurrency={formatCurrency}
            periodLabel={periodLabel}
            onDelete={setDeleteTerminalId}
            onToggleStatus={handleToggleStatus}
            onEdit={setEditTerminal}
            categories={categories}
          />
        ))}
        <button
          onClick={() => setCreateOpen(true)}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary min-h-[200px]"
        >
          <Plus className="h-8 w-8 mb-2" />
          <span className="text-sm font-medium">Add Terminal</span>
        </button>
      </div>

      <CreateTerminalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stores={stores}
        categories={categories}
        users={users}
        onCreateTerminal={createTerminal}
        onUpdateTerminal={updateTerminal}
        onSuccess={() => router.refresh()}
      />
      {editTerminal && (
        <CreateTerminalModal
          open={!!editTerminal}
          onClose={() => setEditTerminal(null)}
          editTerminal={{
            id: editTerminal.id,
            name: editTerminal.name,
            location: editTerminal.label,
            cashier: editTerminal.cashier,
            taxRate: editTerminal.taxRate ?? 0,
            assignedCategories: editTerminal.assignedCategories,
            storeId: editTerminal.storeId,
          }}
          stores={stores}
          categories={categories}
          users={users}
          onCreateTerminal={createTerminal}
          onUpdateTerminal={updateTerminal}
          onSuccess={() => {
            router.refresh()
            setEditTerminal(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTerminalId}
        onOpenChange={(open) => !open && setDeleteTerminalId(null)}
        title="Delete terminal"
        description={
          <p>
            Delete terminal &quot;{terminals.find((t) => t.id === deleteTerminalId)?.label ?? deleteTerminalId}&quot;? This action cannot be undone.
          </p>
        }
        icon={<Trash2 className="h-6 w-6" />}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => deleteTerminalId && handleRemove(deleteTerminalId)}
      />
    </div>
  )
}
