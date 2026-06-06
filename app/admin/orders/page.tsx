import { redirect } from "next/navigation"
import { getTenantId } from "@/lib/auth"
import { orderRepository } from "@/lib/repositories/order.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { OrdersPageClient } from "./orders-page-client"

export default async function OrdersPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const [orders, tenantSettings] = await Promise.all([
    orderRepository.findMany(tenantId, { take: 200 }),
    tenantRepository.getSettings(tenantId),
  ])
  const currency = tenantSettings?.currency ?? "USD"

  const orderList = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    total: Number(o.total),
    paymentMethod: o.paymentMethod,
    status: o.status,
    terminalId: o.terminalId,
    terminalName: o.terminal?.label ?? o.terminal?.name ?? "—",
    customerName: o.customer?.name ?? null,
    cashierName: o.cashierName ?? null,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
  }))

  return (
    <OrdersPageClient
      orders={orderList}
      currency={currency}
    />
  )
}
