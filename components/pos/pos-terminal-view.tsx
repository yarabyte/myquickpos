"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { createOrder } from "@/app/actions/orders"
import { deleteSavedCart, updateSavedCart } from "@/app/actions/saved-carts"
import { getPendingTableOrders } from "@/app/actions/table-orders"
import type { CartItem, Product, Category } from "@/lib/pos-data"
import { PosHeader } from "./pos-header"
import { CategoryBar } from "./category-bar"
import { ProductGrid } from "./product-grid"
import { OrderPanel } from "./order-panel"
import { PaymentModal } from "./payment-modal"
import { QuickActions } from "./quick-actions"
import { ReceiptPreviewModal } from "./receipt-preview-modal"
import { SaveCartModal } from "./save-cart-modal"
import { RecallCartModal } from "./recall-cart-modal"
import { TableOrderPaymentModal, type PendingTableOrder } from "./table-order-payment-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { UtensilsCrossed, Clock, ShoppingCart } from "lucide-react"
import { useSession } from "next-auth/react"
import { formatWithCurrency, formatAmountOnly } from "@/lib/format-currency"
import { expandCategoryIds } from "@/lib/category-tree"
import { playBeep } from "@/lib/sound"
import { cn } from "@/lib/utils"

type MobileView = "products" | "order"

export type PrinterConfig = {
  paperWidth: "58mm" | "80mm"
  headerHtml: string
  footerHtml: string
  autoPrint?: boolean
}

interface PosTerminalViewProps {
  terminalId: string
  terminalName: string
  products: Product[]
  categories: Category[]
  customers: { id: string; name: string; email: string; phone: string; loyaltyPoints: number; tier: string }[]
  assignedCategories?: string[]
  taxRate?: number
  currency?: string
  printerConfig?: PrinterConfig
  pendingTableOrders?: PendingTableOrder[]
}

