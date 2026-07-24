// Phase 0 CLI: crawl a site, chunk it, embed it, store it.
// Usage: npm run ingest -- <url> [maxPages]
import { crawlSite } from "@/lib/crawl/crawler";
import { chunkContent } from "@/lib/crawl/chunk";
import { embedTexts } from "@/lib/ai/embed";
import { clearSite, insertChunks, type DocumentChunk } from "@/lib/db/vector";

async function main() {
  const [rawUrl, maxPagesArg] = process.argv.slice(2);
  if (!rawUrl) {
    console.error("Usage: npm run ingest -- <url> [maxPages]");
    process.exit(1);
  }

  const startUrl = new URL(rawUrl).toString();
  const site = new URL(startUrl).hostname;
  const maxPages = maxPagesArg ? Number(maxPagesArg) : undefined;

  console.log(`Crawling ${startUrl} (site=${site})...`);
  const pages = await crawlSite(startUrl, {
    maxPages,
    onProgress: (done, total, url) => {
      process.stdout.write(`\r  [${done}/${total}] ${url.slice(0, 80).padEnd(80)}`);
    },
  });
  process.stdout.write("\n");
  console.log(`Crawled ${pages.length} usable page(s).`);

  if (pages.length === 0) {
    console.log("Nothing to ingest.");
    return;
  }

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
    site,
    sourceUrl: chunk.sourceUrl,
    title: chunk.title,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
    embedding: embeddings[i],
  }));

  console.log(`Storing (replacing any existing data for site=${site})...`);
  await clearSite(site);
  await insertChunks(documentChunks);

  console.log(`Done. ${documentChunks.length} chunks stored for ${site}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Ingest failed:", err);
  process.exit(1);
});
