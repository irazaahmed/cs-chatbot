import { prisma } from "@/lib/db/client";

export interface TenantOverviewRow {
  id: string;
  name: string;
  ownerEmail: string;
  websiteUrl: string;
  verified: boolean;
  verifyMethod: string | null;
  planId: string;
  status: string;
  periodEnd: Date | null;
  pageCount: number;
  messagesThisMonth: number;
  conversationCount: number;
  lastActiveAt: Date | null;
  signedUpAt: Date;
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Founder-stage admin visibility: one query per stat, grouped across every
 * tenant, joined in JS. Fine at this scale (a handful of tenants); revisit
 * only if the tenant count actually grows enough to matter — see CLAUDE.md
 * section 15 on not building a full analytics suite before it's needed.
 */
export async function getTenantsOverview(): Promise<TenantOverviewRow[]> {
  const periodStart = startOfCurrentMonthUtc();

  const [tenants, pageCounts, convoStats, monthlyUsage] = await Promise.all([
    prisma.tenant.findMany({
      include: { owner: { select: { email: true, createdAt: true } } },
    }),
    prisma.$queryRaw<{ tenantId: string; count: bigint }[]>`
      SELECT "tenantId", COUNT(DISTINCT "sourceUrl") AS count
      FROM "Document"
      GROUP BY "tenantId"
    `,
    prisma.$queryRaw<{ tenantId: string; count: bigint; last: Date }[]>`
      SELECT "tenantId", COUNT(*) AS count, MAX("createdAt") AS last
      FROM "Conversation"
      GROUP BY "tenantId"
    `,
    prisma.$queryRaw<{ tenantId: string; usage: bigint }[]>`
      SELECT "tenantId", COALESCE(SUM(
        (SELECT count(*) FROM jsonb_array_elements(messages) elem WHERE elem->>'role' = 'user')
      ), 0) AS usage
      FROM "Conversation"
      WHERE "createdAt" >= ${periodStart}
      GROUP BY "tenantId"
    `,
  ]);

  const pageByTenant = new Map(pageCounts.map((r) => [r.tenantId, Number(r.count)]));
  const convoByTenant = new Map(convoStats.map((r) => [r.tenantId, { count: Number(r.count), last: r.last }]));
  const usageByTenant = new Map(monthlyUsage.map((r) => [r.tenantId, Number(r.usage)]));

  return tenants
    .map((t) => ({
      id: t.id,
      name: t.name,
      ownerEmail: t.owner.email,
      websiteUrl: t.websiteUrl,
      verified: t.verified,
      verifyMethod: t.verifyMethod,
      planId: t.planId,
      status: t.status,
      periodEnd: t.periodEnd,
      pageCount: pageByTenant.get(t.id) ?? 0,
      messagesThisMonth: usageByTenant.get(t.id) ?? 0,
      conversationCount: convoByTenant.get(t.id)?.count ?? 0,
      lastActiveAt: convoByTenant.get(t.id)?.last ?? null,
      signedUpAt: t.owner.createdAt,
    }))
    .sort((a, b) => b.signedUpAt.getTime() - a.signedUpAt.getTime());
}
