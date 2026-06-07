"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireTenantId } from "@/lib/auth"
import { orderRepository } from "@/lib/repositories/order.repository"
import { establishmentRepository } from "@/lib/repositories/establishment.repository"
import { tableRepository } from "@/lib/repositories/table.repository"
import { terminalRepository } from "@/lib/repositories/terminal.repository"
import { storeRepository } from "@/lib/repositories/store.repository"
import { storeStockRepository } from "@/lib/repositories/store-stock.repository"
import { prisma } from "@/lib/db"

const submitTableOrderSchema = z.object({
  establishmentSlug: z.string().min(1),
  tableSlug: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
        total: z.number().min(0),
      })
    )
    .min(1, "At least one item required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  orderLabel: z.string().nullable().optional(),
})

const submitEstablishmentOrderSchema = z.object({
  establishmentSlug: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
        total: z.number().min(0),
      })
    )
    .min(1, "At least one item required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  orderLabel: z.string().min(1, "Table or customer name is required"),
})

export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

export type EstablishmentOrderSummary = {
  id: string
  orderNumber: string
  orderLabel: string | null
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED"
  subtotal: number
  tax: number
  total: number
  createdAt: string
  items: {
    id: string
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }[]
}

const orderItemsSchema = z
  .array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
      total: z.number().min(0),
    })
  )
  .min(1, "At least one item required")

async function resolveEstablishment(establishmentSlug: string) {
  const resolved = await establishmentRepository.findBySlugPublic(establishmentSlug)
  if (!resolved) return null
  return resolved
}

function mapOrderSummary(order: Awaited<ReturnType<typeof orderRepository.findTabletOrdersByTerminal>>[number]): EstablishmentOrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderLabel: order.orderLabel,
    status: order.status,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
  }
}

const getEstablishmentOrdersSchema = z.object({
  establishmentSlug: z.string().min(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

/** List tablet orders sent to POS for an establishment (public, no auth). */
export async function getEstablishmentOrders(
  input: z.infer<typeof getEstablishmentOrdersSchema>
): Promise<ActionResult<EstablishmentOrderSummary[]>> {
  try {
    const parsed = getEstablishmentOrdersSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }

    const resolved = await resolveEstablishment(parsed.data.establishmentSlug)
    if (!resolved) {
      return { success: false, error: "Tablet not found" }
    }

    const orders = await orderRepository.findTabletOrdersByTerminal(
      resolved.tenantId,
      resolved.terminal.id,
      {
        from: parsed.data.from ? new Date(parsed.data.from) : undefined,
        to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      }
    )

    return { success: true, data: orders.map(mapOrderSummary) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load orders" }
  }
}

export type PendingTableOrderDto = {
  id: string
  orderNumber: string
  orderLabel: string | null
  total: number
  createdAt: string
  table: { id: string; name: string; slug: string } | null
  items: {
    productId: string
    quantity: number
    unitPrice: number
    total: number
    product: { name: string }
  }[]
}

function mapPendingTableOrder(
  o: Awaited<ReturnType<typeof orderRepository.findMany>>[number]
): PendingTableOrderDto {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    orderLabel: o.orderLabel ?? null,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    table: o.table ? { id: o.table.id, name: o.table.name, slug: o.table.slug } : null,
    items: o.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.total),
      product: i.product ? { name: i.product.name } : { name: "—" },
    })),
  }
}

/** Pending tablet orders for POS terminal (authenticated, for polling refresh). */
export async function getPendingTableOrders(
  terminalId: string
): Promise<ActionResult<PendingTableOrderDto[]>> {
  try {
    const tenantId = await requireTenantId()
    const terminal = await terminalRepository.findById(terminalId, tenantId)
    if (!terminal) {
      return { success: false, error: "Terminal not found" }
    }

    const pendingOrders = await orderRepository.findMany(tenantId, {
      terminalId,
      status: "PENDING",
      take: 50,
    })

    return { success: true, data: pendingOrders.map(mapPendingTableOrder) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load pending orders" }
  }
}

const updatePendingEstablishmentOrderSchema = z.object({
  establishmentSlug: z.string().min(1),
  orderId: z.string().min(1),
  items: orderItemsSchema,
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  orderLabel: z.string().min(1, "Table or customer name is required"),
})

/** Update a PENDING tablet order (public, scoped to establishment terminal). */
export async function updatePendingEstablishmentOrder(
  data: z.infer<typeof updatePendingEstablishmentOrderSchema>
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const parsed = updatePendingEstablishmentOrderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }

    const resolved = await resolveEstablishment(parsed.data.establishmentSlug)
    if (!resolved) {
      return { success: false, error: "Tablet not found" }
    }

    const existing = await orderRepository.findById(parsed.data.orderId, resolved.tenantId)
    if (!existing) return { success: false, error: "Order not found" }
    if (existing.terminalId !== resolved.terminal.id) {
      return { success: false, error: "Order does not belong to this tablet" }
    }
    if (existing.status !== "PENDING") {
      return { success: false, error: "Only pending orders can be modified" }
    }

    const total = parsed.data.subtotal + parsed.data.tax - (parsed.data.discount ?? 0)

    const order = await orderRepository.updatePendingOrder(parsed.data.orderId, resolved.tenantId, {
      orderLabel: parsed.data.orderLabel.trim(),
      subtotal: parsed.data.subtotal,
      tax: parsed.data.tax,
      discount: parsed.data.discount ?? 0,
      total,
      items: parsed.data.items,
    })

    revalidatePath(`/pos/${resolved.terminal.id}`)
    revalidatePath("/admin/tablet")
    revalidatePath(`/restaurant/${parsed.data.establishmentSlug}`)

    return { success: true, data: { orderId: order.id, orderNumber: order.orderNumber } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update order" }
  }
}

