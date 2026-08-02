import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/current";
import { prisma } from "@/lib/db/client";
import { getMonthlyConversationUsage } from "@/lib/billing/status";
import { PLAN_IDS, isPlanId, planPageCap, planConversationCap, formatPages } from "@/lib/billing/plans";
import { DeleteTenantForm } from "@/components/admin/DeleteTenantForm";

const STATUS_IDS = ["trialing", "active", "past_due", "suspended", "canceled"] as const;
type StatusId = (typeof STATUS_IDS)[number];
function isStatusId(v: string): v is StatusId {
  return (STATUS_IDS as readonly string[]).includes(v);
}

const STATUS_PILLS: Record<string, string> = {
  trialing: "border-border bg-surface/60 text-muted",
  active: "border-emerald-400/30 bg-emerald-400/10 text-success-text",
  past_due: "border-amber-400/30 bg-amber-400/10 text-warning-text",
  suspended: "border-red-400/30 bg-red-400/10 text-danger-text",
  canceled: "border-red-400/30 bg-red-400/10 text-danger-text",
  submitted: "border-amber-400/30 bg-amber-400/10 text-warning-text",
  verified: "border-emerald-400/30 bg-emerald-400/10 text-success-text",
  rejected: "border-red-400/30 bg-red-400/10 text-danger-text",
};

async function updateTenant(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));

  const statusRaw = String(formData.get("status"));
  const planRaw = String(formData.get("planId"));
  const periodEndRaw = String(formData.get("periodEnd") ?? "").trim();

  if (!isStatusId(statusRaw) || !isPlanId(planRaw)) return;

  await prisma.tenant.update({
    where: { id },
    data: {
      status: statusRaw,
      planId: planRaw,
      periodEnd: periodEndRaw ? new Date(periodEndRaw) : null,
    },
  });

  revalidatePath(`/admin/tenants/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/tenants/${id}?saved=1`);
}

