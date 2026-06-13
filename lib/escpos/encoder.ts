/**
 * Minimal ESC/POS byte encoder for 58mm / 80mm thermal printers (PM-MLP80, etc.).
 *
 * Produces a raw Uint8Array ready to be pushed over a Bluetooth (BLE) write
 * characteristic. No HTML, no print dialog, no RawBT in the loop.
 */

const ESC = 0x1b
const GS = 0x1d

/** CP858 (CP850 + euro) overrides for common Latin/French characters in the 0x80-0xFF range. */
const CP858: Record<string, number> = {
  "€": 0xd5, "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85,
  "å": 0x86, "ç": 0x87, "ê": 0x88, "ë": 0x89, "è": 0x8a, "ï": 0x8b, "î": 0x8c,
  "ì": 0x8d, "Ä": 0x8e, "Å": 0x8f, "É": 0x90, "æ": 0x91, "Æ": 0x92, "ô": 0x93,
  "ö": 0x94, "ò": 0x95, "û": 0x96, "ù": 0x97, "ÿ": 0x98, "Ö": 0x99, "Ü": 0x9a,
  "ø": 0x9b, "£": 0x9c, "Ø": 0x9d, "×": 0x9e, "á": 0xa0, "í": 0xa1, "ó": 0xa2,
  "ú": 0xa3, "ñ": 0xa4, "Ñ": 0xa5, "ª": 0xa6, "º": 0xa7, "¿": 0xa8, "°": 0xf8,
}

/** Encode a JS string to a single-byte ESC/POS code page (PC858). Unknown chars -> '?'. */
function encodeText(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x3f
    if (code < 0x80) {
      out.push(code)
    } else if (CP858[ch] !== undefined) {
      out.push(CP858[ch])
    } else {
      // Strip diacritics as a fallback (é -> e), else '?'
      const ascii = ch.normalize("NFD").replace(/[̀-ͯ]/g, "")
      const a = ascii.codePointAt(0)
      out.push(a !== undefined && a < 0x80 ? a : 0x3f)
    }
  }
  return out
}

export type Align = "left" | "center" | "right"

export class EscPosEncoder {
  private buf: number[] = []

  /** Columns of text in font A (used for two-column rows). 80mm = 48, 58mm = 32. */
  constructor(public readonly columns: number = 48) {}

  private push(...bytes: number[]) {
    this.buf.push(...bytes)
    return this
  }

  /** ESC @ — reset printer to defaults, then select PC858 code page (ESC t 19). */
  init() {
    return this.push(ESC, 0x40).push(ESC, 0x74, 19)
  }

  align(a: Align) {
    const n = a === "center" ? 1 : a === "right" ? 2 : 0
    return this.push(ESC, 0x61, n)
  }

  bold(on: boolean) {
    return this.push(ESC, 0x45, on ? 1 : 0)
  }

  underline(on: boolean) {
    return this.push(ESC, 0x2d, on ? 1 : 0)
  }

  /** GS ! — width/height multiplier (0 = normal, 1 = x2). */
  size(width: 0 | 1, height: 0 | 1) {
    const n = (width << 4) | height
    return this.push(GS, 0x21, n)
  }

  text(str: string) {
    return this.push(...encodeText(str))
  }

  line(str = "") {
    return this.text(str).push(0x0a)
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) this.push(0x0a)
    return this
  }

  /** Full-width separator made of a single character. */
  rule(char = "-") {
    return this.line(char.repeat(this.columns))
  }

  /** Two-column row: label left, value right-aligned, padded to `columns`. */
  row(left: string, right: string) {
    const space = Math.max(1, this.columns - left.length - right.length)
    if (left.length + right.length > this.columns) {
      // Wrap: label on its own line, value right-aligned below.
      this.line(left)
      const pad = Math.max(0, this.columns - right.length)
      return this.line(" ".repeat(pad) + right)
    }
    return this.line(left + " ".repeat(space) + right)
  }

  /** Three-column item row (name / qty / amount) for receipts. */
  item(name: string, qty: string, amount: string) {
    const qtyW = 4
    const amtW = 10
    const nameW = this.columns - qtyW - amtW
    const nameLines = wrap(name, nameW)
    nameLines.forEach((nl, i) => {
      if (i === 0) {
        const q = qty.padStart(qtyW)
        const a = amount.padStart(amtW)
        this.line(nl.padEnd(nameW) + q + a)
      } else {
        this.line(nl)
      }
    })
    return this
  }

  /** GS ( k — QR code (model 2). `size` 1-16 module size. */
  qr(data: string, moduleSize = 6) {
    const store = (fn: number, m: number, pl: number, ph: number, ...rest: number[]) =>
      this.push(GS, 0x28, 0x6b, pl, ph, 0x31, fn, m, ...rest)
    // Model 2
    store(0x41, 0x32, 4, 0)
    // Module size
    this.push(GS, 0x28, 0x6b, 3, 0, 0x31, 0x43, moduleSize)
    // Error correction level M
    this.push(GS, 0x28, 0x6b, 3, 0, 0x31, 0x45, 0x31)
    // Store data
    const bytes = encodeText(data)
    const len = bytes.length + 3
    this.push(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30, ...bytes)
    // Print
    this.push(GS, 0x28, 0x6b, 3, 0, 0x31, 0x51, 0x30)
    return this
  }

  /** Feed paper and full-cut (GS V 65). Many portable printers ignore the cut and just feed. */
  cut(feedLines = 4) {
    return this.feed(feedLines).push(GS, 0x56, 0x41, 0x00)
  }

  /** Open cash drawer (ESC p) — harmless if none connected. */
  pulse() {
    return this.push(ESC, 0x70, 0x00, 0x19, 0xfa)
  }

  encode(): Uint8Array {
    return new Uint8Array(this.buf)
  }
}

/** Word-wrap a string to a max column width (greedy). */
export function wrap(text: string, width: number): string[] {
  if (width <= 0) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    if (w.length > width) {
      if (cur) {
        lines.push(cur)
        cur = ""
      }
      for (let i = 0; i < w.length; i += width) lines.push(w.slice(i, i + width))
      continue
    }
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= width) cur += " " + w
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [""]
}
