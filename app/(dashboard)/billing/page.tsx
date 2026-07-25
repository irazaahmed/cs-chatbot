import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { generateInvoiceRef } from "@/lib/billing/invoice";
import { getPaymentInstructions, planPricePKR } from "@/lib/billing/instructions";
import { saveProofFile } from "@/lib/billing/proof-storage";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_PILLS: Record<string, { label: string; className: string }> = {
  trialing: {
    label: "Trial",
    className: "border-border bg-surface/60 text-muted",
  },
  active: {
    label: "Active",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  past_due: {
    label: "Past due",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  },
  suspended: {
    label: "Suspended",
    className: "border-red-400/30 bg-red-400/10 text-red-300",
  },
  canceled: {
    label: "Canceled",
    className: "border-red-400/30 bg-red-400/10 text-red-300",
  },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { error } = await searchParams;

  const pendingPayment = await prisma.payment.findFirst({
    where: { tenantId: tenant.id, status: "submitted" },
    orderBy: { periodStart: "desc" },
  });

  const instructions = getPaymentInstructions();
  const price = planPricePKR(tenant.planId);
  const invoiceRef = pendingPayment ? pendingPayment.invoiceRef : await generateInvoiceRef();

  async function submitPayment(formData: FormData) {
    "use server";
    const { tenant } = await getCurrentTenant();

    const alreadyPending = await prisma.payment.findFirst({
      where: { tenantId: tenant.id, status: "submitted" },
    });
    if (alreadyPending) redirect("/billing");

    const senderName = String(formData.get("senderName") ?? "").trim().slice(0, 200);
    const amountPKR = Math.round(Number(formData.get("amountPKR")));
    const method = String(formData.get("method") ?? "bank");
    const invoiceRefValue = String(formData.get("invoiceRef") ?? "").trim();
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
          amountPKR,
          method,
          senderName,
          proofUrl: proofFilename,
          status: "submitted",
          periodStart: now,
          periodEnd: new Date(now.getTime() + 30 * DAY_MS),
        },
      });
    } catch {
      redirect("/billing?error=3");
    }

    // CLAUDE.md section 9: "the tenant gets a 3-day provisional extension
    // immediately. Approval must never block access." Extending periodEnd
    // is enough — the status ladder (lib/billing/ladder.ts) reads periodEnd,
    // so this alone keeps them from being demoted during the review window.
    const base = tenant.periodEnd && tenant.periodEnd > now ? tenant.periodEnd : now;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { periodEnd: new Date(base.getTime() + 3 * DAY_MS) },
    });

    revalidatePath("/billing");
    redirect("/billing");
  }

  const statusPill = STATUS_PILLS[tenant.status] ?? {
    label: tenant.status,
    className: "border-border bg-surface/60 text-muted",
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Billing</h1>

      <div className="glass mt-5 rounded-2xl p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Status</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${statusPill.className}`}
          >
            {statusPill.label}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">Plan</span>
          <span className="font-medium capitalize">{tenant.planId}</span>
        </div>
        {tenant.periodEnd && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Current period ends</span>
            <span className="font-medium tabular-nums">
              {tenant.periodEnd.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {pendingPayment ? (
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-200">
          Payment <span className="font-mono">{pendingPayment.invoiceRef}</span> submitted and awaiting
          approval. Your access is already extended while we review it — no action needed.
        </div>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300">
              {error === "2"
                ? "That file couldn't be saved — use a JPEG, PNG, or WEBP under 5MB."
                : error === "3"
                  ? "That invoice reference was already used. Refresh the page and try again."
                  : "Please fill in all fields and attach a screenshot."}
            </p>
          )}

          <div className="glass mt-6 rounded-3xl p-7">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Pay Rs. {price.toLocaleString()} for the {tenant.planId} plan
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Put this reference in your transaction remarks:{" "}
              <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-sm font-medium text-accent-bright">
                {invoiceRef}
              </span>
            </p>

            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between rounded-xl bg-surface/60 px-4 py-2.5">
                <dt className="text-muted">JazzCash</dt>
                <dd className="font-medium tabular-nums">{instructions.jazzCash}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-surface/60 px-4 py-2.5">
                <dt className="text-muted">EasyPaisa</dt>
                <dd className="font-medium tabular-nums">{instructions.easyPaisa}</dd>
              </div>
              <div className="flex justify-between gap-6 rounded-xl bg-surface/60 px-4 py-2.5">
                <dt className="text-muted">Bank</dt>
                <dd className="text-right font-medium">
                  {instructions.bankName}
                  <br />
                  {instructions.bankAccountTitle} — {instructions.bankAccountNumber}
                  <br />
                  <span className="tabular-nums">{instructions.bankIban}</span>
                </dd>
              </div>
            </dl>

            <form action={submitPayment} className="mt-6 space-y-4 border-t border-border pt-5">
              <input type="hidden" name="invoiceRef" value={invoiceRef} />

              <div>
                <label className="block text-sm font-medium">Paid via</label>
                <select
                  name="method"
                  className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none"
                >
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Sender name</label>
                <input name="senderName" required className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium">Amount paid (PKR)</label>
                <input
                  name="amountPKR"
                  type="number"
                  min="1"
                  defaultValue={price}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Payment screenshot</label>
                <input
                  name="screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="mt-1.5 w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-bright hover:file:bg-accent/25"
                />
              </div>

              <button
                type="submit"
                className="btn-sheen rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]"
              >
                Submit payment
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
