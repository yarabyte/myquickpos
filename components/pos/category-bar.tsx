"use client"

import { memo, useMemo } from "react"
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
  categories?: CategoryBarCategory[]
}

const CategoryBarInner = memo(function CategoryBarInner({
  categories,
  activeCategory,
  onCategoryChange,
  allowedCategories,
}: {
  categories: CategoryBarCategory[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  allowedCategories?: string[]
}) {
  const roots = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories]
  )

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryBarCategory[]>()
    for (const category of categories) {
      if (!category.parentId) continue
      const siblings = map.get(category.parentId) ?? []
      siblings.push(category)
      map.set(category.parentId, siblings)
    }
    return map
  }, [categories])

  const getChildren = (parentId: string) => childrenByParent.get(parentId) ?? []

  const visibleRoots = allowedCategories
    ? roots.filter((root) => allowedCategories.includes(root.id))
    : roots

  const activeRoot = visibleRoots.find((root) => root.id === activeCategory)
  const activeChildParent = visibleRoots.find((root) =>
    getChildren(root.id).some((child) => child.id === activeCategory)
  )
  const selectedParent = activeRoot || activeChildParent

  const childrenToShow = selectedParent
    ? getChildren(selectedParent.id).filter(
        (child) => !allowedCategories || allowedCategories.includes(child.id)
      )
    : []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => onCategoryChange("all")}
          className={cn(
            "flex min-h-[52px] touch-manipulation select-none items-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 text-sm font-medium",
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          <LayoutGrid className="h-5 w-5" />
          All Items
        </button>

        {visibleRoots.map((root) => {
          const Icon = getCategoryIcon(root.icon)
          const children = getChildren(root.id)
          const isActive =
            root.id === activeCategory ||
            children.some((child) => child.id === activeCategory)

          return (
            <button
              key={root.id}
              type="button"
              onClick={() => onCategoryChange(root.id)}
              className={cn(
                "flex min-h-[52px] touch-manipulation select-none items-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {toTitleCase(root.name)}
            </button>
          )
        })}
      </div>

      {childrenToShow.length > 0 && selectedParent && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => onCategoryChange(selectedParent.id)}
            className={cn(
              "touch-manipulation select-none rounded-full border px-4 py-2 text-xs font-medium whitespace-nowrap",
              activeCategory === selectedParent.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            All {toTitleCase(selectedParent.name)}
          </button>

          {childrenToShow.map((child) => {
            const ChildIcon = getCategoryIcon(child.icon)
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => onCategoryChange(child.id)}
                className={cn(
                  "flex touch-manipulation select-none items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium whitespace-nowrap",
                  activeCategory === child.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
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
})

function CategoryBarWithStore(props: Omit<CategoryBarProps, "categories">) {
  const { categories } = useCategories()
  const normalized = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        parentId: category.parentId,
      })),
    [categories]
  )

  return <CategoryBarInner categories={normalized} {...props} />
}

export function CategoryBar({
  categories: categoriesProp,
  ...props
}: CategoryBarProps) {
  if (categoriesProp?.length) {
    return <CategoryBarInner categories={categoriesProp} {...props} />
  }
  return <CategoryBarWithStore {...props} />
}
