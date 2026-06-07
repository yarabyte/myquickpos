"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { User as UserIcon, Mail, Lock, Shield, Monitor, UtensilsCrossed, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Role } from "@prisma/client"
import type { ActionResult } from "@/app/actions/users"
import { PermissionsEditor } from "@/components/admin/permissions-editor"
import { TabletAccessSelector, type TabletOption } from "@/components/admin/tablet-access-selector"
import {
  BUILTIN_ROLE_PERMISSIONS,
  permissionsToJson,
  resolveUserPermissions,
  type PermissionKey,
  type RolePermissionsMap,
} from "@/lib/permissions"
import {
  allowedTabletIdsToJson,
  userNeedsTabletScope,
} from "@/lib/tablet-access"

interface CreateUserModalProps {
  open: boolean
  onClose: () => void
  editUser?: {
    id: string
    name: string
    email: string
    role: Role
    status: "active" | "inactive"
    customPermissions: PermissionKey[] | null
    allowedTabletIds: string[] | null
  } | null
  terminals: { id: string; name: string }[]
  tablets: TabletOption[]
  rolePermissions: RolePermissionsMap | null
  onCreateUser: (formData: FormData) => Promise<ActionResult<unknown>>
  onUpdateUser: (id: string, formData: FormData) => Promise<ActionResult<unknown>>
  onSuccess: () => void | Promise<void>
}

type UiRole = "MANAGER" | "SERVER" | "CASHIER"

function normalizeUiRole(role: Role): UiRole {
  if (role === "CASHIER") return "CASHIER"
  if (role === "SERVER") return "SERVER"
  return "MANAGER"
}

function roleForSubmit(uiRole: UiRole, existing?: Role): Role {
  if (uiRole === "CASHIER") return "CASHIER"
  if (uiRole === "SERVER") return "SERVER"
  if (existing === "SUPER_ADMIN" || existing === "ADMIN") return existing
  return "MANAGER"
}

