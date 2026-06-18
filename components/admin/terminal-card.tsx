"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn, toTitleCase } from "@/lib/utils"
import {
  Monitor,
  MapPin,
  User,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Pencil,
  Power,
  Tag,
} from "lucide-react"
import { useCategories } from "@/hooks/use-categories"
import { getCategoryIcon } from "@/lib/category-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CategoryTree {
  id: string
  name: string
  icon: string
  children?: { id: string; name: string; icon: string }[]
}

export interface TerminalCardTerminal {
  id: string
  name: string
  location: string
  status: "online" | "offline" | "maintenance"
  cashier: string
  assignedCategories: string[]
  todaySales: number
  todayOrders: number
}

interface TerminalCardProps {
  terminal: TerminalCardTerminal
  formatCurrency?: (amount: number) => string
  periodLabel?: string
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  onEdit: (terminal: TerminalCardTerminal) => void
  categories?: { roots: CategoryTree[] }
}

const statusConfig = {
  online: { label: "Online", className: "bg-primary/15 text-primary" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground" },
  maintenance: {
    label: "Maintenance",
    className: "bg-chart-3/15 text-chart-3",
  },
}

export function TerminalCard({
  terminal,
  formatCurrency,
  periodLabel,
  onDelete,
  onToggleStatus,
  onEdit,
  categories: categoriesProp,
}: TerminalCardProps) {
  const format = formatCurrency ?? ((n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`)
  const hookCategories = useCategories()
  const roots = categoriesProp?.roots ?? hookCategories.roots
  const getChildren = (parentId: string) => {
    if (categoriesProp) {
      const root = categoriesProp.roots.find((r) => r.id === parentId)
      return root?.children ?? []
    }
    return hookCategories.getChildren(parentId)
  }
  const status = statusConfig[terminal.status]
  const [dropdownMounted, setDropdownMounted] = useState(false)
  useEffect(() => setDropdownMounted(true), [])

  // Build grouped badges: show parent names with child counts
  const assignedSet = new Set(terminal.assignedCategories ?? [])
  const groupedBadges = roots
    .filter((r) => assignedSet.has(r.id))
    .map((root) => {
      const children = getChildren(root.id)
      const assignedChildren = children.filter((c) => assignedSet.has(c.id))
      return {
        root,
        assignedChildren,
        totalChildren: children.length,
      }
    })

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              terminal.status === "online"
                ? "bg-primary/10"
                : "bg-muted"
            )}
          >
            <Monitor
              className={cn(
                "h-5 w-5",
                terminal.status === "online"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">
              {toTitleCase(terminal.name)}
            </h3>
            <span
              className={cn(
                "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                status.className
              )}
            >
              {status.label}
            </span>
          </div>
        </div>

        {dropdownMounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(terminal)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(terminal.id)}>
                <Power className="mr-2 h-4 w-4" />
                {terminal.status === "online" ? "Set Offline" : "Set Online"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(terminal.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Open menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {toTitleCase(terminal.location)}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" />
          {terminal.cashier}
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Tag className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {groupedBadges.map(({ root, assignedChildren, totalChildren }) => {
              const RootIcon = getCategoryIcon(root.icon)
              if (totalChildren === 0) {
                // Leaf root
                return (
                  <span
                    key={root.id}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    <RootIcon className="h-3 w-3" />
                    {toTitleCase(root.name)}
                  </span>
                )
              }
              // Parent with children
              return (
                <span
                  key={root.id}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  <RootIcon className="h-3 w-3" />
                  {toTitleCase(root.name)}
                  {assignedChildren.length < totalChildren && (
                    <span className="text-muted-foreground">
                      ({assignedChildren.length}/{totalChildren})
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stats (current month) */}
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        {periodLabel && (
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {periodLabel}
          </span>
        )}
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Sales</p>
            <p className="text-sm font-semibold text-card-foreground font-mono">
              {format(terminal.todaySales)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="text-sm font-semibold text-card-foreground font-mono">
              {terminal.todayOrders}
            </p>
          </div>
        </div>
      </div>

      {/* Open POS Link */}
      <Link
        href={`/pos/${terminal.name}`}
        className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open POS
      </Link>
    </div>
  )
}
