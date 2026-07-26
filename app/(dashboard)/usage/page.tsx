import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { getMonthlyConversationUsage } from "@/lib/billing/status";
import { planConversationCap, planPageCap, UNLIMITED_PAGE_CAP } from "@/lib/billing/plans";

function UsageBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const unlimited = cap >= UNLIMITED_PAGE_CAP;
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(1, cap)) * 100);
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-heading font-semibold">{label}</span>
        <span className="tabular-nums text-muted">
          {used.toLocaleString()} / {unlimited ? "∞" : cap.toLocaleString()}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            pct >= 90
              ? "bg-gradient-to-r from-red-500 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
              : "bg-gradient-to-r from-accent-dim via-accent to-accent-bright shadow-[0_0_12px_var(--color-accent)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function UsagePage() {
  const { tenant } = await getCurrentTenant();

  const [conversationUsage, pageCount] = await Promise.all([
    getMonthlyConversationUsage(tenant.id),
    prisma.document.findMany({ where: { tenantId: tenant.id }, select: { sourceUrl: true }, distinct: ["sourceUrl"] }),
  ]);

  const conversationCap = planConversationCap(tenant.planId);
  const pageCap = planPageCap(tenant.planId);

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Usage</h1>
      <p className="mt-1 text-sm text-muted">
        Plan:{" "}
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-xs font-medium capitalize text-accent-bright">
          {tenant.planId}
        </span>
      </p>

      <div className="mt-6 space-y-5">
        <UsageBar label="Conversations this month" used={conversationUsage} cap={conversationCap} />
        <UsageBar label="Pages indexed" used={pageCount.length} cap={pageCap} />
      </div>
    </div>
  );
}
