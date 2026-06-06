"use client"

import { useMemo } from "react"
import { cn, toTitleCase } from "@/lib/utils"
import { useCategories } from "@/hooks/use-categories"
import { getCategoryIcon } from "@/lib/category-icons"
import { LayoutGrid } from "lucide-react"

export interface CategoryBarCategory {
  id: string
  name: string
  icon: string
  parentId: string | null
}

interface CategoryBarProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
  allowedCategories?: string[]
  /** When provided (e.g. from server), use these instead of useCategories() for roots + subcategories */
  categories?: CategoryBarCategory[]
}

export function CategoryBar({ activeCategory, onCategoryChange, allowedCategories, categories: categoriesProp }: CategoryBarProps) {
  const hookData = useCategories()

  const { roots: hookRoots, getChildren: hookGetChildren } = hookData
  const rootsFromProp = useMemo(() => {
    if (!categoriesProp?.length) return null
    return categoriesProp.filter((c) => !c.parentId)
  }, [categoriesProp])
  const getChildrenFromProp = useMemo(() => {
    if (!categoriesProp?.length) return null
    return (parentId: string) =>
      categoriesProp.filter((c) => c.parentId === parentId)
  }, [categoriesProp])

  const roots = rootsFromProp ?? hookRoots
  const getChildren = getChildrenFromProp ?? hookGetChildren

  // Filter roots based on allowed categories
  const visibleRoots = allowedCategories
    ? roots.filter((r) => allowedCategories.includes(r.id))
    : roots

  // Determine which parent is active
  const activeRoot = visibleRoots.find((r) => r.id === activeCategory)
  const activeChildParent = visibleRoots.find((r) =>
    getChildren(r.id).some((c) => c.id === activeCategory)
  )
  const selectedParent = activeRoot || activeChildParent

  // Get children of the selected parent (filtered by allowed list)
  const childrenToShow = selectedParent
    ? getChildren(selectedParent.id).filter(
        (c) => !allowedCategories || allowedCategories.includes(c.id)
      )
    : []

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: "All" + root/parent categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* All Items button */}
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium whitespace-nowrap transition-all",
            "min-h-[52px] touch-manipulation select-none",
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <LayoutGrid className="h-5 w-5" />
          All Items
        </button>

        {visibleRoots.map((root) => {
          const Icon = getCategoryIcon(root.icon)
          const children = getChildren(root.id)
          const isActive = root.id === activeCategory || children.some((c) => c.id === activeCategory)
          return (
            <button
              key={root.id}
              onClick={() => onCategoryChange(root.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium whitespace-nowrap transition-all",
                "min-h-[52px] touch-manipulation select-none",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="h-5 w-5" />
              {toTitleCase(root.name)}
            </button>
          )
        })}
      </div>

      {/* Row 2: sub-categories (only if parent has children) */}
      {childrenToShow.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {/* "All {parent}" chip */}
          <button
            onClick={() => onCategoryChange(selectedParent!.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all",
              "touch-manipulation select-none border",
              activeCategory === selectedParent!.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            All {toTitleCase(selectedParent!.name)}
          </button>

          {childrenToShow.map((child) => {
            const ChildIcon = getCategoryIcon(child.icon)
            const isActive = activeCategory === child.id
            return (
              <button
                key={child.id}
                onClick={() => onCategoryChange(child.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all",
                  "touch-manipulation select-none border",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"
                )}
              >
                <ChildIcon className="h-3.5 w-3.5" />
                {toTitleCase(child.name)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
