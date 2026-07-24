// Phase 0 CLI: ask a question against a previously ingested site.
// Usage: npm run ask -- "<question>" <site>
// <site> is the hostname passed to ingest.ts (e.g. example.com).
import { embed, chatComplete, type ChatMessage } from "@/lib/ai/provider";
import { similaritySearch } from "@/lib/db/vector";

const SYSTEM_PROMPT =
  "You are a support assistant for a website. Answer only using the provided " +
  "context. If the context does not contain the answer, say you don't know " +
  "and offer to connect the visitor to a human. Never invent facts. Cite the " +
  "source URL for any claim you make.";

async function main() {
  const [question, site] = process.argv.slice(2);
  if (!question || !site) {
    console.error('Usage: npm run ask -- "<question>" <site>');
    process.exit(1);
  }

  console.log(`Searching ${site} for context...`);
  const queryEmbedding = await embed(question);
  const matches = await similaritySearch(site, queryEmbedding, 5);

  if (matches.length === 0) {
    console.log("No relevant context found. (Did you run ingest.ts for this site?)");
    return;
  }

  console.log(`Found ${matches.length} relevant chunk(s):`);
  for (const match of matches) {
    console.log(`  - [${match.similarity.toFixed(3)}] ${match.sourceUrl}`);
  }

  const context = matches
    .map((m, i) => `[${i + 1}] Source: ${m.sourceUrl}\n${m.content}`)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
  ];

  console.log("\nAnswer:\n");
  const answer = await chatComplete(messages);
  console.log(answer);
}

main().catch((err) => {
  console.error("Ask failed:", err);
  process.exit(1);
});
