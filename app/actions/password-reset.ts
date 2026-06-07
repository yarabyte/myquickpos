"use server"

import { z } from "zod"
import { getResetPasswordUrl } from "@/lib/app-url"
import { sendPasswordResetEmail } from "@/lib/email/send-account-emails"
import { isEmailConfigured } from "@/lib/email/mailer"
import { passwordResetRepository } from "@/lib/repositories/password-reset.repository"
import { tenantRepository } from "@/lib/repositories/tenant.repository"
import { userRepository } from "@/lib/repositories/user.repository"

export type PasswordResetResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

const requestSchema = z.object({
  email: z.string().email("Invalid email"),
  tenantSlug: z.string().min(1, "Choose an establishment"),
})

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function requestPasswordReset(input: {
  email: string
  tenantSlug: string
}): Promise<PasswordResetResult> {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }
  }

  if (!isEmailConfigured()) {
    return {
      ok: false,
      error: "Email is not configured on this server. Contact your administrator.",
    }
  }

  const email = parsed.data.email.trim().toLowerCase()
  const tenant = await tenantRepository.findBySlug(parsed.data.tenantSlug)
  if (!tenant) {
    return {
      ok: true,
      message: "If an account exists for this email, a reset link has been sent.",
    }
  }

  const user = await userRepository.findByEmail(email, tenant.id)
  if (!user || user.status !== "active") {
    return {
      ok: true,
      message: "If an account exists for this email, a reset link has been sent.",
    }
  }

  try {
    const token = await passwordResetRepository.createForUser(user.id, tenant.id)
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: getResetPasswordUrl(token),
    })
  } catch (e) {
    console.error("[password-reset] send failed:", e)
    return { ok: false, error: "Could not send reset email. Please try again later." }
  }

  return {
    ok: true,
    message: "If an account exists for this email, a reset link has been sent.",
  }
}

export async function resetPassword(input: {
  token: string
  password: string
}): Promise<PasswordResetResult> {
  const parsed = resetSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }
  }

  const record = await passwordResetRepository.findValidToken(parsed.data.token)
  if (!record) {
    return { ok: false, error: "This reset link is invalid or has expired." }
  }

  try {
    await userRepository.update(
      record.userId,
      { password: parsed.data.password },
      record.tenantId
    )
    await passwordResetRepository.deleteToken(parsed.data.token)
  } catch (e) {
    console.error("[password-reset] update failed:", e)
    return { ok: false, error: "Could not reset password. Please try again." }
  }

  return { ok: true, message: "Your password has been updated. You can sign in now." }
}

export async function validateResetToken(token: string): Promise<boolean> {
  if (!token) return false
  const record = await passwordResetRepository.findValidToken(token)
  return Boolean(record)
}
