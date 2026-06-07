"use client"

import { useState, useMemo, useCallback } from "react"
import {
  submitEstablishmentOrder,
  updatePendingEstablishmentOrder,
  type EstablishmentOrderSummary,
} from "@/app/actions/table-orders"
import type { CartItem, Product, Category } from "@/lib/pos-data"
import { CategoryBar } from "@/components/pos/category-bar"
import { ProductGrid } from "@/components/pos/product-grid"
import { RestaurantOrderHistory } from "@/components/restaurant/restaurant-order-history"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatWithCurrency } from "@/lib/format-currency"
import { toTitleCase, cn } from "@/lib/utils"
import { toast } from "sonner"
import { Send, ShoppingCart, X } from "lucide-react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useOfflineOrderSync } from "@/hooks/use-offline-order-sync"
import { RestaurantTabletHeader } from "@/components/restaurant/restaurant-tablet-header"

interface RestaurantEstablishmentViewProps {
  establishmentSlug: string
  establishment: { id: string; name: string; slug: string }
  products: Product[]
  categories: Category[]
  assignedCategories?: string[]
  taxRate: number
  currency: string
}

type SidebarTab = "order" | "history"
type MobileView = "menu" | "order"

export function RestaurantEstablishmentView({
  establishmentSlug,
  establishment,
  products: allProducts,
  categories,
  assignedCategories = [],
  taxRate = 0,
  currency = "USD",
}: RestaurantEstablishmentViewProps) {
  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, currency),
    [currency]
  )
  const [activeCategory, setActiveCategory] = useState("all")
  const [mobileView, setMobileView] = useState<MobileView>("menu")
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("order")
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderLabel, setOrderLabel] = useState("")
  const [sending, setSending] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [editingOrder, setEditingOrder] = useState<EstablishmentOrderSummary | null>(null)
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)
  const { pendingCount, queueOrder } = useOfflineOrderSync(establishmentSlug)

  const productMap = useMemo(
    () => new Map(allProducts.map((p) => [p.id, p])),
    [allProducts]
  )

  const getDescendantIds = useCallback((categoryId: string): string[] => {
    const kids = categories.filter((c) => c.parentId === categoryId)
    if (kids.length === 0) return [categoryId]
    return [categoryId, ...kids.flatMap((k) => getDescendantIds(k.id))]
  }, [categories])

  const filteredProducts = useMemo(() => {
    let result = allProducts
    if (activeCategory !== "all") {
      const ids = getDescendantIds(activeCategory)
      result = result.filter((p) => ids.includes(p.category))
    }
    return result
  }, [activeCategory, allProducts, getDescendantIds])

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setOrderLabel("")
    setEditingOrder(null)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingOrder(null)
    setCart([])
    setOrderLabel("")
  }, [])

  const loadOrderForEdit = useCallback(
    (order: EstablishmentOrderSummary) => {
      const items: CartItem[] = []
      for (const item of order.items) {
        const product = productMap.get(item.productId)
        if (!product) {
          toast.error("Product not found", {
            description: `${item.productName} is no longer available.`,
          })
          continue
        }
        items.push({ product, quantity: item.quantity })
      }
      if (items.length === 0) {
        toast.error("Unable to edit this order")
        return
      }
      setEditingOrder(order)
      setCart(items)
      setOrderLabel(order.orderLabel ?? "")
      setSidebarTab("order")
      setMobileView("order")
    },
    [productMap]
  )

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  )
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const executeSubmit = useCallback(async () => {
    const label = orderLabel.trim()
    const payload = {
      establishmentSlug,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity,
      })),
      subtotal,
      tax,
      discount: 0,
      orderLabel: label,
    }

    setSending(true)

    if (!navigator.onLine) {
      await queueOrder(payload)
      setSending(false)
      setCart([])
      setOrderLabel("")
      setEditingOrder(null)
      return
    }

    if (editingOrder) {
      const result = await updatePendingEstablishmentOrder({
        ...payload,
        orderId: editingOrder.id,
      })
      setSending(false)
      if (result.success) {
        setCart([])
        setOrderLabel("")
        setEditingOrder(null)
        setHistoryRefreshKey((k) => k + 1)
        toast.success("Order updated", {
          description: `Order ${result.data.orderNumber} updated.`,
        })
      } else {
        toast.error(result.error)
      }
      return
    }

    const result = await submitEstablishmentOrder(payload)
    setSending(false)
    if (result.success) {
      setCart([])
      setOrderLabel("")
      setHistoryRefreshKey((k) => k + 1)
      toast.success("Order sent to POS", {
        description: `Order ${result.data.orderNumber} pending.`,
      })
    } else {
      await queueOrder(payload)
    }
  }, [cart, establishmentSlug, subtotal, tax, orderLabel, editingOrder, queueOrder])

  const handleSendClick = useCallback(() => {
    if (cart.length === 0) {
      toast.error("Empty cart", { description: "Add at least one item." })
      return
    }
    const label = orderLabel?.trim()
    if (!label) {
      toast.error("Name required", {
        description: "Enter the table or customer name before sending.",
      })
      return
    }

    if (editingOrder) {
      void executeSubmit()
      return
    }

    setConfirmSendOpen(true)
  }, [cart, orderLabel, editingOrder, executeSubmit])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <RestaurantTabletHeader
        establishmentName={establishment.name}
        pendingCount={pendingCount}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            mobileView !== "menu" && "hidden lg:flex"
          )}
        >
          <div className="px-4 pt-3 pb-2">
            <CategoryBar
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              allowedCategories={assignedCategories.length > 0 ? assignedCategories : undefined}
              categories={categories}
            />
          </div>
          <ScrollArea className="flex-1 px-4 pb-4">
            <ProductGrid
              products={filteredProducts}
              onAddToCart={addToCart}
              formatCurrency={formatCurrency}
            />
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                <p className="text-sm font-medium">No products available</p>
                <p className="max-w-sm px-4 text-xs">
                  {allProducts.length === 0
                    ? "No active products are configured for this tablet."
                    : "The categories assigned to the POS terminal do not match any products."}
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-col gap-3 border-t border-border bg-background p-3 lg:w-[420px] lg:max-w-[440px] lg:shrink-0 lg:border-l lg:border-t-0",
            mobileView !== "order" && "hidden lg:flex",
            "flex-1 lg:flex-none"
          )}
        >
          <div className="flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setSidebarTab("order")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors touch-manipulation",
                sidebarTab === "order"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingCart className="h-4 w-4" />
              Order
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("history")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors touch-manipulation",
                sidebarTab === "history"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              History
            </button>
          </div>

          {sidebarTab === "history" ? (
            <RestaurantOrderHistory
              establishmentSlug={establishmentSlug}
              currency={currency}
              onEditOrder={loadOrderForEdit}
              refreshKey={historyRefreshKey}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card">
              {editingOrder && (
                <div className="flex items-center justify-between gap-2 border-b border-border bg-amber-500/10 px-3 py-2">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Editing · {editingOrder.orderNumber}
                  </p>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                    aria-label="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-card-foreground">
                    {editingOrder ? "Edit order" : "Order"}
                  </h2>
                  {cart.length > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-medium text-destructive hover:text-destructive/80"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <Separator />
              <ScrollArea className="flex-1 px-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <ShoppingCart className="mb-2 h-10 w-10 opacity-30" />
                    <p className="text-sm">No items</p>
                    <p className="text-xs">Tap a product to add it</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-2 rounded-lg p-2.5 hover:bg-secondary/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            {toTitleCase(item.product.name)}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {formatCurrency(item.product.price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground touch-manipulation"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground touch-manipulation"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 active:bg-destructive/35 touch-manipulation"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {cart.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3 p-3">
                    <div className="space-y-1.5">
                      <label htmlFor="order-label" className="text-xs font-medium text-muted-foreground">
                        Table or customer name <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="order-label"
                        type="text"
                        value={orderLabel}
                        onChange={(e) => setOrderLabel(e.target.value)}
                        placeholder="Table 5 or customer name"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatCurrency(subtotal)}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tax ({taxRate}%)</span>
                          <span className="font-mono">{formatCurrency(tax)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold text-card-foreground">
                        <span>Total</span>
                        <span className="font-mono">{formatCurrency(total)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendClick}
                      disabled={sending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 touch-manipulation"
                    >
                      <Send className="h-5 w-5" />
                      {sending
                        ? "Sending…"
                        : editingOrder
                          ? "Save changes"
                          : "Send to POS"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border bg-card p-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("menu")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg py-3 text-sm font-medium touch-manipulation",
            mobileView === "menu"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          Menu
        </button>
        <button
          type="button"
          onClick={() => setMobileView("order")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium touch-manipulation",
            mobileView === "order"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Order
          {itemCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1 text-xs font-bold text-primary">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      <ConfirmDialog
        open={confirmSendOpen}
        onOpenChange={setConfirmSendOpen}
        title="Send to POS?"
        description={
          <div className="space-y-2 text-sm">
            <p>
              Confirm sending the order for{" "}
              <strong>{toTitleCase(orderLabel.trim())}</strong>?
            </p>
            <p className="text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? "s" : ""} · Total{" "}
              <span className="font-mono font-semibold text-card-foreground">
                {formatCurrency(total)}
              </span>
            </p>
          </div>
        }
        icon={<Send className="h-6 w-6" />}
        confirmLabel="Send"
        cancelLabel="Cancel"
        variant="default"
        loading={sending}
        onConfirm={executeSubmit}
      />
    </div>
  )
}
