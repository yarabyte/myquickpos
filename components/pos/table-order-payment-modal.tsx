"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Banknote, Smartphone, Loader2 } from "lucide-react"
import { completeTableOrder } from "@/app/actions/table-orders"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { ReceiptPreviewModal, type ReceiptPrinterConfig } from "./receipt-preview-modal"
import type { CartItem } from "@/lib/pos-data"

export interface PendingTableOrder {
  id: string
  orderNumber: string
  orderLabel: string | null
  total: number
  createdAt: Date
  table: { id: string; name: string; slug: string } | null
  items: {
    productId: string
    quantity: number
    unitPrice: number
    total: number
    product: { name: string }
  }[]
}

interface TableOrderPaymentModalProps {
  open: boolean
  onClose: () => void
  order: PendingTableOrder | null
  formatCurrency: (amount: number) => string
  formatAmount?: (amount: number) => string
  currency?: string
  taxRate?: number
  terminalName?: string
  printerConfig?: ReceiptPrinterConfig
  onCompleted?: () => void
}

function tableOrderToCart(order: PendingTableOrder): CartItem[] {
  return order.items.map((item) => ({
    product: {
      id: item.productId,
      name: item.product.name,
      price: item.unitPrice,
      category: "",
    },
    quantity: item.quantity,
  }))
}

const paymentOptions = [
  { id: "Cash", label: "Espèces", icon: Banknote },
  { id: "MTN Money", label: "MTN Money", icon: Smartphone },
  { id: "Orange Money", label: "Orange Money", icon: Smartphone },
]

export function TableOrderPaymentModal({
  open,
  onClose,
  order,
  formatCurrency,
  formatAmount,
  currency,
  taxRate = 0,
  terminalName = "Terminal",
  printerConfig,
  onCompleted,
}: TableOrderPaymentModalProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const currentUserName = (session?.user as { name?: string } | undefined)?.name ?? ""
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [cashReceived, setCashReceived] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptCart, setReceiptCart] = useState<CartItem[]>([])
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState("Espèces")
  const [receiptOrderNumber, setReceiptOrderNumber] = useState<string>()

  useEffect(() => {
    if (open) {
      setPaymentMethod("Cash")
      setCashReceived("")
    }
  }, [open, order?.id])

  const total = order?.total ?? 0
  const receivedAmount = parseFloat(cashReceived) || 0
  const changeDue = receivedAmount - total
  const isCash = paymentMethod === "Cash"
  const canSubmit = !isCash || receivedAmount >= total

  const handleComplete = async () => {
    if (!order) return
    if (isCash && receivedAmount < total) {
      toast.error("Montant insuffisant", {
        description: "Le montant perçu doit être au moins égal au total.",
      })
      return
    }
    setSubmitting(true)
    const result = await completeTableOrder({
      orderId: order.id,
      paymentMethod,
      cashierName: currentUserName.trim() || null,
    })
    setSubmitting(false)
    if (result.success) {
      const methodLabel =
        paymentOptions.find((opt) => opt.id === paymentMethod)?.label ?? paymentMethod
      setReceiptCart(tableOrderToCart(order))
      setReceiptPaymentMethod(methodLabel)
      setReceiptOrderNumber(order.orderNumber)
      setShowReceipt(true)
      toast.success("Commande réglée", { description: `${order.orderNumber} enregistrée.` })
      onClose()
      onCompleted?.()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const label = order ? (order.orderLabel || order.table?.name || order.orderNumber) : ""

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-md">
        <DialogHeader>
          <DialogTitle>Régler la commande table</DialogTitle>
        </DialogHeader>
        {order && (
          <>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {order.orderNumber} — {label}
              </p>
              <p className="text-muted-foreground">
                {new Date(order.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(order.total)}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Mode de paiement
              </label>
              <div className="space-y-2">
                {paymentOptions
                  .filter((opt) => opt.id === "Cash")
                  .map((opt) => (
                    <Button
                      key={opt.id}
                      type="button"
                      variant={paymentMethod === opt.id ? "default" : "outline"}
                      size="sm"
                      className="w-full h-11"
                      onClick={() => {
                        setPaymentMethod(opt.id)
                        if (opt.id !== "Cash") setCashReceived("")
                      }}
                    >
                      <opt.icon className="mr-1.5 h-4 w-4" />
                      {opt.label}
                    </Button>
                  ))}
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions
                    .filter((opt) => opt.id !== "Cash")
                    .map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={paymentMethod === opt.id ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setPaymentMethod(opt.id)
                          if (opt.id !== "Cash") setCashReceived("")
                        }}
                      >
                        <opt.icon className="mr-1.5 h-4 w-4" />
                        {opt.label}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            {isCash && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <label htmlFor="cash-received" className="text-sm font-medium text-muted-foreground">
                    Montant perçu
                  </label>
                  <Input
                    id="cash-received"
                    type="number"
                    min="0"
                    step="1"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0"
                    className="h-11 text-center text-lg font-bold font-mono"
                  />
                </div>
                {receivedAmount >= total && (
                  <div className="rounded-lg bg-primary/10 px-3 py-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Reste à remettre au client</p>
                    <p className="text-xl font-bold text-primary font-mono">
                      {formatCurrency(changeDue)}
                    </p>
                  </div>
                )}
                {cashReceived && receivedAmount < total && (
                  <p className="text-xs text-destructive text-center">
                    Montant insuffisant (manque {formatCurrency(total - receivedAmount)})
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleComplete}
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                "Régler"
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>

    <ReceiptPreviewModal
      open={showReceipt}
      onClose={() => {
        setShowReceipt(false)
        setReceiptCart([])
        setReceiptOrderNumber(undefined)
      }}
      cart={receiptCart}
      taxRate={taxRate}
      formatCurrency={formatCurrency}
      formatAmount={formatAmount}
      currency={currency}
      paymentMethod={receiptPaymentMethod}
      terminalName={terminalName}
      cashierName={currentUserName.trim() || "Caissier"}
      orderNumber={receiptOrderNumber}
      printerConfig={
        printerConfig
          ? { ...printerConfig, autoPrint: true }
          : { paperWidth: "80mm", headerHtml: "", footerHtml: "", autoPrint: true }
      }
    />
    </>
  )
}
