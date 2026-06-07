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
import { userNeedsTabletScope } from "@/lib/tablet-access"
import { TabletAccessSelector, type TabletOption } from "@/components/admin/tablet-access-selector"
import type { Role } from "@prisma/client"

interface PermissionsEditorProps {
  value: PermissionKey[]
  onChange: (permissions: PermissionKey[]) => void
  disabled?: boolean
  compact?: boolean
  role?: Role | string | null
  tablets?: TabletOption[]
  allowedTabletIds?: string[]
  onAllowedTabletIdsChange?: (ids: string[]) => void
}

export function PermissionsEditor({
  value,
  onChange,
  disabled = false,
  compact = false,
  role = null,
  tablets = [],
  allowedTabletIds = [],
  onAllowedTabletIdsChange,
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

  const showTabletAccess =
    !!onAllowedTabletIdsChange &&
    userNeedsTabletScope(value, role)

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
            Select all
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={clearAll}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Deselect all
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
            Server preset
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyRolePreset("CASHIER")}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cashier preset
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
                <div key={key} className="space-y-2">
                  <label
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
                  {key === "restaurant.tablet" && showTabletAccess && (
                    <TabletAccessSelector
                      tablets={tablets}
                      value={allowedTabletIds}
                      onChange={onAllowedTabletIdsChange!}
                      disabled={disabled || !checked}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function countPermissionsLabel(permissions: PermissionKey[] | null, isCustom: boolean) {
  if (!isCustom) return "Role profile"
  if (!permissions?.length) return "No permissions"
  return `${permissions.length} permission${permissions.length > 1 ? "s" : ""}`
}
