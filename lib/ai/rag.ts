import { embed, type ChatMessage } from "./provider";
import { similaritySearch, type SimilarityMatch } from "@/lib/db/vector";

const HISTORY_LIMIT = 6;

// CLAUDE.md section 7: roman_ur must render as Urdu-in-Latin-script, not Urdu script.
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond in English.",
  ur: "اردو میں جواب دیں۔",
  roman_ur: "Respond in Roman Urdu (Urdu written in Latin script), never in Urdu script.",
};

export async function retrieveContext(tenantId: string, query: string): Promise<SimilarityMatch[]> {
  const queryEmbedding = await embed(query);
  return similaritySearch(tenantId, queryEmbedding, 5);
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
  matches: SimilarityMatch[],
  history: ChatMessage[],
  question: string
): ChatMessage[] {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS.en;

  const contextBlock =
    matches.length > 0
      ? matches.map((m, i) => `[${i + 1}] Source: ${m.sourceUrl}\n${m.content}`).join("\n\n")
      : "(no relevant context was found for this question)";

  const system = [
    systemPrompt,
    "Answer only using the context provided below. If the context does not contain the answer, " +
      "say you don't know and offer to connect the visitor to a human. Never invent facts about the business.",
    "Cite the source URL for any claim you make.",
    languageInstruction,
    `Context:\n${contextBlock}`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    ...history.slice(-HISTORY_LIMIT),
    { role: "user", content: question },
  ];
}

export function hasUsableContext(matches: SimilarityMatch[]): boolean {
  return matches.length > 0;
}
