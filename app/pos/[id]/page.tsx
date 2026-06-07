import { redirect } from "next/navigation"
import { getTenantId } from "@/lib/auth"
import { productRepository } from "@/lib/repositories/product.repository"
import { categoryRepository } from "@/lib/repositories/category.repository"
import { terminalRepository } from "@/lib/repositories/terminal.repository"
import { storeRepository } from "@/lib/repositories/store.repository"
import { storeStockRepository } from "@/lib/repositories/store-stock.repository"
import { customerRepository } from "@/lib/repositories/customer.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { orderRepository } from "@/lib/repositories/order.repository"
import { PosTerminalView } from "@/components/pos/pos-terminal-view"

export default async function PosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const [products, categories, terminals, customers, tenantSettings] = await Promise.all([
    productRepository.findAll(tenantId),
    categoryRepository.findAll(tenantId),
    terminalRepository.findAll(tenantId),
    customerRepository.findAll(tenantId),
    tenantRepository.getSettings(tenantId),
  ])
  const currency = tenantSettings?.currency ?? "USD"

  const terminal = terminals.find((t) => t.name === id || t.id === id)
  if (!terminal) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-xl font-bold">Terminal Not Found</h1>
        <p className="text-sm text-muted-foreground">The terminal &quot;{id}&quot; does not exist.</p>
      </div>
    )
  }

  let storeId = terminal.storeId ?? null
  if (!storeId) {
    const central = await storeRepository.getCentral(tenantId)
    storeId = central?.id ?? null
  }

  const storeStockRows = storeId
    ? await storeStockRepository.getByStore(tenantId, storeId)
    : []
  const stockByProduct = new Map(storeStockRows.map((r) => [r.productId, r.quantity]))

  const settings = (terminal.settings as { assignedCategories?: string[]; taxRate?: number }) ?? {}
  const assignedCategories = settings.assignedCategories ?? []
  const taxRate = settings.taxRate ?? 0

  const productList = products.map((p: { id: string; name: string; price: number; category: string; image?: string; isService?: boolean }) => ({
    id: p.id,
    name: p.name,
    price: typeof p.price === "number" ? p.price : Number(p.price),
    category: p.category,
    image: p.image,
    // Services are not tracked in stock: do not pass stock so they are always available
    stock: p.isService ? undefined : (storeId ? (stockByProduct.get(p.id) ?? 0) : undefined),
  }))

  const categoryList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon ?? "grid",
    parentId: c.parentId,
  }))

  const customerList = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    loyaltyPoints: c.loyaltyPoints,
    tier: c.loyaltyTier,
  }))

  const DEFAULT_HEADER = `<p style="text-align: center"><strong>MyQuickPOS</strong></p>`
  const DEFAULT_FOOTER = `<p style="text-align: center">Thank you for your purchase</p>`
  const printerConfig = {
    paperWidth: (tenantSettings?.printer?.paperWidth as "58mm" | "80mm") ?? "80mm",
    headerHtml: tenantSettings?.printer?.headerHtml?.trim() || DEFAULT_HEADER,
    footerHtml: tenantSettings?.printer?.footerHtml?.trim() || DEFAULT_FOOTER,
    autoPrint: tenantSettings?.printer?.autoPrint ?? false,
  }

  const pendingOrders = await orderRepository.findMany(tenantId, {
    terminalId: terminal.id,
    status: "PENDING",
    take: 50,
  })
  const pendingTableOrders = pendingOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    orderLabel: o.orderLabel ?? null,
    total: Number(o.total),
    createdAt: o.createdAt,
    table: o.table ? { id: o.table.id, name: o.table.name, slug: o.table.slug } : null,
    items: o.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.total),
      product: i.product ? { name: i.product.name } : { name: "—" },
    })),
  }))

  return (
    <PosTerminalView
      terminalId={terminal.id}
      terminalName={terminal.label}
      products={productList}
      categories={categoryList}
      customers={customerList}
      assignedCategories={assignedCategories.length > 0 ? assignedCategories : undefined}
      taxRate={taxRate}
      currency={currency}
      printerConfig={printerConfig}
      pendingTableOrders={pendingTableOrders}
    />
  )
}