// Quick trial grant: no invoice, no payment, just a fixed window to let a
// prospect try the product. Runs the tenant through the same "trialing"
// status the ladder (lib/billing/ladder.ts) already knows how to expire on
// its own once periodEnd passes, so this isn't a special case to remember
// to undo later.
async function grantTrial(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const days = Number(formData.get("days"));
  if (!id || !Number.isFinite(days) || days <= 0) return;

  await prisma.tenant.update({
    where: { id },
    data: {
      status: "trialing",
      periodEnd: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/admin/tenants/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/tenants/${id}?saved=1`);
}

// Wipes only the crawled knowledge base (Document rows). Tenant, billing,
// and conversation history are untouched, and a recrawl fully recovers it.
async function clearCrawledData(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  if (!id) return;

  await prisma.document.deleteMany({ where: { tenantId: id } });

  revalidatePath(`/admin/tenants/${id}`);
  redirect(`/admin/tenants/${id}?saved=1`);
}

// Irreversible. Payment has no onDelete: Cascade (kept for audit trail
// elsewhere), so it must be cleared explicitly or the tenant delete fails on
// the FK; every other relation (Document, Conversation, Lead, Appointment,
// RateLimitBucket, WhatsAppAccount) already cascades from the schema.
async function deleteTenant(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  if (!id) return;

  // Idempotent: a resubmitted/double-clicked delete for an already-deleted
  // tenant should just land back on /admin, not crash with a Prisma P2025.
  const exists = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (!exists) redirect("/admin");

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.deleteMany({ where: { tenantId: id } });
      await tx.tenant.delete({ where: { id } });
    },
    { timeout: 20_000, maxWait: 20_000 }
  );

  // Belt-and-suspenders: under a slow/congested connection, a transaction can
  // report success without the write actually being visible yet. Confirm the
  // row is really gone before telling the admin it worked. Silently lying
  // about a delete is worse than a slow one.
  const stillThere = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (stillThere) redirect(`/admin/tenants/${id}?error=delete_failed`);

  revalidatePath("/admin");
  redirect("/admin");
}

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { owner: { select: { email: true, name: true, createdAt: true } } },
  });
  if (!tenant) notFound();

  const [payments, conversationCount, leadCount, pages, conversationsThisMonth] = await Promise.all([
    prisma.payment.findMany({ where: { tenantId: id }, orderBy: { periodStart: "desc" } }),
    prisma.conversation.count({ where: { tenantId: id } }),
    prisma.lead.count({ where: { tenantId: id } }),
    prisma.document.findMany({ where: { tenantId: id }, select: { sourceUrl: true }, distinct: ["sourceUrl"] }),
    getMonthlyConversationUsage(id),
  ]);

  const periodEndValue = tenant.periodEnd ? tenant.periodEnd.toISOString().slice(0, 10) : "";

  return (
    <div className="relative min-h-screen p-6 sm:p-8">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-30" />
        <div className="glow-orb animate-float-slow absolute right-[-14%] top-[-12%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_9%,transparent)]" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-muted transition-colors hover:text-accent-bright">
            ← All tenants
          </Link>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">{tenant.name}</h1>
          <a
            href={tenant.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-accent-bright"
          >
            {tenant.websiteUrl}
          </a>
        </div>
        <span
          className={`inline-flex h-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_PILLS[tenant.status] ?? "border-border bg-surface/60 text-muted"}`}
        >
          {tenant.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted">Owner</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Email</dt>
              <dd className="text-right text-foreground">{tenant.owner.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Signed up</dt>
              <dd className="tabular-nums text-foreground">{tenant.owner.createdAt.toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted">Verification</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Verified</dt>
              <dd className="text-foreground">{tenant.verified ? `yes (${tenant.verifyMethod})` : "no"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Allowed domains</dt>
              <dd className="text-right text-foreground">
                {tenant.allowedDomains.length ? tenant.allowedDomains.join(", ") : "None"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted">Usage</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Pages</dt>
              <dd className="tabular-nums text-foreground">
                {pages.length} / {formatPages(planPageCap(tenant.planId)).replace(" pages", "")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Conversations (this month)</dt>
              <dd className="tabular-nums text-foreground">
                {conversationsThisMonth} / {planConversationCap(tenant.planId)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Conversations (total)</dt>
              <dd className="tabular-nums text-foreground">{conversationCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Leads captured</dt>
              <dd className="tabular-nums text-foreground">{leadCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {saved && (
        <p className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm text-success-text">
          Changes saved.
        </p>
      )}

      {error === "delete_failed" && (
        <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-danger-text">
          Delete didn&apos;t go through. The database connection may be slow or unstable right now.
          Nothing was removed. Please try again.
        </p>
      )}

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-heading font-semibold">Grant a trial</h2>
        <p className="mt-1 text-sm text-muted">
          Sets status to trialing and periodEnd to N days from now, no invoice, no payment. The
          trial ends itself automatically when periodEnd passes (same status ladder as billing).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={grantTrial}>
            <input type="hidden" name="id" value={tenant.id} />
            <input type="hidden" name="days" value="5" />
            <button
              type="submit"
              className="rounded-full border border-border bg-surface/60 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              Grant 5-day trial
            </button>
          </form>
          <form action={grantTrial}>
            <input type="hidden" name="id" value={tenant.id} />
            <input type="hidden" name="days" value="10" />
            <button
              type="submit"
              className="rounded-full border border-border bg-surface/60 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              Grant 10-day trial
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-heading font-semibold">Manage subscription</h2>
        <p className="mt-1 text-sm text-muted">
          For manual overrides: comps, corrections, or acting on a support request. Approving a
          submitted payment (below) is still the normal path for a real payment.
        </p>
        <form action={updateTenant} className="mt-4 flex flex-wrap items-end gap-4">
          <input type="hidden" name="id" value={tenant.id} />
          <div>
            <label htmlFor="status" className="block text-xs font-medium text-muted">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={tenant.status}
              className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm text-foreground outline-none"
            >
              {STATUS_IDS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="planId" className="block text-xs font-medium text-muted">Plan</label>
            <select
              id="planId"
              name="planId"
              defaultValue={tenant.planId}
              className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm capitalize text-foreground outline-none"
            >
              {PLAN_IDS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="periodEnd" className="block text-xs font-medium text-muted">Period ends</label>
            <input
              id="periodEnd"
              type="date"
              name="periodEnd"
              defaultValue={periodEndValue}
              className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
          <button
            type="submit"
            className="btn-sheen rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]"
          >
            Save
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <h2 className="font-heading font-semibold text-danger-text">Danger zone</h2>

        <div className="mt-4 border-t border-red-500/20 pt-4">
          <p className="text-sm font-medium text-foreground">Clear crawled data</p>
          <p className="mt-1 text-sm text-muted">
            Deletes every crawled/uploaded page for this tenant. The tenant, billing, and
            conversation history are untouched. A recrawl on the Website tab fully recovers it.
          </p>
          <form action={clearCrawledData} className="mt-3">
            <input type="hidden" name="id" value={tenant.id} />
            <button
              type="submit"
              className="rounded-full border border-red-400/40 px-5 py-2 text-sm font-medium text-danger-text transition-colors hover:bg-red-500/10"
            >
              Clear crawled data
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-red-500/20 pt-4">
          <p className="text-sm font-medium text-foreground">Delete tenant</p>
          <p className="mt-1 text-sm text-muted">
            Permanently deletes this tenant and everything tied to it: crawled data, conversations,
            leads, appointments, WhatsApp connection, and payment history. This cannot be undone.
          </p>
          <DeleteTenantForm tenantName={tenant.name} action={deleteTenant} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-heading font-semibold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
            No payments submitted yet.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/80 text-left text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Reviewed</th>
                    <th className="px-4 py-3 font-medium">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-accent-bright">{p.invoiceRef}</td>
                      <td className="px-4 py-3 capitalize text-muted">{p.planId}</td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        Rs. {p.amountPKR.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted">{p.method}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_PILLS[p.status] ?? "border-border bg-surface/60 text-muted"}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">{p.periodStart.toLocaleDateString()}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {p.reviewedAt ? p.reviewedAt.toLocaleDateString() : "None"}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/admin/payments/${p.id}/proof`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-bright hover:text-accent"
                        >
                          View
                        </a>
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

