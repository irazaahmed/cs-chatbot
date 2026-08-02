import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { generateInvoiceRef } from "@/lib/billing/invoice";
import { getPaymentInstructions } from "@/lib/billing/instructions";
import { getPlanOptions, whatsappAddonPrice, type BillingCycle } from "@/lib/billing/plans";
import { PlanPicker } from "./_components/plan-picker";

const STATUS_PILLS: Record<string, { label: string; className: string }> = {
  inactive: {
    label: "Not connected",
    className: "border-border bg-surface/60 text-muted",
  },
  trialing: {
    label: "Trial",
    className: "border-border bg-surface/60 text-muted",
  },
  active: {
    label: "Active",
    className: "border-emerald-400/30 bg-emerald-400/10 text-success-text",
  },
  past_due: {
    label: "Past due",
    className: "border-amber-400/30 bg-amber-400/10 text-warning-text",
  },
  suspended: {
    label: "Suspended",
    className: "border-red-400/30 bg-red-400/10 text-danger-text",
  },
  canceled: {
    label: "Canceled",
    className: "border-red-400/30 bg-red-400/10 text-danger-text",
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
  const whatsappStatusPill = STATUS_PILLS[tenant.whatsappStatus] ?? {
    label: tenant.whatsappStatus,
    className: "border-border bg-surface/60 text-muted",
  };

  const whatsappPrices: Record<BillingCycle, number> = {
    monthly: whatsappAddonPrice("monthly"),
    quarterly: whatsappAddonPrice("quarterly"),
    yearly: whatsappAddonPrice("yearly"),
  };
  const whatsappDefaultChecked = tenant.whatsappStatus === "active" || tenant.whatsappStatus === "trialing";

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
        {tenant.whatsappEnabled && (
          <>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted">WhatsApp status</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${whatsappStatusPill.className}`}
              >
                {whatsappStatusPill.label}
              </span>
            </div>
            {tenant.whatsappPeriodEnd && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted">WhatsApp period ends</span>
                <span className="font-medium tabular-nums">
                  {tenant.whatsappPeriodEnd.toLocaleDateString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {pendingPayment ? (
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-warning-text">
          Payment <span className="font-mono">{pendingPayment.invoiceRef}</span> submitted and awaiting
          approval. Your access is already extended while we review it — no action needed.
        </div>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-danger-text">
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
            whatsappEnabled={tenant.whatsappEnabled}
            whatsappPrices={whatsappPrices}
            whatsappDefaultChecked={whatsappDefaultChecked}
          />
        </>
      )}
    </div>
  );
}
