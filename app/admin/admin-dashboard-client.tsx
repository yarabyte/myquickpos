"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StatsCards } from "@/components/admin/stats-cards"
import { TerminalCard } from "@/components/admin/terminal-card"
import { CreateTerminalModal } from "@/components/admin/create-terminal-modal"
import { createTerminal, deleteTerminal, updateTerminal } from "@/app/actions/terminals"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatWithCurrency } from "@/lib/format-currency"

export interface TerminalInfo {
  id: string
  name: string
  label: string
  location: string
  status: "online" | "offline" | "maintenance"
  cashier: string
  assignedCategories: string[]
  todaySales: number
  todayOrders: number
}

export interface CategoryTree {
  id: string
  name: string
  icon: string
  parentId?: string | null
  children?: { id: string; name: string; icon: string; parentId?: string | null }[]
}

export interface UserInfo {
  id: string
  name: string
  email: string
  status: string
}

export interface DashboardStats {
  revenue: number
  totalOrders: number
  avgBasket: number
  customerCount: number
  stockAlerts: number
}

interface AdminDashboardClientProps {
  initialTerminals: TerminalInfo[]
  categories: { roots: CategoryTree[]; selectable: { id: string; name: string; icon: string }[] }
  users: UserInfo[]
  currency?: string
  periodLabel: string
  stats: DashboardStats
}

export function AdminDashboardClient({
  initialTerminals,
  categories,
  users,
  currency = "USD",
  periodLabel,
  stats,
}: AdminDashboardClientProps) {
  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, currency),
    [currency]
  )
  const router = useRouter()
  const [terminals, setTerminals] = useState(initialTerminals)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTerminal, setEditTerminal] = useState<TerminalInfo | null>(null)
  const [deleteTerminalId, setDeleteTerminalId] = useState<string | null>(null)

  useEffect(() => {
    setTerminals(initialTerminals)
  }, [initialTerminals])

  const handleRemove = useCallback(
    async (id: string) => {
      const r = await deleteTerminal(id)
      if (r.success) {
        router.refresh()
        setTerminals((prev) => prev.filter((t) => t.id !== id))
        setDeleteTerminalId(null)
      }
    },
    [router]
  )

  const handleToggleStatus = useCallback(
    async (id: string) => {
      const terminal = terminals.find((t) => t.id === id)
      if (!terminal) return
      const fd = new FormData()
      fd.set("name", terminal.name)
      fd.set("label", terminal.label)
      fd.set("isActive", String(terminal.status !== "online"))
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
    },
    [terminals, router]
  )

  const onlineCount = terminals.filter((t) => t.status === "online").length

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your POS system performance
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Terminal
        </Button>
      </div>

      <StatsCards
        formatCurrency={formatCurrency}
        stats={{
          revenue: stats.revenue,
          totalOrders: stats.totalOrders,
          activeTerminals: `${onlineCount}/${terminals.length}`,
          avgOrderValue: stats.avgBasket,
        }}
      />

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Terminals ({terminals.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {terminals.map((terminal) => (
            <TerminalCard
              key={terminal.id}
              terminal={terminal}
              formatCurrency={formatCurrency}
              periodLabel={periodLabel}
              onDelete={setDeleteTerminalId}
              onToggleStatus={handleToggleStatus}
              onEdit={(t) => {
                const full = terminals.find((x) => x.id === t.id)
                if (full) setEditTerminal(full)
              }}
              categories={categories}
            />
          ))}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Add Terminal</span>
          </button>
        </div>
      </div>

      <CreateTerminalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
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
            assignedCategories: editTerminal.assignedCategories,
          }}
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
        onConfirm={() => {
          if (deleteTerminalId) void handleRemove(deleteTerminalId)
        }}
      />
    </div>
  )
}
