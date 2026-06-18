import { prisma } from "@/lib/db"

export const whatsappNotificationLogRepository = {
  exists: async (tenantId: string, type: string, periodKey: string) => {
    const row = await prisma.whatsAppNotificationLog.findUnique({
      where: {
        tenantId_type_periodKey: { tenantId, type, periodKey },
      },
      select: { id: true },
    })
    return Boolean(row)
  },

  create: async (data: {
    tenantId: string
    type: string
    periodKey: string
    msgId: number | null
    status: string
  }) => {
    return prisma.whatsAppNotificationLog.create({ data })
  },
}
