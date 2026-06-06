"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Download, WifiOff, SignalLow, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { sessionPermissionsFromUser } from "@/lib/permissions"
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
  const { data: session } = useSession()
  const networkStatus = useNetworkStatus()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const user = session?.user as { role?: string; permissions?: string[] } | undefined
  const permissions = sessionPermissionsFromUser(user ?? {})
  const isServerProfile =
    user?.role === "SERVER" ||
    (permissions.includes("restaurant.tablet") && !permissions.includes("tablet.manage"))

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

  const showInstall =
    !isStandalone() &&
    !dismissed &&
    deferredPrompt &&
    (isServerProfile || pathname?.startsWith("/restaurant"))

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
              Hors ligne — les commandes seront envoyées à la reconnexion
            </>
          ) : (
            <>
              <SignalLow className="h-4 w-4 shrink-0" />
              Connexion lente — l&apos;envoi peut prendre plus de temps
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
                Installer l&apos;application tablette
              </p>
              <p className="text-xs text-muted-foreground">
                Accès rapide, mode hors ligne et meilleure gestion des coupures réseau
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={handleInstall}>
                Installer
              </Button>
              <button
                type="button"
                onClick={dismissInstall}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary"
                aria-label="Fermer"
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
