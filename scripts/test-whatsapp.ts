import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { getSessionStatus, isWhatsAppConfigured, sendTextMessage } from "../lib/whatsapp/wasender"

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

  const to = process.argv[2]
  if (!to) {
    console.error("Usage: pnpm tsx scripts/test-whatsapp.ts +237612345678")
    process.exit(1)
  }

  if (!isWhatsAppConfigured()) {
    console.error("Missing WASENDER_API_KEY in .env")
    process.exit(1)
  }

  console.log("WasenderAPI config:")
  console.log(`  api key: ${process.env.WASENDER_API_KEY?.slice(0, 8)}…`)
  console.log(`  to:      ${to}`)
  console.log("")

  console.log("Checking session status...")
  const status = await getSessionStatus()
  console.log(`  status: ${status ?? "unknown"}`)

  if (status !== "connected") {
    console.error("Session is not connected. Connect your WhatsApp session in WasenderAPI dashboard.")
    process.exit(1)
  }

  const result = await sendTextMessage({
    to,
    text: "Test MyQuickPOS — les notifications WhatsApp fonctionnent correctement.",
  })

  if (!result) {
    console.error("Failed to send test message.")
    process.exit(1)
  }

  console.log("Message sent successfully.")
  console.log(`  msgId:  ${result.msgId}`)
  console.log(`  jid:    ${result.jid}`)
  console.log(`  status: ${result.status}`)
}

main().catch((error) => {
  console.error("WhatsApp test failed:")
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
