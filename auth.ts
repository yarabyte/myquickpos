import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { userRepository } from "@/lib/repositories/user.repository"
import {
  parsePermissionsJson,
  resolveUserPermissions,
  type RolePermissionsMap,
} from "@/lib/permissions"
import { parseAllowedTabletIds } from "@/lib/tablet-access"
import type { Role } from "@prisma/client"

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  tenantSlug: z.string().optional().default("tenant1"),
  rememberMe: z.enum(["true", "false"]).optional().default("false"),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        tenantSlug: {},
        rememberMe: {},
      },
      authorize: async (credentials) => {
        try {
          const parsed = signInSchema.safeParse(credentials)
          if (!parsed.success) {
            console.error("[Auth] Invalid credentials shape:", parsed.error.flatten())
            return null
          }

          const { email, password, tenantSlug, rememberMe } = parsed.data

          const tenant = await tenantRepository.findBySlug(tenantSlug)
          if (!tenant) {
            console.error("[Auth] Tenant not found:", tenantSlug)
            return null
          }

          const user = await userRepository.authenticate(email, password, tenant.id)
          if (!user) {
            console.error("[Auth] Authentication failed for", email, "tenant", tenantSlug)
            return null
          }

          const tenantSettings = (tenant.settings ?? {}) as { rolePermissions?: RolePermissionsMap }
          const customPermissions = parsePermissionsJson(user.permissions)
          const allowedTabletIds = parseAllowedTabletIds(user.allowedTabletIds)
          const permissions = resolveUserPermissions({
            role: user.role as Role,
            customPermissions,
            tenantRolePermissions: tenantSettings.rolePermissions ?? null,
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            rememberMe: rememberMe === "true",
            permissions,
            allowedTabletIds,
          }
        } catch (err) {
          console.error("[Auth] authorize error:", err)
          throw err
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.tenantId = (user as { tenantId?: string }).tenantId
        token.tenantSlug = (user as { tenantSlug?: string }).tenantSlug
        token.role = (user as { role?: string }).role
        token.permissions = (user as { permissions?: string[] }).permissions ?? []
        token.allowedTabletIds = (user as { allowedTabletIds?: string[] | null }).allowedTabletIds ?? null
        const rememberMe = (user as { rememberMe?: boolean }).rememberMe
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
        token.exp = Math.floor(Date.now() / 1000) + maxAge
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string
        (session.user as { tenantId?: string }).tenantId = token.tenantId as string
        (session.user as { tenantSlug?: string }).tenantSlug = token.tenantSlug as string
        (session.user as { role?: string }).role = token.role as string
        ;(session.user as { permissions?: string[] }).permissions =
          (token.permissions as string[]) ?? []
        ;(session.user as { allowedTabletIds?: string[] | null }).allowedTabletIds =
          (token.allowedTabletIds as string[] | null) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})
