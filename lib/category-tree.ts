export type CategoryNode = { id: string; parentId: string | null }

/** Include assigned category IDs and all their descendants. */
export function expandCategoryIds(
  categories: CategoryNode[],
  categoryIds: string[]
): string[] {
  if (categoryIds.length === 0) return []

  const childrenByParent = new Map<string, string[]>()
  for (const category of categories) {
    if (!category.parentId) continue
    const siblings = childrenByParent.get(category.parentId) ?? []
    siblings.push(category.id)
    childrenByParent.set(category.parentId, siblings)
  }

  const expanded = new Set<string>()
  function walk(id: string) {
    if (expanded.has(id)) return
    expanded.add(id)
    for (const childId of childrenByParent.get(id) ?? []) {
      walk(childId)
    }
  }

  for (const id of categoryIds) {
    walk(id)
  }

  return [...expanded]
}

export function filterProductsByAssignedCategories<
  T extends { category: string }
>(products: T[], categories: CategoryNode[], assignedCategoryIds: string[]): T[] {
  if (assignedCategoryIds.length === 0) return products
  const allowed = new Set(expandCategoryIds(categories, assignedCategoryIds))
  return products.filter((product) => allowed.has(product.category))
}
