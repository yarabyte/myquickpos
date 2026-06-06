const RECEIPT_PRINT_STYLES = `
  @page {
    margin: 0;
  }
  * {
    box-sizing: border-box;
  }
  body, body * {
    color: #000 !important;
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  .receipt-thermal-pro {
    width: var(--receipt-paper-width, 80mm);
    padding: var(--receipt-padding, 4mm 3mm);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    line-height: 1.4;
    font-size: 13px;
    word-wrap: break-word;
  }
  .receipt-thermal-pro[data-paper-width="58mm"] {
    --receipt-paper-width: 58mm;
    --receipt-padding: 3mm 2mm;
    font-size: 12px;
  }
  .receipt-thermal-pro[data-paper-width="80mm"] {
    --receipt-paper-width: 80mm;
    --receipt-padding: 4mm 3mm;
    font-size: 13px;
  }
  .receipt-preview p { margin: 0.1em 0; line-height: 1.35; }
  .receipt-preview h2 { font-size: 1.15em; font-weight: 700; margin: 0.15em 0; }
  .receipt-preview h3 { font-size: 1.08em; font-weight: 600; margin: 0.1em 0; }
  .receipt-preview img { max-width: 60%; height: auto; margin: 0.2em auto; display: block; }
  .receipt-line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.15em 0.5em;
    align-items: baseline;
  }
  .receipt-line .receipt-col-qty { text-align: center; white-space: nowrap; }
  .receipt-line .receipt-col-amount { text-align: right; white-space: nowrap; }
  .receipt-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5em;
  }
  .receipt-row > :last-child { text-align: right; white-space: nowrap; flex-shrink: 0; }
  .receipt-separator { border: none; border-top: 1px solid #000; margin: 0.5em 0; }
  .receipt-separator-thick { border: none; border-top: 2px solid #000; margin: 0.5em 0; }
  .receipt-separator-dashed { border: none; border-top: 1px dashed #000; margin: 0.5em 0; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .uppercase { text-transform: uppercase; }
  .mb-2 { margin-bottom: 0.5em; }
  .space-y-0\\.5 > * + * { margin-top: 0.125em; }
  .receipt-no-print { display: none !important; }
`

/** Print receipt via isolated iframe — avoids dialog overlay, clip-path and gray dithering on thermal printers. */
export function printReceiptElement(element: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const paperWidth = element.getAttribute("data-paper-width") ?? "80mm"
    const pageStyles = `${RECEIPT_PRINT_STYLES}\n@page { margin: 0; size: ${paperWidth} auto; }\nbody { background: #fff !important; }\n.receipt-thermal-pro { background: #fff !important; }`
    const clone = element.cloneNode(true) as HTMLElement
    clone.classList.remove("shadow-lg", "animate-receipt-print")
    clone.querySelectorAll(".receipt-no-print").forEach((node) => node.remove())

    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;"
    document.body.appendChild(iframe)

    const win = iframe.contentWindow
    const doc = iframe.contentDocument
    if (!win || !doc) {
      document.body.removeChild(iframe)
      reject(new Error("Print iframe unavailable"))
      return
    }

    doc.open()
    doc.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Receipt</title>
  <style>${pageStyles}</style>
</head>
<body>${clone.outerHTML}</body>
</html>`)
    doc.close()

    const cleanup = () => {
      window.removeEventListener("focus", onFocus)
      if (iframe.parentNode) document.body.removeChild(iframe)
      resolve()
    }

    const onFocus = () => {
      setTimeout(cleanup, 300)
    }

    win.onafterprint = cleanup
    window.addEventListener("focus", onFocus)

    setTimeout(() => {
      try {
        win.focus()
        win.print()
      } catch (err) {
        cleanup()
        reject(err)
      }
    }, 250)
  })
}
