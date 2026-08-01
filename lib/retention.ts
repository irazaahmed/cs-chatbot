import { prisma } from "@/lib/db/client";

// Conversation transcripts are the bulkiest tenant data and lose value quickly.
// Leads and appointments already carry their own copy of the visitor's name,
// contact, and interest, so purging raw chat history after a fixed window keeps
// the database small on the 4GB VPS without losing anything the dashboard needs.
//
// Note on billing: monthly usage counts distinct sessionIds created since the
// start of the current calendar month (lib/billing/status.ts). A 30-day window
// can, only on a 31-day month's final day, drop a conversation still inside that
// month — which slightly under-counts usage in the customer's favour, never a
// leak or over-charge, so 30 days is safe to honour as requested.
export const CONVERSATION_RETENTION_DAYS = 30;

/** Deletes conversations older than the retention window across all tenants.
 *  Returns how many rows were removed. Leads/appointments are separate tables
 *  and are never touched. */
export async function purgeOldConversations(
  retentionDays = CONVERSATION_RETENTION_DAYS
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.conversation.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}
