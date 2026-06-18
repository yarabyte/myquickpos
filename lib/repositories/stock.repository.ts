import { prisma } from "@/lib/db"
import type { Prisma, StockMovementType } from "@prisma/client"
import { storeStockRepository } from "./store-stock.repository"

export const stockRepository = {
  getMovements: (tenantId: string, productId?: string, storeId?: string, limit = 50) => {
    const where: Prisma.StockMovementWhereInput = { tenantId }
    if (productId) where.productId = productId
    if (storeId) {
      where.OR = [{ fromStoreId: storeId }, { toStoreId: storeId }]
    }
    return prisma.stockMovement.findMany({
      where,
      include: { product: true, fromStore: true, toStore: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  },

  addMovement: (
    tenantId: string,
    productId: string,
    type: StockMovementType,
    quantity: number,
    reason?: string,
    options?: { fromLocation?: string; toLocation?: string; fromStoreId?: string; toStoreId?: string }
  ) =>
    prisma.stockMovement.create({
      data: {
        tenantId,
        productId,
        type,
        quantity,
        reason: reason ?? null,
        fromLocation: options?.fromLocation ?? null,
        toLocation: options?.toLocation ?? null,
        fromStoreId: options?.fromStoreId ?? null,
        toStoreId: options?.toStoreId ?? null,
      },
    }),

  recordSale: async (
    tenantId: string,
    productId: string,
    quantity: number,
    storeId: string,
    terminalId: string
  ) => {
    const result = await storeStockRepository.decrement(storeId, productId, quantity)
    if (!result.ok) return null
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId,
        type: "OUT",
        quantity: -quantity,
        reason: "POS sale",
        fromStoreId: storeId,
        fromLocation: terminalId,
      },
    })
    return { success: true }
  },
}
