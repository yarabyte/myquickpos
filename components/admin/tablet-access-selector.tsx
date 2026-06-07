"use client"

import { Tablet } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TabletOption {
  id: string
  name: string
  slug: string
}

interface TabletAccessSelectorProps {
  tablets: TabletOption[]
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function TabletAccessSelector({
  tablets,
  value,
  onChange,
  disabled = false,
}: TabletAccessSelectorProps) {
  function toggle(id: string) {
    if (disabled) return
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  function selectAll() {
    if (disabled) return
    onChange(tablets.map((t) => t.id))
  }

  function clearAll() {
    if (disabled) return
    onChange([])
  }

  if (tablets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
        No tablets configured yet. Create tablets in the Tablet admin section first.
      </p>
    )
  }

  return (
    <div className="ml-6 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-card-foreground">Allowed tablets</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={selectAll}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            All
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
          >
            None
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Select which tablets this user can open in the restaurant interface.
      </p>
      <div className="flex flex-col gap-1.5">
        {tablets.map((tablet) => {
          const selected = value.includes(tablet.id)
          return (
            <button
              key={tablet.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tablet.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-all",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary",
                disabled && "opacity-60 cursor-not-allowed"
              )}
            >
              <Tablet className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">{tablet.name}</span>
              <span className="shrink-0 text-xs opacity-70">{tablet.slug}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
