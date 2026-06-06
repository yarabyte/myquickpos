import { prisma } from "@/lib/db"
import type { OrderStatus } from "@prisma/client"

export interface CreateOrderDto {
  orderNumber: string
  terminalId: string
  customerId?: string | null
  tableId?: string | null
  orderLabel?: string | null
  status?: OrderStatus
  subtotal: number
  tax: number
  discount?: number
  total: number
  paymentMethod: string
  cashierName?: string | null
  items: {
    productId: string
    quantity: number
    unitPrice: number
    total: number
  }[]
}

export interface OrderFilters {
  status?: OrderStatus
  terminalId?: string
  from?: Date
  to?: Date
  take?: number
}

export const orderRepository = {
  findById: (id: string, tenantId: string) =>
    prisma.order.findFirst({
      where: { id, tenantId },
      include: { items: { include: { product: true } }, customer: true, terminal: true },
    }),

  findMany: (tenantId: string, filters?: OrderFilters) => {
    const where: Parameters<typeof prisma.order.findMany>[0]["where"] = { tenantId }
    if (filters?.status) where.status = filters.status
    if (filters?.terminalId) where.terminalId = filters.terminalId
    if (filters?.from || filters?.to) {
      where.createdAt = {}
      if (filters.from) where.createdAt.gte = filters.from
      if (filters.to) where.createdAt.lte = filters.to
    }
    return prisma.order.findMany({
      where,
      take: filters?.take ?? 200,
      include: { items: { include: { product: true } }, terminal: true, customer: true, table: true },
      orderBy: { createdAt: "desc" },
    })
  },

  create: (data: CreateOrderDto, tenantId: string) =>
    prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        tenantId,
        terminalId: data.terminalId,
        customerId: data.customerId ?? null,
        tableId: data.tableId ?? null,
        orderLabel: data.orderLabel ?? null,
        status: data.status ?? "COMPLETED",
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount ?? 0,
        total: data.total,
        paymentMethod: data.paymentMethod,
        cashierName: data.cashierName ?? null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true, table: true },
    }),

  updateStatus: (id: string, tenantId: string, data: { status: OrderStatus; paymentMethod?: string; cashierName?: string | null }) =>
    prisma.order.updateMany({
      where: { id, tenantId },
      data: {
        status: data.status,
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.cashierName !== undefined && { cashierName: data.cashierName }),
      },
    }),

  generateOrderNumber: async (tenantId: string) => {
    const last = await prisma.order.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true },
    })
    const num = last ? parseInt(last.orderNumber.replace(/\D/g, ""), 10) + 1 : 1000
    return `ORD-${num}`
  },

  /** Tablet orders sent to a terminal (orderLabel or tableId set). */
  findTabletOrdersByTerminal: (
    tenantId: string,
    terminalId: string,
    options?: { take?: number; from?: Date; to?: Date }
  ) => {
    const where: Parameters<typeof prisma.order.findMany>[0]["where"] = {
      tenantId,
      terminalId,
      OR: [{ orderLabel: { not: null } }, { tableId: { not: null } }],
    }
    if (options?.from || options?.to) {
      where.createdAt = {}
      if (options.from) where.createdAt.gte = options.from
      if (options.to) where.createdAt.lte = options.to
    }
    return prisma.order.findMany({
      where,
      take: options?.take ?? 100,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })
  },

  updatePendingOrder: async (
    id: string,
    tenantId: string,
    data: {
      orderLabel?: string
      subtotal: number
      tax: number
      discount?: number
      total: number
      items: { productId: string; quantity: number; unitPrice: number; total: number }[]
    }
  ) => {
    const existing = await prisma.order.findFirst({
      where: { id, tenantId, status: "PENDING" },
    })
    if (!existing) throw new Error("Order not found or not pending")

    return prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } })
      return tx.order.update({
        where: { id },
        data: {
          ...(data.orderLabel !== undefined && { orderLabel: data.orderLabel }),
          subtotal: data.subtotal,
          tax: data.tax,
          discount: data.discount ?? 0,
          total: data.total,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      })
    })
  },
}
