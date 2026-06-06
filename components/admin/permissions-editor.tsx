"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  BUILTIN_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
} from "@/lib/permissions"
import type { Role } from "@prisma/client"

interface PermissionsEditorProps {
  value: PermissionKey[]
  onChange: (permissions: PermissionKey[]) => void
  disabled?: boolean
  compact?: boolean
}

export function PermissionsEditor({
  value,
  onChange,
  disabled = false,
  compact = false,
}: PermissionsEditorProps) {
  function toggle(key: PermissionKey, checked: boolean) {
    if (disabled) return
    onChange(checked ? [...new Set([...value, key])] : value.filter((k) => k !== key))
  }

  function selectAll() {
    if (disabled) return
    onChange([...PERMISSION_KEYS])
  }

  function clearAll() {
    if (disabled) return
    onChange([])
  }

  function applyRolePreset(role: Role) {
    if (disabled) return
    onChange([...BUILTIN_ROLE_PERMISSIONS[role]])
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={selectAll}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={clearAll}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Tout désélectionner
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyRolePreset("MANAGER")}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Preset Manager
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyRolePreset("SERVER")}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Preset Serveur
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyRolePreset("CASHIER")}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Preset Caissier
          </button>
        </div>
      )}

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="rounded-lg border border-border bg-secondary/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {group.label}
          </p>
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
            {group.keys.map((key) => {
              const checked = value.includes(key)
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-secondary/60 transition-colors",
                    disabled && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) => toggle(key, v === true)}
                  />
                  <span className="text-card-foreground">{PERMISSION_LABELS[key]}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function countPermissionsLabel(permissions: PermissionKey[] | null, isCustom: boolean) {
  if (!isCustom) return "Profil du rôle"
  if (!permissions?.length) return "Aucun droit"
  return `${permissions.length} droit${permissions.length > 1 ? "s" : ""}`
}
