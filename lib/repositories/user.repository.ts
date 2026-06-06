import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import type { Role } from "@prisma/client"
import type { PermissionKey } from "@/lib/permissions"

export interface CreateUserDto {
  email: string
  password: string
  name: string
  role: Role
  assignedTerminals?: string[]
  status?: string
  permissions?: PermissionKey[] | null
}

export interface UpdateUserDto {
  email?: string
  password?: string
  name?: string
  role?: Role
  assignedTerminals?: string[]
  status?: string
  permissions?: PermissionKey[] | null
}

export const userRepository = {
  findAll: (tenantId: string) =>
    prisma.user.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),

  findById: (id: string, tenantId: string) =>
    prisma.user.findFirst({
      where: { id, tenantId },
    }),

  findByEmail: (email: string, tenantId: string) =>
    prisma.user.findFirst({
      where: { email, tenantId },
    }),

  authenticate: async (email: string, password: string, tenantId: string) => {
    const user = await prisma.user.findFirst({
      where: { email, tenantId, status: "active" },
    })
    if (!user || !(await bcrypt.compare(password, user.password))) return null
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })
    return user
  },

  create: async (data: CreateUserDto, tenantId: string) => {
    const hashedPassword = await bcrypt.hash(data.password, 10)
    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        tenantId,
        status: data.status ?? "active",
        ...(data.permissions !== undefined && {
          permissions: data.permissions,
        }),
      },
    })
  },

  update: async (id: string, data: UpdateUserDto, tenantId: string) => {
    const updateData: Parameters<typeof prisma.user.update>[0]["data"] = {
      email: data.email,
      name: data.name,
      role: data.role,
      status: data.status,
    }
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }
    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions
    }
    return prisma.user.update({
      where: { id },
      data: updateData,
    })
  },

  delete: (id: string, tenantId: string) =>
    prisma.user.deleteMany({
      where: { id, tenantId },
    }),
}
