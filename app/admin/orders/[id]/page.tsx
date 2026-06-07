import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getTenantId } from "@/lib/auth"
import { orderRepository } from "@/lib/repositories/order.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { formatWithCurrency } from "@/lib/format-currency"
import { ArrowLeft, Receipt, User, Monitor, CreditCard } from "lucide-react"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const [order, tenantSettings] = await Promise.all([
    orderRepository.findById(id, tenantId),
    tenantRepository.getSettings(tenantId),
  ])
  if (!order) notFound()

  const currency = tenantSettings?.currency ?? "USD"
  const formatCurrency = (amount: number) => formatWithCurrency(amount, currency)
  const createdAt = new Date(order.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{createdAt}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Terminal</p>
            <p className="font-medium text-card-foreground">{order.terminal?.label ?? order.terminal?.name ?? "—"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Cashier</p>
            <p className="font-medium text-card-foreground">{order.cashierName ?? "Not specified"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Payment</p>
            <p className="font-medium text-card-foreground">{order.paymentMethod}</p>
          </div>
        </div>
      </div>

      {order.customer && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Customer</p>
            <p className="font-medium text-card-foreground">{order.customer.name}</p>
            {(order.customer.email || order.customer.phone) && (
              <p className="text-sm text-muted-foreground">
                {[order.customer.email, order.customer.phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/50 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-card-foreground">Order items</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Qty</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Unit price</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3 font-medium text-card-foreground">
                  {item.product?.name ?? `Product ${item.productId}`}
                </td>
                <td className="px-5 py-3 text-right font-mono text-muted-foreground">{item.quantity}</td>
                <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                  {formatCurrency(Number(item.unitPrice))}
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold text-card-foreground">
                  {formatCurrency(Number(item.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-5 py-4 space-y-1.5 bg-secondary/20">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax</span>
            <span className="font-mono">{formatCurrency(Number(order.tax))}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Discount</span>
              <span className="font-mono">-{formatCurrency(Number(order.discount))}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-card-foreground pt-2 border-t border-border">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(Number(order.total))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
