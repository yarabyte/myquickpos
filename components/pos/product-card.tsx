"use client"

import { memo } from "react"
import { Plus } from "lucide-react"
import { cn, toTitleCase } from "@/lib/utils"
import type { Product } from "@/lib/pos-data"

export interface ProductCardData {
  id: string
  displayName: string
  displayPrice: string
  stock: number | null
}

export function toProductCardData(
  products: Product[],
  formatPrice: (price: number) => string
): ProductCardData[] {
  return products.map((product) => ({
    id: product.id,
    displayName: toTitleCase(product.name),
    displayPrice: formatPrice(product.price),
    stock: product.stock ?? null,
  }))
}

interface ProductCardProps {
  product: ProductCardData
  onAdd: (productId: string) => void
}

export const ProductCard = memo(function ProductCard({
  product,
  onAdd,
}: ProductCardProps) {
  const isOutOfStock = product.stock !== null && product.stock <= 0
  const isLowStock =
    product.stock !== null && product.stock > 0 && product.stock <= 5

  return (
    <button
      type="button"
      onClick={() => !isOutOfStock && onAdd(product.id)}
      disabled={isOutOfStock}
      className={cn(
        "group relative flex flex-col items-start rounded-xl border border-border bg-card p-4 text-left touch-manipulation select-none min-h-[120px]",
        isOutOfStock
          ? "opacity-70 cursor-not-allowed"
          : "active:bg-card/80 active:border-primary/40"
      )}
    >
      <div className="flex w-full items-start justify-between">
        <span className="text-sm font-semibold text-card-foreground leading-tight">
          {product.displayName}
        </span>
        {!isOutOfStock && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-auto flex flex-col gap-0.5 pt-3">
        <span className="text-lg font-bold text-primary font-mono">
          {product.displayPrice}
        </span>
        {product.stock !== null && (
          <span
            className={cn(
              "text-xs font-medium",
              isOutOfStock && "text-destructive",
              isLowStock && !isOutOfStock && "text-amber-600 dark:text-amber-400",
              !isOutOfStock && !isLowStock && "text-muted-foreground"
            )}
          >
            {isOutOfStock ? "Out of stock" : `Stock: ${product.stock}`}
          </span>
        )}
      </div>
    </button>
  )
})
