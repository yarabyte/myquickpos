import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export interface CreateCustomerDto {
  name: string
  email?: string
  phone?: string
  address?: string
  loyaltyPoints?: number
  loyaltyTier?: string
}

export interface UpdateCustomerDto {
  name?: string
  email?: string
  phone?: string
  address?: string
  loyaltyPoints?: number
  loyaltyTier?: string
}

export const customerRepository = {
  findAll: async (tenantId: string, search?: string) => {
    const where: Prisma.CustomerWhereInput = { tenantId }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ]
    }
    return prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
    })
  },

  findById: (id: string, tenantId: string) =>
    prisma.customer.findFirst({
      where: { id, tenantId },
    }),

  create: (data: CreateCustomerDto, tenantId: string) =>
    prisma.customer.create({
      data: {
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        loyaltyPoints: data.loyaltyPoints ?? 0,
        loyaltyTier: data.loyaltyTier ?? "bronze",
        tenantId,
      },
    }),

  update: (id: string, data: UpdateCustomerDto, tenantId: string) =>
    prisma.customer.updateMany({
      where: { id, tenantId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        loyaltyPoints: data.loyaltyPoints,
        loyaltyTier: data.loyaltyTier,
      },
    }),

  addLoyaltyPoints: async (id: string, points: number, tenantId: string) => {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    })
    if (!customer) return null
    return prisma.customer.update({
      where: { id },
      data: {
        loyaltyPoints: { increment: points },
        totalSpent: { increment: 0 }, // Caller should pass amount if needed
        visits: { increment: 1 },
        lastVisit: new Date(),
      },
    })
  },

  delete: (id: string, tenantId: string) =>
    prisma.customer.deleteMany({
      where: { id, tenantId },
    }),

  getStats: async (tenantId: string) => {
    const [count, agg] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.customer.aggregate({
        where: { tenantId },
        _sum: { loyaltyPoints: true },
      }),
    ])
    return { count, totalPoints: agg._sum.loyaltyPoints ?? 0 }
  },
}
