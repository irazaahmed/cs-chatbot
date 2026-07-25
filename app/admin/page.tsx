import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { prisma } from "@/lib/db/client";

const DAY_MS = 24 * 60 * 60 * 1000;

async function approvePayment(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.status !== "submitted") return;

  const now = new Date();
  await prisma.$transaction([
    prisma.payment.update({ where: { id }, data: { status: "verified", reviewedAt: now } }),
    prisma.tenant.update({
      where: { id: payment.tenantId },
      data: { status: "active", planId: payment.planId, periodEnd: new Date(now.getTime() + 30 * DAY_MS) },
    }),
  ]);
  revalidatePath("/admin");
}

async function rejectPayment(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").slice(0, 500);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.status !== "submitted") return;

  await prisma.payment.update({
    where: { id },
    data: { status: "rejected", reviewedAt: new Date(), note: note || null },
  });
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
            Verify each reference against your real bank statement before approving — the screenshot
            is a supporting document, not proof.
          </p>
        </div>
        <Link
          href="/playground"
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
                    <dd className="mt-0.5 font-medium capitalize">{payment.planId}</dd>
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
                      className="rounded-full border border-red-400/40 px-5 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
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
    </div>
  );
}
