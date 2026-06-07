"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePrinter } from "@/hooks/use-printer"
import { Printer, X, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn, toTitleCase } from "@/lib/utils"
import { printReceiptElement } from "@/lib/print-receipt"
import { formatAmountOnly } from "@/lib/format-currency"
import type { CartItem } from "@/lib/pos-data"

export type ReceiptPrinterConfig = {
  paperWidth: "58mm" | "80mm"
  headerHtml: string
  footerHtml: string
  autoPrint?: boolean
}

interface ReceiptPreviewModalProps {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  taxRate: number
  formatCurrency: (amount: number) => string
  formatAmount?: (amount: number) => string
  currency?: string
  paymentMethod?: string
  terminalName?: string
  cashierName?: string
  orderNumber?: string
  /** When provided (e.g. from tenant settings), overrides usePrinter() config for this modal */
  printerConfig?: ReceiptPrinterConfig
}

export function ReceiptPreviewModal({
  open,
  onClose,
  cart,
  taxRate,
  formatCurrency,
  formatAmount,
  currency = "USD",
  paymentMethod = "Card",
  terminalName = "Terminal",
  cashierName = "Cashier",
  orderNumber,
  printerConfig: printerConfigProp,
}: ReceiptPreviewModalProps) {
  const { config: storeConfig } = usePrinter()
  const config = printerConfigProp ?? storeConfig
  const receiptRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)
  const [printed, setPrinted] = useState(false)
  const autoPrint = printerConfigProp?.autoPrint === true

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const orderNo =
    orderNumber?.startsWith("#") ? orderNumber : orderNumber ? `#${orderNumber}` : "#" + String(Math.floor(Math.random() * 9000) + 1000)
  const formatLineAmount =
    formatAmount ?? ((amount: number) => formatAmountOnly(amount, currency))

  useEffect(() => {
    if (open) {
      setPrinting(false)
      setPrinted(false)
    }
  }, [open])

  const handlePrint = useCallback(async () => {
    if (!receiptRef.current) return
    setPrinting(true)
    try {
      await printReceiptElement(receiptRef.current)
      setPrinted(true)
    } catch {
      toast.error("Unable to print receipt")
    } finally {
      setPrinting(false)
    }
  }, [])

  useEffect(() => {
    if (open && autoPrint && cart.length > 0) {
      const t = setTimeout(handlePrint, 300)
      return () => clearTimeout(t)
    }
  }, [open, autoPrint, cart.length, handlePrint])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-card-foreground text-base font-semibold">
              Receipt Preview
            </DialogTitle>
            <span className="text-xs text-muted-foreground font-mono">
              {config.paperWidth}
            </span>
          </div>
        </DialogHeader>

        <div className="flex justify-center bg-secondary/30 py-6 px-4 max-h-[60vh] overflow-y-auto">
          {/* Ticket thermal format pro : 58mm / 80mm, mise en page soignée */}
          <div
            ref={receiptRef}
            data-paper-width={config.paperWidth}
            className={cn(
              "bg-white text-black shadow-lg relative receipt-thermal-pro",
              "font-mono leading-snug",
              config.paperWidth === "58mm" ? "text-[12px]" : "text-[13px]"
            )}
          >
            {/* En-tête commerce */}
            {config.headerHtml && (
              <div
                className="receipt-preview text-center mb-2 text-[inherit]"
                dangerouslySetInnerHTML={{ __html: config.headerHtml }}
              />
            )}

            <hr className="receipt-separator-thick" />

            {/* Infos commande */}
            <div className="receipt-order-meta">
              <p className="font-bold uppercase tracking-wide">{orderNo}</p>
              <p>{dateStr} · {timeStr}</p>
              <p className="font-medium">Terminal: {terminalName}</p>
              <p className="font-medium">Cashier: {cashierName}</p>
            </div>

            <hr className="receipt-separator-dashed" />

            {/* Colonnes articles */}
            <div className="receipt-line font-bold uppercase tracking-wide text-[0.9em] mb-1">
              <span className="receipt-col-name">Item</span>
              <span className="receipt-col-qty">Qty</span>
              <span className="receipt-col-amount">Amount</span>
            </div>

            <div className="space-y-0.5 mb-2">
              {cart.map((item) => (
                <div key={item.product.id} className="receipt-line">
                  <span className="receipt-col-name">{toTitleCase(item.product.name)}</span>
                  <span className="receipt-col-qty">{item.quantity}</span>
                  <span className="receipt-col-amount">
                    {formatLineAmount(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {cart.length === 0 && (
              <div className="text-center text-gray-500 py-2 text-[0.9em]">
                No items
              </div>
            )}

            <hr className="receipt-separator-dashed" />

            {/* Totaux */}
            <div className="space-y-0.5 text-[0.95em]">
              <div className="receipt-row">
                <span>Subtotal ({itemCount} items)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {(taxRate ?? 0) > 0 ? (
                <div className="receipt-row">
                  <span>Tax ({taxRate}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              ) : (
                <div className="receipt-row">
                  <span>Tax</span>
                  <span>—</span>
                </div>
              )}
              <hr className="receipt-separator-thick" />
              <div className="receipt-row font-bold text-[1.05em]">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <hr className="receipt-separator-dashed" />

            <div className="receipt-row text-[0.95em]">
              <span>Payment</span>
              <span className="font-semibold">{paymentMethod}</span>
            </div>

            {config.footerHtml && (
              <>
                <hr className="receipt-separator-dashed" />
                <div
                  className="receipt-preview text-center text-[0.9em]"
                  dangerouslySetInnerHTML={{ __html: config.footerHtml }}
                />
              </>
            )}

            <div className="receipt-no-print h-3" aria-hidden />
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-border">
          {printed ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-primary py-3">
              <CheckCircle2 className="h-4 w-4" />
              Sent to printer
            </div>
          ) : (
            <button
              onClick={handlePrint}
              disabled={printing}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all touch-manipulation select-none",
                printing
                  ? "bg-muted text-muted-foreground cursor-wait"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
              )}
            >
              {printing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Printing…
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Print receipt (thermal)
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors touch-manipulation select-none"
          >
            <X className="h-4 w-4 mr-1.5" />
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
