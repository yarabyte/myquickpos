import { getLoginUrl } from "@/lib/app-url"
import { emailButton, emailInfoTable, emailLayout, escapeHtml } from "@/lib/email/templates/layout"
import { ROLE_LABELS } from "@/lib/permissions"
import type { Role } from "@prisma/client"

export function accountCreatedEmailHtml(input: {
  name: string
  email: string
  password: string
  role: Role
  tenantName: string
  tenantSlug: string
}): string {
  const loginUrl = getLoginUrl(input.tenantSlug)
  const body = `
    <p style="color:#18181b;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong>${escapeHtml(input.name)}</strong>,
    </p>
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0 0 8px;">
      An account has been created for you at <strong>${escapeHtml(input.tenantName)}</strong> on MyQuickPOS.
      Use the credentials below to sign in.
    </p>
    ${emailInfoTable([
      { label: "Business", value: input.tenantName },
      { label: "Email", value: input.email },
      { label: "Password", value: input.password },
      { label: "Role", value: ROLE_LABELS[input.role] ?? input.role },
    ])}
    ${emailButton(loginUrl, "Sign in")}
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0;">
      For security, change your password after your first login.
    </p>
  `

  return emailLayout("Your MyQuickPOS account", body)
}

export function accountCreatedEmailText(input: {
  name: string
  email: string
  password: string
  role: Role
  tenantName: string
  tenantSlug: string
}): string {
  const loginUrl = getLoginUrl(input.tenantSlug)
  return `Hi ${input.name},

An account has been created for you at ${input.tenantName} on MyQuickPOS.

Email: ${input.email}
Password: ${input.password}
Role: ${ROLE_LABELS[input.role] ?? input.role}

Sign in: ${loginUrl}

For security, change your password after your first login.`
}

export function welcomeSignupEmailHtml(input: {
  name: string
  email: string
  tenantName: string
  tenantSlug: string
}): string {
  const loginUrl = getLoginUrl(input.tenantSlug)
  const body = `
    <p style="color:#18181b;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong>${escapeHtml(input.name)}</strong>,
    </p>
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Welcome to MyQuickPOS! Your business <strong>${escapeHtml(input.tenantName)}</strong> is ready.
      You can sign in to your dashboard to set up terminals, products, and your team.
    </p>
    ${emailInfoTable([
      { label: "Business", value: input.tenantName },
      { label: "Email", value: input.email },
    ])}
    ${emailButton(loginUrl, "Sign in to your dashboard")}
  `

  return emailLayout("Welcome to MyQuickPOS", body)
}

export function welcomeSignupEmailText(input: {
  name: string
  email: string
  tenantName: string
  tenantSlug: string
}): string {
  const loginUrl = getLoginUrl(input.tenantSlug)
  return `Hi ${input.name},

Welcome to MyQuickPOS! Your business ${input.tenantName} is ready.

Email: ${input.email}
Sign in: ${loginUrl}`
}

export function passwordResetEmailHtml(input: {
  name: string
  resetUrl: string
}): string {
  const body = `
    <p style="color:#18181b;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong>${escapeHtml(input.name)}</strong>,
    </p>
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0 0 8px;">
      We received a request to reset your MyQuickPOS password. Click the button below to choose a new password.
      This link expires in 1 hour.
    </p>
    ${emailButton(input.resetUrl, "Reset password")}
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0;">
      If you did not request a password reset, you can safely ignore this email.
    </p>
  `

  return emailLayout("Reset your password", body)
}

export function passwordResetEmailText(input: {
  name: string
  resetUrl: string
}): string {
  return `Hi ${input.name},

Reset your MyQuickPOS password using this link (expires in 1 hour):
${input.resetUrl}

If you did not request this, you can ignore this email.`
}
