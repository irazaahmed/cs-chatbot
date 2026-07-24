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
      data: { status: "active", periodEnd: new Date(now.getTime() + 30 * DAY_MS) },
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
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Payment approvals</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Verify each reference against your real bank statement before approving — the screenshot
        is a supporting document, not proof (CLAUDE.md section 9).
      </p>

      {payments.length === 0 ? (
        <p className="mt-6 rounded-lg border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Nothing pending.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {payments.map((payment) => {
            const tenant = tenantById.get(payment.tenantId);
            return (
              <div
                key={payment.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-black dark:text-zinc-50">
                      {tenant?.name ?? payment.tenantId}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{tenant?.websiteUrl}</p>
                  </div>
                  <a
                    href={`/api/admin/payments/${payment.id}/proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline dark:text-blue-400"
                  >
                    View screenshot
                  </a>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-zinc-600 dark:text-zinc-400">Reference</dt>
                  <dd className="font-mono text-black dark:text-zinc-50">{payment.invoiceRef}</dd>
                  <dt className="text-zinc-600 dark:text-zinc-400">Amount</dt>
                  <dd className="text-black dark:text-zinc-50">
                    Rs. {payment.amountPKR.toLocaleString()}
                  </dd>
                  <dt className="text-zinc-600 dark:text-zinc-400">Method</dt>
                  <dd className="text-black dark:text-zinc-50">{payment.method}</dd>
                  <dt className="text-zinc-600 dark:text-zinc-400">Sender name</dt>
                  <dd className="text-black dark:text-zinc-50">{payment.senderName}</dd>
                </dl>

                <div className="mt-4 flex items-center gap-3">
                  <form action={approvePayment}>
                    <input type="hidden" name="id" value={payment.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectPayment} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={payment.id} />
                    <input
                      name="note"
                      placeholder="Reason (optional)"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
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
