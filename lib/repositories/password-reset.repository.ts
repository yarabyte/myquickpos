import crypto from "crypto"
import { prisma } from "@/lib/db"

const TOKEN_TTL_MS = 60 * 60 * 1000

export const passwordResetRepository = {
  async createForUser(userId: string, tenantId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.passwordResetToken.deleteMany({ where: { userId } })

    await prisma.passwordResetToken.create({
      data: { token, userId, tenantId, expiresAt },
    })

    return token
  },

  findValidToken(token: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    })
  },

  deleteToken(token: string) {
    return prisma.passwordResetToken.deleteMany({ where: { token } })
  },

  deleteExpired() {
    return prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    })
  },
}
