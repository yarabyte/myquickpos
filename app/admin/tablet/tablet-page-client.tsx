"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  createEstablishment,
  updateEstablishment,
  deleteEstablishment,
} from "@/app/actions/establishments"
import { createTable, updateTable, deleteTable } from "@/app/actions/tables"
import { Tablet, Plus, Pencil, Trash2, ExternalLink, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface TableRow {
  id: string
  name: string
  slug: string
}

interface EstablishmentRow {
  id: string
  name: string
  slug: string
  terminalId: string
  terminalName: string
  tables: TableRow[]
}

interface TerminalOption {
  id: string
  name: string
  label: string
}

export function TabletPageClient({
  establishments: initialEstablishments,
  terminals,
  canManageTablet,
}: {
  establishments: EstablishmentRow[]
  terminals: TerminalOption[]
  canManageTablet: boolean
}) {
  const router = useRouter()
  const [establishments, setEstablishments] = useState(initialEstablishments)
  useEffect(() => {
    setEstablishments(initialEstablishments)
  }, [initialEstablishments])

  const [establishmentModalOpen, setEstablishmentModalOpen] = useState(false)
  const [editEstablishment, setEditEstablishment] = useState<EstablishmentRow | null>(null)
  const [establishmentName, setEstablishmentName] = useState("")
  const [establishmentSlug, setEstablishmentSlug] = useState("")
  const [establishmentTerminalId, setEstablishmentTerminalId] = useState("")
  const [tableModalOpen, setTableModalOpen] = useState(false)
  const [tableEstablishmentId, setTableEstablishmentId] = useState("")
  const [editTable, setEditTable] = useState<{ establishmentId: string; table: TableRow } | null>(null)
  const [tableName, setTableName] = useState("")
  const [tableSlug, setTableSlug] = useState("")
  const [deleteEstablishmentId, setDeleteEstablishmentId] = useState<string | null>(null)
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  function getTabletLink(establishmentSlug: string) {
    return `${baseUrl}/restaurant/${establishmentSlug}`
  }

  async function handleCreateEstablishment(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!establishmentName.trim() || !establishmentSlug.trim() || !establishmentTerminalId) return
    const fd = new FormData()
    fd.set("name", establishmentName.trim())
    fd.set("slug", establishmentSlug.trim().toLowerCase())
    fd.set("terminalId", establishmentTerminalId)
    const r = await createEstablishment(fd)
    if (r.success) {
      router.refresh()
      setEstablishmentModalOpen(false)
      setEstablishmentName("")
      setEstablishmentSlug("")
      setEstablishmentTerminalId(terminals[0]?.id ?? "")
      toast.success("Establishment created")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleUpdateEstablishment(e: React.FormEvent) {
    e.preventDefault()
    if (!editEstablishment) return
    setError("")
    const fd = new FormData()
    fd.set("name", establishmentName.trim())
    fd.set("slug", establishmentSlug.trim().toLowerCase())
    fd.set("terminalId", establishmentTerminalId)
    const r = await updateEstablishment(editEstablishment.id, fd)
    if (r.success) {
      router.refresh()
      setEditEstablishment(null)
      setEstablishmentModalOpen(false)
      toast.success("Establishment updated")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleDeleteEstablishment() {
    if (!deleteEstablishmentId) return
    setError("")
    const r = await deleteEstablishment(deleteEstablishmentId)
    if (r.success) {
      router.refresh()
      setEstablishments((prev) => prev.filter((e) => e.id !== deleteEstablishmentId))
      setDeleteEstablishmentId(null)
      toast.success("Establishment deleted")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!tableName.trim() || !tableSlug.trim() || !tableEstablishmentId) return
    const fd = new FormData()
    fd.set("name", tableName.trim())
    fd.set("slug", tableSlug.trim().toLowerCase())
    fd.set("establishmentId", tableEstablishmentId)
    const r = await createTable(fd)
    if (r.success) {
      router.refresh()
      setTableModalOpen(false)
      setTableName("")
      setTableSlug("")
      setTableEstablishmentId("")
      toast.success("Table created")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleUpdateTable(e: React.FormEvent) {
    e.preventDefault()
    if (!editTable) return
    setError("")
    const fd = new FormData()
    fd.set("name", tableName.trim())
    fd.set("slug", tableSlug.trim().toLowerCase())
    fd.set("establishmentId", editTable.establishmentId)
    const r = await updateTable(editTable.table.id, fd)
    if (r.success) {
      router.refresh()
      setEditTable(null)
      setTableModalOpen(false)
      toast.success("Table updated")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleDeleteTable() {
    if (!deleteTableId) return
    setError("")
    const r = await deleteTable(deleteTableId)
    if (r.success) {
      router.refresh()
      setEstablishments((prev) =>
        prev.map((e) => ({
          ...e,
          tables: e.tables.filter((t) => t.id !== deleteTableId),
        }))
      )
      setDeleteTableId(null)
      toast.success("Table deleted")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-card-foreground sm:text-2xl">Tablet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Établissements et tables. Chaque établissement est lié à un POS ; les liens tablette envoient les commandes à ce POS.
          </p>
        </div>
        {canManageTablet && (
        <Button
          onClick={() => {
            setEstablishmentModalOpen(true)
            setEditEstablishment(null)
            setEstablishmentName("")
            setEstablishmentSlug("")
            setEstablishmentTerminalId(terminals[0]?.id ?? "")
            setError("")
          }}
          className="w-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Nouvel établissement
        </Button>
        )}
      </div>

      <div className="space-y-6">
        {establishments.map((establishment) => (
          <div
            key={establishment.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-b border-border bg-secondary/30 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Tablet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-card-foreground">{establishment.name}</h2>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    slug: {establishment.slug} · POS: {establishment.terminalName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    À l&apos;envoi de la commande, le serveur saisit le nom de la table ou du client.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
                <a
                  href={getTabletLink(establishment.slug)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 sm:w-auto sm:py-1.5 sm:text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir la tablette
                </a>
                {canManageTablet && (
                <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTableModalOpen(true)
                    setTableEstablishmentId(establishment.id)
                    setEditTable(null)
                    setTableName("")
                    setTableSlug("")
                    setError("")
                  }}
                  className="text-muted-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" /> Table
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditEstablishment(establishment)
                    setEstablishmentName(establishment.name)
                    setEstablishmentSlug(establishment.slug)
                    setEstablishmentTerminalId(establishment.terminalId)
                    setEstablishmentModalOpen(true)
                    setError("")
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteEstablishmentId(establishment.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                </>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {establishment.tables.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune table.</p>
              ) : (
                <div className="space-y-2">
                  {establishment.tables.map((table) => (
                    <div
                      key={table.id}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-card-foreground">{table.name}</span>
                        <span className="text-xs text-muted-foreground">({table.slug})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManageTablet && (
                        <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditTable({ establishmentId: establishment.id, table })
                            setTableName(table.name)
                            setTableSlug(table.slug)
                            setTableModalOpen(true)
                            setError("")
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTableId(table.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {establishments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground sm:p-12">
          <Tablet className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>
            {canManageTablet
              ? "Créez un établissement pour obtenir un lien tablette."
              : "Aucun établissement disponible pour le moment."}
          </p>
        </div>
      )}

      {canManageTablet && (
      <>
      <Dialog
        open={establishmentModalOpen}
        onOpenChange={(open) => {
          if (!open) setEditEstablishment(null)
          setEstablishmentModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              {editEstablishment ? "Modifier l'établissement" : "Nouvel établissement"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Établissement lié à un POS. Le slug est utilisé dans l&apos;URL tablette (ex. le-petit-bistrot).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editEstablishment ? handleUpdateEstablishment : handleCreateEstablishment} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-card-foreground">Nom</Label>
              <Input
                value={establishmentName}
                onChange={(e) => setEstablishmentName(e.target.value)}
                placeholder="Le Petit Bistrot"
                className="mt-1 bg-secondary border-border"
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-card-foreground">Slug (URL)</Label>
              <Input
                value={establishmentSlug}
                onChange={(e) => setEstablishmentSlug(e.target.value)}
                placeholder="le-petit-bistrot"
                className="mt-1 bg-secondary border-border"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Lettres minuscules, chiffres et tirets uniquement.</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-card-foreground">POS (Terminal)</Label>
              <select
                value={establishmentTerminalId}
                onChange={(e) => setEstablishmentTerminalId(e.target.value)}
                className="w-full mt-1 h-10 rounded-md border border-border bg-secondary px-3 text-sm"
                required
              >
                <option value="">Sélectionner un terminal</option>
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>{t.label || t.name}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEstablishmentModalOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1">{editEstablishment ? "Enregistrer" : "Créer"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table modal (create / edit) */}
      <Dialog
        open={tableModalOpen}
        onOpenChange={(open) => {
          if (!open) setEditTable(null)
          setTableModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              {editTable ? "Modifier la table" : "Nouvelle table"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Le slug de la table est utilisé dans l&apos;URL tablette (ex. t1, table-5). Unique par établissement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editTable ? handleUpdateTable : handleCreateTable} className="space-y-4 mt-2">
            {!editTable && (
              <div>
                <Label className="text-sm font-medium text-card-foreground">Établissement</Label>
                <select
                  value={tableEstablishmentId}
                  onChange={(e) => setTableEstablishmentId(e.target.value)}
                  className="w-full mt-1 h-10 rounded-md border border-border bg-secondary px-3 text-sm"
                  required
                >
                  <option value="">Sélectionner un établissement</option>
                  {establishments.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-card-foreground">Nom de la table</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Table 1"
                className="mt-1 bg-secondary border-border"
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-card-foreground">Slug (URL)</Label>
              <Input
                value={tableSlug}
                onChange={(e) => setTableSlug(e.target.value)}
                placeholder="t1"
                className="mt-1 bg-secondary border-border"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setTableModalOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1">{editTable ? "Enregistrer" : "Créer"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteEstablishmentId}
        onOpenChange={(open) => !open && (setDeleteEstablishmentId(null), setError(""))}
        title="Supprimer l'établissement"
        description={
          <span>
            Supprimer &quot;{establishments.find((e) => e.id === deleteEstablishmentId)?.name ?? "cet établissement"}&quot; et toutes ses tables ? Cette action est irréversible.
          </span>
        }
        icon={<Trash2 className="h-6 w-6" />}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={handleDeleteEstablishment}
      />

      <ConfirmDialog
        open={!!deleteTableId}
        onOpenChange={(open) => !open && (setDeleteTableId(null), setError(""))}
        title="Supprimer la table"
        description={
          <span>
            Supprimer cette table ? Le lien tablette ne fonctionnera plus.
          </span>
        }
        icon={<Trash2 className="h-6 w-6" />}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={handleDeleteTable}
      />
      </>
      )}
    </div>
  )
}
