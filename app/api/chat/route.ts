import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { isOriginAllowed } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { checkTenantStatus, checkMonthlyUsage } from "@/lib/billing/status";
import { retrieveContext, buildMessages, hasUsableContext } from "@/lib/ai/rag";
import { chatStream, type ChatMessage } from "@/lib/ai/provider";

// Prisma's node-postgres adapter needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";

const ChatRequestSchema = z.object({
  publicKey: z.string().min(1),
  sessionId: z.string().min(1).max(200),
  message: z.string().min(1).max(4000),
});

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  ts: string;
}

function parseHistory(raw: unknown): StoredMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: StoredMessage[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      "content" in item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string"
    ) {
      messages.push(item as StoredMessage);
    }
  }
  return messages;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

function disabledResponse(message: string): Response {
  return Response.json({ disabled: true, message }, { status: 200 });
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof ChatRequestSchema>;
  try {
    body = ChatRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { publicKey: body.publicKey } });
  if (!tenant) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin, tenant.allowedDomains)) {
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const statusGate = checkTenantStatus(tenant.status);
  if (!statusGate.allowed) {
    return disabledResponse(statusGate.message ?? "Chat is temporarily unavailable.");
  }

  const usageGate = await checkMonthlyUsage(tenant.id, tenant.planId);
  if (!usageGate.allowed) {
    return disabledResponse(usageGate.message ?? "This chatbot has reached its monthly limit.");
  }

  const ip = getClientIp(request);
  const rateResult = await checkRateLimit(tenant.id, ip);
  if (!rateResult.allowed) {
    return Response.json({ error: rateResult.reason }, { status: 429 });
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, sessionId: body.sessionId },
    orderBy: { createdAt: "desc" },
  });
  const priorMessages = existingConversation ? parseHistory(existingConversation.messages) : [];

  const matches = await retrieveContext(tenant.id, body.message);
  const promptMessages: ChatMessage[] = buildMessages(
    tenant.systemPrompt,
    tenant.language,
    matches,
    priorMessages,
    body.message
  );
  const citations = Array.from(new Set(matches.map((m) => m.sourceUrl)));
  const answered = hasUsableContext(matches);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullAnswer = "";

      try {
        const generator = chatStream(promptMessages);
        let usage = { inputTokens: 0, outputTokens: 0 };

        while (true) {
          const { value, done } = await generator.next();
          if (done) {
            usage = value;
            break;
          }
          fullAnswer += value;
          controller.enqueue(encoder.encode(sseEvent({ token: value })));
        }

        controller.enqueue(encoder.encode(sseEvent({ done: true, citations, answered })));
        controller.close();

        const now = new Date().toISOString();
        const newMessages: StoredMessage[] = [
          ...priorMessages,
          { role: "user", content: body.message, ts: now },
          { role: "assistant", content: fullAnswer, citations, ts: now },
        ];

        const messagesJson = newMessages as unknown as Prisma.InputJsonValue;

        if (existingConversation) {
          await prisma.conversation.update({
            where: { id: existingConversation.id },
            data: {
              messages: messagesJson,
              answered,
              inputTokens: { increment: usage.inputTokens },
              outputTokens: { increment: usage.outputTokens },
            },
          });
        } else {
          await prisma.conversation.create({
            data: {
              tenantId: tenant.id,
              sessionId: body.sessionId,
              messages: messagesJson,
              answered,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            },
          });
        }
      } catch (err) {
        console.error("chat stream failed:", err instanceof Error ? err.message : err);
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

  return new Response(stream, { headers: SSE_HEADERS });
}
