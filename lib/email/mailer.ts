import nodemailer from "nodemailer"
import type Transporter from "nodemailer/lib/mailer"

let transporter: Transporter | null = null
let cachedConfigKey: string | null = null

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS ?? 10_000)

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD?.trim()
  )
}

function smtpConfigKey() {
  return [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT ?? "465",
    process.env.SMTP_USER,
    process.env.SMTP_SECURE ?? "true",
  ].join("|")
}

function getTransporter(): Transporter {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.")
  }

  const key = smtpConfigKey()
  if (transporter && cachedConfigKey === key) return transporter

  const port = Number(process.env.SMTP_PORT ?? 465)
  const secure = process.env.SMTP_SECURE !== "false"

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  })
  cachedConfigKey = key

  return transporter
}

export function getFromAddress(): string {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@myquickpos.app"
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
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

  await withTimeout(
    getTransporter().sendMail({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
    SMTP_TIMEOUT_MS,
    "SMTP send"
  )
}

/** Fire-and-forget email; never blocks the caller. */
export function sendMailAsync(options: Parameters<typeof sendMail>[0]): void {
  void sendMail(options).catch((error) => {
    console.error("[email] async send failed:", error)
  })
}
