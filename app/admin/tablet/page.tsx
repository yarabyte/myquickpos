import { redirect } from "next/navigation"
import { getTenantId, getSessionPermissions, getSessionAllowedTabletIds, getSessionRole } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { filterTabletsForUser } from "@/lib/tablet-access"
import { establishmentRepository } from "@/lib/repositories/establishment.repository"
import { terminalRepository } from "@/lib/repositories/terminal.repository"
import { TabletPageClient } from "./tablet-page-client"

export default async function TabletPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect("/login")

  const permissions = await getSessionPermissions()
  const role = await getSessionRole()
  const allowedTabletIds = await getSessionAllowedTabletIds()
  const canManageTablet =
    hasPermission(permissions, "tablet.manage") ||
    (role !== "SERVER" &&
      role !== "CASHIER" &&
      hasPermission(permissions, "admin.tablet"))

  const [establishments, terminals] = await Promise.all([
    establishmentRepository.findAll(tenantId),
    terminalRepository.findAll(tenantId),
  ])

  const establishmentList = filterTabletsForUser(
    establishments.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      terminalId: e.terminalId,
      terminalName: e.terminal?.label ?? e.terminal?.name ?? "",
    })),
    allowedTabletIds,
    permissions,
    role
  )

  const terminalList = terminals.map((t) => ({
    id: t.id,
    name: t.name,
    label: t.label,
  }))

  return (
    <TabletPageClient
      establishments={establishmentList}
      terminals={terminalList}
      canManageTablet={canManageTablet}
    />
  )
}
