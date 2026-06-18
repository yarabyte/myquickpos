"use client"

import { memo } from "react"
import { ProductCard, type ProductCardData } from "./product-card"

interface ProductGridProps {
  products: ProductCardData[]
  onAddToCart: (productId: string) => void
}

export const ProductGrid = memo(function ProductGrid({
  products,
  onAddToCart,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
      ))}
    </div>
  )
})
