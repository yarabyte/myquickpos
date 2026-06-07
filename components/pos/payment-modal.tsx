"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Banknote,
  Smartphone,
  CheckCircle2,
  Receipt,
  Star,
  User,
  Search,
  X,
  Gift,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CartItem } from "@/lib/pos-data"
import { ReceiptPreviewModal, type ReceiptPrinterConfig } from "./receipt-preview-modal"

interface CustomerOption {
  id: string
  name: string
  email: string
  phone: string
  loyaltyPoints: number
  tier: string
}

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  total: number
  cart: CartItem[]
  /** Cart of the order just completed (for receipt preview after payment). Parent sets this after successful payment. */
  completedOrderCart?: CartItem[]
  taxRate: number
  formatCurrency: (amount: number) => string
  formatAmount?: (amount: number) => string
  currency?: string
  terminalName?: string
  cashierName?: string
  customers?: CustomerOption[]
  onConfirmPayment: (data: { customerId?: string | null; paymentMethod: string }) => void | Promise<void>
  onPaymentComplete: () => void
  printerConfig?: ReceiptPrinterConfig
}

type PaymentMethod = "cash" | "mtn" | "orange" | null
type PaymentStep = "customer" | "method" | "processing" | "complete"

const paymentMethods = [
  {
    id: "cash" as const,
    label: "Cash",
    icon: Banknote,
    description: "Amount and change",
  },
  {
    id: "mtn" as const,
    label: "MTN Money",
    icon: Smartphone,
  },
  {
    id: "orange" as const,
    label: "Orange Money",
    icon: Smartphone,
  },
]

const cashPaymentMethod = paymentMethods.find((pm) => pm.id === "cash")!
const mobilePaymentMethods = paymentMethods.filter((pm) => pm.id !== "cash")

const defaultCustomers: CustomerOption[] = []

