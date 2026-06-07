function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function emailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:32px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 6px;">MyQuickPOS</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${escapeHtml(title)}</p>
      </div>
      <div style="padding:32px 32px 24px;">
        ${bodyHtml}
      </div>
      <div style="border-top:1px solid #e4e4e7;padding:20px 32px;background:#fafafa;">
        <p style="color:#71717a;font-size:12px;line-height:1.5;margin:0;text-align:center;">
          You received this email from MyQuickPOS. If you did not expect it, you can ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function emailButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#16a34a;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
      ${escapeHtml(label)}
    </a>
  </div>`
}

export function emailInfoTable(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (row) => `<tr>
        <td style="color:#71717a;font-size:13px;padding:6px 0;vertical-align:top;width:110px;">${escapeHtml(row.label)}</td>
        <td style="color:#18181b;font-size:13px;font-weight:600;padding:6px 0;">${escapeHtml(row.value)}</td>
      </tr>`
    )
    .join("")

  return `<div style="background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;">
    <p style="color:#71717a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Account details</p>
    <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
  </div>`
}

export { escapeHtml }
