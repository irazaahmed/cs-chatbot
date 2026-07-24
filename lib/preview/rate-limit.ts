// Public, unauthenticated endpoint that triggers a real crawl + real OpenAI
// calls — needs abuse protection even before any tenant exists. In-memory is
// fine here: it's a courtesy limit on a free demo, not a tenant-isolation
// boundary, so it doesn't need Postgres-backed durability across restarts.

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PREVIEWS_PER_IP = 5;
const MAX_PREVIEW_MESSAGES_PER_IP = 30;

const buckets = new Map<string, number[]>();

function checkLimit(bucketKey: string, max: number): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = (buckets.get(bucketKey) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= max) {
    buckets.set(bucketKey, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(bucketKey, timestamps);
  return true;
}

export function checkPreviewRateLimit(ip: string): boolean {
  return checkLimit(`crawl:${ip}`, MAX_PREVIEWS_PER_IP);
}

export function checkPreviewChatRateLimit(ip: string): boolean {
  return checkLimit(`chat:${ip}`, MAX_PREVIEW_MESSAGES_PER_IP);
}
