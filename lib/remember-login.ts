const REMEMBER_KEY = "myquickpos-remember-login"
const REMEMBER_DAYS = 30

export type RememberedLogin = {
  email: string
  tenantSlug: string
  expiresAt: number
}

export function saveRememberedLogin(email: string, tenantSlug: string) {
  const data: RememberedLogin = {
    email,
    tenantSlug,
    expiresAt: Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(data))
}

export function loadRememberedLogin(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RememberedLogin
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(REMEMBER_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearRememberedLogin() {
  localStorage.removeItem(REMEMBER_KEY)
}