export function PosTerminalView({
  terminalId,
  terminalName,
  products: allProducts,
  categories,
  customers,
  assignedCategories = [],
  taxRate = 0,
  currency = "USD",
  printerConfig,
  pendingTableOrders = [],
}: PosTerminalViewProps) {
  const { data: session } = useSession()
  const cashierName = (session?.user as { name?: string } | undefined)?.name ?? "Cashier"
  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, currency),
    [currency]
  )
  const formatAmount = useCallback(
    (amount: number) => formatAmountOnly(amount, currency),
    [currency]
  )
  const [activeCategory, setActiveCategory] = useState("all")
  const [mobileView, setMobileView] = useState<MobileView>("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [saveCartOpen, setSaveCartOpen] = useState(false)
  const [recallCartOpen, setRecallCartOpen] = useState(false)
  const [lastPaymentMethod, setLastPaymentMethod] = useState("Card")
  /** ID of the saved cart that was recalled; updated on save or deleted after payment */
  const [recalledSavedCartId, setRecalledSavedCartId] = useState<string | null>(null)
  const [recalledSavedCartName, setRecalledSavedCartName] = useState<string | null>(null)
  const [updatingSavedCart, setUpdatingSavedCart] = useState(false)
  const [tableOrderModalOrder, setTableOrderModalOrder] = useState<PendingTableOrder | null>(null)
  const [tableOrderModalOpen, setTableOrderModalOpen] = useState(false)
  const [pendingOrders, setPendingOrders] = useState(pendingTableOrders)
  const previousCountRef = useRef(pendingTableOrders.length)
  const isFirstPollRef = useRef(true)

  useEffect(() => {
    setPendingOrders(pendingTableOrders)
    previousCountRef.current = pendingTableOrders.length
  }, [pendingTableOrders])

  const refreshPendingOrders = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    const result = await getPendingTableOrders(terminalId)
    if (!result.success) return

    const next = result.data.map((o) => ({
      ...o,
      createdAt: new Date(o.createdAt),
    }))

    if (!isFirstPollRef.current && next.length > previousCountRef.current) {
      toast.info("New tablet order", {
        description: `${next.length - previousCountRef.current} order(s) pending.`,
      })
    }
    isFirstPollRef.current = false
    previousCountRef.current = next.length
    setPendingOrders(next)
  }, [terminalId])

  useEffect(() => {
    refreshPendingOrders()
    const interval = setInterval(refreshPendingOrders, 5000)
    return () => clearInterval(interval)
  }, [refreshPendingOrders])

  const getDescendantIds = useCallback((categoryId: string): string[] => {
    const kids = categories.filter((c) => c.parentId === categoryId)
    if (kids.length === 0) return [categoryId]
    return [categoryId, ...kids.flatMap((k) => getDescendantIds(k.id))]
  }, [categories])

  const terminalProducts = useMemo(() => {
    if (assignedCategories.length === 0) return allProducts
    const allowed = new Set(expandCategoryIds(categories, assignedCategories))
    return allProducts.filter((p) => allowed.has(p.category))
  }, [assignedCategories, allProducts, categories])

  const filteredProducts = useMemo(() => {
    let result = terminalProducts
    if (activeCategory !== "all") {
      const ids = getDescendantIds(activeCategory)
      result = result.filter((p) => ids.includes(p.category))
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(query))
    }
    return result
  }, [activeCategory, searchQuery, terminalProducts, getDescendantIds])

  // keep a copy of last completed order for receipt reprint
  const [lastCart, setLastCart] = useState<CartItem[]>([])

  const addToCart = useCallback((product: Product) => {
    playBeep()
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setRecalledSavedCartId(null)
    setRecalledSavedCartName(null)
  }, [])

  const mergeCartItems = useCallback((base: CartItem[], incoming: CartItem[]) => {
    const merged = base.map((item) => ({ ...item, product: { ...item.product } }))
    for (const item of incoming) {
      const existing = merged.find((i) => i.product.id === item.product.id)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        merged.push({ ...item, product: { ...item.product } })
      }
    }
    return merged
  }, [])

  const handleUpdateSavedOrder = useCallback(async () => {
    if (!recalledSavedCartId || cart.length === 0) return
    setUpdatingSavedCart(true)
    const result = await updateSavedCart({
      id: recalledSavedCartId,
      name: recalledSavedCartName ?? undefined,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    })
    setUpdatingSavedCart(false)
    if (result.success) {
      toast.success("Order updated", {
        description: recalledSavedCartName
          ? `"${recalledSavedCartName}" includes the new items.`
          : undefined,
      })
    } else {
      toast.error(result.error)
    }
  }, [recalledSavedCartId, recalledSavedCartName, cart])

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return
    setPaymentOpen(true)
  }, [cart.length])

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const total = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )
    return subtotal + subtotal * (taxRate / 100)
  }, [cart, taxRate])

  const handlePaymentComplete = useCallback(
    async (paymentData: {
      customerId?: string | null
      paymentMethod: string
    }) => {
      const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      const taxAmount = subtotal * (taxRate / 100)
      const result = await createOrder({
        terminalId,
        customerId: paymentData.customerId,
        paymentMethod: paymentData.paymentMethod,
        subtotal,
        tax: taxAmount,
        discount: 0,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          total: item.product.price * item.quantity,
        })),
      })

      if (result.success) {
        setLastCart([...cart])
        setLastPaymentMethod(paymentData.paymentMethod)
        setCart([])
        if (recalledSavedCartId) {
          await deleteSavedCart(recalledSavedCartId)
          setRecalledSavedCartId(null)
          setRecalledSavedCartName(null)
        }
        toast.success("Order completed successfully!", {
          description: "Receipt is ready to print.",
        })
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
    [cart, taxRate, terminalId, recalledSavedCartId]
  )

  const handleReceiptQuickAction = useCallback(() => {
    if (lastCart.length > 0) {
      setReceiptOpen(true)
    } else {
      toast.info("No recent order", {
        description: "Complete a sale to generate a receipt.",
      })
    }
  }, [lastCart.length])

  const handleRecallCart = useCallback(
    (items: CartItem[], savedCartId: string, savedCartName: string) => {
      setCart((prev) => mergeCartItems(prev, items))
      setRecalledSavedCartId(savedCartId)
      setRecalledSavedCartName(savedCartName)
      // On tablet/mobile the order panel is hidden behind a tab; switch to it so
      // the recalled items are actually visible.
      setMobileView("order")
    },
    [mergeCartItems]
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <PosHeader
        onSearch={setSearchQuery}
        terminalName={terminalName}
        cashierName={cashierName}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left: Product selection area */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            mobileView !== "products" && "hidden lg:flex"
          )}
        >
          <div className="px-4 pt-3 pb-2 lg:px-5 lg:pt-4 lg:pb-3">
            <CategoryBar
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              allowedCategories={assignedCategories.length > 0 ? assignedCategories : undefined}
              categories={categories.map((c) => ({
                id: c.id,
                name: c.name,
                icon: c.icon ?? "grid",
                parentId: c.parentId ?? null,
              }))}
            />
          </div>

          <ScrollArea className="flex-1 px-4 pb-4 lg:px-5 lg:pb-5">
            <ProductGrid
              products={filteredProducts}
              onAddToCart={addToCart}
              formatCurrency={formatCurrency}
            />
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm">No products found</p>
                <p className="text-xs mt-1">
                  Try a different category or search
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Pending table orders + Order panel */}
        <div
          className={cn(
            "flex min-h-0 flex-col gap-3 border-t border-border bg-background p-3 lg:w-[420px] lg:max-w-[440px] lg:shrink-0 lg:border-l lg:border-t-0",
            mobileView !== "order" && "hidden lg:flex",
            "flex-1 lg:flex-none"
          )}
        >
          {pendingOrders.length > 0 && (
            <div className="shrink-0 rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-card-foreground">Order from Tablet</span>
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded bg-primary px-1 text-xs font-bold text-primary-foreground">
                  {pendingOrders.length}
                </span>
              </div>
              <ScrollArea className="max-h-[180px]">
                <div className="p-2 space-y-1">
                  {pendingOrders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setTableOrderModalOrder(o)
                        setTableOrderModalOpen(true)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg border border-transparent p-2.5 text-left transition-colors hover:border-border hover:bg-muted/50"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-card-foreground">
                          {o.orderLabel || o.table?.name || o.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.orderNumber} · {new Date(o.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-card-foreground font-mono">
                        {formatCurrency(o.total)}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <OrderPanel
              cart={cart}
              taxRate={taxRate}
              formatCurrency={formatCurrency}
              formatAmount={formatAmount}
              recalledOrderName={recalledSavedCartName}
              onUpdateSavedOrder={recalledSavedCartId ? handleUpdateSavedOrder : undefined}
              isUpdatingSavedOrder={updatingSavedCart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onCheckout={handleCheckout}
            />
          </div>
          <div className="shrink-0">
            <QuickActions
            onSaveOrder={() => setSaveCartOpen(true)}
            onRecallOrder={() => setRecallCartOpen(true)}
            onDiscount={() =>
              toast.info("Discount", {
                description: "Discount feature coming soon.",
              })
            }
            onReceipt={handleReceiptQuickAction}
            onRefund={() =>
              toast.info("Refund", {
                description: "Refund feature coming soon.",
              })
            }
          />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border bg-card p-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("products")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg py-3 text-sm font-medium touch-manipulation",
            mobileView === "products"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          Products
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

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        total={total}
        cart={cart}
        completedOrderCart={lastCart}
        taxRate={taxRate}
        formatCurrency={formatCurrency}
        formatAmount={formatAmount}
        currency={currency}
        terminalName={terminalName}
        cashierName={cashierName}
        customers={customers}
        onConfirmPayment={handlePaymentComplete}
        onPaymentComplete={() => setPaymentOpen(false)}
        printerConfig={printerConfig}
      />

      {/* Receipt reprint from quick action */}
      <ReceiptPreviewModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        cart={lastCart}
        taxRate={taxRate}
        formatCurrency={formatCurrency}
        formatAmount={formatAmount}
        currency={currency}
        paymentMethod={lastPaymentMethod}
        terminalName={terminalName}
        cashierName={cashierName}
        printerConfig={printerConfig}
      />

      <SaveCartModal
        open={saveCartOpen}
        onClose={() => setSaveCartOpen(false)}
        cart={cart}
        terminalId={terminalId}
        savedCartId={recalledSavedCartId}
        initialName={recalledSavedCartName ?? ""}
        onSaved={() => setSaveCartOpen(false)}
      />

      <RecallCartModal
        open={recallCartOpen}
        onClose={() => setRecallCartOpen(false)}
        terminalId={terminalId}
        products={allProducts}
        onRecall={handleRecallCart}
      />

      <TableOrderPaymentModal
        open={tableOrderModalOpen}
        onClose={() => {
          setTableOrderModalOpen(false)
          setTableOrderModalOrder(null)
        }}
        order={tableOrderModalOrder}
        formatCurrency={formatCurrency}
        formatAmount={formatAmount}
        currency={currency}
        taxRate={taxRate}
        terminalName={terminalName}
        printerConfig={printerConfig}
        onCompleted={refreshPendingOrders}
      />
    </div>
  )
}
