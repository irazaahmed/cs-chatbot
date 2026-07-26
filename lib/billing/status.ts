import { prisma } from "@/lib/db/client";
import { planConversationCap } from "@/lib/billing/plans";

// Status ladder from CLAUDE.md section 9 — only suspended/canceled block chat
// here; past_due still works normally (the forced "Powered by" branding at day
// 3 is a widget/config concern, handled in /api/config). Plan caps live in
// plans.ts, the single source of truth.
//
// The usage unit is a *conversation* — one visitor chat session (one
// sessionId), not an individual message. A session maps to exactly one
// Conversation row (the chat route appends to it), so counting distinct
// sessions started this month is the monthly usage.

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

/** Counts distinct visitor conversations (chat sessions) started this month. */
export async function getMonthlyConversationUsage(tenantId: string): Promise<number> {
  const periodStart = startOfCurrentMonthUtc();

  const rows = await prisma.$queryRaw<{ usage: bigint }[]>`
    SELECT COUNT(DISTINCT "sessionId") AS usage
    FROM "Conversation"
    WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${periodStart}
  `;

  return Number(rows[0]?.usage ?? 0);
}

export async function checkMonthlyUsage(
  tenantId: string,
  planId: string,
  sessionId?: string,
): Promise<GateResult> {
  const cap = planConversationCap(planId);
  const usage = await getMonthlyConversationUsage(tenantId);

  if (usage < cap) return { allowed: true };

  // At/over the cap, a conversation already counted this month may still
  // continue — the cap limits *new* conversations, and cutting off a visitor
  // mid-chat is worse than letting an in-flight session finish.
  if (sessionId) {
    const periodStart = startOfCurrentMonthUtc();
    const existing = await prisma.conversation.findFirst({
      where: { tenantId, sessionId, createdAt: { gte: periodStart } },
      select: { id: true },
    });
    if (existing) return { allowed: true };
  }

  return {
    allowed: false,
    message: "This chatbot has reached its monthly conversation limit. Please check back next month.",
  };
}
