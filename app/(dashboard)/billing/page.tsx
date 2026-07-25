import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { generateInvoiceRef } from "@/lib/billing/invoice";
import { getPaymentInstructions } from "@/lib/billing/instructions";
import { getPlanOptions } from "@/lib/billing/plans";
import { PlanPicker } from "./_components/plan-picker";

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
  const plans = getPlanOptions();
  const invoiceRef = pendingPayment ? pendingPayment.invoiceRef : await generateInvoiceRef();

  const statusPill = STATUS_PILLS[tenant.status] ?? {
    label: tenant.status,
    className: "border-border bg-surface/60 text-muted",
  };

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

          <PlanPicker
            plans={plans}
            defaultPlanId={tenant.planId}
            invoiceRef={invoiceRef}
            instructions={instructions}
          />
        </>
      )}
    </div>
  );
}
