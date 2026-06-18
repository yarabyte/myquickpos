/** Remove legacy service workers that cached Next.js bundles and caused stale chunk errors. */
export async function clearLegacyServiceWorker(): Promise<void> {
  if (typeof window === "undefined") return

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    } catch {
      // ignore — private mode / restricted storage
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    } catch {
      // ignore
    }
  }
}
