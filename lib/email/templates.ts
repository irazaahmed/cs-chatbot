import { site, cybrum } from "@/lib/site";

// Hand-written inline-CSS, table-based HTML — same technique proven in
// cybrum-solutions/src/lib/leads.ts (no MJML/React Email dependency). Each
// builder below fills the content slot of the shared shell with CS
// Chatbot's own brand instead of Cybrum Solutions'.

const ACCENT = "#1e88e8";
const INK = "#0B0E14";
const LOGO_URL = `${site.url}/icon.png`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared header/footer shell. `previewText` is the hidden preheader shown in
 *  inbox lists (Gmail/Outlook) before the email is opened. */
function emailShell(bodyHtml: string, previewText: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${site.shortName}</title>
<style>
  body { margin:0; padding:0; background:#eef1f7; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  .btn { display:inline-block; color:#ffffff !important; font-size:14px; font-weight:600; padding:13px 26px; border-radius:10px; }
  @media only screen and (max-width:480px) {
    .px { padding:24px 20px !important; }
    .hpx { padding:26px 20px !important; }
    .h1 { font-size:19px !important; }
    .btn { display:block !important; width:100% !important; box-sizing:border-box; text-align:center; }
  }
</style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;">
    <tr>
      <td align="center" style="padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6e9f0;">
          <tr>
            <td class="hpx" style="background:${INK};padding:26px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${LOGO_URL}" width="40" height="40" alt="${site.shortName}" style="display:block;border:0;outline:none;text-decoration:none;width:40px;height:40px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:0.3px;">${site.shortName}</div>
                    <div style="color:#8a93a6;font-size:12px;margin-top:4px;">by Cybrum Solutions</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f7f9fc;padding:16px 32px;border-top:1px solid #e6e9f0;">
              <div style="color:#9aa3b2;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
                You're receiving this because you have an account on ${site.shortName}.
                Reply to this email and it'll reach the team.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(tenantName: string): string {
  return `<p class="h1" style="color:${INK};font-size:18px;font-weight:700;margin:0 0 16px;">Hi ${escapeHtml(tenantName)},</p>`;
}

function paragraph(text: string): string {
  return `<p style="color:#3a4252;font-size:15px;line-height:1.6;margin:0 0 16px;">${text}</p>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;"><tr><td><a class="btn" href="${href}" style="background:${ACCENT};">${escapeHtml(label)}</a></td></tr></table>`;
}

export function welcomeEmailHtml(tenantName: string, trialDays: number): string {
  const body = `
    ${greeting(tenantName)}
    ${paragraph(`Welcome to ${site.shortName}! Your account is live and your ${trialDays}-day free trial has started.`)}
    ${paragraph("Next step: install the widget on your website and start feeding it your content so it can answer questions about your business, 24/7. You can also turn on the WhatsApp channel any time, so the same AI answers on your own WhatsApp number too.")}
    ${button("Go to your dashboard", `${site.url}/install`)}
  `;
  return emailShell(body, `Your ${site.shortName} trial has started`);
}

export function trialEndedEmailHtml(tenantName: string): string {
  const body = `
    ${greeting(tenantName)}
    ${paragraph("Your free trial has ended, so your chatbot is temporarily paused on your website.")}
    ${paragraph("Pick a plan and submit a payment to pick up right where you left off — nothing is lost, your knowledge base and settings are all still there.")}
    ${button("View plans & pay", `${site.url}/billing`)}
  `;
  return emailShell(body, "Your trial has ended — pick a plan to keep your chatbot live");
}

export function paymentSubmittedEmailHtml(tenantName: string, invoiceRef: string, amountPKR: number): string {
  const body = `
    ${greeting(tenantName)}
    ${paragraph(`We've received your payment submission for <strong>${escapeHtml(invoiceRef)}</strong> (Rs. ${amountPKR.toLocaleString("en-PK")}).`)}
    ${paragraph("Your account has already been extended so your chatbot keeps working while we verify it against our bank statement — usually within a day. You'll get another email as soon as it's approved.")}
  `;
  return emailShell(body, `Payment received for ${invoiceRef} — verifying now`);
}

export function paymentApprovedEmailHtml(tenantName: string, planLabel: string, periodEnd: Date): string {
  const periodEndLabel = periodEnd.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
  const body = `
    ${greeting(tenantName)}
    ${paragraph(`Your payment has been verified and your <strong>${escapeHtml(planLabel)}</strong> plan is now active, through <strong>${periodEndLabel}</strong>.`)}
    ${paragraph("Thanks for being a customer — reach out any time if you need a hand.")}
    ${button("Open your dashboard", `${site.url}/usage`)}
  `;
  return emailShell(body, `Your ${planLabel} plan is active`);
}

export function paymentRejectedEmailHtml(tenantName: string, invoiceRef: string, note?: string): string {
  const noteBlock = note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e6e9f0;border-radius:12px;margin:0 0 20px;"><tr><td style="padding:14px 16px;"><div style="color:#8a93a6;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Note from our team</div><div style="color:#3a4252;font-size:14px;line-height:1.6;">${escapeHtml(note)}</div></td></tr></table>`
    : "";
  const body = `
    ${greeting(tenantName)}
    ${paragraph(`We couldn't verify your payment submission for <strong>${escapeHtml(invoiceRef)}</strong> against our bank statement, so it hasn't been approved.`)}
    ${noteBlock}
    ${paragraph("Please double-check the amount and reference and resubmit, or reply to this email if you think this is a mistake.")}
    ${button("Resubmit payment", `${site.url}/billing`)}
  `;
  return emailShell(body, `Action needed: payment ${invoiceRef} could not be verified`);
}

export function adminPaymentSubmittedEmailHtml(
  tenantName: string,
  invoiceRef: string,
  amountPKR: number,
  method: string
): string {
  const body = `
    <p style="color:${INK};font-size:18px;font-weight:700;margin:0 0 16px;">New payment to review</p>
    ${paragraph(`<strong>${escapeHtml(tenantName)}</strong> submitted a payment of Rs. ${amountPKR.toLocaleString("en-PK")} via ${escapeHtml(method)}, ref <strong>${escapeHtml(invoiceRef)}</strong>.`)}
    ${button("Review in admin", `${site.url}/admin`)}
  `;
  return emailShell(body, `New payment from ${tenantName} — ${invoiceRef}`);
}

// Referenced for reply-to on admin-facing emails, kept alongside the templates
// so notify.ts doesn't need to import lib/site.ts separately just for this.
export const teamInboxAddress = cybrum.email;
