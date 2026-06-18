import type { Category } from "@/lib/pos-data"

/** Precompute descendant category IDs for fast POS filtering. */
export function buildCategoryDescendantMap(
  categories: Pick<Category, "id" | "parentId">[]
): Map<string, Set<string>> {
  const childrenByParent = new Map<string, string[]>()

  for (const category of categories) {
    if (!category.parentId) continue
    const siblings = childrenByParent.get(category.parentId) ?? []
    siblings.push(category.id)
    childrenByParent.set(category.parentId, siblings)
  }

  const cache = new Map<string, Set<string>>()

  function collect(categoryId: string): Set<string> {
    const cached = cache.get(categoryId)
    if (cached) return cached

    const ids = new Set<string>([categoryId])
    for (const childId of childrenByParent.get(categoryId) ?? []) {
      for (const id of collect(childId)) ids.add(id)
    }
    cache.set(categoryId, ids)
    return ids
  }

  for (const category of categories) {
    collect(category.id)
  }

  return cache
}
