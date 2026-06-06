const STORAGE_KEY = "myquickpos-offline-orders"

export type QueuedEstablishmentOrder = {
  id: string
  type: "establishment"
  payload: {
    establishmentSlug: string
    items: {
      productId: string
      quantity: number
      unitPrice: number
      total: number
    }[]
    subtotal: number
    tax: number
    discount: number
    orderLabel: string
  }
  createdAt: string
}

function readQueue(): QueuedEstablishmentOrder[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedEstablishmentOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function getOfflineOrderQueue(): QueuedEstablishmentOrder[] {
  return readQueue()
}

export function enqueueEstablishmentOrder(
  payload: QueuedEstablishmentOrder["payload"]
): QueuedEstablishmentOrder {
  const entry: QueuedEstablishmentOrder = {
    id: crypto.randomUUID(),
    type: "establishment",
    payload,
    createdAt: new Date().toISOString(),
  }
  writeQueue([...readQueue(), entry])
  return entry
}

export function removeQueuedOrder(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id))
}

export function countQueuedOrders(establishmentSlug?: string): number {
  const queue = readQueue()
  if (!establishmentSlug) return queue.length
  return queue.filter((item) => item.payload.establishmentSlug === establishmentSlug).length
}
