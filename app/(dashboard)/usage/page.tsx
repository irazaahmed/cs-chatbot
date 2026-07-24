import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { getMonthlyMessageUsage, planMessageCap, planPageCap } from "@/lib/billing/status";

function UsageBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, (used / Math.max(1, cap)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-black dark:text-zinc-50">{label}</span>
        <span className="text-zinc-600 dark:text-zinc-400">
          {used.toLocaleString()} / {cap.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-black dark:bg-zinc-50"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function UsagePage() {
  const { tenant } = await getCurrentTenant();

  const [messageUsage, pageCount] = await Promise.all([
    getMonthlyMessageUsage(tenant.id),
    prisma.document.findMany({ where: { tenantId: tenant.id }, select: { sourceUrl: true }, distinct: ["sourceUrl"] }),
  ]);

  const messageCap = planMessageCap(tenant.planId);
  const pageCap = planPageCap(tenant.planId);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Usage</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Plan: <span className="font-medium capitalize text-black dark:text-zinc-50">{tenant.planId}</span>
      </p>

      <div className="mt-6 space-y-6">
        <UsageBar label="Messages this month" used={messageUsage} cap={messageCap} />
        <UsageBar label="Pages indexed" used={pageCount.length} cap={pageCap} />
      </div>
    </div>
  );
}
