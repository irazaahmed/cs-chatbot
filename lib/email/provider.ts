// THE ONLY file in this codebase allowed to call the Resend API. Mirrors the
// single-import-point pattern of lib/ai/provider.ts — everything else calls
// sendEmail(), so swapping providers later never touches call sites.
//
// Plain fetch against the Resend REST API, no SDK dependency — same approach
// already proven in cybrum-solutions/src/lib/leads.ts. cybrumsolutions.dev is
// already domain-verified (SPF/DKIM) in that Resend account, and verification
// is domain-wide, so any @cybrumsolutions.dev from-address works with the same
// RESEND_API_KEY, no extra DNS needed.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailResult = { ok: boolean; error?: string };

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM_ADDRESS ?? "CS Chatbot <chatbot@cybrumsolutions.dev>";
}

/**
 * Best-effort by design: returns {ok:false} instead of throwing when
 * unconfigured or the call fails, so a missing RESEND_API_KEY or a Resend
 * outage can never break the signup/payment flow that triggered the email.
 * Never logs the API key.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "email_not_configured" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [payload.to],
        ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        subject: payload.subject,
        html: payload.html,
      }),
    });
    if (!res.ok) return { ok: false, error: "send_failed" };
    return { ok: true };
  } catch {
    return { ok: false, error: "send_failed" };
  }
}
