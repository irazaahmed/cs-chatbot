"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { saveProofFile } from "@/lib/billing/proof-storage";
import { isPlanId, isBillingCycle, cycleMonths, addMonths, planPrice, whatsappAddonPrice } from "@/lib/billing/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

/** One combined payment covering either a website plan (with an optional
 * WhatsApp add-on bundled into the same checkout), or WhatsApp on its own
 * for a tenant who doesn't want a website plan at all. mode="whatsapp_only"
 * skips the plan portion entirely: no planId is purchased, only
 * whatsappPeriodEnd moves. The WhatsApp side of this only has any effect if
 * tenant.whatsappEnabled is true (admin allowlist, see schema.prisma),
 * re-checked server-side, never trusted from the client. */
export async function submitPayment(formData: FormData) {
  const { tenant } = await getCurrentTenant();

  const alreadyPending = await prisma.payment.findFirst({
    where: { tenantId: tenant.id, status: "submitted" },
  });
  if (alreadyPending) redirect("/billing");

  const senderName = String(formData.get("senderName") ?? "").trim().slice(0, 200);
  const method = String(formData.get("method") ?? "bank");
  const invoiceRefValue = String(formData.get("invoiceRef") ?? "").trim();
  const cycleRaw = String(formData.get("billingCycle") ?? "");
  const billingCycle = isBillingCycle(cycleRaw) ? cycleRaw : "monthly";
  const file = formData.get("screenshot") as File | null;

  const whatsappOnly = tenant.whatsappEnabled && String(formData.get("mode") ?? "") === "whatsapp_only";
  const planIdRaw = String(formData.get("planId") ?? "");
  const planId = isPlanId(planIdRaw) ? planIdRaw : "starter";
  const includeWhatsapp =
    !whatsappOnly && tenant.whatsappEnabled && String(formData.get("includeWhatsapp") ?? "") === "on";

  // The amount is never taken from the client. It's the listed price for
  // the chosen plan+cycle (plus the WhatsApp add-on if selected and allowed),
  // full stop. A visitor typing an arbitrary number into the amount field
  // must never end up on the invoice. The bundle rate applies whenever a
  // plan is part of this same payment, or the tenant already has one active.
  const hasWebsitePlan = !whatsappOnly || tenant.status === "active";
  const amountPKR = whatsappOnly
    ? whatsappAddonPrice(billingCycle, hasWebsitePlan)
    : planPrice(planId, billingCycle) + (includeWhatsapp ? whatsappAddonPrice(billingCycle, true) : 0);

  if (!senderName || !invoiceRefValue || !file || file.size === 0) {
    redirect("/billing?error=1");
  }

  const paymentId = randomUUID();
  let proofFilename: string;
  try {
    proofFilename = await saveProofFile(paymentId, file);
  } catch {
    redirect("/billing?error=2");
  }

  const now = new Date();
  try {
    await prisma.payment.create({
      data: {
        id: paymentId,
        tenantId: tenant.id,
        invoiceRef: invoiceRefValue,
        planId,
        billingCycle,
        addon: whatsappOnly ? "whatsapp" : includeWhatsapp ? "bundle" : null,
        amountPKR,
        method,
        senderName,
        proofUrl: proofFilename,
        status: "submitted",
        periodStart: now,
        // The purchased period the payment covers (informational until an admin
        // approves) — one/three/twelve months depending on the chosen cycle.
        periodEnd: addMonths(now, cycleMonths(billingCycle)),
      },
    });
  } catch {
    redirect("/billing?error=3");
  }

  // CLAUDE.md section 9: "the tenant gets a 3-day provisional extension
  // immediately. Approval must never block access." Extending periodEnd
  // is enough — the status ladder (lib/billing/ladder.ts) reads periodEnd,
  // so this alone keeps them from being demoted during the review window.
  // The plan itself (page/message caps) only changes once an admin verifies
  // the payment against the real bank statement — see approvePayment. Same
  // policy applies to whatsappPeriodEnd when the add-on was included, or is
  // the only thing being paid for.
  const tenantUpdate: { periodEnd?: Date; whatsappPeriodEnd?: Date } = {};
  if (!whatsappOnly) {
    const base = tenant.periodEnd && tenant.periodEnd > now ? tenant.periodEnd : now;
    tenantUpdate.periodEnd = new Date(base.getTime() + 3 * DAY_MS);
  }
  if (whatsappOnly || includeWhatsapp) {
    const waBase = tenant.whatsappPeriodEnd && tenant.whatsappPeriodEnd > now ? tenant.whatsappPeriodEnd : now;
    tenantUpdate.whatsappPeriodEnd = new Date(waBase.getTime() + 3 * DAY_MS);
  }
  await prisma.tenant.update({ where: { id: tenant.id }, data: tenantUpdate });

  revalidatePath("/billing");
  redirect("/billing");
}
