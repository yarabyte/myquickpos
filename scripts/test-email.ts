import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import nodemailer from "nodemailer"

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env")
  const content = readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

async function main() {
  loadEnvFile()

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 465)
  const secure = process.env.SMTP_SECURE !== "false"
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM ?? user
  const to = process.argv[2] ?? user

  if (!host || !user || !pass) {
    console.error("Missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD in .env")
    process.exit(1)
  }

  console.log("SMTP config:")
  console.log(`  host: ${host}:${port} (secure=${secure})`)
  console.log(`  user: ${user}`)
  console.log(`  from: ${from}`)
  console.log(`  to:   ${to}`)
  console.log("")

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
  })

  console.log("Verifying SMTP connection...")
  await transport.verify()
  console.log("Connection OK.")

  const info = await transport.sendMail({
    from,
    to,
    subject: "MyQuickPOS — test email",
    text: "This is a test email from MyQuickPOS. SMTP is working.",
    html: `<p>This is a <strong>test email</strong> from MyQuickPOS.</p><p>SMTP is working.</p>`,
  })

  console.log("Email sent successfully.")
  console.log(`  messageId: ${info.messageId}`)
  console.log(`  response:  ${info.response}`)
}

main().catch((error) => {
  console.error("Email test failed:")
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
