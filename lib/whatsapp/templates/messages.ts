import { formatWithCurrency } from "@/lib/format-currency"

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  CASHIER: "Caissier",
  SERVER: "Serveur",
}

function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  })
}

function formatPeriodFr(from: Date, to: Date): string {
  return `${formatDateFr(from)} → ${formatDateFr(to)}`
}

function formatMonthFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Douala",
  })
}

export function accountCreatedMessage(params: {
  storeName: string
  name: string
  email: string
  role: string
}): string {
  const roleLabel = ROLE_LABELS[params.role] ?? params.role
  return [
    `🆕 Nouveau compte créé — ${params.storeName}`,
    "",
    `👤 ${params.name}`,
    `📧 ${params.email}`,
    `🔑 Rôle : ${roleLabel}`,
  ].join("\n")
}

export function salesReportMessage(params: {
  period: "daily" | "weekly" | "monthly"
  storeName: string
  periodLabel: string
  totalOrders: number
  revenue: number
  avgBasket: number
  currency: string
}): string {
  const titles = {
    daily: "Rapport journalier",
    weekly: "Rapport hebdomadaire",
    monthly: "Rapport mensuel",
  }
  const icons = {
    daily: "📊",
    weekly: "📈",
    monthly: "📅",
  }

  return [
    `${icons[params.period]} ${titles[params.period]} — ${params.storeName}`,
    `📅 ${params.periodLabel}`,
    "",
    `✅ Commandes : ${params.totalOrders}`,
    `💰 Chiffre d'affaires : ${formatWithCurrency(params.revenue, params.currency)}`,
    `🧾 Panier moyen : ${formatWithCurrency(params.avgBasket, params.currency)}`,
  ].join("\n")
}

export function testMessage(storeName: string): string {
  return [
    `✅ Test MyQuickPOS — ${storeName}`,
    "",
    "Les notifications WhatsApp sont correctement configurées.",
  ].join("\n")
}

export { formatDateFr, formatPeriodFr, formatMonthFr }
