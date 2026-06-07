import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getTenantId, getSessionPermissions } from "@/lib/auth"
import { userRepository } from "@/lib/repositories/user.repository"
import { terminalRepository } from "@/lib/repositories/terminal.repository"
import { establishmentRepository } from "@/lib/repositories/establishment.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { UsersPageClient } from "./users-page-client"
import { parsePermissionsJson, hasPermission } from "@/lib/permissions"
import { parseAllowedTabletIds } from "@/lib/tablet-access"

export default async function UsersPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const session = await auth()
  const permissions = await getSessionPermissions()
  const canManageUsers = hasPermission(permissions, "users.manage")

  const [users, terminals, establishments, rolePermissions] = await Promise.all([
    userRepository.findAll(tenantId),
    terminalRepository.findAll(tenantId),
    establishmentRepository.findAll(tenantId),
    tenantRepository.getRolePermissions(tenantId),
  ])

  const userList = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status as "active" | "inactive",
    lastLogin: u.lastLogin?.toISOString() ?? "Never",
    customPermissions: parsePermissionsJson(u.permissions),
    allowedTabletIds: parseAllowedTabletIds(u.allowedTabletIds),
  }))

  const terminalList = terminals.map((t) => ({ id: t.id, name: t.name }))
  const tabletList = establishments.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
  }))

  return (
    <UsersPageClient
      initialUsers={userList}
      terminals={terminalList}
      tablets={tabletList}
      rolePermissions={rolePermissions}
      canManageUsers={canManageUsers}
      currentUserId={(session?.user as { id?: string } | undefined)?.id}
    />
  )
}
