"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { releaseUiLock } from "@/lib/release-ui-lock"

export function RadixPortalCleanup() {
  const pathname = usePathname()

  useEffect(() => {
    releaseUiLock()
  }, [pathname])

  return null
}
