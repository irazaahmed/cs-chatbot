"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { saveProofFile } from "@/lib/billing/proof-storage";
import { isPlanId, isBillingCycle, cycleMonths, addMonths } from "@/lib/billing/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function submitPayment(formData: FormData) {
  const { tenant } = await getCurrentTenant();

  const alreadyPending = await prisma.payment.findFirst({
    where: { tenantId: tenant.id, status: "submitted" },
  });
  if (alreadyPending) redirect("/billing");

  const senderName = String(formData.get("senderName") ?? "").trim().slice(0, 200);
  const amountPKR = Math.round(Number(formData.get("amountPKR")));
  const method = String(formData.get("method") ?? "bank");
  const invoiceRefValue = String(formData.get("invoiceRef") ?? "").trim();
  const planIdRaw = String(formData.get("planId") ?? "");
  const planId = isPlanId(planIdRaw) ? planIdRaw : "starter";
  const cycleRaw = String(formData.get("billingCycle") ?? "");
  const billingCycle = isBillingCycle(cycleRaw) ? cycleRaw : "monthly";
  const file = formData.get("screenshot") as File | null;

  if (!senderName || !invoiceRefValue || !Number.isFinite(amountPKR) || amountPKR <= 0 || !file || file.size === 0) {
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
  // the payment against the real bank statement — see approvePayment.
  const base = tenant.periodEnd && tenant.periodEnd > now ? tenant.periodEnd : now;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { periodEnd: new Date(base.getTime() + 3 * DAY_MS) },
  });

  revalidatePath("/billing");
  redirect("/billing");
}
