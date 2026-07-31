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
      "— asking about pricing or plans, how to purchase or sign up, requesting a quote, wanting a " +
      "specific service done for them, or otherwise signalling they are a potential customer — first " +
      "answer their question, then naturally offer to have the team follow up and ask for their name " +
      "and a phone number or WhatsApp (email is also fine). Ask politely, in the same language as the " +
      "rest of your reply, and only once per conversation: if the visitor declines, ignores it, or has " +
      "already shared their contact, do not ask again. Never ask for contact details during ordinary " +
      "informational questions or small talk — only on genuine buying intent."
    : null;

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
    `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
    "Write a natural, plain-language answer. Do not tack on citation markers like " +
      "(source: ...) or [1] after every sentence just to prove where a fact came from — the " +
      "interface already shows the source links separately underneath your reply, so that kind of " +
      "repetition is redundant. That said, if the visitor is specifically asking to see links, " +
      "pages, or projects (for example: show me your projects, what pages do you have, send me the " +
      "link), do include the actual URLs in your answer — that is the answer being asked for, not a " +
      "redundant citation.",
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