export function PaymentModal({
  open,
  onClose,
  total,
  cart,
  completedOrderCart,
  taxRate,
  formatCurrency,
  formatAmount,
  currency,
  terminalName = "Terminal",
  cashierName = "Cashier",
  customers = defaultCustomers,
  onConfirmPayment,
  onPaymentComplete,
  printerConfig,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [step, setStep] = useState<PaymentStep>("customer")
  const [cashAmount, setCashAmount] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [earnedPoints, setEarnedPoints] = useState(0)

  useEffect(() => {
    if (open) {
      setMethod("cash")
      setCashAmount("")
      const points = Math.floor(total)
      setEarnedPoints(points)
    }
  }, [open, total])

  useEffect(() => {
    if (open && step === "complete" && printerConfig?.autoPrint && completedOrderCart?.length) {
      setShowReceipt(true)
    }
  }, [open, step, printerConfig?.autoPrint, completedOrderCart?.length])

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer)
    setMethod("cash")
    setStep("method")
  }

  const handleSkipCustomer = () => {
    setSelectedCustomer(null)
    setMethod("cash")
    setStep("method")
  }

  const handleSelectMethod = (m: PaymentMethod) => {
    if (!m) return
    setMethod(m)
    if (m !== "cash") setCashAmount("")
  }

  const handleMobilePayment = async () => {
    if (method !== "mtn" && method !== "orange") return
    setStep("processing")
    try {
      await onConfirmPayment({
        customerId: selectedCustomer?.id ?? null,
        paymentMethod: method === "mtn" ? "MTN Money" : "Orange Money",
      })
      setStep("complete")
    } catch {
      setStep("method")
    }
  }

  const handleCashPayment = async () => {
    setStep("processing")
    try {
      await onConfirmPayment({
        customerId: selectedCustomer?.id ?? null,
        paymentMethod: "Cash",
      })
      setStep("complete")
    } catch (err) {
      setStep("method")
    }
  }

  const handleDone = () => {
    setMethod("cash")
    setStep("customer")
    setCashAmount("")
    setSelectedCustomer(null)
    setCustomerSearch("")
    onPaymentComplete()
  }

  const handleClose = () => {
    setMethod("cash")
    setStep("customer")
    setCashAmount("")
    setSelectedCustomer(null)
    setCustomerSearch("")
    onClose()
  }

  const handleViewReceipt = () => {
    setShowReceipt(true)
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const cashValue = parseFloat(cashAmount) || 0
  const changeDue = cashValue - total

  const methodLabel =
    method === "cash" ? "Cash" : method === "mtn" ? "MTN Money" : "Orange Money"

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "text-purple-600 bg-purple-100 dark:bg-purple-950"
      case "Gold": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950"
      case "Silver": return "text-gray-600 bg-gray-100 dark:bg-gray-800"
      case "Bronze": return "text-orange-600 bg-orange-100 dark:bg-orange-950"
      default: return "text-muted-foreground bg-muted"
    }
  }

  const CashIcon = cashPaymentMethod.icon

  const methodButtonClass = (id: PaymentMethod) =>
    cn(
      "flex flex-col items-center gap-2 rounded-xl border p-5 transition-all active:scale-[0.97] touch-manipulation select-none",
      method === id
        ? "border-primary bg-primary/10"
        : "border-border hover:border-primary/40 hover:bg-secondary/50"
    )

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {step === "complete" ? "Payment Successful" : step === "customer" ? "Customer Lookup" : "Payment"}
            </DialogTitle>
          </DialogHeader>

          {/* Customer Lookup Step */}
          {step === "customer" && (
            <div className="space-y-4">
              {selectedCustomer && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{selectedCustomer.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", getTierColor(selectedCustomer.tier))}>
                            <Star className="h-3 w-3 fill-current" />
                            {selectedCustomer.tier}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {selectedCustomer.loyaltyPoints.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} pts
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="rounded-lg p-1 hover:bg-secondary transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">+{earnedPoints} points</span>
                    <span className="text-muted-foreground">will be earned</span>
                  </div>
                </div>
              )}

              {!selectedCustomer && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, phone, or email..."
                      className="pl-9 h-11"
                    />
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-secondary/50 active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-bold", getTierColor(customer.tier))}>
                              {customer.tier}
                            </span>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {customer.loyaltyPoints.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} pts
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No customers found
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                <p className="text-4xl font-bold text-primary font-mono">
                  {formatCurrency(total)}
                </p>
              </div>

              <Button
                onClick={handleSkipCustomer}
                className="w-full h-12 text-base font-bold"
                size="lg"
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {step === "method" && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-4xl font-bold text-primary font-mono mt-1">
                  {formatCurrency(total)}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSelectMethod("cash")}
                  className={cn(methodButtonClass("cash"), "w-full")}
                >
                  <CashIcon className="h-8 w-8 text-primary" />
                  <span className="text-sm font-semibold">{cashPaymentMethod.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {cashPaymentMethod.description}
                  </span>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {mobilePaymentMethods.map((pm) => {
                    const Icon = pm.icon
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => handleSelectMethod(pm.id)}
                        className={methodButtonClass(pm.id)}
                      >
                        <Icon className="h-8 w-8 text-primary" />
                        <span className="text-sm font-semibold">{pm.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {method === "cash" && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Amount received
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-4 text-center text-2xl font-bold font-mono text-card-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {cashValue >= total && (
                    <div className="rounded-xl bg-primary/10 p-3 text-center">
                      <p className="text-sm text-muted-foreground">Change due</p>
                      <p className="text-2xl font-bold text-primary font-mono">
                        {formatCurrency(changeDue)}
                      </p>
                    </div>
                  )}

                  {cashAmount && cashValue < total && (
                    <p className="text-xs text-destructive text-center">
                      Insufficient amount (short {formatCurrency(total - cashValue)})
                    </p>
                  )}

                  <button
                    onClick={handleCashPayment}
                    disabled={cashValue < total}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold transition-all touch-manipulation select-none",
                      cashValue >= total
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    Pay
                  </button>
                </>
              )}

              {(method === "mtn" || method === "orange") && (
                <button
                  onClick={handleMobilePayment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] touch-manipulation select-none"
                >
                  Pay via {methodLabel}
                </button>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Processing payment...
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary font-mono">
                  {formatCurrency(total)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Payment received via {methodLabel}
                </p>
                {method === "cash" && changeDue > 0 && (
                  <p className="text-sm font-semibold text-primary mt-1 font-mono">
                    Change: {formatCurrency(changeDue)}
                  </p>
                )}
              </div>

              {selectedCustomer && (
                <div className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <Star className="h-5 w-5 text-primary fill-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{selectedCustomer.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lg font-bold text-primary">+{earnedPoints}</span>
                        <span className="text-xs text-muted-foreground">points earned</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    New balance: {(selectedCustomer.loyaltyPoints + earnedPoints).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} points
                  </div>
                </div>
              )}

              <div className="flex w-full gap-2 mt-2">
                <button
                  onClick={handleViewReceipt}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-semibold text-card-foreground transition-all hover:bg-secondary active:scale-[0.98] touch-manipulation select-none"
                >
                  <Receipt className="h-4 w-4" />
                  View Receipt
                </button>
                <button
                  onClick={handleDone}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] touch-manipulation select-none"
                >
                  New Order
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptPreviewModal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        cart={completedOrderCart?.length ? completedOrderCart : cart}
        taxRate={taxRate}
        formatCurrency={formatCurrency}
        formatAmount={formatAmount}
        currency={currency}
        paymentMethod={methodLabel}
        terminalName={terminalName}
        cashierName={cashierName}
        printerConfig={printerConfig}
      />
    </>
  )
}
