"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { useProducts } from "@/hooks/use-products"
import { useCategories } from "@/hooks/use-categories"
import type { CartItem } from "@/lib/pos-data"
import { PosHeader } from "./pos-header"
import { CategoryBar } from "./category-bar"
import { ProductGrid } from "./product-grid"
import { toProductCardData } from "./product-card"
import { OrderPanel } from "./order-panel"
import { PaymentModal } from "./payment-modal"
import { QuickActions } from "./quick-actions"
import { ReceiptPreviewModal } from "./receipt-preview-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatWithCurrency } from "@/lib/format-currency"

type MobileView = "products" | "order"

export function PosTerminal() {
  const { products: allProducts } = useProducts()
  const { getDescendantIds } = useCategories()
  const [activeCategory, setActiveCategory] = useState("all")
  const [mobileView, setMobileView] = useState<MobileView>("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [lastCart, setLastCart] = useState<CartItem[]>([])

  const filteredProducts = useMemo(() => {
    let result = allProducts
    if (activeCategory !== "all") {
      const ids = getDescendantIds(activeCategory)
      result = result.filter((p) => ids.includes(p.category))
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(query))
    }
    return result
  }, [activeCategory, searchQuery, allProducts, getDescendantIds])

  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, "USD"),
    []
  )

  const displayProducts = useMemo(
    () => toProductCardData(filteredProducts, formatCurrency),
    [filteredProducts, formatCurrency]
  )

  const productById = useMemo(
    () => new Map(allProducts.map((product) => [product.id, product])),
    [allProducts]
  )
  const productByIdRef = useRef(productById)
  productByIdRef.current = productById

  const addToCartById = useCallback((productId: string) => {
    const product = productByIdRef.current.get(productId)
    if (!product) return
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
  }, [])

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return
    setPaymentOpen(true)
  }, [cart.length])

  const total = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )
    return subtotal + subtotal * 0.08
  }, [cart])

  const handlePaymentComplete = useCallback(() => {
    setLastCart([...cart])
    setPaymentOpen(false)
    setCart([])
    toast.success("Order completed successfully!", {
      description: "Receipt is ready to print.",
    })
  }, [cart])

  const handleReceiptQuickAction = useCallback(() => {
    if (lastCart.length > 0) {
      setReceiptOpen(true)
    } else {
      toast.info("No recent order", {
        description: "Complete a sale to generate a receipt.",
      })
    }
  }, [lastCart.length])

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <PosHeader onSearch={setSearchQuery} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
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
            />
          </div>

          <ScrollArea className="flex-1 px-4 pb-4 lg:px-5 lg:pb-5">
            <ProductGrid
              products={displayProducts}
              onAddToCart={addToCartById}
            />
            {displayProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm">No products found</p>
                <p className="text-xs mt-1">Try a different category or search</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-col gap-3 border-t border-border bg-background p-3 lg:w-[380px] lg:max-w-[400px] lg:shrink-0 lg:border-l lg:border-t-0",
            mobileView !== "order" && "hidden lg:flex",
            "flex-1 lg:flex-none"
          )}
        >
          <div className="flex-1 overflow-hidden">
            <OrderPanel
              cart={cart}
              formatCurrency={formatCurrency}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onCheckout={handleCheckout}
            />
          </div>
          <QuickActions
            onSaveOrder={() =>
              toast.info("Order held", { description: "You can resume this order later." })
            }
            onRecallOrder={() =>
              toast.info("Recall", { description: "Recall feature coming soon." })
            }
            onDiscount={() =>
              toast.info("Discount", { description: "Discount feature coming soon." })
            }
            onReceipt={handleReceiptQuickAction}
            onRefund={() =>
              toast.info("Refund", { description: "Refund feature coming soon." })
            }
          />
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
        taxRate={8}
        formatCurrency={(amount) => formatWithCurrency(amount, "USD")}
        terminalName="Quick Terminal"
        cashierName="Cashier"
        onConfirmPayment={async () => {
          handlePaymentComplete()
        }}
        onPaymentComplete={handlePaymentComplete}
      />

      <ReceiptPreviewModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        cart={lastCart}
        taxRate={8}
        formatCurrency={(amount) => formatWithCurrency(amount, "USD")}
        paymentMethod="Card"
        terminalName="Quick Terminal"
        cashierName="Cashier"
      />
    </div>
  )
}
