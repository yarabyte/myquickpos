"use client"

import { memo } from "react"
import { UtensilsCrossed, Clock } from "lucide-react"
import type { CartItem } from "@/lib/pos-data"
import { OrderPanel } from "./order-panel"
import { QuickActions } from "./quick-actions"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PendingTableOrder } from "./table-order-payment-modal"
import { cn } from "@/lib/utils"

interface PosOrderSidebarProps {
  visible: boolean
  cart: CartItem[]
  taxRate: number
  formatCurrency: (amount: number) => string
  formatAmount: (amount: number) => string
  recalledOrderName: string | null
  onUpdateSavedOrder?: () => void
  isUpdatingSavedOrder: boolean
  onUpdateQuantity: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  onCheckout: () => void
  pendingOrders: PendingTableOrder[]
  onPendingOrderClick: (order: PendingTableOrder) => void
  onSaveOrder: () => void
  onRecallOrder: () => void
  onDiscount: () => void
  onReceipt: () => void
  onRefund: () => void
}

export const PosOrderSidebar = memo(function PosOrderSidebar({
  visible,
  cart,
  taxRate,
  formatCurrency,
  formatAmount,
  recalledOrderName,
  onUpdateSavedOrder,
  isUpdatingSavedOrder,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  pendingOrders,
  onPendingOrderClick,
  onSaveOrder,
  onRecallOrder,
  onDiscount,
  onReceipt,
  onRefund,
}: PosOrderSidebarProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-3 border-t border-border bg-background p-3 lg:w-[420px] lg:max-w-[440px] lg:shrink-0 lg:border-l lg:border-t-0",
        !visible && "hidden lg:flex",
        "flex-1 lg:flex-none"
      )}
    >
      {pendingOrders.length > 0 && (
        <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-card-foreground">
              Order from Tablet
            </span>
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded bg-primary px-1 text-xs font-bold text-primary-foreground">
              {pendingOrders.length}
            </span>
          </div>
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-1 p-2">
              {pendingOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onPendingOrderClick(order)}
                  className="flex w-full items-center gap-2 rounded-lg border border-transparent p-2.5 text-left active:border-border active:bg-muted/50"
                >
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {order.orderLabel || order.table?.name || order.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.orderNumber} ·{" "}
                      {new Date(order.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-card-foreground">
                    {formatCurrency(order.total)}
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
          recalledOrderName={recalledOrderName}
          onUpdateSavedOrder={onUpdateSavedOrder}
          isUpdatingSavedOrder={isUpdatingSavedOrder}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onClearCart={onClearCart}
          onCheckout={onCheckout}
        />
      </div>

      <div className="shrink-0">
        <QuickActions
          onSaveOrder={onSaveOrder}
          onRecallOrder={onRecallOrder}
          onDiscount={onDiscount}
          onReceipt={onReceipt}
          onRefund={onRefund}
        />
      </div>
    </div>
  )
})
