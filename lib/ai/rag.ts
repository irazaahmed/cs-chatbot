import { embed, type ChatMessage } from "./provider";
import { similaritySearch, type SimilarityMatch } from "@/lib/db/vector";

const HISTORY_LIMIT = 6;

// A fixed lookup used to pull contact details (phone/email/WhatsApp) out of
// whatever was crawled, independent of the visitor's actual question — so the
// bot can still point to a human when it can't answer, instead of a bare
// "contact us". Exported so the preview flow (which searches an in-memory
// chunk list, not the tenant-scoped vector index) can reuse the same query.
export const CONTACT_QUERY = "contact phone number email WhatsApp address get in touch";

// CLAUDE.md section 7: roman_ur must render as Urdu-in-Latin-script, not Urdu script.
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond in English.",
  ur: "اردو میں جواب دیں۔",
  roman_ur: "Respond in Roman Urdu (Urdu written in Latin script), never in Urdu script.",
};

interface ContextMatch {
  sourceUrl: string;
  title: string | null;
  content: string;
}

export async function retrieveContext(tenantId: string, query: string): Promise<SimilarityMatch[]> {
  const queryEmbedding = await embed(query);
  return similaritySearch(tenantId, queryEmbedding, 5);
}

export async function retrieveContactInfo(tenantId: string): Promise<SimilarityMatch[]> {
  const queryEmbedding = await embed(CONTACT_QUERY);
  return similaritySearch(tenantId, queryEmbedding, 2);
}

/**
 * Builds the message list for the LLM. `history` must come from the
 * persisted Conversation row, never from the client request body — trusting
 * client-supplied history would let a visitor inject arbitrary fake turns
 * into the prompt.
 */
export function buildMessages(
  systemPrompt: string,
  language: string,
  matches: ContextMatch[],
  history: ChatMessage[],
  question: string,
  contactMatches: ContextMatch[] = [],
  leadCapture = true
): ChatMessage[] {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS.en;

  // Only present when the tenant has lead capture enabled. Turns the bot from a
  // passive Q&A into a lead generator: on real buying intent it offers a human
  // follow-up and asks once for contact details. The visitor's reply (a
  // phone/email) is then picked up by the structured-extraction pass in the
  // chat route, which creates the Lead.
  const leadGenInstruction = leadCapture
    ? "You also act as a lead generator for this business. When a visitor shows clear buying intent " +
      "— asking about pricing or plans, how to purchase or sign up, requesting a quote, or wanting a " +
      "specific service done for them — first answer their question, then in the SAME reply warmly " +
      "invite them to leave their details so the team can follow up, asking for their name and " +
      "phone/WhatsApp number together in one short sentence (email is fine too). Ask for both at once " +
      "in a single message — never interrogate the visitor one question at a time, and never ask them " +
      "to restate their problem or message, you already have it from the conversation. Before asking " +
      "for anything, re-read the conversation: if the visitor has ALREADY given their name, or " +
      "already given a phone/WhatsApp number or email, take that value from what they said earlier " +
      "and never ask for it again — only ask for whatever detail is still genuinely missing. Do this only " +
      "ONCE. The moment the visitor has shared a way to reach them, stop asking completely and reply " +
      "with a brief, warm thank-you saying the team will get back to them soon — ask no further " +
      "questions after that. If they decline or ignore the request, drop it and keep helping normally. " +
      "Never ask for contact details during ordinary questions or small talk."
    : null;

  // Independent of the lead-capture toggle (appointments have their own
  // dashboard tab). Only activates when a visitor actually wants to book, and
  // deliberately collects everything in one message so it doesn't feel like an
  // interrogation.
  const appointmentInstruction =
    "If a visitor wants to book an appointment, call, meeting, or visit, ask for their name, a " +
    "phone/WhatsApp number or email, and their preferred day and time — all together in one message, " +
    "never one question at a time. First re-read the conversation: if the visitor has already given " +
    "their name or a contact number/email earlier, take it from there and do not ask for it again — " +
    "only ask for the details still missing. Once you have those, confirm warmly that the team will " +
    "reach out to finalize it, and stop re-asking.";

  const contextBlock =
    matches.length > 0
      ? matches.map((m, i) => `[${i + 1}] Source: ${m.sourceUrl}\n${m.content}`).join("\n\n")
      : "(no relevant context was found for this question)";

  const contactBlock =
    contactMatches.length > 0
      ? contactMatches.map((m) => `Source: ${m.sourceUrl}\n${m.content}`).join("\n\n")
      : null;

  const system = [
    systemPrompt,
    "For questions specifically about this business — its services, pricing, policies, hours, " +
      "or anything only the business itself would know — answer only using the context below. " +
      "If the context doesn't cover it, say so plainly, and if contact details are given below, " +
      'invite the visitor to reach out directly by name (e.g. "you can reach us on WhatsApp at ' +
      '..." or "email us at ...") instead of a generic "contact us". Never invent business facts.',
    "For general questions unrelated to this specific business (small talk, simple factual or " +
      "conversational questions), you may answer briefly from your own general knowledge instead " +
      "of refusing.",
    ...(leadGenInstruction ? [leadGenInstruction] : []),
    appointmentInstruction,
    `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
    "Keep your answers short and conversational — usually two to four sentences. Get straight to " +
      "the point and never pad the reply. Only give a longer or step-by-step answer if the visitor " +
      "explicitly asks for more detail.",
    "Write in natural, plain language. Do not tack on citation markers, source URLs, or " +
      "'(source: ...)' / [1] notes to your answer — just answer the question directly. The only " +
      "exception is when the visitor is specifically asking to see links, pages, or projects (for " +
      "example: show me your projects, what pages do you have, send me the link); then include the " +
      "actual URLs, because that is the answer being asked for.",
    languageInstruction,
    `Context:\n${contextBlock}`,
    ...(contactBlock
      ? [
          "Contact details found on the business's website (only use these to help a visitor " +
            `reach a human — never as an answer about what the business does):\n${contactBlock}`,
        ]
      : []),
  ].join("\n\n");

  return [
    { role: "system", content: system },
    ...history.slice(-HISTORY_LIMIT),
    { role: "user", content: question },
  ];
}

export function hasUsableContext(matches: ContextMatch[]): boolean {
  return matches.length > 0;
}
