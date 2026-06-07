import nodemailer from "nodemailer"
import type Transporter from "nodemailer/lib/mailer"

let transporter: Transporter | null = null

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

function getTransporter(): Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.")
  }

  const port = Number(process.env.SMTP_PORT ?? 465)
  const secure = process.env.SMTP_SECURE !== "false"

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  return transporter
}

export function getFromAddress(): string {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@myquickpos.app"
}

export async function sendMail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — skipping send to", options.to)
    return
  }

  await getTransporter().sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}
