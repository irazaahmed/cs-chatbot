import { chatComplete, type ChatMessage } from "./provider";

// Lead capture existed as a schema + dashboard tab but nothing ever created a
// row (there was no mechanism to pull structured data out of a free-form
// chat). This is that mechanism, reused for both leads and the new
// conversational appointment booking — same signal, different destination
// table depending on what the visitor actually provided.

const CONTACT_SIGNAL_PATTERN =
  /@|(\+?\d[\d\s-]{6,}\d)|\b(book|appointment|schedule|reserve|meet(ing)?|call me|whatsapp|milna|mulaqat|waqt|booking)\b/i;

/** Cheap pre-filter so the extra LLM call below only runs on messages that
 * plausibly contain contact info or a booking request — most chat turns
 * don't, and this keeps the added cost/latency rare rather than per-message. */
export function looksLikeContactOrBookingSignal(message: string): boolean {
  return CONTACT_SIGNAL_PATTERN.test(message);
}

export interface ExtractedSignal {
  type: "lead" | "appointment" | "none";
  name: string | null;
  contact: string | null;
  requestedTime: string | null;
  notes: string | null;
}

const NONE_SIGNAL: ExtractedSignal = { type: "none", name: null, contact: null, requestedTime: null, notes: null };

const EXTRACT_SYSTEM_PROMPT =
  "You extract structured signals from a customer-support chat transcript. Reply with ONLY a JSON " +
  'object, no prose, no markdown fences, matching exactly: {"type": "lead" | "appointment" | "none", ' +
  '"name": string | null, "contact": string | null, "requestedTime": string | null, "notes": string | null}. ' +
  'Use "appointment" if the visitor is asking to book/schedule a call, meeting, or visit and you can ' +
  'see at least a name or contact plus some indication of when. Use "lead" if the visitor shared a ' +
  "way to reach them (email or phone number) — a name is a bonus, not required — without asking to " +
  'schedule anything. Use "none" if neither applies yet. requestedTime is the visitor\'s own words ' +
  "for when they want to meet (e.g. " +
  '"tomorrow 3pm", "kal shaam ko") — never invent or normalize a date/time. Only use information ' +
  "actually present in the transcript.";

/** One extra, deliberately small LLM call — only invoked when
 * looksLikeContactOrBookingSignal matched, so this never runs on ordinary
 * chat turns. Defensive JSON parsing: a malformed response just yields
 * "none" rather than throwing and breaking the visitor's already-streamed
 * answer. */
export async function extractStructuredSignal(
  history: ChatMessage[],
  latestMessage: string
): Promise<ExtractedSignal> {
  const transcript = [...history, { role: "user" as const, content: latestMessage }]
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: EXTRACT_SYSTEM_PROMPT },
    { role: "user", content: transcript },
  ];

  try {
    const raw = await chatComplete(messages);
    const parsed = JSON.parse(raw.trim());
    if (parsed && (parsed.type === "lead" || parsed.type === "appointment" || parsed.type === "none")) {
      return {
        type: parsed.type,
        name: typeof parsed.name === "string" ? parsed.name : null,
        contact: typeof parsed.contact === "string" ? parsed.contact : null,
        requestedTime: typeof parsed.requestedTime === "string" ? parsed.requestedTime : null,
        notes: typeof parsed.notes === "string" ? parsed.notes : null,
      };
    }
    return NONE_SIGNAL;
  } catch {
    return NONE_SIGNAL;
  }
}
