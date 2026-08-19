import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { prisma } from "@/lib/db/client";
import { getTenantsOverview } from "@/lib/admin/overview";
import { isBillingCycle, cycleMonths, addMonths, CYCLE_META, planLabel } from "@/lib/billing/plans";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail } from "@/lib/email/notify";

const STATUS_PILLS: Record<string, string> = {
  trialing: "border-border bg-surface/60 text-muted",
  active: "border-emerald-400/30 bg-emerald-400/10 text-success-text",
  past_due: "border-amber-400/30 bg-amber-400/10 text-warning-text",
  suspended: "border-red-400/30 bg-red-400/10 text-danger-text",
  canceled: "border-red-400/30 bg-red-400/10 text-danger-text",
};

async function approvePayment(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { tenant: { include: { owner: true } } },
  });
  if (!payment || payment.status !== "submitted") return;

  const now = new Date();
  const cycle = isBillingCycle(payment.billingCycle) ? payment.billingCycle : "monthly";
  const periodEnd = addMonths(now, cycleMonths(cycle));

  const websiteUpdate = { status: "active", planId: payment.planId, periodEnd };
  const tenantUpdateData =
    payment.addon === "bundle"
      ? { ...websiteUpdate, whatsappStatus: "active", whatsappPeriodEnd: periodEnd }
      : payment.addon === "whatsapp"
        ? { whatsappStatus: "active", whatsappPeriodEnd: periodEnd }
        : websiteUpdate;

  await prisma.$transaction([
    prisma.payment.update({ where: { id }, data: { status: "verified", reviewedAt: now } }),
    prisma.tenant.update({ where: { id: payment.tenantId }, data: tenantUpdateData }),
  ]);

  if (payment.tenant.owner.email) {
    const label = payment.addon === "whatsapp" ? "WhatsApp" : `${planLabel(payment.planId)} plan`;
    await sendPaymentApprovedEmail(payment.tenant.owner.email, payment.tenant.name, label, periodEnd);
  }

  revalidatePath("/admin");
}

async function rejectPayment(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").slice(0, 500);
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { tenant: { include: { owner: true } } },
  });
  if (!payment || payment.status !== "submitted") return;

  await prisma.payment.update({
    where: { id },
    data: { status: "rejected", reviewedAt: new Date(), note: note || null },
  });

  if (payment.tenant.owner.email) {
    await sendPaymentRejectedEmail(payment.tenant.owner.email, payment.tenant.name, payment.invoiceRef, note || undefined);
  }

  revalidatePath("/admin");
}

export default async function AdminPage() {
  await requireAdmin();

  const payments = await prisma.payment.findMany({
    where: { status: "submitted" },
    orderBy: { periodStart: "asc" },
  });

  const tenantIds = Array.from(new Set(payments.map((p) => p.tenantId)));
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, websiteUrl: true },
  });
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const overview = await getTenantsOverview();

  return (
    <div className="relative min-h-screen p-6 sm:p-8">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-30" />
        <div className="glow-orb animate-float-slow absolute right-[-14%] top-[-12%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_9%,transparent)]" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Payment approvals</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Verify each reference against your real bank statement before approving. The screenshot
            is a supporting document, not proof.
          </p>
        </div>
        <Link
          href="/home"
          className="rounded-full border border-border bg-surface/60 px-5 py-2 text-sm text-foreground transition-colors hover:border-accent"
        >
          Back to dashboard
        </Link>
      </div>

      {payments.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
          Nothing pending.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {payments.map((payment) => {
            const tenant = tenantById.get(payment.tenantId);
            return (
              <div key={payment.id} className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-heading font-semibold">
                      {tenant?.name ?? payment.tenantId}
                    </p>
                    <p className="text-sm text-muted">{tenant?.websiteUrl}</p>
                  </div>
                  <a
                    href={`/api/admin/payments/${payment.id}/proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent-bright transition-colors hover:bg-accent/20"
                  >
                    View screenshot
                  </a>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Reference</dt>
                    <dd className="mt-0.5 font-mono text-accent-bright">{payment.invoiceRef}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Plan requested</dt>
                    <dd className="mt-0.5 font-medium capitalize">
                      {payment.addon === "bundle"
                        ? `${payment.planId} + WhatsApp`
                        : payment.addon === "whatsapp"
                          ? "WhatsApp"
                          : payment.planId}
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        ({CYCLE_META[isBillingCycle(payment.billingCycle) ? payment.billingCycle : "monthly"].label})
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Amount</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      Rs. {payment.amountPKR.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Method</dt>
                    <dd className="mt-0.5 capitalize">{payment.method}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Sender name</dt>
                    <dd className="mt-0.5">{payment.senderName}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <form action={approvePayment}>
                    <input type="hidden" name="id" value={payment.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_24px_-6px_rgb(16,185,129)]"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectPayment} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={payment.id} />
                    <input
                      name="note"
                      placeholder="Reason (optional)"
                      className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]"
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-red-400/40 px-5 py-2 text-sm font-medium text-danger-text transition-colors hover:bg-red-500/10"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-12">
        <h2 className="font-heading text-xl font-semibold tracking-tight">All tenants</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every signup: which channels are on, plan, usage, and where they stand on billing, in one place.
        </p>

        {overview.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
            No signups yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/80 text-left text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Business</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Channels</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pages</th>
                    <th className="px-4 py-3 font-medium">Convos (mo)</th>
                    <th className="px-4 py-3 font-medium">Last active</th>
                    <th className="px-4 py-3 font-medium">Period ends</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((t) => (
                    <tr key={t.id} className="border-t border-border transition-colors hover:bg-accent/5">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link href={`/admin/tenants/${t.id}`} className="hover:text-accent-bright hover:underline">
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{t.ownerEmail}</td>
                      <td className="max-w-[14rem] truncate px-4 py-3 text-muted">
                        <a href={t.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-bright">
                          {t.websiteUrl}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              t.websiteEnabled
                                ? "border-emerald-400/30 bg-emerald-400/10 text-success-text"
                                : "border-border bg-surface/60 text-muted"
                            }`}
                          >
                            Website
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              t.whatsappEnabled
                                ? "border-emerald-400/30 bg-emerald-400/10 text-success-text"
                                : "border-border bg-surface/60 text-muted"
                            }`}
                          >
                            WhatsApp
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted">{t.planId}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_PILLS[t.status] ?? "border-border bg-surface/60 text-muted"}`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">{t.pageCount}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{t.conversationsThisMonth}</td>
                      <td className="px-4 py-3 text-muted">
                        {t.lastActiveAt ? t.lastActiveAt.toLocaleDateString() : "never"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {t.periodEnd ? t.periodEnd.toLocaleDateString() : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
