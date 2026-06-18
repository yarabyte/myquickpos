"use client"

import { useEffect } from "react"
import { clearLegacyServiceWorker } from "@/lib/pwa/clear-legacy-service-worker"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void clearLegacyServiceWorker()
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#0f1117] p-6 text-[#fafafa]">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-[#16181f] p-6 text-center">
          <h1 className="text-lg font-semibold">Unable to load MyQuickPOS</h1>
          <p className="text-sm text-white/70">
            A temporary loading error occurred. This is often fixed by clearing cached
            data and reloading.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                void clearLegacyServiceWorker().finally(() => window.location.reload())
              }}
              className="rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-medium text-white"
            >
              Clear cache &amp; reload
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium"
            >
              Try again
            </button>
          </div>
          <p className="text-xs text-white/50">
            POS: <a href="/login" className="underline">/login</a>
            {" · "}
            Tablet: <a href="/admin/tablet" className="underline">/admin/tablet</a>
          </p>
        </div>
      </body>
    </html>
  )
}
