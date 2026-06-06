"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Monitor, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toTitleCase } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { signIn, getSession } from "next-auth/react"
import {
  firstAllowedAdminRoute,
  hasPermission,
  sessionPermissionsFromUser,
} from "@/lib/permissions"
import {
  clearRememberedLogin,
  loadRememberedLogin,
  saveRememberedLogin,
} from "@/lib/remember-login"
import { releaseUiLock } from "@/lib/release-ui-lock"

type LoginFormProps = {
  tenants: { slug: string; name: string }[]
}

function resolveTenantSlug(
  tenants: { slug: string; name: string }[],
  slugFromUrl: string | null,
  rememberedSlug?: string | null
) {
  if (slugFromUrl && tenants.some((t) => t.slug === slugFromUrl)) return slugFromUrl
  if (rememberedSlug && tenants.some((t) => t.slug === rememberedSlug)) return rememberedSlug
  return tenants[0]?.slug ?? ""
}

export function LoginForm({ tenants }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [tenantSlug, setTenantSlug] = useState(() =>
    resolveTenantSlug(
      tenants,
      searchParams.get("tenantSlug"),
      loadRememberedLogin()?.tenantSlug
    )
  )
  const [tenantSelectOpen, setTenantSelectOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const remembered = loadRememberedLogin()
    if (remembered) {
      setEmail(remembered.email)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    const remembered = loadRememberedLogin()
    const urlSlug = searchParams.get("tenantSlug")
    const slug = resolveTenantSlug(tenants, urlSlug, remembered?.tenantSlug)

    if (slug) {
      setTenantSlug(slug)
    }

    const hasValidUrlSlug = Boolean(
      urlSlug && tenants.some((t) => t.slug === urlSlug)
    )
    if (slug && !hasValidUrlSlug) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tenantSlug", slug)
      router.replace(`/login?${params.toString()}`, { scroll: false })
    }
  }, [searchParams, tenants, router])

  function handleTenantChange(slug: string) {
    setTenantSlug(slug)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tenantSlug", slug)
    router.replace(`/login?${params.toString()}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug,
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
      })

        if (result?.error) {
        setError("Invalid email or password.")
        setIsLoading(false)
        return
      }

      if (rememberMe) {
        saveRememberedLogin(email, tenantSlug)
      } else {
        clearRememberedLogin()
      }

      setTenantSelectOpen(false)
      releaseUiLock()

      const session = await getSession()
      const user = session?.user as { role?: string; permissions?: string[] } | undefined
      const permissions = sessionPermissionsFromUser(user ?? {})
      let target = callbackUrl

      if (!searchParams.get("callbackUrl")) {
        if (user?.role === "CASHIER") {
          target = "/pos"
        } else if (user?.role === "SERVER") {
          target = firstAllowedAdminRoute(permissions) ?? "/admin/tablet"
        } else if (!permissions.some((p) => p.startsWith("admin.")) && hasPermission(permissions, "pos.access")) {
          target = "/pos"
        } else {
          target = firstAllowedAdminRoute(permissions) ?? "/admin"
        }
      }

      router.push(target)
      router.refresh()
    } catch (err) {
      console.error("[Login error]", err)
      const message = err instanceof Error ? err.message : "An error occurred. Please try again."
      setError(process.env.NODE_ENV === "development" ? message : "An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-12 lg:px-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Monitor className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              MyQuickPOS
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {tenants.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenant" className="text-foreground">
                Tenant
              </Label>
              <Select
                modal={false}
                open={tenantSelectOpen}
                onOpenChange={setTenantSelectOpen}
                value={tenantSlug}
                onValueChange={handleTenantChange}
              >
                <SelectTrigger
                  id="tenant"
                  className="h-11 bg-card text-card-foreground"
                >
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.slug} value={tenant.slug}>
                      {toTitleCase(tenant.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@myquickpos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 bg-card text-card-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 pr-10 bg-card text-card-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) =>
                setRememberMe(checked as boolean)
              }
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal text-muted-foreground cursor-pointer"
            >
              Remember me for 30 days
            </Label>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full text-sm font-semibold"
            disabled={isLoading || !tenantSlug}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Footer text */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {"Vous n'avez pas de compte ? "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
