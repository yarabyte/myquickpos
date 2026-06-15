"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Download, WifiOff, SignalLow, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "myquickpos-tablet-pwa-dismissed"

function isTabletRoute(pathname: string) {
  return pathname.startsWith("/restaurant") || pathname.startsWith("/admin/tablet")
}

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function TabletPwaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const networkStatus = useNetworkStatus()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const active = isTabletRoute(pathname ?? "")

  useEffect(() => {
    if (!active) return
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1")
  }, [active, pathname])

  useEffect(() => {
    if (!active) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [active])

  if (!active) return <>{children}</>

  // Show the install prompt on any tablet route (this provider only renders
  // when `active`), regardless of role — admins setting up a tablet need it
  // just as much as servers.
  const showInstall = !isStandalone() && !dismissed && Boolean(deferredPrompt)

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
  }

  function dismissInstall() {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }

  return (
    <>
      {children}

      {networkStatus !== "online" && (
        <div
          className={cn(
            "fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
            networkStatus === "offline"
              ? "bg-destructive text-destructive-foreground"
              : "bg-amber-500 text-amber-950"
          )}
        >
          {networkStatus === "offline" ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0" />
              Offline — orders will be sent when reconnected
            </>
          ) : (
            <>
              <SignalLow className="h-4 w-4 shrink-0" />
              Slow connection — sending may take longer
            </>
          )}
        </div>
      )}

      {showInstall && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300 max-md:bottom-6">
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Download className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-card-foreground">
                Install tablet app
              </p>
              <p className="text-xs text-muted-foreground">
                Quick access, offline mode, and better handling of network outages
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
              <button
                type="button"
                onClick={dismissInstall}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
