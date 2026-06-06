"use client"

import { useState } from "react"
import { Shield, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionsEditor } from "@/components/admin/permissions-editor"
import { updateTenantRolePermissions } from "@/app/actions/permissions"
import {
  BUILTIN_ROLE_PERMISSIONS,
  type PermissionKey,
  type RolePermissionsMap,
} from "@/lib/permissions"
import type { Role } from "@prisma/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const CONFIGURABLE_ROLES: { role: Role; label: string }[] = [
  { role: "MANAGER", label: "Manager" },
  { role: "SERVER", label: "Serveur" },
  { role: "CASHIER", label: "Caissier POS" },
]

interface RolePermissionsPanelProps {
  initialRolePermissions: RolePermissionsMap | null
  canManage: boolean
  onSaved?: () => void
}

export function RolePermissionsPanel({
  initialRolePermissions,
  canManage,
  onSaved,
}: RolePermissionsPanelProps) {
  const [activeRole, setActiveRole] = useState<Role>("MANAGER")
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(() => ({
    MANAGER:
      initialRolePermissions?.MANAGER ?? [...BUILTIN_ROLE_PERMISSIONS.MANAGER],
    SERVER:
      initialRolePermissions?.SERVER ?? [...BUILTIN_ROLE_PERMISSIONS.SERVER],
    CASHIER:
      initialRolePermissions?.CASHIER ?? [...BUILTIN_ROLE_PERMISSIONS.CASHIER],
  }))
  const [saving, setSaving] = useState(false)

  const current = rolePermissions[activeRole] ?? []

  async function handleSave() {
    if (!canManage) return
    setSaving(true)
    const result = await updateTenantRolePermissions(rolePermissions)
    setSaving(false)
    if (result.success) {
      toast.success("Profils de droits enregistrés")
      onSaved?.()
    } else {
      toast.error(result.error)
    }
  }

  function resetToBuiltin() {
    setRolePermissions((prev) => ({
      ...prev,
      [activeRole]: [...BUILTIN_ROLE_PERMISSIONS[activeRole]],
    }))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Profils de droits par rôle
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Définissez les droits par défaut pour chaque type d&apos;utilisateur
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les profils
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {CONFIGURABLE_ROLES.map(({ role, label }) => (
          <button
            key={role}
            type="button"
            onClick={() => setActiveRole(role)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
              activeRole === role
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <PermissionsEditor
        value={current}
        onChange={(next) =>
          setRolePermissions((prev) => ({
            ...prev,
            [activeRole]: next,
          }))
        }
        disabled={!canManage}
      />

      {canManage && (
        <button
          type="button"
          onClick={resetToBuiltin}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Réinitialiser au profil par défaut
        </button>
      )}
    </div>
  )
}
