"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Monitor, Loader2, ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toTitleCase } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { requestPasswordReset } from "@/app/actions/password-reset"
import { loadRememberedLogin } from "@/lib/remember-login"

type ForgotPasswordFormProps = {
  tenants: { slug: string; name: string }[]
}

export function ForgotPasswordForm({ tenants }: ForgotPasswordFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const remembered = loadRememberedLogin()
    const urlSlug = searchParams.get("tenantSlug")
    const slug =
      (urlSlug && tenants.some((t) => t.slug === urlSlug) ? urlSlug : null) ??
      remembered?.tenantSlug ??
      tenants[0]?.slug ??
      ""
    setTenantSlug(slug)
    if (remembered?.email) setEmail(remembered.email)
  }, [searchParams, tenants])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    const result = await requestPasswordReset({ email, tenantSlug })
    setIsLoading(false)

    if (result.ok) {
      setSuccess(result.message)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 lg:px-12">
      <div className="flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to sign in</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Forgot password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Choose an establishment</Label>
            <Select value={tenantSlug} onValueChange={setTenantSlug} required>
              <SelectTrigger className="h-11 bg-card text-card-foreground">
                <SelectValue placeholder="Select an establishment" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {toTitleCase(t.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="forgot-email" className="text-foreground">
              Email address
            </Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-11 bg-card text-card-foreground"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {success}
            </p>
          )}

          <Button type="submit" className="h-11 w-full" disabled={isLoading || !!success}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send reset link
              </>
            )}
          </Button>

          {success && (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => router.push("/login")}>
              Back to sign in
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
