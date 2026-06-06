import { Suspense } from "react"
import { LoginCover } from "@/components/auth/login-cover"
import { LoginForm } from "@/components/auth/login-form"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In - MyQuickPOS",
  description: "Sign in to your MyQuickPOS admin dashboard",
}

export default async function LoginPage() {
  const tenants = await tenantRepository.findAll()

  return (
    <main className="flex min-h-screen">
      <div className="hidden lg:block lg:w-1/2">
        <LoginCover />
      </div>
      <div className="w-full bg-background lg:w-1/2">
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
          <LoginForm tenants={tenants} />
        </Suspense>
      </div>
    </main>
  )
}
