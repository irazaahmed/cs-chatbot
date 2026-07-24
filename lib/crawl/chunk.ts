const CHUNK_TOKENS = 800;
const OVERLAP_TOKENS = 150;
const CHARS_PER_TOKEN = 4; // rough English-text heuristic, good enough without a tokenizer dep

const SENTENCE_SPLIT = /(?<=[.!?۔])\s+/;

export interface Chunk {
  content: string;
  tokenCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Splits content into ~800 token chunks with ~150 token overlap, never
 * splitting mid-sentence. Token counts are estimated from character length
 * (no tokenizer dependency) — fine for sizing chunks, not for billing.
 */
export function chunkContent(content: string): Chunk[] {
  const sentences = content
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  // Every iteration consumes exactly one sentence (i always advances), so
  // this terminates even if a single sentence alone exceeds CHUNK_TOKENS or
  // the carried-over overlap plus the next sentence still overflows.
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > CHUNK_TOKENS && current.length > 0) {
      chunks.push(finalize(current));

      // carry trailing sentences into the next chunk for overlap
      let overlapTokens = 0;
      const overlapSentences: string[] = [];
      for (let j = current.length - 1; j >= 0 && overlapTokens < OVERLAP_TOKENS; j--) {
        overlapSentences.unshift(current[j]);
        overlapTokens += estimateTokens(current[j]);
      }
      current = overlapSentences;
      currentTokens = overlapTokens;
    }

    current.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (current.length > 0) chunks.push(finalize(current));

  return chunks;
}

function finalize(sentences: string[]): Chunk {
  const content = sentences.join(" ");
  return { content, tokenCount: estimateTokens(content) };
}
