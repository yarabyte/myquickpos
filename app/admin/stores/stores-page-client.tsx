"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createStore, updateStore, deleteStore as deleteStoreAction } from "@/app/actions/stores"
import { Store, Plus, Pencil, Trash2, Star } from "lucide-react"
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

interface StoreRow {
  id: string
  name: string
  isCentral: boolean
}

export function StoresPageClient({ stores: initialStores }: { stores: StoreRow[] }) {
  const router = useRouter()
  const [stores, setStores] = useState(initialStores)
  useEffect(() => {
    setStores(initialStores)
  }, [initialStores])
  const [createOpen, setCreateOpen] = useState(false)
  const [editStore, setEditStore] = useState<StoreRow | null>(null)
  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [isCentral, setIsCentral] = useState(false)
  const [error, setError] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) return
    const r = await createStore(name.trim(), isCentral)
    if (r.success) {
      setName("")
      setIsCentral(false)
      setCreateOpen(false)
      setError("")
      router.refresh()
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editStore) return
    setError("")
    if (!name.trim()) return
    const r = await updateStore(editStore.id, { name: name.trim(), isCentral })
    if (r.success) {
      router.refresh()
      setStores((prev) =>
        prev.map((s) => (s.id === editStore.id ? { ...s, name: name.trim(), isCentral } : s))
      )
      setEditStore(null)
      setName("")
      setIsCentral(false)
    } else {
      setError(r.error ?? "Failed")
    }
  }

  async function handleDelete(id: string) {
    setError("")
    const r = await deleteStoreAction(id)
    if (r.success) {
      router.refresh()
      setStores((prev) => prev.filter((s) => s.id !== id))
      setDeleteStoreId(null)
    } else {
      setError(r.error ?? "Failed to delete")
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Stores</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage stores (magasins) for multi-location stock</p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true)
            setError("")
            setName("")
            setIsCentral(false)
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" /> New Store
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stores.map((s) => (
              <tr key={s.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-card-foreground">{s.name}</span>
                </td>
                <td className="px-4 py-3">
                  {s.isCentral ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Star className="h-3 w-3" /> Central
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Store</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditStore(s)
                      setName(s.name)
                      setIsCentral(s.isCentral)
                      setError("")
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!s.isCentral && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteStoreId(s.id)
                      setError("")
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">New Store</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new store. Only one store can be the central store (for restock).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-card-foreground">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downtown Store"
                className="mt-1 bg-secondary border-border"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-central"
                checked={isCentral}
                onChange={(e) => setIsCentral(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="create-central" className="text-sm text-muted-foreground">
                Set as central store (receives restock)
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editStore} onOpenChange={(open) => !open && setEditStore(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Edit Store</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Change name or central role. Only one store can be central.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-card-foreground">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-secondary border-border"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-central"
                checked={isCentral}
                onChange={(e) => setIsCentral(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="edit-central" className="text-sm text-muted-foreground">
                Central store
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditStore(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteStoreId}
        onOpenChange={(open) => !open && (setDeleteStoreId(null), setError(""))}
        title="Delete store"
        description={
          <>
            {error && <span className="block text-sm text-destructive mb-2">{error}</span>}
            <span>Remove &quot;{stores.find((s) => s.id === deleteStoreId)?.name ?? "this store"}&quot;? Terminals must be reassigned first. This action cannot be undone.</span>
          </>
        }
        icon={<Trash2 className="h-6 w-6" />}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteStoreId) void handleDelete(deleteStoreId)
        }}
      />
    </div>
  )
}
