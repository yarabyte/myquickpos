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
        toast.error("Entrez un nom pour cette commande")
        return
      }
      if (cart.length === 0) {
        toast.error("Le panier est vide")
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
        toast.success(isUpdate ? "Commande mise à jour" : "Commande enregistrée", {
          description: isUpdate
            ? `"${trimmed}" a été mise à jour.`
            : `"${trimmed}" pourra être rappelée plus tard.`,
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
            {isUpdate ? "Mettre à jour la commande" : "Enregistrer la commande"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Enregistrez les modifications (articles ajoutés ou quantités changées)."
              : "Donnez un nom à cette commande pour la rappeler plus tard sur ce terminal."}
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
              {saving ? "Enregistrement…" : isUpdate ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
