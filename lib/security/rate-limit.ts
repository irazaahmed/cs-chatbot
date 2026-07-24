import { prisma } from "@/lib/db/client";

// Postgres-backed fixed-window limiter (CLAUDE.md section 10: "Postgres-backed
// counter is fine at this scale"). One bucket per (tenant, key, minute).

const WINDOW_MS = 60_000;
const TENANT_LIMIT_PER_MINUTE = 60;
const IP_LIMIT_PER_MINUTE = 20;

function currentWindowStart(): Date {
  const now = Date.now();
  return new Date(now - (now % WINDOW_MS));
}

async function hitBucket(tenantId: string, key: string, limit: number): Promise<boolean> {
  const windowStart = currentWindowStart();
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { tenantId_key_windowStart: { tenantId, key, windowStart } },
    create: { tenantId, key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  return bucket.count <= limit;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

export async function checkRateLimit(tenantId: string, ip: string): Promise<RateLimitResult> {
  const ipOk = await hitBucket(tenantId, `ip:${ip}`, IP_LIMIT_PER_MINUTE);
  if (!ipOk) {
    return { allowed: false, reason: "Too many requests from this visitor. Please try again shortly." };
  }

  const tenantOk = await hitBucket(tenantId, "tenant", TENANT_LIMIT_PER_MINUTE);
  if (!tenantOk) {
    return { allowed: false, reason: "This chatbot is receiving too many messages right now. Please try again shortly." };
  }

  return { allowed: true };
}
