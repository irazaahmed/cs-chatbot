import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { retrieveContext, buildMessages, hasUsableContext } from "@/lib/ai/rag";
import { chatStream, type ChatMessage } from "@/lib/ai/provider";

export const runtime = "nodejs";

// Dashboard-only chat endpoint for the owner testing their own bot. Per
// CLAUDE.md section 5: "derive tenantId from the session (dashboard) or from
// publicKey (widget)" — session auth is the security boundary here, not the
// Origin allowlist (which holds the customer's website domains, not ours).
const RequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (!tenant) {
    return Response.json({ error: "No tenant found" }, { status: 404 });
  }

  const matches = await retrieveContext(tenant.id, body.message);
  const history: ChatMessage[] = (body.history ?? []).slice(-6);
  const promptMessages = buildMessages(tenant.systemPrompt, tenant.language, matches, history, body.message);
  const citations = Array.from(new Set(matches.map((m) => m.sourceUrl)));
  const answered = hasUsableContext(matches);

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
        controller.enqueue(encoder.encode(sseEvent({ done: true, citations, answered })));
        controller.close();
      } catch (err) {
        console.error("playground chat failed:", err instanceof Error ? err.message : err);
        try {
          controller.enqueue(encoder.encode(sseEvent({ error: "Something went wrong." })));
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
