import { Suspense } from "react"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot Password - MyQuickPOS",
  description: "Reset your MyQuickPOS account password",
}

export default async function ForgotPasswordPage() {
  const tenants = await tenantRepository.findAll()

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
        <ForgotPasswordForm tenants={tenants} />
      </Suspense>
    </main>
  )
}
