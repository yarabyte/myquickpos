"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface PwaUpdateBannerProps {
  onUpdate: () => void
}

export function PwaUpdateBanner({ onUpdate }: PwaUpdateBannerProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">
            Update available
          </p>
          <p className="text-xs text-muted-foreground">
            A new version of MyQuickPOS is ready
          </p>
        </div>
        <Button size="sm" onClick={onUpdate}>
          Update
        </Button>
      </div>
    </div>
  )
}
