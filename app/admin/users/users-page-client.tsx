"use client"

import { useState, useMemo, useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Monitor,
  Mail,
  UserCheck,
  UserX,
  UtensilsCrossed,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CreateUserModal } from "@/components/admin/create-user-modal"
import { RolePermissionsPanel } from "@/components/admin/role-permissions-panel"
import { countPermissionsLabel } from "@/components/admin/permissions-editor"
import { createUser, updateUser, deleteUser as deleteUserAction } from "@/app/actions/users"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import {
  resolveUserPermissions,
  ROLE_LABELS,
  isStaffRole,
  type PermissionKey,
  type RolePermissionsMap,
} from "@/lib/permissions"
import type { Role } from "@prisma/client"

import type { TabletOption } from "@/components/admin/tablet-access-selector"

export interface UserInfo {
  id: string
  name: string
  email: string
  role: Role
  status: "active" | "inactive"
  lastLogin: string
  customPermissions: PermissionKey[] | null
  allowedTabletIds: string[] | null
}

interface UsersPageClientProps {
  initialUsers: UserInfo[]
  terminals: { id: string; name: string }[]
  tablets: TabletOption[]
  rolePermissions: RolePermissionsMap | null
  canManageUsers: boolean
  currentUserId?: string
}

export function UsersPageClient({
  initialUsers,
  terminals,
  tablets,
  rolePermissions,
  canManageUsers,
  currentUserId,
}: UsersPageClientProps) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "MANAGER" | "SERVER" | "CASHIER">("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserInfo | null>(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserInfo | null>(null)

  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  const reloadPage = useCallback(() => {
    startRefresh(() => {
      router.refresh()
    })
  }, [router])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "MANAGER"
            ? isStaffRole(u.role)
            : u.role === filter
      return matchesSearch && matchesFilter
    })
  }, [users, search, filter])

  const managerCount = users.filter((u) => isStaffRole(u.role)).length
  const serverCount = users.filter((u) => u.role === "SERVER").length
  const cashierCount = users.filter((u) => u.role === "CASHIER").length

  const handleDelete = useCallback(
    async (id: string) => {
      const r = await deleteUserAction(id)
      if (r.success) {
        reloadPage()
        setUsers((prev) => prev.filter((u) => u.id !== id))
        setDeleteUserTarget(null)
      }
    },
    [reloadPage]
  )

  const handleToggleStatus = useCallback(
    async (user: UserInfo) => {
      const fd = new FormData()
      fd.set("name", user.name)
      fd.set("email", user.email)
      fd.set("role", user.role)
      fd.set("status", user.status === "active" ? "inactive" : "active")
      const r = await updateUser(user.id, fd)
      if (r.success) {
        reloadPage()
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, status: u.status === "active" ? ("inactive" as const) : ("active" as const) }
              : u
          )
        )
      }
    },
    [reloadPage]
  )

  function formatDate(dateStr: string) {
    if (dateStr === "Never") return "Never"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  function roleLabel(role: Role) {
    return ROLE_LABELS[role] ?? role
  }

  function permissionsLabel(user: UserInfo) {
    const isCustom = user.customPermissions != null
    const effective = resolveUserPermissions({
      role: user.role,
      customPermissions: user.customPermissions,
      tenantRolePermissions: rolePermissions,
    })
    const base = countPermissionsLabel(isCustom ? user.customPermissions : effective, isCustom)
    return isCustom ? `${base} (custom)` : base
  }

  const tabs: { key: "all" | "MANAGER" | "SERVER" | "CASHIER"; label: string; count: number }[] = [
    { key: "all", label: "All", count: users.length },
    { key: "MANAGER", label: "Managers", count: managerCount },
    { key: "SERVER", label: "Servers", count: serverCount },
    { key: "CASHIER", label: "Cashiers", count: cashierCount },
  ]

  return (
    <div className="relative flex flex-col gap-6 p-6">
      {isRefreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading…
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage accounts and access permissions
          </p>
        </div>
        {canManageUsers && (
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
        )}
      </div>

      <RolePermissionsPanel
        initialRolePermissions={rolePermissions}
        canManage={canManageUsers}
        onSaved={reloadPage}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === tab.key
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-secondary-foreground"
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Permissions</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Last Login</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          isStaffRole(user.role)
                            ? "bg-primary/15 text-primary"
                            : user.role === "SERVER"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                        isStaffRole(user.role)
                          ? "bg-primary/10 text-primary"
                          : user.role === "SERVER"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {isStaffRole(user.role) ? (
                        <Shield className="h-3 w-3" />
                      ) : user.role === "SERVER" ? (
                        <UtensilsCrossed className="h-3 w-3" />
                      ) : (
                        <Monitor className="h-3 w-3" />
                      )}
                      {roleLabel(user.role)}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {permissionsLabel(user)}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium",
                        user.status === "active" ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {user.status === "active" ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <UserX className="h-3 w-3" />
                      )}
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(user.lastLogin)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-card-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">User actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        {canManageUsers && (
                        <DropdownMenuItem onClick={() => setEditUser(user)} className="text-card-foreground">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        )}
                        {canManageUsers && (
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user)}
                          className="text-card-foreground"
                        >
                          {user.status === "active" ? (
                            <>
                              <UserX className="h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        )}
                        {canManageUsers && user.id !== currentUserId && (
                        <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteUserTarget(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-sm text-muted-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try a different search or filter
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal
        open={modalOpen || !!editUser}
        onClose={() => {
          setModalOpen(false)
          setEditUser(null)
        }}
        editUser={editUser}
        terminals={terminals}
        tablets={tablets}
        rolePermissions={rolePermissions}
        onCreateUser={createUser}
        onUpdateUser={updateUser}
        onSuccess={() => {
          setModalOpen(false)
          setEditUser(null)
          reloadPage()
        }}
      />

      <ConfirmDialog
        open={!!deleteUserTarget}
        onOpenChange={(o) => !o && setDeleteUserTarget(null)}
        title="Delete user"
        description={
          <p>Delete user &quot;{deleteUserTarget?.name}&quot; ({deleteUserTarget?.email})? This action cannot be undone.</p>
        }
        icon={<Trash2 className="h-6 w-6" />}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteUserTarget) void handleDelete(deleteUserTarget.id)
        }}
      />
    </div>
  )
}
