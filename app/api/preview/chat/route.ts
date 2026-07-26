import { z } from "zod";
import { getClientIp } from "@/lib/security/ip";
import { checkPreviewChatRateLimit } from "@/lib/preview/rate-limit";
import {
  getPreview,
  incrementPreviewMessageCount,
  previewMessageLimitReached,
  searchPreview,
} from "@/lib/preview/store";
import { buildMessages, CONTACT_QUERY } from "@/lib/ai/rag";
import { embed, chatStream, type ChatMessage } from "@/lib/ai/provider";

export const runtime = "nodejs";

const HISTORY_LIMIT = 6;

const PreviewChatRequestSchema = z.object({
  previewId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

const PREVIEW_SYSTEM_PROMPT =
  "You are a demo assistant showing how an AI chatbot trained on this website would " +
  "answer visitor questions. Be friendly and concise.";

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof PreviewChatRequestSchema>;
  try {
    body = PreviewChatRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (!checkPreviewChatRateLimit(ip)) {
    return Response.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  const preview = getPreview(body.previewId);
  if (!preview) {
    return Response.json(
      { error: "This preview has expired. Please crawl the site again." },
      { status: 404 }
    );
  }

  const messageCount = incrementPreviewMessageCount(body.previewId);
  if (messageCount !== null && previewMessageLimitReached(messageCount)) {
    return Response.json({ error: "limit_reached" }, { status: 403 });
  }

  const queryEmbedding = await embed(body.message);
  const matches = searchPreview(body.previewId, queryEmbedding, 5);
  const contactEmbedding = await embed(CONTACT_QUERY);
  const contactMatches = searchPreview(body.previewId, contactEmbedding, 2);
  const history: ChatMessage[] = (body.history ?? []).slice(-HISTORY_LIMIT);
  const promptMessages = buildMessages(
    PREVIEW_SYSTEM_PROMPT,
    "en",
    matches,
    history,
    body.message,
    contactMatches
  );
  const citations = Array.from(new Set(matches.map((m) => m.sourceUrl)));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const generator = chatStream(promptMessages);
        while (true) {
          const { value, done } = await generator.next();
          if (done) break;
          controller.enqueue(encoder.encode(sseEvent({ token: value })));
        }
        controller.enqueue(
          encoder.encode(sseEvent({ done: true, citations, answered: matches.length > 0 }))
        );
        controller.close();
      } catch (err) {
        console.error("preview chat failed:", err instanceof Error ? err.message : err);
        try {
          controller.enqueue(
            encoder.encode(sseEvent({ error: "Something went wrong. Please try again." }))
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
