"use client"

import { memo } from "react"
import { CategoryBar, type CategoryBarCategory } from "./category-bar"
import { ProductGrid } from "./product-grid"
import type { ProductCardData } from "./product-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface PosProductSectionProps {
  visible: boolean
  activeCategory: string
  onCategoryChange: (category: string) => void
  categories: CategoryBarCategory[]
  assignedCategories?: string[]
  products: ProductCardData[]
  onAddToCart: (productId: string) => void
}

export const PosProductSection = memo(function PosProductSection({
  visible,
  activeCategory,
  onCategoryChange,
  categories,
  assignedCategories,
  products,
  onAddToCart,
}: PosProductSectionProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        !visible && "hidden lg:flex"
      )}
    >
      <div className="px-4 pt-3 pb-2 lg:px-5 lg:pt-4 lg:pb-3">
        <CategoryBar
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
          allowedCategories={assignedCategories}
          categories={categories}
        />
      </div>

      <ScrollArea className="flex-1 px-4 pb-4 lg:px-5 lg:pb-5">
        <ProductGrid products={products} onAddToCart={onAddToCart} />
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No products found</p>
            <p className="mt-1 text-xs">Try a different category or search</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
})