export function CreateUserModal({
  open,
  onClose,
  editUser,
  terminals,
  tablets,
  rolePermissions,
  onCreateUser,
  onUpdateUser,
  onSuccess,
}: CreateUserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [uiRole, setUiRole] = useState<UiRole>("CASHIER")
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([])
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([])
  const [selectedTabletIds, setSelectedTabletIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const isEdit = !!editUser
  const submitRole = roleForSubmit(uiRole, editUser?.role)

  const defaultPermissionsForRole = useMemo(
    () =>
      resolveUserPermissions({
        role: roleForSubmit(uiRole, editUser?.role),
        customPermissions: null,
        tenantRolePermissions: rolePermissions,
      }),
    [uiRole, editUser?.role, rolePermissions]
  )

  const effectivePermissions = useMemo(
    () => (useCustomPermissions ? selectedPermissions : defaultPermissionsForRole),
    [useCustomPermissions, selectedPermissions, defaultPermissionsForRole]
  )

  const needsTabletScope = useMemo(
    () => userNeedsTabletScope(effectivePermissions, submitRole),
    [effectivePermissions, submitRole]
  )

  useEffect(() => {
    if (!open) return
    if (editUser) {
      setName(editUser.name)
      setEmail(editUser.email)
      setPassword("")
      setUiRole(normalizeUiRole(editUser.role))
      setSelectedTerminals([])
      setStatus(editUser.status)
      const hasCustom = editUser.customPermissions != null
      setUseCustomPermissions(hasCustom)
      setSelectedPermissions(
        hasCustom
          ? editUser.customPermissions!
          : resolveUserPermissions({
              role: editUser.role,
              customPermissions: null,
              tenantRolePermissions: rolePermissions,
            })
      )
      setSelectedTabletIds(
        editUser.allowedTabletIds ?? tablets.map((t) => t.id)
      )
    } else {
      resetForm()
    }
  }, [editUser, open, rolePermissions])

  function resetForm() {
    setName("")
    setEmail("")
    setPassword("")
    setUiRole("CASHIER")
    setSelectedTerminals([])
    setStatus("active")
    setUseCustomPermissions(false)
    setSelectedPermissions([...BUILTIN_ROLE_PERMISSIONS.CASHIER])
    setSelectedTabletIds([])
    setFormError("")
    setSubmitting(false)
  }

  function handleRoleChange(next: UiRole) {
    setUiRole(next)
    const nextRole = roleForSubmit(next, editUser?.role)
    const perms = useCustomPermissions
      ? selectedPermissions
      : resolveUserPermissions({
          role: nextRole,
          customPermissions: null,
          tenantRolePermissions: rolePermissions,
        })
    if (!useCustomPermissions) {
      setSelectedPermissions(perms)
    }
    if (userNeedsTabletScope(perms, nextRole) && selectedTabletIds.length === 0) {
      setSelectedTabletIds(tablets.map((t) => t.id))
    }
  }

  function toggleTerminal(terminalId: string) {
    setSelectedTerminals((prev) =>
      prev.includes(terminalId)
        ? prev.filter((id) => id !== terminalId)
        : [...prev, terminalId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!name.trim() || !email.trim()) {
      setFormError("Name and email are required.")
      return
    }
    if (!isEdit && !password.trim()) {
      setFormError("Password is required.")
      return
    }
    if (!isEdit && password.trim().length < 6) {
      setFormError("Password must be at least 6 characters.")
      return
    }

    if (needsTabletScope && selectedTabletIds.length === 0) {
      setFormError("Select at least one tablet for restaurant access.")
      return
    }

    const fd = new FormData()
    fd.set("name", name.trim())
    fd.set("email", email.trim())
    fd.set("role", submitRole)
    fd.set("status", status)
    if (password.trim()) fd.set("password", password.trim())
    fd.set("useCustomPermissions", String(useCustomPermissions))
    if (useCustomPermissions) {
      fd.set("permissions", permissionsToJson(selectedPermissions))
    }
    if (needsTabletScope) {
      fd.set("allowedTabletIds", allowedTabletIdsToJson(selectedTabletIds))
    } else {
      fd.set("allowedTabletIds", "null")
    }

    setSubmitting(true)
    try {
      const result = isEdit && editUser
        ? await onUpdateUser(editUser.id, fd)
        : await onCreateUser(fd)

      if (result.success) {
        toast.success(isEdit ? "User updated" : "User created — login details sent by email")
        resetForm()
        await onSuccess()
        onClose()
      } else {
        setFormError(result.error)
        toast.error(result.error)
      }
    } catch {
      const message = "Something went wrong. Please try again."
      setFormError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            {isEdit ? "Edit user" : "New user"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Update account information and access permissions."
              : "Add a manager, server, or POS cashier."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name" className="text-sm font-medium text-card-foreground">
              Full name
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="pl-10 bg-secondary border-border text-card-foreground"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email" className="text-sm font-medium text-card-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="pl-10 bg-secondary border-border text-card-foreground"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password" className="text-sm font-medium text-card-foreground">
              {isEdit ? "New password (optional)" : "Password"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current" : "Password"}
                className="pl-10 bg-secondary border-border text-card-foreground"
                required={!isEdit}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-card-foreground">Role</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange("MANAGER")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-all",
                  uiRole === "MANAGER"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                <Shield className="h-4 w-4 shrink-0" />
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("SERVER")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-all",
                  uiRole === "SERVER"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                <UtensilsCrossed className="h-4 w-4 shrink-0" />
                Server
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("CASHIER")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-all",
                  uiRole === "CASHIER"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                <Monitor className="h-4 w-4 shrink-0" />
                Cashier
              </button>
            </div>
            {uiRole === "SERVER" && (
              <p className="text-xs text-muted-foreground">
                Access to the Tablet module and restaurant interfaces for taking orders.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium text-card-foreground">
                  Custom permissions
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {useCustomPermissions
                    ? "Manually configure this user's access"
                    : "Uses the role's default profile"}
                </p>
              </div>
              <Switch
                checked={useCustomPermissions}
                onCheckedChange={(checked) => {
                  setUseCustomPermissions(checked)
                  if (checked) {
                    setSelectedPermissions(defaultPermissionsForRole)
                  }
                }}
              />
            </div>
            {useCustomPermissions && (
              <PermissionsEditor
                value={selectedPermissions}
                onChange={setSelectedPermissions}
                compact
                role={submitRole}
                tablets={tablets}
                allowedTabletIds={selectedTabletIds}
                onAllowedTabletIdsChange={setSelectedTabletIds}
              />
            )}
            {!useCustomPermissions && needsTabletScope && (
              <TabletAccessSelector
                tablets={tablets}
                value={selectedTabletIds}
                onChange={setSelectedTabletIds}
              />
            )}
          </div>

          {uiRole === "CASHIER" && terminals.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-card-foreground">
                Assigned terminals (coming soon)
              </Label>
              <p className="text-xs text-muted-foreground">
                Visual selection — persistence coming soon
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                {terminals.map((t) => {
                  const isSelected = selectedTerminals.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTerminal(t.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground"
                      )}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-card-foreground">Status</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                  status === "active"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus("inactive")}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                  status === "inactive"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          {formError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save"
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
