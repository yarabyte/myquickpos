import { prisma } from "@/lib/db"

const DEFAULT_HEADER = `<p style="text-align: center"><strong>MyQuickPOS Demo Store</strong></p><p style="text-align: center">123 Main Street, Suite 100</p><p style="text-align: center">Tel: (555) 123-4567</p>`
const DEFAULT_FOOTER = `<p style="text-align: center">Thank you for your purchase!</p><p style="text-align: center">Visit us at myquickpos.app</p><p style="text-align: center"><em>Returns accepted within 30 days</em></p>`

export type TenantSettingsJson = {
  currency?: string
  taxRate?: number
  rolePermissions?: Partial<Record<string, string[]>>
  printer?: {
    paperWidth?: "58mm" | "80mm"
    autoPrint?: boolean
    headerHtml?: string
    footerHtml?: string
  }
}

const RESERVED_SLUGS = [
  "app", "api", "www", "admin", "dashboard", "help", "support",
  "billing", "status", "docs", "mail", "ftp", "myquickpos", "demo",
]

export const tenantRepository = {
  findById: (id: string) => prisma.tenant.findUnique({ where: { id } }),
  findBySlug: (slug: string) => prisma.tenant.findUnique({ where: { slug } }),

  findAll: () =>
    prisma.tenant.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),

  isSlugAvailable(slug: string): boolean {
    if (!slug || slug.length < 3) return false
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) return false
    return true
  },

  async isSlugTaken(slug: string): Promise<boolean> {
    const normalized = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
    if (!tenantRepository.isSlugAvailable(normalized)) return true
    const existing = await prisma.tenant.findUnique({ where: { slug: normalized } })
    return !!existing
  },

  create(data: { slug: string; name: string; plan?: string; settings?: object }) {
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
    return prisma.tenant.create({
      data: {
        slug,
        name: data.name,
        plan: data.plan ?? "free",
        settings: data.settings ?? undefined,
      },
    })
  },

  async getSettings(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: true },
    })
    if (!tenant) return null
    const settings = (tenant.settings ?? {}) as TenantSettingsJson
    return {
      storeName: tenant.name,
      currency: settings.currency ?? "USD",
      taxRate: settings.taxRate ?? 8,
      printer: {
        paperWidth: (settings.printer?.paperWidth as "58mm" | "80mm") ?? "80mm",
        autoPrint: settings.printer?.autoPrint ?? false,
        headerHtml: settings.printer?.headerHtml?.trim() || DEFAULT_HEADER,
        footerHtml: settings.printer?.footerHtml?.trim() || DEFAULT_FOOTER,
      },
    }
  },

  async updateSettings(
    tenantId: string,
    data: {
      storeName?: string
      currency?: string
      taxRate?: number
      printer?: TenantSettingsJson["printer"]
    }
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: true },
    })
    if (!tenant) return null
    const current = (tenant.settings ?? {}) as TenantSettingsJson
    const nextSettings: TenantSettingsJson = {
      ...current,
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
      ...(data.printer !== undefined && { printer: { ...current.printer, ...data.printer } }),
    }
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.storeName !== undefined && { name: data.storeName }),
        settings: nextSettings,
      },
    })
    return this.getSettings(tenantId)
  },

  async getRolePermissions(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    if (!tenant) return null
    const settings = (tenant.settings ?? {}) as TenantSettingsJson
    return settings.rolePermissions ?? null
  },

  async updateRolePermissions(
    tenantId: string,
    rolePermissions: TenantSettingsJson["rolePermissions"]
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    })
    if (!tenant) return null
    const current = (tenant.settings ?? {}) as TenantSettingsJson
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...current,
          rolePermissions,
        },
      },
    })
    return rolePermissions ?? null
  },
}
