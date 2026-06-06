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
import {
  BUILTIN_ROLE_PERMISSIONS,
  permissionsToJson,
  resolveUserPermissions,
  type PermissionKey,
  type RolePermissionsMap,
} from "@/lib/permissions"

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
  } | null
  terminals: { id: string; name: string }[]
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
    setFormError("")
    setSubmitting(false)
  }

  function handleRoleChange(next: UiRole) {
    setUiRole(next)
    if (!useCustomPermissions) {
      setSelectedPermissions(
        resolveUserPermissions({
          role: next,
          customPermissions: null,
          tenantRolePermissions: rolePermissions,
        })
      )
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
      setFormError("Nom et email sont requis.")
      return
    }
    if (!isEdit && !password.trim()) {
      setFormError("Le mot de passe est requis.")
      return
    }
    if (!isEdit && password.trim().length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.")
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

    setSubmitting(true)
    try {
      const result = isEdit && editUser
        ? await onUpdateUser(editUser.id, fd)
        : await onCreateUser(fd)

      if (result.success) {
        toast.success(isEdit ? "Utilisateur mis à jour" : "Utilisateur créé")
        resetForm()
        await onSuccess()
        onClose()
      } else {
        setFormError(result.error)
        toast.error(result.error)
      }
    } catch {
      const message = "Une erreur est survenue. Réessayez."
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
            {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Mettez à jour les informations et les droits d'accès."
              : "Ajoutez un manager, serveur ou caissier POS."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name" className="text-sm font-medium text-card-foreground">
              Nom complet
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
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
                placeholder="jean@example.com"
                className="pl-10 bg-secondary border-border text-card-foreground"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password" className="text-sm font-medium text-card-foreground">
              {isEdit ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Laisser vide pour conserver" : "Mot de passe"}
                className="pl-10 bg-secondary border-border text-card-foreground"
                required={!isEdit}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-card-foreground">Rôle</Label>
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
                Serveur
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
                Caissier
              </button>
            </div>
            {uiRole === "SERVER" && (
              <p className="text-xs text-muted-foreground">
                Accès au module Tablette et aux interfaces restaurant pour prendre les commandes.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium text-card-foreground">
                  Droits personnalisés
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {useCustomPermissions
                    ? "Configurez manuellement les accès de cet utilisateur"
                    : "Utilise le profil par défaut du rôle"}
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
              />
            )}
          </div>

          {uiRole === "CASHIER" && terminals.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-card-foreground">
                Terminaux assignés (bientôt)
              </Label>
              <p className="text-xs text-muted-foreground">
                Sélection visuelle — persistance à venir
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
            <Label className="text-sm font-medium text-card-foreground">Statut</Label>
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
                Actif
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
                Inactif
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
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : isEdit ? (
                "Enregistrer"
              ) : (
                "Créer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
