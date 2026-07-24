import { z } from "zod";
import { assertSafeUrl } from "@/lib/security/url";
import { getClientIp } from "@/lib/security/ip";
import { checkPreviewRateLimit } from "@/lib/preview/rate-limit";
import { crawlSite } from "@/lib/crawl/crawler";
import { chunkContent } from "@/lib/crawl/chunk";
import { embedTexts } from "@/lib/ai/embed";
import { createPreview, type PreviewChunk } from "@/lib/preview/store";

export const runtime = "nodejs";

// CLAUDE.md section 6 exception: the landing-page preview crawl is capped at
// 15 pages, doesn't require ownership verification, and isn't stored
// permanently against a tenant (see lib/preview/store.ts).
const PREVIEW_PAGE_CAP = 15;

const PreviewRequestSchema = z.object({ url: z.string().url() });

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof PreviewRequestSchema>;
  try {
    body = PreviewRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (!checkPreviewRateLimit(ip)) {
    return Response.json(
      { error: "Too many previews from this IP. Please try again later." },
      { status: 429 }
    );
  }

  let startUrl: string;
  try {
    startUrl = (await assertSafeUrl(body.url)).toString();
  } catch {
    return Response.json({ error: "That URL can't be crawled." }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const pages = await crawlSite(startUrl, {
          maxPages: PREVIEW_PAGE_CAP,
          onProgress: (done, total, url) => {
            controller.enqueue(encoder.encode(sseEvent({ type: "progress", done, total, url })));
          },
        });

        if (pages.length === 0) {
          controller.enqueue(
            encoder.encode(
              sseEvent({ type: "error", message: "Couldn't find any readable pages on that site." })
            )
          );
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(sseEvent({ type: "embedding" })));

        const chunks: { sourceUrl: string; title: string | null; content: string }[] = [];
        for (const page of pages) {
          for (const chunk of chunkContent(page.content)) {
            chunks.push({ sourceUrl: page.url, title: page.title, content: chunk.content });
          }
        }

        const embeddings = await embedTexts(chunks.map((c) => c.content));
        const previewChunks: PreviewChunk[] = chunks.map((chunk, i) => ({
          ...chunk,
          embedding: embeddings[i],
        }));

        const previewId = createPreview(startUrl, previewChunks);
        controller.enqueue(
          encoder.encode(sseEvent({ type: "ready", previewId, pageCount: pages.length }))
        );
        controller.close();
      } catch (err) {
        console.error("preview crawl failed:", err instanceof Error ? err.message : err);
        try {
          controller.enqueue(
            encoder.encode(sseEvent({ type: "error", message: "Something went wrong during the crawl." }))
          );
          controller.close();
        } catch {
          // controller already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
