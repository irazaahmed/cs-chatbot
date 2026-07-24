import { prisma } from "@/lib/db/client";

// Plan caps from CLAUDE.md section 6. Status ladder from section 9 — only
// suspended/canceled block chat here; past_due still works normally (the
// forced "Powered by" branding at day 3 is a widget/config concern, not a
// chat-gating one, and belongs with /api/config in a later phase).

const PLAN_CAPS: Record<string, { pages: number; messagesPerMonth: number }> = {
  starter: { pages: 50, messagesPerMonth: 1000 },
  pro: { pages: 300, messagesPerMonth: 5000 },
  business: { pages: 1000, messagesPerMonth: 20000 },
};

const DISABLED_STATUSES = new Set(["suspended", "canceled"]);

export interface GateResult {
  allowed: boolean;
  message?: string;
}

export function checkTenantStatus(status: string): GateResult {
  if (DISABLED_STATUSES.has(status)) {
    return { allowed: false, message: "Chat is temporarily unavailable. Please check back soon." };
  }
  return { allowed: true };
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Counts visitor-authored messages this calendar month for a tenant. */
export async function getMonthlyMessageUsage(tenantId: string): Promise<number> {
  const periodStart = startOfCurrentMonthUtc();

  const rows = await prisma.$queryRaw<{ usage: bigint }[]>`
    SELECT COALESCE(SUM(
      (SELECT count(*) FROM jsonb_array_elements(messages) elem WHERE elem->>'role' = 'user')
    ), 0) AS usage
    FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${periodStart}
  `;

  return Number(rows[0]?.usage ?? 0);
}

export async function checkMonthlyUsage(tenantId: string, planId: string): Promise<GateResult> {
  const cap = PLAN_CAPS[planId] ?? PLAN_CAPS.starter;
  const usage = await getMonthlyMessageUsage(tenantId);

  if (usage >= cap.messagesPerMonth) {
    return {
      allowed: false,
      message: "This chatbot has reached its monthly message limit. Please check back next month.",
    };
  }
  return { allowed: true };
}

export function planPageCap(planId: string): number {
  return (PLAN_CAPS[planId] ?? PLAN_CAPS.starter).pages;
}

export function planMessageCap(planId: string): number {
  return (PLAN_CAPS[planId] ?? PLAN_CAPS.starter).messagesPerMonth;
}
