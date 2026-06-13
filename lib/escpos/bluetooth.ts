/**
 * Web Bluetooth (BLE / GATT) transport for ESC/POS thermal printers.
 *
 * IMPORTANT: Web Bluetooth only speaks BLE, NOT Bluetooth Classic SPP.
 * If the PM-MLP80 is reachable, it exposes a GATT service with a writable
 * characteristic. We probe a list of known printer service UUIDs and, as a
 * fallback, scan every service for any writable characteristic.
 *
 * Supported on Chrome / Edge for Android, ChromeOS, macOS, Windows, Linux.
 * NOT supported on iOS Safari (Apple blocks Web Bluetooth) and requires HTTPS.
 */

// Common BLE service UUIDs found on cheap ESC/POS thermal printers
// (16-bit shorthand for ffe0/18f0/... plus a few 128-bit vendor UUIDs).
const KNOWN_SERVICE_UUIDS: BluetoothServiceUUID[] = [
  0xffe0,
  0x18f0,
  0xff00,
  0xfee7,
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / Microchip transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // some Goojprt/Zjiang printers
]

export type ConnectionState = "disconnected" | "connecting" | "connected"

interface PrinterTransport {
  device: BluetoothDevice
  characteristic: BluetoothRemoteGATTCharacteristic
  /** Max payload per write; BLE MTU is small on cheap printers. */
  chunkSize: number
  withoutResponse: boolean
}

let transport: PrinterTransport | null = null
const listeners = new Set<(s: ConnectionState) => void>()
let state: ConnectionState = "disconnected"

function setState(s: ConnectionState) {
  state = s
  listeners.forEach((l) => l(s))
}

export function getConnectionState(): ConnectionState {
  return state
}

export function subscribeConnection(l: (s: ConnectionState) => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as Navigator).bluetooth
}

export function getDeviceName(): string | null {
  return transport?.device.name ?? null
}

/** Pick the first writable characteristic across all services of a connected GATT server. */
async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServer
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  let services: BluetoothRemoteGATTService[] = []
  try {
    services = await server.getPrimaryServices()
  } catch {
    // Fall back to probing known services individually.
    for (const uuid of KNOWN_SERVICE_UUIDS) {
      try {
        services.push(await server.getPrimaryService(uuid))
      } catch {
        /* not present */
      }
    }
  }

  for (const service of services) {
    let chars: BluetoothRemoteGATTCharacteristic[] = []
    try {
      chars = await service.getCharacteristics()
    } catch {
      continue
    }
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c
    }
  }
  return null
}

/** Prompt the user to pick a printer and open a GATT connection. Must be called from a user gesture. */
export async function connectPrinter(): Promise<void> {
  if (!isWebBluetoothAvailable()) {
    throw new Error(
      "Web Bluetooth indisponible. Utilisez Chrome/Edge sur Android, ChromeOS ou desktop, en HTTPS. (iOS non supporté.)"
    )
  }

  setState("connecting")
  try {
    const device = await (navigator as Navigator).bluetooth!.requestDevice({
      // acceptAllDevices lets the user pick any printer; we still declare known
      // services so their characteristics are accessible after connecting.
      acceptAllDevices: true,
      optionalServices: KNOWN_SERVICE_UUIDS,
    })

    device.addEventListener("gattserverdisconnected", () => {
      transport = null
      setState("disconnected")
    })

    const server = await device.gatt!.connect()
    const characteristic = await findWritableCharacteristic(server)
    if (!characteristic) {
      server.disconnect()
      throw new Error(
        "Aucune caractéristique inscriptible trouvée. L'imprimante est probablement en Bluetooth Classic (SPP) uniquement — Web Bluetooth ne peut pas l'utiliser."
      )
    }

    transport = {
      device,
      characteristic,
      chunkSize: 180,
      withoutResponse: characteristic.properties.writeWithoutResponse,
    }
    setState("connected")
  } catch (err) {
    setState("disconnected")
    throw err
  }
}

export function disconnectPrinter() {
  try {
    transport?.device.gatt?.disconnect()
  } finally {
    transport = null
    setState("disconnected")
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** Send raw ESC/POS bytes to the connected printer, chunked to fit the BLE MTU. */
export async function printBytes(data: Uint8Array): Promise<void> {
  if (!transport) throw new Error("Imprimante non connectée.")
  const { characteristic, chunkSize, withoutResponse } = transport

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.subarray(offset, offset + chunkSize)
    if (withoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
      // Cheap printers overflow without a small breather between chunks.
      await delay(20)
    } else {
      await characteristic.writeValueWithResponse(chunk)
    }
  }
}
