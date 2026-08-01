// Standalone job worker (CLAUDE.md section 3): polls the Job table every 5s
// and runs full crawls. Never a Next.js route — crawls run for minutes.
//
// Run with: npm run worker  (tsx, not plain `node worker.js` as the doc's
// literal example shows — lib/ is TypeScript with @/ path aliases that plain
// Node can't resolve without a build step; tsx is already how every other
// script in this repo runs, so this stays consistent rather than introducing
// a second toolchain just for this one file).
import { readFile } from "node:fs/promises";
import type { Job } from "@prisma/client";
import { prisma } from "./lib/db/client";
import { crawlSite } from "./lib/crawl/crawler";
import { chunkContent } from "./lib/crawl/chunk";
import { embedTexts } from "./lib/ai/embed";
import { replaceDocuments, replacePdfDocument, type DocumentChunk } from "./lib/db/vector";
import { planPageCap } from "./lib/billing/plans";
import { applyStatusLadder } from "./lib/billing/ladder";
import { purgeOldConversations, CONVERSATION_RETENTION_DAYS } from "./lib/retention";
import { extractText, getDocumentProxy } from "unpdf";

const POLL_INTERVAL_MS = 5000;
const STATUS_LADDER_INTERVAL_TICKS = 60; // ~5 minutes at 5s/tick — billing status isn't urgent
const RETENTION_INTERVAL_TICKS = 720; // ~1 hour at 5s/tick — retention isn't time-sensitive
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

async function processCrawlJob(job: Job): Promise<void> {
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

// PDF ingestion (CLAUDE.md-additive: a second knowledge source alongside the
// website crawl). sourceUrl for a PDF is a synthetic "pdf://<filename>"
// identifier (never a real fetchable URL) so it lines up with Document's
// existing sourceUrl column without a schema change beyond `kind`, and so
// re-uploading the same filename replaces just that file's chunks.
async function processPdfJob(job: Job): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: job.tenantId } });
  if (!tenant) throw new Error(`Tenant ${job.tenantId} not found`);

  const payload = job.payload as { filePath?: string; filename?: string } | null;
  if (!payload?.filePath || !payload.filename) throw new Error("pdf_ingest job missing filePath/filename");

  const fileBuffer = await readFile(payload.filePath);
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });

  const sourceUrl = `pdf://${payload.filename}`;
  const chunks = chunkContent(text).map((chunk) => ({
    sourceUrl,
    title: payload.filename ?? null,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
  }));

  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const documentChunks: DocumentChunk[] = chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] }));

  await replacePdfDocument(tenant.id, sourceUrl, documentChunks);

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "done", finishedAt: new Date(), progress: { done: 1, total: 1, currentUrl: payload.filename } },
  });
}

async function processJob(job: Job): Promise<void> {
  if (job.type === "pdf_ingest") {
    await processPdfJob(job);
  } else {
    await processCrawlJob(job);
  }
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

  if (tickCount % RETENTION_INTERVAL_TICKS === 0) {
    try {
      const purged = await purgeOldConversations();
      if (purged > 0) {
        console.log(`[worker] purged ${purged} conversation(s) older than ${CONVERSATION_RETENTION_DAYS} days`);
      }
    } catch (err) {
      console.error("[worker] conversation purge failed:", err instanceof Error ? err.message : err);
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
