import { randomUUID } from "node:crypto";

// The landing-page preview crawl (CLAUDE.md section 6 exception) isn't tied
// to a real tenant, so it can't live in the Document table — that column has
// a hard FK to Tenant. It's also explicitly "not stored permanently", so an
// in-process Map is the right amount of infrastructure: no Redis, no schema
// change, and it self-cleans on restart.

export interface PreviewChunk {
  sourceUrl: string;
  title: string | null;
  content: string;
  embedding: number[];
}

interface PreviewEntry {
  websiteUrl: string;
  chunks: PreviewChunk[];
  createdAt: number;
  messageCount: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes, long enough for a demo session
const MAX_ENTRIES = 50;

const store = new Map<string, PreviewEntry>();

function evictExpired(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, entry] of store) {
    if (entry.createdAt < cutoff) store.delete(id);
  }
}

function evictOldestIfFull(): void {
  if (store.size < MAX_ENTRIES) return;
  const oldest = [...store.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
  if (oldest) store.delete(oldest[0]);
}

export function createPreview(websiteUrl: string, chunks: PreviewChunk[]): string {
  evictExpired();
  evictOldestIfFull();
  const previewId = randomUUID();
  store.set(previewId, { websiteUrl, chunks, createdAt: Date.now(), messageCount: 0 });
  return previewId;
}

export function getPreview(previewId: string): PreviewEntry | null {
  evictExpired();
  return store.get(previewId) ?? null;
}

// Free-preview cap (3 questions) lives here rather than only in the client,
// so it can't be bypassed by calling the API directly.
const MAX_FREE_MESSAGES = 3;

export function incrementPreviewMessageCount(previewId: string): number | null {
  const entry = store.get(previewId);
  if (!entry) return null;
  entry.messageCount += 1;
  return entry.messageCount;
}

export function previewMessageLimitReached(messageCount: number): boolean {
  return messageCount > MAX_FREE_MESSAGES;
}

export interface PreviewMatch {
  sourceUrl: string;
  title: string | null;
  content: string;
  similarity: number;
}

const SIMILARITY_FLOOR = 0.3;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Brute-force cosine search — fine at preview scale (<=15 pages worth of chunks). */
export function searchPreview(previewId: string, queryEmbedding: number[], topK = 5): PreviewMatch[] {
  const entry = getPreview(previewId);
  if (!entry) return [];

  return entry.chunks
    .map((chunk) => ({
      sourceUrl: chunk.sourceUrl,
      title: chunk.title,
      content: chunk.content,
      similarity: cosineSimilarity(chunk.embedding, queryEmbedding),
    }))
    .filter((match) => match.similarity >= SIMILARITY_FLOOR)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
