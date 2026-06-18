const WASENDER_API_BASE = "https://www.wasenderapi.com"
const API_TIMEOUT_MS = Number(process.env.WASENDER_TIMEOUT_MS ?? 10_000)

export type WasenderSessionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "need_scan"
  | "logged_out"
  | "expired"

export type SendTextMessageResult = {
  msgId: number
  jid: string
  status: string
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WASENDER_API_KEY?.trim())
}

/** Normalize phone to E.164: keep leading +, strip spaces/dashes. */
export function normalizePhoneE164(phone: string): string {
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith("+")
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return ""
  return hasPlus ? `+${digits}` : `+${digits}`
}

function getApiKey(): string {
  const key = process.env.WASENDER_API_KEY?.trim()
  if (!key) throw new Error("WASENDER_API_KEY is not configured.")
  return key
}

async function wasenderFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(`${WASENDER_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: unknown }).message)
          : `WasenderAPI error ${res.status}`
      throw new Error(message)
    }

    return body as T
  } finally {
    clearTimeout(timer)
  }
}

export async function getSessionStatus(): Promise<WasenderSessionStatus | null> {
  if (!isWhatsAppConfigured()) return null

  try {
    const data = await wasenderFetch<{ status?: string }>("/api/status")
    return (data.status as WasenderSessionStatus) ?? null
  } catch (error) {
    console.error("[whatsapp] getSessionStatus failed:", error)
    return null
  }
}

export async function sendTextMessage(options: {
  to: string
  text: string
}): Promise<SendTextMessageResult | null> {
  if (!isWhatsAppConfigured()) {
    console.warn("[whatsapp] WASENDER_API_KEY not configured — skipping send to", options.to)
    return null
  }

  const to = normalizePhoneE164(options.to)
  if (!to || !/^\+\d{8,15}$/.test(to)) {
    console.warn("[whatsapp] Invalid phone number:", options.to)
    return null
  }

  const status = await getSessionStatus()
  if (status !== "connected") {
    console.warn("[whatsapp] Session not connected (status:", status, ") — skipping send to", to)
    return null
  }

  try {
    const data = await wasenderFetch<{
      success?: boolean
      data?: { msgId?: number; jid?: string; status?: string }
    }>("/api/send-message", {
      method: "POST",
      body: JSON.stringify({ to, text: options.text }),
    })

    if (!data.data?.msgId) {
      console.warn("[whatsapp] Unexpected send response:", data)
      return null
    }

    return {
      msgId: data.data.msgId,
      jid: data.data.jid ?? to,
      status: data.data.status ?? "in_progress",
    }
  } catch (error) {
    console.error("[whatsapp] sendTextMessage failed:", error)
    return null
  }
}

export async function getMessageInfo(msgId: number): Promise<{
  status: number
  remoteJid?: string
} | null> {
  if (!isWhatsAppConfigured()) return null

  try {
    const data = await wasenderFetch<{
      success?: boolean
      data?: { status?: number; remoteJid?: string }
    }>(`/api/messages/${msgId}/info`)

    if (data.data?.status === undefined) return null
    return { status: data.data.status, remoteJid: data.data.remoteJid }
  } catch (error) {
    console.error("[whatsapp] getMessageInfo failed:", error)
    return null
  }
}
