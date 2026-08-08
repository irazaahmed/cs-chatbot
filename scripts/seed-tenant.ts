// Phase 1 dev helper: creates a test tenant and ingests a real site straight
// into the tenant-scoped Document table, so /api/chat can be curl-tested
// without auth/dashboard (those are Phase 3). Not the production ingestion
// path — that's the Job-queue + worker.js flow built in a later phase.
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { crawlSite } from "@/lib/crawl/crawler";
import { chunkContent } from "@/lib/crawl/chunk";
import { embedTexts } from "@/lib/ai/embed";
import { replaceDocuments, type DocumentChunk } from "@/lib/db/vector";
import { planPageCap } from "@/lib/billing/plans";

function generatePublicKey(): string {
  return `pk_live_${randomBytes(16).toString("hex")}`;
}

async function main() {
  const [websiteUrl, allowedDomain, maxPagesArg] = process.argv.slice(2);
  if (!websiteUrl || !allowedDomain) {
    console.error("Usage: npm run seed-tenant -- <websiteUrl> <allowedDomain> [maxPages]");
    process.exit(1);
  }

  const ownerEmail = "dev-seed@cybrumsolutions.dev";
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    create: { email: ownerEmail, name: "Dev Seed Owner" },
    update: {},
  });

  const planId = "starter";
  const maxPages = maxPagesArg ? Number(maxPagesArg) : planPageCap(planId);

  const tenant = await prisma.tenant.create({
    data: {
      ownerId: owner.id,
      name: new URL(websiteUrl).hostname,
      publicKey: generatePublicKey(),
      websiteUrl,
      allowedDomains: [allowedDomain],
      websiteEnabled: true,
      status: "active",
      planId,
      brandConfig: {
        color: "#1e88e8",
        botName: "Assistant",
        greeting: "Hi! How can I help?",
        position: "bottom-right",
      },
      systemPrompt: "You are a helpful support assistant for this website.",
      language: "en",
    },
  });

  console.log(`Created tenant ${tenant.id} (publicKey=${tenant.publicKey})`);
  console.log(`Crawling ${websiteUrl} (max ${maxPages} pages)...`);

  const pages = await crawlSite(websiteUrl, {
    maxPages,
    onProgress: (done, total, url) => {
      process.stdout.write(`\r  [${done}/${total}] ${url.slice(0, 80).padEnd(80)}`);
    },
  });
  process.stdout.write("\n");
  console.log(`Crawled ${pages.length} usable page(s).`);

  const chunks: { sourceUrl: string; title: string | null; content: string; tokenCount: number }[] = [];
  for (const page of pages) {
    for (const chunk of chunkContent(page.content)) {
      chunks.push({
        sourceUrl: page.url,
        title: page.title,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
      });
    }
  }
  console.log(`Built ${chunks.length} chunk(s). Embedding...`);

  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const documentChunks: DocumentChunk[] = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  await replaceDocuments(tenant.id, documentChunks);
  console.log(`Done. ${documentChunks.length} chunks stored for tenant ${tenant.id}.`);

  console.log(`\nTest with curl:\n`);
  console.log(`curl -N -X POST http://localhost:3000/api/chat \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "Origin: https://${allowedDomain}" \\`);
  console.log(
    `  -d '{"publicKey":"${tenant.publicKey}","sessionId":"test-1","message":"your question here"}'`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
