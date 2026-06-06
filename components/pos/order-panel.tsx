"use client"

import type { CartItem } from "@/lib/pos-data"
import { toTitleCase } from "@/lib/utils"
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface OrderPanelProps {
  cart: CartItem[]
  taxRate?: number
  formatCurrency: (amount: number) => string
  formatAmount?: (amount: number) => string
  recalledOrderName?: string | null
  onUpdateSavedOrder?: () => void
  isUpdatingSavedOrder?: boolean
  onUpdateQuantity: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  onCheckout: () => void
}

export function OrderPanel({
  cart,
  taxRate = 0,
  formatCurrency,
  formatAmount = formatCurrency,
  recalledOrderName = null,
  onUpdateSavedOrder,
  isUpdatingSavedOrder = false,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: OrderPanelProps) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">
            Current Order
          </h2>
          {itemCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {itemCount}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors touch-manipulation select-none"
          >
            Clear All
          </button>
        )}
      </div>

      <Separator />

      {recalledOrderName && cart.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 space-y-2">
          <div>
            <p className="text-xs font-semibold text-primary">{recalledOrderName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Commande rappelée — ajoutez des articles depuis le catalogue
            </p>
          </div>
          {onUpdateSavedOrder && (
            <button
              type="button"
              onClick={onUpdateSavedOrder}
              disabled={isUpdatingSavedOrder}
              className="w-full rounded-lg border border-primary/40 bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 touch-manipulation"
            >
              {isUpdatingSavedOrder ? "Mise à jour…" : "Mettre à jour la commande sauvegardée"}
            </button>
          )}
        </div>
      )}

      {/* Items */}
      <ScrollArea className="flex-1 px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No items yet</p>
            <p className="text-xs mt-1">Tap a product to add it</p>
          </div>
        ) : (
          <div className="py-3 space-y-1">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground break-words">
                    {toTitleCase(item.product.name)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation select-none"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-card-foreground font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation select-none"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-right text-sm font-semibold text-card-foreground font-mono">
                    {formatAmount(item.product.price * item.quantity)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors touch-manipulation select-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals + Checkout */}
      {cart.length > 0 && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {(taxRate ?? 0) > 0 ? (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({taxRate}%)</span>
                <span className="font-mono">{formatCurrency(tax)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax</span>
                <span className="font-mono">Disabled</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold text-card-foreground">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] touch-manipulation select-none"
          >
            Pay {formatCurrency(total)}
          </button>
        </div>
      )}
    </div>
  )
}
