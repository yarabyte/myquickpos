/**
 * Build ESC/POS bytes for a sale receipt from the same data the on-screen
 * preview uses. Header/footer are rich HTML in the printer config, so we strip
 * them to centered text lines.
 */

import { EscPosEncoder } from "./encoder"
import type { CartItem } from "@/lib/pos-data"

export interface ReceiptData {
  cart: CartItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  itemCount: number
  orderNo: string
  dateStr: string
  timeStr: string
  terminalName: string
  cashierName: string
  paymentMethod: string
  /** Rich HTML from printer settings; converted to plain centered lines. */
  headerHtml: string
  footerHtml: string
  paperWidth: "58mm" | "80mm"
  formatCurrency: (amount: number) => string
  formatAmount: (amount: number) => string
  /** Optional payload for a QR code printed at the bottom (e.g. receipt URL). */
  qrData?: string
}

/** Convert a fragment of receipt HTML to plain text lines (one per block element). */
function htmlToLines(html: string): string[] {
  if (!html) return []
  if (typeof window === "undefined") {
    // SSR-safe crude fallback.
    return html
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  }
  const doc = new DOMParser().parseFromString(html, "text/html")
  // One line per block element so the layout matches the on-screen preview.
  const blocks = Array.from(doc.body.querySelectorAll("p,div,h1,h2,h3,h4,li"))
  if (blocks.length) {
    return blocks.map((el) => (el.textContent ?? "").trim()).filter(Boolean)
  }
  return (doc.body.textContent ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
}

export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const columns = data.paperWidth === "58mm" ? 32 : 48
  const e = new EscPosEncoder(columns)

  e.init()

  // Header (merchant block) — centered, first line emphasized.
  const headerLines = htmlToLines(data.headerHtml)
  e.align("center")
  headerLines.forEach((l, i) => {
    if (i === 0) {
      e.bold(true).size(1, 1).line(l).size(0, 0).bold(false)
    } else {
      e.line(l)
    }
  })

  e.align("center").rule("=")

  // Order meta.
  e.align("center")
    .bold(true)
    .line(data.orderNo)
    .bold(false)
    .line(`${data.dateStr} - ${data.timeStr}`)
    .line(`Terminal: ${data.terminalName}`)
    .line(`Cashier: ${data.cashierName}`)

  e.align("left").rule("-")

  // Column header + items.
  e.bold(true).item("ITEM", "QTY", "AMOUNT").bold(false)
  if (data.cart.length === 0) {
    e.align("center").line("No items").align("left")
  } else {
    for (const it of data.cart) {
      e.item(
        it.product.name,
        String(it.quantity),
        data.formatAmount(it.product.price * it.quantity)
      )
    }
  }

  e.rule("-")

  // Totals.
  e.row(`Subtotal (${data.itemCount} items)`, data.formatCurrency(data.subtotal))
  if (data.taxRate > 0) {
    e.row(`Tax (${data.taxRate}%)`, data.formatCurrency(data.tax))
  } else {
    e.row("Tax", "-")
  }
  e.rule("=")
  e.bold(true).size(1, 0).row("TOTAL", data.formatCurrency(data.total)).size(0, 0).bold(false)

  e.rule("-")
  e.row("Payment", data.paymentMethod)

  // Footer.
  const footerLines = htmlToLines(data.footerHtml)
  if (footerLines.length) {
    e.rule("-").align("center")
    footerLines.forEach((l) => e.line(l))
  }

  if (data.qrData) {
    e.align("center").feed(1).qr(data.qrData).feed(1)
  }

  e.align("left").cut()

  return e.encode()
}
