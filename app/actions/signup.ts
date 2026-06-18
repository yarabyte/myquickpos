"use server"

import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { userRepository } from "@/lib/repositories/user.repository"
import { sendWelcomeSignupEmail } from "@/lib/email/send-account-emails"
import type { Role } from "@prisma/client"

/** Slugify for server-side validation (must match client logic) */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export async function checkSubdomain(slug: string): Promise<{ available: boolean; error?: string }> {
  const normalized = slugify(slug)
  if (normalized.length < 3) return { available: false, error: "At least 3 characters" }
  if (!tenantRepository.isSlugAvailable(normalized)) return { available: false, error: "Reserved" }
  const taken = await tenantRepository.isSlugTaken(normalized)
  return { available: !taken }
}

export type SignupResult = { ok: true; subdomain: string } | { ok: false; error: string }

export async function signup(data: {
  companyName: string
  subdomain: string
  businessType: string
  currency: string
  fullName: string
  email: string
  password: string
}): Promise<SignupResult> {
  const slug = slugify(data.subdomain)
  if (slug.length < 3) return { ok: false, error: "Subdomain must be at least 3 characters" }
  if (!tenantRepository.isSlugAvailable(slug)) return { ok: false, error: "Subdomain is reserved" }

  const existing = await tenantRepository.findBySlug(slug)
  if (existing) return { ok: false, error: "This subdomain is already taken" }

  const email = data.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Invalid email" }
  if (data.password.length < 8) return { ok: false, error: "Password must be at least 8 characters" }
  if (data.fullName.trim().length === 0) return { ok: false, error: "Name is required" }

  try {
    const tenant = await tenantRepository.create({
      slug,
      name: data.companyName.trim(),
      plan: "free",
      settings: { currency: data.currency || "USD" },
    })

    await userRepository.create(
      {
        email,
        password: data.password,
        name: data.fullName.trim(),
        role: "MANAGER" as Role,
        status: "active",
      },
      tenant.id
    )

    void sendWelcomeSignupEmail({
      to: email,
      name: data.fullName.trim(),
      email,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    }).catch((e) => console.error("[signup] welcome email failed:", e))

    return { ok: true, subdomain: tenant.slug }
  } catch (e) {
    console.error("Signup error:", e)
    return { ok: false, error: "Could not create account. Please try again." }
  }
}
