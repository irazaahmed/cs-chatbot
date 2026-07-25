import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { generateInvoiceRef } from "@/lib/billing/invoice";
import { getPaymentInstructions, planPricePKR } from "@/lib/billing/instructions";
import { saveProofFile } from "@/lib/billing/proof-storage";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  trialing: { label: "Trial", className: "text-zinc-600 dark:text-zinc-400" },
  active: { label: "Active", className: "text-green-600 dark:text-green-400" },
  past_due: { label: "Past due", className: "text-amber-600 dark:text-amber-400" },
  suspended: { label: "Suspended", className: "text-red-600 dark:text-red-400" },
  canceled: { label: "Canceled", className: "text-red-600 dark:text-red-400" },
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

  const statusInfo = STATUS_LABELS[tenant.status] ?? { label: tenant.status, className: "text-zinc-600" };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Billing</h1>

      <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Status</span>
          <span className={`font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Plan</span>
          <span className="font-medium capitalize text-black dark:text-zinc-50">{tenant.planId}</span>
        </div>
        {tenant.periodEnd && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Current period ends</span>
            <span className="font-medium text-black dark:text-zinc-50">
              {tenant.periodEnd.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {pendingPayment ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Payment <span className="font-mono">{pendingPayment.invoiceRef}</span> submitted and awaiting
          approval. Your access is already extended while we review it — no action needed.
        </div>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error === "2"
                ? "That file couldn't be saved — use a JPEG, PNG, or WEBP under 5MB."
                : error === "3"
                  ? "That invoice reference was already used. Refresh the page and try again."
                  : "Please fill in all fields and attach a screenshot."}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="font-medium text-black dark:text-zinc-50">
              Pay Rs. {price.toLocaleString()} for the {tenant.planId} plan
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Put this reference in your transaction remarks:{" "}
              <span className="font-mono font-medium text-black dark:text-zinc-50">{invoiceRef}</span>
            </p>

            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">JazzCash</dt>
                <dd className="text-black dark:text-zinc-50">{instructions.jazzCash}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">EasyPaisa</dt>
                <dd className="text-black dark:text-zinc-50">{instructions.easyPaisa}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">Bank</dt>
                <dd className="text-right text-black dark:text-zinc-50">
                  {instructions.bankName}
                  <br />
                  {instructions.bankAccountTitle} — {instructions.bankAccountNumber}
                  <br />
                  {instructions.bankIban}
                </dd>
              </div>
            </dl>

            <form action={submitPayment} className="mt-6 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <input type="hidden" name="invoiceRef" value={invoiceRef} />

              <div>
                <label className="block text-sm font-medium text-black dark:text-zinc-50">
                  Paid via
                </label>
                <select
                  name="method"
                  className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-zinc-50">
                  Sender name
                </label>
                <input
                  name="senderName"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-zinc-50">
                  Amount paid (PKR)
                </label>
                <input
                  name="amountPKR"
                  type="number"
                  min="1"
                  defaultValue={price}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-zinc-50">
                  Payment screenshot
                </label>
                <input
                  name="screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="mt-1 w-full text-sm text-zinc-600 dark:text-zinc-400"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
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
