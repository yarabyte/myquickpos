/** Public app domain (production). Tenant subdomains use `{slug}.myquickpos.app`. */
export const APP_DOMAIN = "myquickpos.app"

/** Canonical production URL. Prefer AUTH_URL when set (local or deployed). */
export function getAppUrl(): string {
  const fromEnv = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  if (fromEnv?.startsWith("http")) return fromEnv.replace(/\/$/, "")
  return `https://${APP_DOMAIN}`
}

export function getLoginUrl(tenantSlug?: string): string {
  const base = getAppUrl()
  if (!tenantSlug) return `${base}/login`
  return `${base}/login?tenantSlug=${encodeURIComponent(tenantSlug)}`
}

export function getResetPasswordUrl(token: string): string {
  return `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`
}
