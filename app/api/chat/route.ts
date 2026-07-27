import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { isOriginAllowed } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";
import { checkTenantStatus, checkMonthlyUsage } from "@/lib/billing/status";
import { retrieveContext, retrieveContactInfo, buildMessages, hasUsableContext } from "@/lib/ai/rag";
import { looksLikeContactOrBookingSignal, extractStructuredSignal } from "@/lib/ai/extract";
import { chatStream, type ChatMessage } from "@/lib/ai/provider";
import { corsHeaders, corsPreflightResponse } from "@/lib/security/cors";

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

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function OPTIONS(request: Request): Promise<Response> {
  return corsPreflightResponse(request);
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  const json = (data: unknown, status: number) =>
    Response.json(data, { status, headers: cors });
  const disabledResponse = (message: string) => json({ disabled: true, message }, 200);

  let body: z.infer<typeof ChatRequestSchema>;
  try {
    body = ChatRequestSchema.parse(await request.json());
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const tenant = await prisma.tenant.findUnique({ where: { publicKey: body.publicKey } });
  if (!tenant) {
    return json({ error: "Not found" }, 404);
  }

  if (!isOriginAllowed(origin, tenant.allowedDomains)) {
    return json({ error: "Origin not allowed" }, 403);
  }

  const statusGate = checkTenantStatus(tenant.status);
  if (!statusGate.allowed) {
    return disabledResponse(statusGate.message ?? "Chat is temporarily unavailable.");
  }

  const usageGate = await checkMonthlyUsage(tenant.id, tenant.planId, body.sessionId);
  if (!usageGate.allowed) {
    return disabledResponse(usageGate.message ?? "This chatbot has reached its monthly limit.");
  }

  const ip = getClientIp(request);
  const rateResult = await checkRateLimit(tenant.id, ip);
  if (!rateResult.allowed) {
    return json({ error: rateResult.reason }, 429);
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, sessionId: body.sessionId },
    orderBy: { createdAt: "desc" },
  });
  const priorMessages = existingConversation ? parseHistory(existingConversation.messages) : [];

  const matches = await retrieveContext(tenant.id, body.message);
  const contactMatches = await retrieveContactInfo(tenant.id);
  const promptMessages: ChatMessage[] = buildMessages(
    tenant.systemPrompt,
    tenant.language,
    matches,
    priorMessages,
    body.message,
    contactMatches
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

        const conversationRecord = existingConversation
          ? await prisma.conversation.update({
              where: { id: existingConversation.id },
              data: {
                messages: messagesJson,
                answered,
                inputTokens: { increment: usage.inputTokens },
                outputTokens: { increment: usage.outputTokens },
              },
            })
          : await prisma.conversation.create({
              data: {
                tenantId: tenant.id,
                sessionId: body.sessionId,
                messages: messagesJson,
                answered,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
              },
            });

        // Separate from the answer itself and never allowed to affect it —
        // this runs after the response is already streamed and saved. Only
        // fires the extra LLM call when the visitor's message plausibly
        // contains contact info or a booking request.
        try {
          if (looksLikeContactOrBookingSignal(body.message)) {
            const signal = await extractStructuredSignal(priorMessages, body.message);
            if (signal.type === "lead") {
              const already = await prisma.lead.findFirst({
                where: { conversationId: conversationRecord.id },
              });
              if (!already) {
                await prisma.lead.create({
                  data: {
                    tenantId: tenant.id,
                    name: signal.name,
                    email: signal.contact?.includes("@") ? signal.contact : null,
                    phone: signal.contact && !signal.contact.includes("@") ? signal.contact : null,
                    conversationId: conversationRecord.id,
                  },
                });
              }
            } else if (signal.type === "appointment") {
              const already = await prisma.appointment.findFirst({
                where: { conversationId: conversationRecord.id },
              });
              if (!already) {
                await prisma.appointment.create({
                  data: {
                    tenantId: tenant.id,
                    name: signal.name,
                    contact: signal.contact,
                    requestedTime: signal.requestedTime,
                    notes: signal.notes,
                    conversationId: conversationRecord.id,
                  },
                });
              }
            }
          }
        } catch (err) {
          console.error("structured signal extraction failed:", err instanceof Error ? err.message : err);
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

  return new Response(stream, { headers: { ...SSE_HEADERS, ...cors } });
}
