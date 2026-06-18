"use client"

import { PwaInstallPrompt } from "./pwa-install-prompt"

export function PwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  )
}
