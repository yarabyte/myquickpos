"use client"

/**
 * Tiny Web Audio beep generator — no audio asset, works offline, low latency.
 * The AudioContext is created lazily on the first call (which always happens
 * from a user gesture, e.g. tapping a product, satisfying autoplay policies).
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

interface BeepOptions {
  /** Tone frequency in Hz. */
  frequency?: number
  /** Duration in seconds. */
  duration?: number
  /** Peak volume 0–1. */
  volume?: number
}

/** Play a short beep. Safe to call anywhere; silently no-ops if audio is unavailable. */
export function playBeep({
  frequency = 880,
  duration = 0.08,
  volume = 0.15,
}: BeepOptions = {}): void {
  try {
    const c = getCtx()
    if (!c) return
    if (c.state === "suspended") void c.resume().catch(() => {})

    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = "sine"
    osc.frequency.value = frequency
    osc.connect(gain)
    gain.connect(c.destination)

    const now = c.currentTime
    // Quick attack + exponential decay to avoid clicks.
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.start(now)
    osc.stop(now + duration + 0.02)
  } catch {
    /* audio not available — ignore */
  }
}