/** Submit order from tablet (no auth). Creates Order with status PENDING, no stock movement. */
export async function submitTableOrder(
  data: z.infer<typeof submitTableOrderSchema>
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const parsed = submitTableOrderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }

    const resolved = await tableRepository.findByEstablishmentSlugAndTableSlug(
      parsed.data.establishmentSlug,
      parsed.data.tableSlug
    )
    if (!resolved) {
      return { success: false, error: "Tablet not found" }
    }

    const { table, establishment, terminal, tenantId } = resolved
    const total = parsed.data.subtotal + parsed.data.tax - (parsed.data.discount ?? 0)
    const orderNumber = await orderRepository.generateOrderNumber(tenantId)

    const order = await orderRepository.create(
      {
        orderNumber,
        terminalId: terminal.id,
        tableId: table.id,
        orderLabel: parsed.data.orderLabel ?? null,
        status: "PENDING",
        subtotal: parsed.data.subtotal,
        tax: parsed.data.tax,
        discount: parsed.data.discount ?? 0,
        total,
        paymentMethod: "TABLE",
        items: parsed.data.items,
      },
      tenantId
    )

    revalidatePath(`/pos/${terminal.id}`)
    revalidatePath("/admin/tablet")

    return { success: true, data: { orderId: order.id, orderNumber: order.orderNumber } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to submit table order" }
  }
}

/** Submit order from establishment tablet (no table in URL). orderLabel (table or client name) is required. */
export async function submitEstablishmentOrder(
  data: z.infer<typeof submitEstablishmentOrderSchema>
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const parsed = submitEstablishmentOrderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }

    const resolved = await establishmentRepository.findBySlugPublic(parsed.data.establishmentSlug)
    if (!resolved) {
      return { success: false, error: "Tablet not found" }
    }

    const { establishment, terminal, tenantId } = resolved
    const total = parsed.data.subtotal + parsed.data.tax - (parsed.data.discount ?? 0)
    const orderNumber = await orderRepository.generateOrderNumber(tenantId)

    const order = await orderRepository.create(
      {
        orderNumber,
        terminalId: terminal.id,
        tableId: null,
        orderLabel: parsed.data.orderLabel.trim(),
        status: "PENDING",
        subtotal: parsed.data.subtotal,
        tax: parsed.data.tax,
        discount: parsed.data.discount ?? 0,
        total,
        paymentMethod: "TABLE",
        items: parsed.data.items,
      },
      tenantId
    )

    revalidatePath(`/pos/${terminal.id}`)
    revalidatePath("/admin/tablet")
    revalidatePath(`/restaurant/${parsed.data.establishmentSlug}`)

    return { success: true, data: { orderId: order.id, orderNumber: order.orderNumber } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to submit order" }
  }
}

const completeTableOrderSchema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.string().min(1),
  cashierName: z.string().nullable().optional(),
})

/** Complete a PENDING table order at POS: apply stock logic and set status COMPLETED. */
export async function completeTableOrder(
  data: z.infer<typeof completeTableOrderSchema>
): Promise<ActionResult> {
  try {
    const tenantId = await requireTenantId()
    const parsed = completeTableOrderSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join(", ") }
    }

    const order = await orderRepository.findById(parsed.data.orderId, tenantId)
    if (!order) return { success: false, error: "Order not found" }
    if (order.status !== "PENDING") {
      return { success: false, error: "Order is not pending" }
    }

    const terminal = await terminalRepository.findById(order.terminalId, tenantId)
    if (!terminal) return { success: false, error: "Terminal not found" }

    let storeId = terminal.storeId ?? null
    if (!storeId) {
      const central = await storeRepository.getCentral(tenantId)
      if (!central) return { success: false, error: "Terminal has no store and no central store configured" }
      storeId = central.id
    }

    const productIds = [...new Set(order.items.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: { id: true, name: true, isService: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of order.items) {
      const product = productMap.get(item.productId)
      if (!product) return { success: false, error: `Product not found: ${item.productId}` }
      if (product.isService) continue
      const available = await storeStockRepository.getByProductAndStore(
        tenantId,
        item.productId,
        storeId
      )
      if (available < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${product.name}. Available: ${available}`,
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED",
          paymentMethod: parsed.data.paymentMethod,
          cashierName: parsed.data.cashierName ?? null,
        },
      })

      for (const item of order.items) {
        const product = productMap.get(item.productId)
        if (product?.isService) continue
        const row = await tx.storeStock.findFirst({
          where: { storeId: storeId!, productId: item.productId },
        })
        const current = row?.quantity ?? 0
        if (current < item.quantity) throw new Error(`Insufficient stock for product ${item.productId}`)
        if (row) {
          await tx.storeStock.update({
            where: { storeId_productId: { storeId: storeId!, productId: item.productId } },
            data: { quantity: { decrement: item.quantity } },
          })
        }
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            type: "OUT",
            quantity: -item.quantity,
            reason: `Order ${order.orderNumber}`,
            fromStoreId: storeId!,
            fromLocation: order.terminalId,
          },
        })
      }
    })

    revalidatePath("/admin/analytics")
    revalidatePath("/admin/stock")
    revalidatePath(`/pos/${order.terminalId}`)
    revalidatePath("/admin/tablet")

    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to complete table order" }
  }
}
