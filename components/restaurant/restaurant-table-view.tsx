"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { submitTableOrder } from "@/app/actions/table-orders"
import type { CartItem, Product, Category } from "@/lib/pos-data"
import { CategoryBar } from "@/components/pos/category-bar"
import { ProductGrid } from "@/components/pos/product-grid"
import { toProductCardData } from "@/components/pos/product-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatWithCurrency } from "@/lib/format-currency"
import { toTitleCase } from "@/lib/utils"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { RestaurantTabletHeader } from "@/components/restaurant/restaurant-tablet-header"

interface RestaurantTableViewProps {
  establishmentSlug: string
  tableSlug: string
  establishment: { id: string; name: string; slug: string }
  table: { id: string; name: string; slug: string }
  products: Product[]
  categories: Category[]
  assignedCategories?: string[]
  taxRate: number
  currency: string
}

export function RestaurantTableView({
  establishmentSlug,
  tableSlug,
  establishment,
  table,
  products: allProducts,
  categories,
  assignedCategories = [],
  taxRate = 0,
  currency = "USD",
}: RestaurantTableViewProps) {
  const formatCurrency = useCallback(
    (amount: number) => formatWithCurrency(amount, currency),
    [currency]
  )
  const [activeCategory, setActiveCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderLabel, setOrderLabel] = useState(table.name)
  const [sending, setSending] = useState(false)

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

  const addToCartById = useCallback((productId: string) => {
    const product = productByIdRef.current.get(productId)
    if (product) addToCart(product)
  }, [addToCart])

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

  const clearCart = useCallback(() => setCart([]), [])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  )
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const handleSendToPos = useCallback(async () => {
    if (cart.length === 0) {
      toast.error("Empty cart", { description: "Add at least one item." })
      return
    }
    setSending(true)
    const result = await submitTableOrder({
      establishmentSlug,
      tableSlug,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity,
      })),
      subtotal,
      tax,
      discount: 0,
      orderLabel: orderLabel?.trim() || null,
    })
    setSending(false)
    if (result.success) {
      setCart([])
      toast.success("Order sent to POS", {
        description: `Order ${result.data.orderNumber} pending.`,
      })
    } else {
      toast.error(result.error)
    }
  }, [cart, establishmentSlug, tableSlug, subtotal, tax, orderLabel])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <RestaurantTabletHeader
        establishmentName={establishment.name}
        tableName={table.name}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
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
              products={displayProducts}
              onAddToCart={addToCartById}
            />
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">No products</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: cart + order label + send */}
        <div className="flex w-full max-w-[400px] flex-col gap-3 border-l border-border bg-background p-3 sm:w-[380px]">
          <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">Order</h2>
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
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive touch-manipulation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                      Table or customer name
                    </label>
                    <input
                      id="order-label"
                      type="text"
                      value={orderLabel}
                      onChange={(e) => setOrderLabel(e.target.value)}
                      placeholder={table.name}
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
                    onClick={handleSendToPos}
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 touch-manipulation"
                  >
                    <Send className="h-5 w-5" />
                    {sending ? "Sending…" : "Send to POS"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
