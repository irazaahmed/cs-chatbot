import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { verifyMetaSignature } from "@/lib/security/meta-webhook";
import { retrieveContext, retrieveContactInfo, buildMessages, hasUsableContext } from "@/lib/ai/rag";
import { chatComplete } from "@/lib/ai/provider";
import { captureStructuredSignal } from "@/lib/ai/capture";
import { checkMonthlyUsage } from "@/lib/billing/status";
import { INSTAGRAM_CONVERSATION_CAP } from "@/lib/billing/plans";
import { parseBrandConfig } from "@/lib/tenant/brand";
import { resolveChannelSession } from "@/lib/ai/session";
import { sendInstagramMessage } from "@/lib/instagram/send";

export const runtime = "nodejs";

// Instagram needs no standalone connector process like WhatsApp's Baileys
// socket — Meta pushes messages to this webhook, and the reply pipeline
// (retrieval, prompt, LLM, lead/appointment capture) runs inline per
// delivery, same logic whatsapp-connector.mts runs per inbound message.

const SUSPENDED_INSTAGRAM_STATUSES = new Set(["suspended"]);

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
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
      messages.push({
        role: item.role,
        content: item.content,
        ts: "ts" in item && typeof item.ts === "string" ? item.ts : new Date().toISOString(),
      });
    }
  }
  return messages;
}

interface InstagramMessagingEvent {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean };
}

interface InstagramWebhookEntry {
  id?: string;
  messaging?: InstagramMessagingEvent[];
}

interface InstagramWebhookPayload {
  object?: string;
  entry?: InstagramWebhookEntry[];
}

/** Meta's one-time subscription handshake, done once in the App Dashboard
 * (not per tenant) — echoes hub.challenge back as plain text when
 * hub.verify_token matches INSTAGRAM_WEBHOOK_VERIFY_TOKEN. */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Raw text, not .json() — the HMAC must be computed over the exact bytes
  // Meta signed; re-serializing a parsed object could produce different bytes.
  const rawBody = await request.text();
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appSecret || !verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    console.error("[instagram-webhook] signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Always resolve 200 past this point. Meta retries non-2xx deliveries and
  // disables the webhook subscription after sustained failures, so an
  // internal error here must never surface as a delivery failure to Meta.
  try {
    for (const entry of payload.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        await handleInboundEvent(entry.id, event);
      }
    }
  } catch (err) {
    console.error("[instagram-webhook] handling failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ success: true });
}

async function handleInboundEvent(igUserId: string | undefined, event: InstagramMessagingEvent): Promise<void> {
  const senderId = event.sender?.id;
  const text = event.message?.text;
  // Meta echoes our own replies back through this same webhook — without
  // this guard the bot would treat its own answer as new inbound and loop.
  if (!igUserId || !senderId || !text || event.message?.is_echo) return;

  const account = await prisma.instagramAccount.findUnique({ where: { igUserId } });
  if (!account || !account.accessToken) return;

  const tenant = await prisma.tenant.findUnique({ where: { id: account.tenantId } });
  if (!tenant) return;
  if (!tenant.instagramEnabled || SUSPENDED_INSTAGRAM_STATUSES.has(tenant.instagramStatus)) return;

  const { existingConversation, sessionId } = await resolveChannelSession(tenant.id, "instagram", senderId);

  const usageGate = await checkMonthlyUsage(tenant.id, INSTAGRAM_CONVERSATION_CAP, sessionId, "instagram");
  if (!usageGate.allowed) return;

  const priorMessages = existingConversation ? parseHistory(existingConversation.messages) : [];
  const leadCaptureEnabled = parseBrandConfig(tenant.brandConfig).leadCapture;

  const matches = await retrieveContext(tenant.id, text);
  const contactMatches = await retrieveContactInfo(tenant.id);
  const promptMessages = buildMessages(
    tenant.systemPrompt,
    tenant.language,
    matches,
    priorMessages,
    text,
    contactMatches,
    leadCaptureEnabled
  );
  const answered = hasUsableContext(matches);

  let answer: string;
  try {
    answer = await chatComplete(promptMessages);
  } catch (err) {
    console.error(`[instagram-webhook] chatComplete failed for tenant ${tenant.id}:`, err instanceof Error ? err.message : err);
    return;
  }
  if (!answer.trim()) return;

  try {
    await sendInstagramMessage(account.accessToken, senderId, answer);
  } catch (err) {
    console.error(`[instagram-webhook] send failed for tenant ${tenant.id}:`, err instanceof Error ? err.message : err);
    return;
  }

  const now = new Date().toISOString();
  const newMessages: StoredMessage[] = [
    ...priorMessages,
    { role: "user", content: text, ts: now },
    { role: "assistant", content: answer, ts: now },
  ];
  const messagesJson = newMessages as unknown as Prisma.InputJsonValue;

  const conversationRecord = existingConversation
    ? await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { messages: messagesJson, answered },
      })
    : await prisma.conversation.create({
        data: { tenantId: tenant.id, sessionId, messages: messagesJson, answered, channel: "instagram" },
      });

  await captureStructuredSignal({
    tenantId: tenant.id,
    leadCaptureEnabled,
    history: priorMessages,
    latestMessage: text,
    conversationId: conversationRecord.id,
    channel: "instagram",
  });
}
