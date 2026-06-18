"use client"

import { memo } from "react"
import { Receipt, Percent, Save, ShoppingBag, RotateCcw } from "lucide-react"

interface QuickActionsProps {
  onSaveOrder: () => void
  onRecallOrder: () => void
  onDiscount: () => void
  onReceipt: () => void
  onRefund: () => void
}

export const QuickActions = memo(function QuickActions({
  onSaveOrder,
  onRecallOrder,
  onDiscount,
  onReceipt,
  onRefund,
}: QuickActionsProps) {
  const actions = [
    { icon: Save, label: "Save", onClick: onSaveOrder },
    { icon: ShoppingBag, label: "Recall", onClick: onRecallOrder },
    { icon: Percent, label: "Discount", onClick: onDiscount },
    { icon: Receipt, label: "Receipt", onClick: onReceipt },
    { icon: RotateCcw, label: "Refund", onClick: onRefund },
  ]

  return (
    <div className="grid grid-cols-5 gap-2">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-muted-foreground touch-manipulation select-none active:border-primary/30 active:text-card-foreground"
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
})
