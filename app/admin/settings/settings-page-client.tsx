"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Store,
  Percent,
  Globe,
  Printer,
  RotateCcw,
  Eye,
  EyeOff,
  Save,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatWithCurrency as formatCurrencyAmount } from "@/lib/format-currency"
import { ReceiptEditor } from "@/components/admin/receipt-editor"
import { WelcomeEmailTemplate } from "@/components/admin/welcome-email-template"
import { updateTenantSettings } from "@/app/actions/settings"

export type InitialSettings = {
  storeName: string
  currency: string
  taxRate: number
  printer: {
    paperWidth: "58mm" | "80mm"
    autoPrint: boolean
    headerHtml: string
    footerHtml: string
  }
}

export function SettingsPageClient({ initialSettings }: { initialSettings: InitialSettings }) {
  const router = useRouter()
  const [storeName, setStoreName] = useState(initialSettings.storeName)
  const [currency, setCurrency] = useState(initialSettings.currency)
  const [taxRate, setTaxRate] = useState(String(initialSettings.taxRate))
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [printer, setPrinter] = useState(initialSettings.printer)

  useEffect(() => {
    setStoreName(initialSettings.storeName)
    setCurrency(initialSettings.currency)
    setTaxRate(String(initialSettings.taxRate))
    setPrinter(initialSettings.printer)
  }, [initialSettings])

  const formatWithCurrency = (amount: number) =>
    formatCurrencyAmount(amount, currency.trim() || "USD")

  function handleResetPrinter() {
    setPrinter({
      paperWidth: "80mm",
      autoPrint: false,
      headerHtml: `<p style="text-align: center"><strong>MyQuickPOS Demo Store</strong></p><p style="text-align: center">123 Main Street, Suite 100</p><p style="text-align: center">Tel: (555) 123-4567</p>`,
      footerHtml: `<p style="text-align: center">Thank you for your purchase!</p><p style="text-align: center">Visit us at myquickpos.app</p><p style="text-align: center"><em>Returns accepted within 30 days</em></p>`,
    })
  }

  async function handleSave() {
    setSaving(true)
    const formData = new FormData()
    formData.set("storeName", storeName)
    formData.set("currency", currency)
    formData.set("taxRate", taxRate)
    formData.set("paperWidth", printer.paperWidth)
    formData.set("autoPrint", String(printer.autoPrint))
    formData.set("headerHtml", printer.headerHtml)
    formData.set("footerHtml", printer.footerHtml)
    const result = await updateTenantSettings(formData)
    setSaving(false)
    if (result?.ok) router.refresh()
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure global POS system preferences
        </p>
      </div>

      {/* Store Info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Store className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">
            Store Information
          </h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store-name" className="text-sm text-card-foreground">
            Store Name
          </Label>
          <Input
            id="store-name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="bg-secondary border-border text-card-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-sm text-card-foreground">
              <Globe className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Currency
            </Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-secondary border-border text-card-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax" className="text-sm text-card-foreground">
              <Percent className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Default Tax Rate (%) <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="tax"
              type="number"
              min={0}
              step="0.1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0"
              className="bg-secondary border-border text-card-foreground"
            />
            <p className="text-xs text-muted-foreground">Optional. Set to 0 to disable tax.</p>
          </div>
        </div>
      </div>

      {/* Thermal Printer */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-card-foreground">
              Thermal Printer
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
            >
              {showPreview ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {showPreview ? "Hide" : "Show"} Preview
            </button>
            <button
              onClick={handleResetPrinter}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-card-foreground">Paper Width</Label>
            <div className="flex gap-2">
              {(["58mm", "80mm"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setPrinter((p) => ({ ...p, paperWidth: w }))}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    printer.paperWidth === w
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-border/80"
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-card-foreground">Auto-Print</Label>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                checked={printer.autoPrint}
                onCheckedChange={(checked) =>
                  setPrinter((p) => ({ ...p, autoPrint: checked }))
                }
              />
              <span className="text-sm text-muted-foreground">
                {printer.autoPrint ? "Print after every sale" : "Manual print"}
              </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-6",
            showPreview ? "lg:grid-cols-[1fr_280px]" : "grid-cols-1"
          )}
        >
          <div className="space-y-5">
            <ReceiptEditor
              value={printer.headerHtml}
              onChange={(html) => setPrinter((p) => ({ ...p, headerHtml: html }))}
              label="Receipt Header"
              description="Shown at the top of every receipt. Typically your store name, address, and phone."
            />

            <ReceiptEditor
              value={printer.footerHtml}
              onChange={(html) => setPrinter((p) => ({ ...p, footerHtml: html }))}
              label="Receipt Footer"
              description="Shown at the bottom of every receipt. Typically a thank-you message or return policy."
            />
          </div>

          {showPreview && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-card-foreground">
                Live Preview
              </p>
              <p className="text-xs text-muted-foreground">
                Simulated {printer.paperWidth} thermal receipt
              </p>
              <div
                data-paper-width={printer.paperWidth}
                className={cn(
                  "mx-auto rounded-md border border-dashed border-border bg-white text-black overflow-hidden receipt-thermal-pro font-mono",
                  printer.paperWidth === "58mm" ? "text-[12px]" : "text-[13px]"
                )}
              >
                <div className="space-y-0">
                  <div
                    className="receipt-preview"
                    dangerouslySetInnerHTML={{ __html: printer.headerHtml }}
                  />

                  <div className="border-t border-dashed border-neutral-300 my-2" />

                  <div className="space-y-1 leading-tight">
                    <div className="receipt-row">
                      <span>Classic Burger x2</span>
                      <span>{formatWithCurrency(17.98)}</span>
                    </div>
                    <div className="receipt-row">
                      <span>French Fries x1</span>
                      <span>{formatWithCurrency(4.49)}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Cola x2</span>
                      <span>{formatWithCurrency(4.98)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-neutral-300 my-2" />

                  <div className="space-y-0.5 leading-tight">
                    <div className="receipt-row">
                      <span>Subtotal</span>
                      <span>{formatWithCurrency(27.45)}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Tax ({taxRate}%)</span>
                      <span>{formatWithCurrency(27.45 * parseFloat(taxRate || "0") / 100)}</span>
                    </div>
                    <div className="receipt-row font-bold pt-0.5">
                      <span>TOTAL</span>
                      <span>{formatWithCurrency(27.45 + 27.45 * parseFloat(taxRate || "0") / 100)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-neutral-300 my-2" />

                  <div className="space-y-0.5 leading-tight">
                    <div className="receipt-row">
                      <span>Paid: Cash</span>
                      <span>{formatWithCurrency(30)}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Change</span>
                      <span>{formatWithCurrency(30 - (27.45 + 27.45 * parseFloat(taxRate || "0") / 100))}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-neutral-300 my-2" />

                  <div
                    className="receipt-preview"
                    dangerouslySetInnerHTML={{ __html: printer.footerHtml }}
                  />

                  <p className="text-[10px] text-neutral-400 text-center pt-2 font-mono" suppressHydrationWarning>
                    {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[10px] text-neutral-400 text-center font-mono">
                    Terminal 01 - Receipt #0048
                  </p>
                </div>

                <div className="border-t-2 border-dotted border-neutral-200" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Templates */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Email Templates
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize the welcome email sent to new business owners after signup
            </p>
          </div>
        </div>

        <WelcomeEmailTemplate />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  )
}
