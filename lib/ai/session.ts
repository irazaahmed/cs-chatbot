import type { Conversation } from "@prisma/client";
import { prisma } from "@/lib/db/client";

// Shared session-resolution logic for any channel keyed by an external
// sender id (WhatsApp JID, Instagram-scoped user id, ...). Originally only
// in whatsapp-connector.mts; extracted here once the Instagram webhook
// became a second caller, rather than duplicating it.
//
// A thread that's gone quiet this long is treated as ended, same as a
// captured Lead/Appointment closing it explicitly (lib/ai/capture.ts) — the
// customer's next message starts a fresh session/history rather than
// resuming a stale one.
export const SESSION_IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export interface ChannelSession {
  existingConversation: Conversation | null;
  sessionId: string;
}

/**
 * Stable per-customer prefix: `{channel}:{tenantId}:{externalUserId}`. A
 * closed or idle session gets a fresh sessionId suffixed with the epoch it
 * started, so old rows (bare prefix, no suffix) still match via prefix.
 */
export async function resolveChannelSession(
  tenantId: string,
  channel: string,
  externalUserId: string
): Promise<ChannelSession> {
  const baseSessionId = `${channel}:${tenantId}:${externalUserId}`;

  const latestConversation = await prisma.conversation.findFirst({
    where: { tenantId, sessionId: { startsWith: baseSessionId } },
    orderBy: { createdAt: "desc" },
  });
  const sessionExpired =
    latestConversation !== null &&
    (latestConversation.closedAt !== null ||
      Date.now() - latestConversation.updatedAt.getTime() > SESSION_IDLE_TIMEOUT_MS);

  const existingConversation = sessionExpired ? null : latestConversation;
  const sessionId = existingConversation ? existingConversation.sessionId : `${baseSessionId}:${Date.now()}`;

  return { existingConversation, sessionId };
}
