import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export interface TerminalSettings {
  assignedCategories?: string[]
  taxRate?: number
  cashier?: string
}

export interface CreateTerminalDto {
  name: string
  label: string
  storeId?: string | null
  settings?: TerminalSettings
}

export interface UpdateTerminalDto {
  name?: string
  label?: string
  storeId?: string | null
  isActive?: boolean
  settings?: TerminalSettings
}

export const terminalRepository = {
  findAll: (tenantId: string) =>
    prisma.terminal.findMany({
      where: { tenantId },
      include: { store: true },
      orderBy: { name: "asc" },
    }),

  findById: (id: string, tenantId: string) =>
    prisma.terminal.findFirst({
      where: { id, tenantId },
      include: { store: true },
    }),

  findByName: (name: string, tenantId: string) =>
    prisma.terminal.findFirst({
      where: { name, tenantId },
    }),

  create: (data: CreateTerminalDto, tenantId: string) =>
    prisma.terminal.create({
      data: {
        name: data.name,
        label: data.label,
        tenantId,
        storeId: data.storeId ?? undefined,
        settings: (data.settings ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    }),

  update: (id: string, data: UpdateTerminalDto, tenantId: string) =>
    prisma.terminal.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.storeId !== undefined && { storeId: data.storeId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.settings !== undefined && {
          settings: data.settings as Prisma.InputJsonValue,
        }),
      },
    }),

  delete: (id: string, tenantId: string) =>
    prisma.terminal.deleteMany({
      where: { id, tenantId },
    }),
}
