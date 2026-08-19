import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { generateInvoiceRef } from "@/lib/billing/invoice";
import { getPaymentInstructions } from "@/lib/billing/instructions";
import { getPlanOptions, whatsappAddonPrice, BILLING_CYCLES, type BillingCycle } from "@/lib/billing/plans";
import { PlanPicker } from "./_components/plan-picker";
import { Card } from "@/components/dashboard/Card";
import { Badge } from "@/components/dashboard/Badge";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { channelStatusTone } from "@/lib/billing/status-tone";

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

  const statusInfo = channelStatusTone(tenant.status);
  const whatsappStatusInfo = channelStatusTone(tenant.whatsappStatus);

  // Bundle rate for the checkbox in plan mode (always true: buying a plan
  // right now), vs the standalone-mode rate, resolved from whether the
  // tenant already has an active website plan.
  const hasActivePlan = tenant.status === "active";
  const whatsappBundlePrices = {} as Record<BillingCycle, number>;
  const whatsappStandaloneModePrices = {} as Record<BillingCycle, number>;
  for (const cycle of BILLING_CYCLES) {
    whatsappBundlePrices[cycle] = whatsappAddonPrice(cycle, true);
    whatsappStandaloneModePrices[cycle] = whatsappAddonPrice(cycle, hasActivePlan);
  }
  const whatsappDefaultChecked = tenant.whatsappStatus === "active" || tenant.whatsappStatus === "trialing";

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Billing</h1>

      <Card className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Status</span>
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
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
              <Badge tone={whatsappStatusInfo.tone}>{whatsappStatusInfo.label}</Badge>
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
      </Card>

      {pendingPayment ? (
        <div className="mt-6">
          <StatusBanner tone="warning">
            Payment <span className="font-mono">{pendingPayment.invoiceRef}</span> submitted and awaiting
            approval. Your access is already extended while we review it, no action needed.
          </StatusBanner>
        </div>
      ) : !tenant.websiteEnabled && !tenant.whatsappEnabled ? (
        <Card className="mt-6 text-sm text-muted">
          Turn on the{" "}
          <Link href="/install" className="font-medium text-foreground underline underline-offset-2">
            Website
          </Link>{" "}
          or{" "}
          <Link href="/whatsapp" className="font-medium text-foreground underline underline-offset-2">
            WhatsApp
          </Link>{" "}
          channel first — billing is based on whichever channel(s) you have on.
        </Card>
      ) : (
        <>
          {error && (
            <div className="mt-4">
              <StatusBanner tone="danger">
                {error === "2"
                  ? "That file couldn't be saved. Use a JPEG, PNG, or WEBP under 5MB."
                  : error === "3"
                    ? "That invoice reference was already used. Refresh the page and try again."
                    : error === "4"
                      ? "Turn on a channel (Website or WhatsApp) before paying for it."
                      : "Please fill in all fields and attach a screenshot."}
              </StatusBanner>
            </div>
          )}

          <PlanPicker
            plans={plans}
            defaultPlanId={tenant.planId}
            invoiceRef={invoiceRef}
            instructions={instructions}
            websiteEnabled={tenant.websiteEnabled}
            whatsappEnabled={tenant.whatsappEnabled}
            whatsappBundlePrices={whatsappBundlePrices}
            whatsappStandaloneModePrices={whatsappStandaloneModePrices}
            whatsappDefaultChecked={whatsappDefaultChecked}
          />
        </>
      )}
    </div>
  );
}
