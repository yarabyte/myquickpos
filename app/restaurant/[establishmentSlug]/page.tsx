import { notFound } from "next/navigation"
import { establishmentRepository } from "@/lib/repositories/establishment.repository"
import { productRepository } from "@/lib/repositories/product.repository"
import { categoryRepository } from "@/lib/repositories/category.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { storeRepository } from "@/lib/repositories/store.repository"
import { storeStockRepository } from "@/lib/repositories/store-stock.repository"
import { RestaurantEstablishmentView } from "@/components/restaurant/restaurant-establishment-view"
import {
  expandCategoryIds,
  filterProductsByAssignedCategories,
} from "@/lib/category-tree"

export default async function RestaurantEstablishmentPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string }>
}) {
  const { establishmentSlug } = await params
  const decoded = decodeURIComponent(establishmentSlug)

  const resolved = await establishmentRepository.findBySlugPublic(decoded)
  if (!resolved) notFound()

  const { establishment, terminal, tenantId } = resolved
  const settings = (terminal.settings as { assignedCategories?: string[]; taxRate?: number }) ?? {}
  const assignedCategories = settings.assignedCategories ?? []
  const taxRate = settings.taxRate ?? 0

  const [products, categories, tenantSettings] = await Promise.all([
    productRepository.findAll(tenantId),
    categoryRepository.findAll(tenantId),
    tenantRepository.getSettings(tenantId),
  ])

  let storeId = terminal.storeId ?? null
  if (!storeId) {
    const central = await storeRepository.getCentral(tenantId)
    storeId = central?.id ?? null
  }
  const storeStockRows = storeId
    ? await storeStockRepository.getByStore(tenantId, storeId)
    : []
  const stockByProduct = new Map(storeStockRows.map((r) => [r.productId, r.quantity]))

  const productList = products.map(
    (p: {
      id: string
      name: string
      price: number
      category: string
      image?: string
      isService?: boolean
    }) => ({
      id: p.id,
      name: p.name,
      price: typeof p.price === "number" ? p.price : Number(p.price),
      category: p.category,
      image: p.image,
      stock: p.isService ? undefined : (storeId ? stockByProduct.get(p.id) ?? 0 : undefined),
    })
  )

  const categoryList = categories.map(
    (c: { id: string; name: string; icon?: string | null; parentId: string | null }) => ({
      id: c.id,
      name: c.name,
      icon: c.icon ?? "grid",
      parentId: c.parentId,
    })
  )

  const filteredProducts = filterProductsByAssignedCategories(
    productList,
    categoryList,
    assignedCategories
  )

  const currency = tenantSettings?.currency ?? "USD"
  const expandedAssignedCategories =
    assignedCategories.length > 0
      ? expandCategoryIds(categoryList, assignedCategories)
      : undefined

  return (
    <RestaurantEstablishmentView
      establishmentSlug={decoded}
      establishment={{ id: establishment.id, name: establishment.name, slug: establishment.slug }}
      products={filteredProducts}
      categories={categoryList}
      assignedCategories={expandedAssignedCategories}
      taxRate={taxRate}
      currency={currency}
    />
  )
}
