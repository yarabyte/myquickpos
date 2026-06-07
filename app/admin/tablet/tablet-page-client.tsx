"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  createEstablishment,
  updateEstablishment,
  deleteEstablishment,
} from "@/app/actions/establishments"
import { Tablet, Plus, Pencil, Trash2, ExternalLink } from "lucide-react"
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
import { SwitchServerButton } from "@/components/restaurant/restaurant-tablet-header"

interface EstablishmentRow {
  id: string
  name: string
  slug: string
  terminalId: string
  terminalName: string
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
  const [deleteEstablishmentId, setDeleteEstablishmentId] = useState<string | null>(null)
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
      toast.success("Tablet created")
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
      toast.success("Tablet updated")
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
      toast.success("Tablet deleted")
    } else {
      setError(r.error ?? "Failed")
    }
  }

  return (
    <div className="space-y-6 p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-card-foreground sm:text-2xl">Tablet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each tablet is linked to a POS; its link sends orders to that POS.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <SwitchServerButton className="w-full justify-center sm:w-auto" iconOnly={false} />
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
              <Plus className="mr-2 h-4 w-4" /> New tablet
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {establishments.map((establishment) => (
          <div
            key={establishment.id}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                    When the order is sent, the server enters the table or customer name.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
                <a
                  href={getTabletLink(establishment.slug)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 sm:w-auto sm:py-1.5 sm:text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open tablet
                </a>
                {canManageTablet && (
                  <>
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
          </div>
        ))}
      </div>

      {establishments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground sm:p-12">
          <Tablet className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>
            {canManageTablet
              ? "Create a tablet to get its link."
              : "No tablets available at this time."}
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
            <DialogContent className="border-border bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  {editEstablishment ? "Edit tablet" : "New tablet"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Tablet linked to a POS. The slug is used in the URL (e.g. le-petit-bistrot).
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={editEstablishment ? handleUpdateEstablishment : handleCreateEstablishment}
                className="mt-2 space-y-4"
              >
                <div>
                  <Label className="text-sm font-medium text-card-foreground">Name</Label>
                  <Input
                    value={establishmentName}
                    onChange={(e) => setEstablishmentName(e.target.value)}
                    placeholder="Le Petit Bistrot"
                    className="mt-1 border-border bg-secondary"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-card-foreground">Slug (URL)</Label>
                  <Input
                    value={establishmentSlug}
                    onChange={(e) => setEstablishmentSlug(e.target.value)}
                    placeholder="le-petit-bistrot"
                    className="mt-1 border-border bg-secondary"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only.
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-card-foreground">POS (Terminal)</Label>
                  <select
                    value={establishmentTerminalId}
                    onChange={(e) => setEstablishmentTerminalId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm"
                    required
                  >
                    <option value="">Select a terminal</option>
                    {terminals.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label || t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEstablishmentModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editEstablishment ? "Save" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={!!deleteEstablishmentId}
            onOpenChange={(open) => !open && (setDeleteEstablishmentId(null), setError(""))}
            title="Delete tablet"
            description={
              <span>
                Delete &quot;
                {establishments.find((e) => e.id === deleteEstablishmentId)?.name ?? "this tablet"}
                &quot;? This action cannot be undone.
              </span>
            }
            icon={<Trash2 className="h-6 w-6" />}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="destructive"
            onConfirm={handleDeleteEstablishment}
          />
        </>
      )}
    </div>
  )
}
