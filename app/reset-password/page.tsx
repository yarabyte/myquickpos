import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { validateResetToken } from "@/app/actions/password-reset"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset Password - MyQuickPOS",
  description: "Choose a new password for your MyQuickPOS account",
}

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams
  const valid = token ? await validateResetToken(token) : false

  if (!token || !valid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Invalid or expired link</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This password reset link is no longer valid. Request a new one from the sign-in page.
        </p>
        <Button asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
        <ResetPasswordForm token={token} />
      </Suspense>
    </main>
  )
}
