import { redirect } from "next/navigation"
import { getTenantId } from "@/lib/auth"
import { terminalRepository } from "@/lib/repositories/terminal.repository"
import { storeRepository } from "@/lib/repositories/store.repository"
import { categoryRepository } from "@/lib/repositories/category.repository"
import { userRepository } from "@/lib/repositories/user.repository"
import { analyticsRepository } from "@/lib/repositories/analytics.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { getCurrentMonthLabel } from "@/lib/analytics-date-range"
import { TerminalsPageClient } from "./terminals-page-client"

export default async function TerminalsPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const [terminals, stores, categories, users, monthByTerminal, tenantSettings] = await Promise.all([
    terminalRepository.findAll(tenantId),
    storeRepository.findAll(tenantId),
    categoryRepository.getRootCategories(tenantId),
    userRepository.findAll(tenantId),
    analyticsRepository.monthStatsByTerminal(tenantId),
    tenantRepository.getSettings(tenantId),
  ])
  const currency = tenantSettings?.currency ?? "USD"
  const monthLabel = getCurrentMonthLabel()
  const monthMap = new Map(monthByTerminal.map((s) => [s.terminalId, { revenue: s.revenue, orders: s.orders }]))
  const terminalList = terminals.map((t) => {
    const settings = (t.settings as { assignedCategories?: string[]; cashier?: string; taxRate?: number }) ?? {}
    const month = monthMap.get(t.id) ?? { revenue: 0, orders: 0 }
    return {
      id: t.id,
      name: t.name,
      label: t.label,
      location: t.label,
      status: t.isActive ? ("online" as const) : ("offline" as const),
      cashier: settings.cashier ?? "Unassigned",
      taxRate: settings.taxRate ?? 0,
      assignedCategories: settings.assignedCategories ?? [],
      todaySales: month.revenue,
      todayOrders: month.orders,
      storeId: t.storeId ?? undefined,
      storeName: t.store?.name ?? undefined,
    }
  })

  const roots = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon ?? "grid",
    parentId: c.parentId,
    children: c.children.map((ch) => ({
      id: ch.id,
      name: ch.name,
      icon: ch.icon ?? "grid",
      parentId: ch.parentId,
    })),
  }))
  const selectable = categories.flatMap((c) =>
    [c, ...c.children].map((ch) => ({ id: ch.id, name: ch.name, icon: ch.icon ?? "grid" }))
  )
  const usersList = users.map((u) => ({ id: u.id, name: u.name, email: u.email, status: u.status }))
  const storeList = stores.map((s) => ({ id: s.id, name: s.name, isCentral: s.isCentral }))

  return (
    <TerminalsPageClient
      initialTerminals={terminalList}
      stores={storeList}
      categories={{ roots, selectable }}
      users={usersList}
      currency={currency}
      periodLabel={monthLabel}
    />
  )
}
