"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isTabletRoute(pathname: string) {
  return pathname.startsWith("/restaurant") || pathname.startsWith("/admin/tablet")
}

export function PwaInstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isTabletRoute(pathname ?? "")) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [pathname])

  if (isTabletRoute(pathname ?? "") || !deferredPrompt || dismissed) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">
            Install MyQuickPOS
          </p>
          <p className="text-xs text-muted-foreground">
            Add to home screen for quick access
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
