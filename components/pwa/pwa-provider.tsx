"use client"

import { useEffect } from "react"
import { clearLegacyServiceWorker } from "@/lib/pwa/clear-legacy-service-worker"
import { PwaInstallPrompt } from "./pwa-install-prompt"

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void clearLegacyServiceWorker()
  }, [])

  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  )
}
