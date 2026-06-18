"use client"

import { memo, useMemo } from "react"
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

interface CartLineProps {
  item: CartItem
  lineTotal: string
  displayName: string
  onUpdateQuantity: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
}

const CartLine = memo(function CartLine({
  item,
  lineTotal,
  displayName,
  onUpdateQuantity,
  onRemoveItem,
}: CartLineProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2.5">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-card-foreground">
          {displayName}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.product.id, -1)}
          className="flex h-8 w-8 touch-manipulation select-none items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center font-mono text-sm font-semibold text-card-foreground">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.product.id, 1)}
          className="flex h-8 w-8 touch-manipulation select-none items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-20 shrink-0 text-right font-mono text-sm font-semibold text-card-foreground">
          {lineTotal}
        </span>
        <button
          type="button"
          onClick={() => onRemoveItem(item.product.id)}
          className="flex h-8 w-8 touch-manipulation select-none items-center justify-center rounded-lg text-muted-foreground active:bg-destructive/10 active:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
})

export const OrderPanel = memo(function OrderPanel({
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
  const { subtotal, tax, total, itemCount } = useMemo(() => {
    const sub = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )
    const taxAmount = sub * (taxRate / 100)
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    return {
      subtotal: sub,
      tax: taxAmount,
      total: sub + taxAmount,
      itemCount: count,
    }
  }, [cart, taxRate])

  const lines = useMemo(
    () =>
      cart.map((item) => ({
        item,
        displayName: toTitleCase(item.product.name),
        lineTotal: formatAmount(item.product.price * item.quantity),
      })),
    [cart, formatAmount]
  )

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between p-4">
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
            type="button"
            onClick={onClearCart}
            className="touch-manipulation select-none text-xs font-medium text-destructive"
          >
            Clear All
          </button>
        )}
      </div>

      <Separator className="shrink-0" />

      {recalledOrderName && cart.length > 0 && (
        <div className="mx-4 mt-3 shrink-0 space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-primary">{recalledOrderName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recalled order — add items from the catalog
            </p>
          </div>
          {onUpdateSavedOrder && (
            <button
              type="button"
              onClick={onUpdateSavedOrder}
              disabled={isUpdatingSavedOrder}
              className="w-full touch-manipulation rounded-lg border border-primary/40 bg-background px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
            >
              {isUpdatingSavedOrder ? "Updating…" : "Update saved order"}
            </button>
          )}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No items yet</p>
            <p className="mt-1 text-xs">Tap a product to add it</p>
          </div>
        ) : (
          <div className="space-y-1 py-3">
            {lines.map(({ item, displayName, lineTotal }) => (
              <CartLine
                key={item.product.id}
                item={item}
                displayName={displayName}
                lineTotal={lineTotal}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {cart.length > 0 && (
        <div className="shrink-0 space-y-3 border-t border-border p-4">
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
            type="button"
            onClick={onCheckout}
            className="flex w-full touch-manipulation select-none items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground active:bg-primary/90"
          >
            Pay {formatCurrency(total)}
          </button>
        </div>
      )}
    </div>
  )
})
