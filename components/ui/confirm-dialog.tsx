"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  icon?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: "default" | "destructive"
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
  loading = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const busy = loading || isLoading

  async function handleConfirm() {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md bg-card border-border">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {icon && (
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                  variant === "destructive"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                )}
              >
                {icon}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <AlertDialogTitle className="text-card-foreground">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-sm text-muted-foreground">{description}</div>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
