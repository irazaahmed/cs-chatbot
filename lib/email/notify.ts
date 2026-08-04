import { sendEmail } from "@/lib/email/provider";
import {
  welcomeEmailHtml,
  trialEndedEmailHtml,
  paymentSubmittedEmailHtml,
  paymentApprovedEmailHtml,
  paymentRejectedEmailHtml,
  adminPaymentSubmittedEmailHtml,
  teamInboxAddress,
} from "@/lib/email/templates";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { site } from "@/lib/site";

// High-level, best-effort notification functions — one per lifecycle event.
// Every function swallows its own errors so a bad template or an unconfigured
// RESEND_API_KEY can never break the signup/payment flow that triggered it
// (same principle as CLAUDE.md rule #4 for the widget). Callers don't need
// their own try/catch around these.

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function sendWelcomeEmail(to: string, tenantName: string): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: `Welcome to ${site.shortName} — your trial has started`,
      html: welcomeEmailHtml(tenantName, TRIAL_DAYS),
    });
  } catch {
    // best-effort, ignore
  }
}

export async function sendTrialEndedEmail(to: string, tenantName: string): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: `Your ${site.shortName} trial has ended`,
      html: trialEndedEmailHtml(tenantName),
    });
  } catch {
    // best-effort, ignore
  }
}

export async function sendPaymentSubmittedEmail(
  to: string,
  tenantName: string,
  invoiceRef: string,
  amountPKR: number
): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: `Payment received — ${invoiceRef}`,
      html: paymentSubmittedEmailHtml(tenantName, invoiceRef, amountPKR),
    });
  } catch {
    // best-effort, ignore
  }
}

export async function sendAdminPaymentSubmittedEmail(
  tenantName: string,
  invoiceRef: string,
  amountPKR: number,
  method: string
): Promise<void> {
  const recipients = adminEmails();
  if (recipients.length === 0) return;
  try {
    await Promise.all(
      recipients.map((to) =>
        sendEmail({
          to,
          subject: `New payment to review — ${tenantName}`,
          html: adminPaymentSubmittedEmailHtml(tenantName, invoiceRef, amountPKR, method),
        })
      )
    );
  } catch {
    // best-effort, ignore
  }
}

export async function sendPaymentApprovedEmail(
  to: string,
  tenantName: string,
  planLabel: string,
  periodEnd: Date
): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: `Your ${site.shortName} plan is active`,
      html: paymentApprovedEmailHtml(tenantName, planLabel, periodEnd),
    });
  } catch {
    // best-effort, ignore
  }
}

export async function sendPaymentRejectedEmail(
  to: string,
  tenantName: string,
  invoiceRef: string,
  note?: string
): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: `Action needed — payment ${invoiceRef} could not be verified`,
      html: paymentRejectedEmailHtml(tenantName, invoiceRef, note),
      replyTo: teamInboxAddress,
    });
  } catch {
    // best-effort, ignore
  }
}
