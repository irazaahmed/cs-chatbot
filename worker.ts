// Standalone job worker (CLAUDE.md section 3): polls the Job table every 5s
// and runs full crawls. Never a Next.js route — crawls run for minutes.
//
// Run with: npm run worker  (tsx, not plain `node worker.js` as the doc's
// literal example shows — lib/ is TypeScript with @/ path aliases that plain
// Node can't resolve without a build step; tsx is already how every other
// script in this repo runs, so this stays consistent rather than introducing
// a second toolchain just for this one file).
import type { Job } from "@prisma/client";
import { prisma } from "./lib/db/client";
import { crawlSite } from "./lib/crawl/crawler";
import { chunkContent } from "./lib/crawl/chunk";
import { embedTexts } from "./lib/ai/embed";
import { replaceDocuments, type DocumentChunk } from "./lib/db/vector";
import { planPageCap } from "./lib/billing/status";
import { applyStatusLadder } from "./lib/billing/ladder";

const POLL_INTERVAL_MS = 5000;
const STATUS_LADDER_INTERVAL_TICKS = 60; // ~5 minutes at 5s/tick — billing status isn't urgent
let tickCount = 0;

async function claimNextJob(): Promise<Job | null> {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (!job) return null;

    return tx.job.update({
      where: { id: job.id },
      data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
    });
  });
}

async function processJob(job: Job): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: job.tenantId } });
  if (!tenant) throw new Error(`Tenant ${job.tenantId} not found`);

  const payload = job.payload as { url?: string } | null;
  const startUrl = payload?.url ?? tenant.websiteUrl;
  const maxPages = planPageCap(tenant.planId);

  const pages = await crawlSite(startUrl, {
    maxPages,
    onProgress: async (done, total, url) => {
      await prisma.job.update({
        where: { id: job.id },
        data: { progress: { done, total, currentUrl: url } },
      });
    },
  });

  const chunks: { sourceUrl: string; title: string | null; content: string; tokenCount: number }[] = [];
  for (const page of pages) {
    for (const chunk of chunkContent(page.content)) {
      chunks.push({ sourceUrl: page.url, title: page.title, content: chunk.content, tokenCount: chunk.tokenCount });
    }
  }

  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const documentChunks: DocumentChunk[] = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  await replaceDocuments(tenant.id, documentChunks);

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "done",
      finishedAt: new Date(),
      progress: { done: pages.length, total: pages.length, currentUrl: "" },
    },
  });
}

async function tick(): Promise<void> {
  if (tickCount % STATUS_LADDER_INTERVAL_TICKS === 0) {
    try {
      const changed = await applyStatusLadder();
      if (changed > 0) console.log(`[worker] status ladder updated ${changed} tenant(s)`);
    } catch (err) {
      console.error("[worker] status ladder check failed:", err instanceof Error ? err.message : err);
    }
  }
  tickCount++;

  let job: Job | null = null;
  try {
    job = await claimNextJob();
    if (!job) return;
    console.log(`[worker] processing job ${job.id} (${job.type}) for tenant ${job.tenantId}`);
    await processJob(job);
    console.log(`[worker] job ${job.id} done`);
  } catch (err) {
    console.error(`[worker] job ${job?.id ?? "?"} failed:`, err instanceof Error ? err.message : err);
    if (job) {
      await prisma.job
        .update({
          where: { id: job.id },
          data: { status: "failed", finishedAt: new Date(), error: err instanceof Error ? err.message : String(err) },
        })
        .catch((updateErr) => console.error("[worker] failed to record job failure:", updateErr));
    }
  }
}

console.log(`[worker] started, polling every ${POLL_INTERVAL_MS / 1000}s`);
tick();
setInterval(tick, POLL_INTERVAL_MS);
