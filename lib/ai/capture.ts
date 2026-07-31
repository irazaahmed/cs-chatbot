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
}): Promise<void> {
  const { tenantId, leadCaptureEnabled, history, latestMessage, conversationId } = params;

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
          conversationId: conversationId ?? null,
        },
      });
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
        },
      });
    }
  } catch (err) {
    console.error("structured signal capture failed:", err instanceof Error ? err.message : err);
  }
}
