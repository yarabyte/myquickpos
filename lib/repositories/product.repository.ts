import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export interface ProductFilters {
  categoryId?: string
  search?: string
  lowStock?: boolean
  isService?: boolean
  includeInactive?: boolean
}

export interface CreateProductDto {
  name: string
  sku: string
  price: number
  cost: number
  categoryId: string
  minStock?: number
  barcode?: string
  imageUrl?: string
  isService?: boolean
}

export interface UpdateProductDto {
  name?: string
  sku?: string
  price?: number
  cost?: number
  categoryId?: string
  minStock?: number
  barcode?: string
  imageUrl?: string
  isActive?: boolean
  isService?: boolean
}

export const productRepository = {
  findAll: async (tenantId: string, filters?: ProductFilters) => {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(filters?.includeInactive !== true && { isActive: true }),
    }
    if (filters?.isService !== undefined) where.isService = filters.isService
    if (filters?.categoryId) where.categoryId = filters.categoryId
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
      ]
    }
    let products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    })
    if (filters?.lowStock && filters?.isService !== true) {
      const lowStockIds = await productRepository.getLowStockProductIds(tenantId)
      products = products.filter((p) => lowStockIds.has(p.id))
    }
    return products.map((p) => ({
      ...p,
      price: Number(p.price),
      cost: Number(p.cost),
      category: p.categoryId,
      image: p.imageUrl ?? undefined,
    }))
  },

  findById: async (id: string, tenantId: string) => {
    const p = await prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true },
    })
    if (!p) return null
    return {
      ...p,
      price: Number(p.price),
      cost: Number(p.cost),
      category: p.categoryId,
      image: p.imageUrl ?? undefined,
    }
  },

  getLowStockProductIds: async (tenantId: string): Promise<Set<string>> => {
    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, minStock: true },
    })
    const ids = products.map((p) => p.id)
    if (ids.length === 0) return new Set()
    const sums = await prisma.storeStock.groupBy({
      by: ["productId"],
      where: { productId: { in: ids }, store: { tenantId } },
      _sum: { quantity: true },
    })
    const totalByProduct = new Map(sums.map((s) => [s.productId, s._sum.quantity ?? 0]))
    const lowStockIds = new Set<string>()
    for (const p of products) {
      const total = totalByProduct.get(p.id) ?? 0
      if (total <= p.minStock) lowStockIds.add(p.id)
    }
    return lowStockIds
  },

  getLowStock: async (tenantId: string) => {
    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { storeStocks: true },
    })
    return products.filter((p) => {
      const total = p.storeStocks.reduce((s, row) => s + row.quantity, 0)
      return total <= p.minStock
    })
  },

  create: (data: CreateProductDto, tenantId: string) =>
    prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        price: data.price,
        cost: data.cost,
        categoryId: data.categoryId,
        minStock: data.minStock ?? 5,
        barcode: data.barcode ?? null,
        imageUrl: data.imageUrl ?? null,
        isService: data.isService ?? false,
        tenantId,
      },
    }),

  update: (id: string, data: UpdateProductDto, tenantId: string) =>
    prisma.product.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isService !== undefined && { isService: data.isService }),
      },
    }),

  /** Soft delete: sets isActive to false. Preserves order history. */
  delete: (id: string, tenantId: string) =>
    prisma.product.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    }),
}
