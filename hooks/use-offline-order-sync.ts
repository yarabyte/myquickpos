"use client"

import { useCallback, useEffect, useState } from "react"
import { submitEstablishmentOrder } from "@/app/actions/table-orders"
import {
  countQueuedOrders,
  enqueueEstablishmentOrder,
  getOfflineOrderQueue,
  removeQueuedOrder,
  type QueuedEstablishmentOrder,
} from "@/lib/offline-order-queue"
import { toast } from "sonner"

export function useOfflineOrderSync(establishmentSlug: string) {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(() => {
    setPendingCount(countQueuedOrders(establishmentSlug))
  }, [establishmentSlug])

  const flushQueue = useCallback(async () => {
    if (syncing || !navigator.onLine) return
    const queue = getOfflineOrderQueue().filter(
      (item) => item.payload.establishmentSlug === establishmentSlug
    )
    if (queue.length === 0) return

    setSyncing(true)
    let sent = 0

    for (const item of queue) {
      const ok = await sendQueuedOrder(item)
      if (ok) sent++
    }

    setSyncing(false)
    refreshCount()

    if (sent > 0) {
      toast.success(`${sent} commande${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}`, {
        description: "Synchronisation après reconnexion réussie.",
      })
    }
  }, [establishmentSlug, syncing, refreshCount])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  useEffect(() => {
    function handleOnline() {
      void flushQueue()
    }
    window.addEventListener("online", handleOnline)
    if (navigator.onLine) void flushQueue()
    return () => window.removeEventListener("online", handleOnline)
  }, [flushQueue])

  async function queueOrder(payload: QueuedEstablishmentOrder["payload"]) {
    enqueueEstablishmentOrder(payload)
    refreshCount()
    toast.info("Commande en attente", {
      description: "Sera envoyée automatiquement dès que la connexion revient.",
    })
  }

  return { pendingCount, syncing, queueOrder, flushQueue, refreshCount }
}

async function sendQueuedOrder(item: QueuedEstablishmentOrder): Promise<boolean> {
  try {
    const result = await submitEstablishmentOrder(item.payload)
    if (result.success) {
      removeQueuedOrder(item.id)
      return true
    }
  } catch {
    // keep in queue
  }
  return false
}
