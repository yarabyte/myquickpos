"use client"

import { useState, useEffect } from "react"
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
  MessageCircle,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatWithCurrency as formatCurrencyAmount } from "@/lib/format-currency"
import { ReceiptEditor } from "@/components/admin/receipt-editor"
import { WelcomeEmailTemplate } from "@/components/admin/welcome-email-template"
import {
  getWhatsAppSessionStatus,
  sendWhatsAppTestMessage,
  updateTenantSettings,
} from "@/app/actions/settings"

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
  whatsapp: {
    enabled: boolean
    phoneNumber: string
    notifyAccountCreated: boolean
    notifyDailyReport: boolean
    notifyWeeklyReport: boolean
    notifyMonthlyReport: boolean
  }
}

const SESSION_STATUS_LABELS: Record<string, string> = {
  connected: "Connectée",
  connecting: "Connexion en cours…",
  disconnected: "Déconnectée",
  need_scan: "Scan QR requis",
  logged_out: "Déconnectée (logout)",
  expired: "Session expirée",
}

export function SettingsPageClient({ initialSettings }: { initialSettings: InitialSettings }) {
  const [storeName, setStoreName] = useState(initialSettings.storeName)
  const [currency, setCurrency] = useState(initialSettings.currency)
  const [taxRate, setTaxRate] = useState(String(initialSettings.taxRate))
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [printer, setPrinter] = useState(initialSettings.printer)
  const [whatsapp, setWhatsapp] = useState(initialSettings.whatsapp)
  const [sessionStatus, setSessionStatus] = useState<{
    configured: boolean
    status: string | null
  } | null>(null)
  const [testingWhatsApp, setTestingWhatsApp] = useState(false)
  const [whatsAppTestResult, setWhatsAppTestResult] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    setStoreName(initialSettings.storeName)
    setCurrency(initialSettings.currency)
    setTaxRate(String(initialSettings.taxRate))
    setPrinter(initialSettings.printer)
    setWhatsapp(initialSettings.whatsapp)
  }, [initialSettings])

  useEffect(() => {
    void getWhatsAppSessionStatus().then(setSessionStatus)
  }, [])

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
    setSaveMessage(null)
    try {
      const formData = new FormData()
      formData.set("storeName", storeName)
      formData.set("currency", currency)
      formData.set("taxRate", taxRate)
      formData.set("paperWidth", printer.paperWidth)
      formData.set("autoPrint", String(printer.autoPrint))
      formData.set("headerHtml", printer.headerHtml)
      formData.set("footerHtml", printer.footerHtml)
      formData.set("whatsappEnabled", String(whatsapp.enabled))
      formData.set("whatsappPhoneNumber", whatsapp.phoneNumber)
      formData.set("whatsappNotifyAccountCreated", String(whatsapp.notifyAccountCreated))
      formData.set("whatsappNotifyDailyReport", String(whatsapp.notifyDailyReport))
      formData.set("whatsappNotifyWeeklyReport", String(whatsapp.notifyWeeklyReport))
      formData.set("whatsappNotifyMonthlyReport", String(whatsapp.notifyMonthlyReport))

      const result = await updateTenantSettings(formData)
      if (result?.ok) {
        setSaveMessage("Paramètres enregistrés.")
      } else {
        setSaveMessage(result?.error ?? "Échec de l'enregistrement.")
      }
    } catch {
      setSaveMessage("Échec de l'enregistrement. Réessayez.")
    } finally {
      setSaving(false)
    }
  }

  async function handleWhatsAppTest() {
    setTestingWhatsApp(true)
    setWhatsAppTestResult(null)
    try {
      const result = await sendWhatsAppTestMessage(whatsapp.phoneNumber)
      setWhatsAppTestResult(
        result.ok ? "Message de test envoyé." : (result.error ?? "Échec de l'envoi.")
      )
      if (result.ok) {
        void getWhatsAppSessionStatus().then(setSessionStatus)
      }
    } catch {
      setWhatsAppTestResult("Échec de l'envoi. Réessayez.")
    } finally {
      setTestingWhatsApp(false)
    }
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

      {/* WhatsApp Notifications */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Notifications WhatsApp
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recevez des alertes et rapports de vente sur WhatsApp
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-card-foreground">Activer WhatsApp</p>
            <p className="text-xs text-muted-foreground">
              Envoyer des notifications au numéro configuré ci-dessous
            </p>
          </div>
          <Switch
            checked={whatsapp.enabled}
            onCheckedChange={(checked) =>
              setWhatsapp((w) => ({ ...w, enabled: checked }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp-phone" className="text-sm text-card-foreground">
            Numéro destinataire (E.164)
          </Label>
          <Input
            id="whatsapp-phone"
            value={whatsapp.phoneNumber}
            onChange={(e) =>
              setWhatsapp((w) => ({ ...w, phoneNumber: e.target.value }))
            }
            placeholder="+237612345678"
            className="bg-secondary border-border text-card-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Format international avec indicatif pays, ex: +237612345678. Cliquez sur
            Enregistrer pour sauvegarder le numéro.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-card-foreground">Types de notifications</p>
          {[
            {
              key: "notifyAccountCreated" as const,
              label: "Création de compte (admin)",
              description: "Alerte quand un utilisateur est créé depuis l'administration",
            },
            {
              key: "notifyDailyReport" as const,
              label: "Rapport journalier",
              description: "Résumé des ventes chaque matin à 08:00 (Africa/Douala)",
            },
            {
              key: "notifyWeeklyReport" as const,
              label: "Rapport hebdomadaire",
              description: "Résumé chaque lundi à 08:00 (semaine précédente)",
            },
            {
              key: "notifyMonthlyReport" as const,
              label: "Rapport mensuel",
              description: "Résumé le 1er de chaque mois à 08:00 (mois précédent)",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm text-card-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={whatsapp[item.key]}
                onCheckedChange={(checked) =>
                  setWhatsapp((w) => ({ ...w, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="text-xs text-muted-foreground">
            Session WasenderAPI :{" "}
            {sessionStatus === null ? (
              "…"
            ) : !sessionStatus.configured ? (
              <span className="text-amber-600">Non configurée (WASENDER_API_KEY)</span>
            ) : (
              <span
                className={cn(
                  "font-medium",
                  sessionStatus.status === "connected"
                    ? "text-green-600"
                    : "text-amber-600"
                )}
              >
                {SESSION_STATUS_LABELS[sessionStatus.status ?? ""] ??
                  sessionStatus.status ??
                  "Inconnue"}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleWhatsAppTest}
            disabled={testingWhatsApp || !whatsapp.phoneNumber.trim()}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {testingWhatsApp ? "Envoi…" : "Envoyer un test"}
          </Button>
        </div>
        {whatsAppTestResult && (
          <p
            className={cn(
              "text-xs",
              whatsAppTestResult.includes("envoyé")
                ? "text-green-600"
                : "text-destructive"
            )}
          >
            {whatsAppTestResult}
          </p>
        )}
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
        type="button"
        onClick={handleSave}
        disabled={saving || testingWhatsApp}
        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
      {saveMessage && (
        <p
          className={cn(
            "text-sm",
            saveMessage.includes("enregistrés") ? "text-green-600" : "text-destructive"
          )}
        >
          {saveMessage}
        </p>
      )}
    </div>
  )
}
