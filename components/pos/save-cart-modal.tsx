"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"
import { saveCart, updateSavedCart } from "@/app/actions/saved-carts"
import type { CartItem } from "@/lib/pos-data"
import { toast } from "sonner"

interface SaveCartModalProps {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  terminalId: string
  savedCartId?: string | null
  initialName?: string
  onSaved?: () => void
}

export function SaveCartModal({
  open,
  onClose,
  cart,
  terminalId,
  savedCartId = null,
  initialName = "",
  onSaved,
}: SaveCartModalProps) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const isUpdate = Boolean(savedCartId)

  useEffect(() => {
    if (open) {
      setName(initialName)
    }
  }, [open, initialName])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = name.trim()
      if (!trimmed) {
        toast.error("Enter a name for this order")
        return
      }
      if (cart.length === 0) {
        toast.error("Cart is empty")
        return
      }
      setSaving(true)
      const items = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }))
      const result = isUpdate
        ? await updateSavedCart({ id: savedCartId!, name: trimmed, items })
        : await saveCart({ name: trimmed, terminalId, items })
      setSaving(false)
      if (result.success) {
        toast.success(isUpdate ? "Order updated" : "Order saved", {
          description: isUpdate
            ? `"${trimmed}" has been updated.`
            : `"${trimmed}" can be recalled later.`,
        })
        setName("")
        onSaved?.()
        onClose()
      } else {
        toast.error(result.error)
      }
    },
    [name, cart, terminalId, onClose, onSaved, isUpdate, savedCartId]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setName("")
        onClose()
      }
    },
    [onClose]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {isUpdate ? "Update order" : "Save order"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Save changes (added items or updated quantities)."
              : "Give this order a name to recall it later on this terminal."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="save-cart-name">Name</Label>
            <Input
              id="save-cart-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Table 5, Mr. Dupont"
              maxLength={100}
              autoFocus
              disabled={saving}
            />
          </div>
          {cart.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {cart.length} item{cart.length !== 1 ? "s" : ""} ·{" "}
              {cart.reduce((sum, i) => sum + i.quantity, 0)} total
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || cart.length === 0 || !name.trim()}>
              {saving ? "Saving…" : isUpdate ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
