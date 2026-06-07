import { sendMail } from "@/lib/email/mailer"
import {
  accountCreatedEmailHtml,
  accountCreatedEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
  welcomeSignupEmailHtml,
  welcomeSignupEmailText,
} from "@/lib/email/templates/account-emails"
import type { Role } from "@prisma/client"

export async function sendAccountCreatedEmail(input: {
  to: string
  name: string
  email: string
  password: string
  role: Role
  tenantName: string
  tenantSlug: string
}) {
  await sendMail({
    to: input.to,
    subject: "Your MyQuickPOS account",
    html: accountCreatedEmailHtml(input),
    text: accountCreatedEmailText(input),
  })
}

export async function sendWelcomeSignupEmail(input: {
  to: string
  name: string
  email: string
  tenantName: string
  tenantSlug: string
}) {
  await sendMail({
    to: input.to,
    subject: "Welcome to MyQuickPOS",
    html: welcomeSignupEmailHtml(input),
    text: welcomeSignupEmailText(input),
  })
}

export async function sendPasswordResetEmail(input: {
  to: string
  name: string
  resetUrl: string
}) {
  await sendMail({
    to: input.to,
    subject: "Reset your MyQuickPOS password",
    html: passwordResetEmailHtml(input),
    text: passwordResetEmailText(input),
  })
}
