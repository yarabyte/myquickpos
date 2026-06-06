"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { listSavedCarts, getSavedCart, deleteSavedCart } from "@/app/actions/saved-carts"
import type { CartItem, Product } from "@/lib/pos-data"
import { toast } from "sonner"
import { Loader2, Trash2, ShoppingBag } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RecallCartModalProps {
  open: boolean
  onClose: () => void
  terminalId: string
  products: Product[]
  /** (cart, savedCartId, savedCartName) – savedCartId is passed so the parent can update/delete it */
  onRecall: (cart: CartItem[], savedCartId: string, savedCartName: string) => void
  onDeleteAfterRecall?: (id: string) => void
}

export function RecallCartModal({
  open,
  onClose,
  terminalId,
  products,
  onRecall,
  onDeleteAfterRecall,
}: RecallCartModalProps) {
  const [list, setList] = useState<{ id: string; name: string; updatedAt: Date; itemCount: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [recallingId, setRecallingId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    const result = await listSavedCarts(terminalId)
    setLoading(false)
    if (result.success) setList(result.data)
    else toast.error(result.error)
  }, [terminalId])

  useEffect(() => {
    if (open) fetchList()
  }, [open, fetchList])

  const handleSelect = useCallback(
    async (id: string) => {
      setRecallingId(id)
      const result = await getSavedCart(id)
      setRecallingId(null)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const productMap = new Map(products.map((p) => [p.id, p]))
      const cart: CartItem[] = []
      let skipped = 0
      for (const { productId, quantity } of result.data.items) {
        const product = productMap.get(productId)
        if (!product) {
          skipped += quantity
          continue
        }
        cart.push({ product, quantity })
      }
      if (skipped > 0) {
        toast.info("Some items were removed (product no longer available)")
      }
      onRecall(cart, id, result.data.name)
      onClose()
      toast.success("Commande rappelée", {
        description: "Ajoutez des articles depuis le catalogue, puis mettez à jour ou payez.",
      })
    },
    [products, onRecall, onClose]
  )

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      const result = await deleteSavedCart(id)
      if (result.success) {
        setList((prev) => prev.filter((c) => c.id !== id))
        onDeleteAfterRecall?.(id)
        toast.success("Saved order deleted")
      } else {
        toast.error(result.error)
      }
    },
    [onDeleteAfterRecall]
  )

  const formatDate = (d: Date) =>
    new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Recall saved order
          </DialogTitle>
          <DialogDescription>
            Sélectionnez une commande à charger dans le panier. Vous pourrez ajouter des articles, modifier les quantités, puis mettre à jour ou payer.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No saved orders. Save an order with a name to recall it here.
          </div>
        ) : (
          <ScrollArea className="max-h-[320px] pr-2">
            <ul className="space-y-1">
              {list.map((item) => (
                <li key={item.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(item.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelect(item.id)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-card-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.itemCount} item{item.itemCount !== 1 ? "s" : ""} ·{" "}
                        {formatDate(item.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, item.id)}
                        title="Delete saved order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {recallingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
