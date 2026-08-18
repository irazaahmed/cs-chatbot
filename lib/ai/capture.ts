import { prisma } from "@/lib/db/client";
import { looksLikeContactOrBookingSignal, extractStructuredSignal } from "./extract";
import type { ChatMessage } from "./provider";

// Shared lead / appointment capture, used by BOTH the live widget chat route
// and the dashboard playground. It used to live only in the widget route, so
// an owner testing in the playground never saw leads saved — the whole reason
// this was pulled out. Runs after the answer is already streamed and must
// never throw into the response path.
export async function captureStructuredSignal(params: {
  tenantId: string;
  leadCaptureEnabled: boolean;
  history: ChatMessage[];
  latestMessage: string;
  /** The persisted conversation (widget). The playground has none, so it's
   *  null there — dedup is skipped, which is safe because the cheap pre-filter
   *  only fires on the single turn that actually carries the contact info. */
  conversationId?: string | null;
  /** Which surface this signal came from — stored on the Lead/Appointment row
   *  so the dashboard can show where a contact reached out from. Defaults to
   *  "web" since that's every caller except the WhatsApp connector and the
   *  Instagram webhook. */
  channel?: "web" | "whatsapp" | "instagram";
}): Promise<void> {
  const { tenantId, leadCaptureEnabled, history, latestMessage, conversationId, channel = "web" } = params;

  try {
    if (!looksLikeContactOrBookingSignal(latestMessage)) return;
    const signal = await extractStructuredSignal(history, latestMessage);

    if (leadCaptureEnabled && signal.type === "lead") {
      if (conversationId) {
        const already = await prisma.lead.findFirst({ where: { conversationId } });
        if (already) return;
      }
      await prisma.lead.create({
        data: {
          tenantId,
          name: signal.name,
          email: signal.contact?.includes("@") ? signal.contact : null,
          phone: signal.contact && !signal.contact.includes("@") ? signal.contact : null,
          interest: signal.notes,
          conversationId: conversationId ?? null,
          channel,
        },
      });
      await closeConversation(conversationId);
    } else if (signal.type === "appointment") {
      // Appointments are independent of the lead-capture toggle — a separate
      // feature with its own dashboard tab.
      if (conversationId) {
        const already = await prisma.appointment.findFirst({ where: { conversationId } });
        if (already) return;
      }
      await prisma.appointment.create({
        data: {
          tenantId,
          name: signal.name,
          contact: signal.contact,
          requestedTime: signal.requestedTime,
          notes: signal.notes,
          conversationId: conversationId ?? null,
          channel,
        },
      });
      await closeConversation(conversationId);
    }
  } catch (err) {
    console.error("structured signal capture failed:", err instanceof Error ? err.message : err);
  }
}

/** Marks the thread as done the moment a Lead/Appointment is captured from
 * it. The WhatsApp connector reads this to start a fresh session for that
 * customer's next message instead of dragging a closed deal's context into
 * an unrelated later conversation (see whatsapp-connector.mts). No-op for
 * the playground, which has no conversationId. */
async function closeConversation(conversationId: string | null | undefined): Promise<void> {
  if (!conversationId) return;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { closedAt: new Date() },
  });
}
