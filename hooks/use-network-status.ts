"use client"

import { useEffect, useState } from "react"

export type NetworkStatus = "online" | "offline" | "slow"

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  )

  useEffect(() => {
    function handleOnline() {
      setStatus("online")
    }

    function handleOffline() {
      setStatus("offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const connection = (
      navigator as Navigator & {
        connection?: { effectiveType?: string; addEventListener?: (t: string, fn: () => void) => void; removeEventListener?: (t: string, fn: () => void) => void }
      }
    ).connection

    function handleConnectionChange() {
      const type = connection?.effectiveType
      if (!navigator.onLine) {
        setStatus("offline")
      } else if (type === "slow-2g" || type === "2g") {
        setStatus("slow")
      } else {
        setStatus("online")
      }
    }

    connection?.addEventListener?.("change", handleConnectionChange)
    handleConnectionChange()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      connection?.removeEventListener?.("change", handleConnectionChange)
    }
  }, [])

  return status
}
