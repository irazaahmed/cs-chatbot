// Standalone WhatsApp connector (mirrors worker.ts's pattern: a long-lived
// process next to the Next.js app, not a route. Baileys holds a persistent
// WebSocket per tenant, which a stateless request/response route can't do).
//
// Run with: npm run whatsapp-connector
//
// Responsibilities:
// 1. On boot, reopen a Baileys socket for every tenant whose WhatsAppAccount
//    is already "connected" (auth state lives in Postgres, see
//    lib/whatsapp/pg-auth-state.ts, no mounted volume needed).
// 2. Poll the existing Job table for "whatsapp_pair" jobs (same mechanism
//    /install already uses for "crawl" jobs) to start pairing a new tenant
//    and publish the QR code for the dashboard to show.
// 3. Watch for a WhatsAppAccount flipped to "disconnected" from the
//    dashboard (the /whatsapp page's Disconnect action) and tear down that
//    tenant's socket.
// 4. On every inbound WhatsApp message, run the exact same pipeline
//    app/api/chat/route.ts uses for the website widget: retrieval, prompt
//    building, OpenAI, lead/appointment capture, just non-streaming and
//    keyed by the sender's WhatsApp id instead of a browser sessionId.

import { Prisma } from "@prisma/client";
import type { Job } from "@prisma/client";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { prisma } from "./lib/db/client";
import { usePgAuthState } from "./lib/whatsapp/pg-auth-state";
import { retrieveContext, retrieveContactInfo, buildMessages, hasUsableContext } from "./lib/ai/rag";
import { chatComplete } from "./lib/ai/provider";
import { captureStructuredSignal } from "./lib/ai/capture";
import { looksLikeHumanHandoffRequest } from "./lib/ai/extract";
import { checkMonthlyUsage } from "./lib/billing/status";
import { parseBrandConfig } from "./lib/tenant/brand";
import { WHATSAPP_CONVERSATION_CAP } from "./lib/billing/plans";

const POLL_INTERVAL_MS = 5000;
const SUSPENDED_WHATSAPP_STATUSES = new Set(["suspended"]);

const sockets = new Map<string, WASocket>();
// Tenants that have had at least one QR shown during the current connection
// attempt. Baileys has no explicit "QR scanned" event, so the signal used
// for the "connecting" UI state is: we were showing a QR, and now got a
// connection.update with no fresh qr in it (see connection.update handler).
const qrShownTenants = new Set<string>();

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

function extractText(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;
  if (typeof m.conversation === "string") return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  return null;
}

function normalizePhoneNumber(waId: string | undefined): string | null {
  if (!waId) return null;
  return waId.split(":")[0].split("@")[0];
}

/** Turns the owner's "Talk to a human" field (Customize tab) into a WhatsApp
 * JID to notify, but only when it's actually a phone number — the same
 * field also accepts a URL or email for the website widget's button, which
 * this can't message. */
function humanContactJid(raw: string): string | null {
  const v = raw.trim();
  if (!v || /^(https?:|mailto:)/i.test(v)) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `${digits}@s.whatsapp.net`;
}

async function handleInboundMessage(tenantId: string, sock: WASocket, fromJid: string, text: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  if (!tenant.whatsappEnabled || SUSPENDED_WHATSAPP_STATUSES.has(tenant.whatsappStatus)) return;

  const sessionId = `whatsapp:${tenantId}:${fromJid}`;

  const usageGate = await checkMonthlyUsage(tenant.id, WHATSAPP_CONVERSATION_CAP, sessionId, "whatsapp");
  if (!usageGate.allowed) return;

  const existingConversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, sessionId },
    orderBy: { createdAt: "desc" },
  });
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
    console.error(`[whatsapp-connector] chatComplete failed for tenant ${tenantId}:`, err instanceof Error ? err.message : err);
    return;
  }
  if (!answer.trim()) return;

  await sock.sendMessage(fromJid, { text: answer });

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
        data: { tenantId: tenant.id, sessionId, messages: messagesJson, answered, channel: "whatsapp" },
      });

  await captureStructuredSignal({
    tenantId: tenant.id,
    leadCaptureEnabled,
    history: priorMessages,
    latestMessage: text,
    conversationId: conversationRecord.id,
    channel: "whatsapp",
  });

  await notifyHumanHandoff(tenant, sock, fromJid, text, conversationRecord.id, existingConversation?.humanNotifiedAt ?? null);
}

/** Proactively pings the owner's "Talk to a human" WhatsApp number when a
 * customer explicitly asks for one, since (unlike the website widget) a
 * WhatsApp visitor has no button to click. Best-effort and never throws into
 * the message-handling path; at most once per conversation thread so a
 * customer repeating the request doesn't spam the owner. */
async function notifyHumanHandoff(
  tenant: { id: string; brandConfig: unknown },
  sock: WASocket,
  fromJid: string,
  text: string,
  conversationId: string,
  alreadyNotifiedAt: Date | null
): Promise<void> {
  if (alreadyNotifiedAt) return;
  if (!looksLikeHumanHandoffRequest(text)) return;

  const jid = humanContactJid(parseBrandConfig(tenant.brandConfig).humanContact);
  if (!jid) return;

  try {
    const customerNumber = normalizePhoneNumber(fromJid) ?? fromJid;
    await sock.sendMessage(jid, {
      text:
        `A customer wants to talk to you on WhatsApp.\n\n` +
        `From: +${customerNumber}\n` +
        `Message: "${text}"`,
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { humanNotifiedAt: new Date() },
    });
  } catch (err) {
    console.error(`[whatsapp-connector] human handoff notify failed for tenant ${tenant.id}:`, err instanceof Error ? err.message : err);
  }
}

async function openSocketForTenant(tenantId: string): Promise<void> {
  if (sockets.has(tenantId)) return;

  // Named to match Baileys' own useMultiFileAuthState convention, not a React hook.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await usePgAuthState(tenantId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sockets.set(tenantId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrShownTenants.add(tenantId);
      const qrDataUrl = await QRCode.toDataURL(qr);
      await prisma.whatsAppAccount.update({
        where: { tenantId },
        data: { status: "pairing", qrCode: qrDataUrl },
      });
    } else if (connection === "connecting" && qrShownTenants.has(tenantId)) {
      // Phone scanned the QR. Baileys stops emitting `qr` and starts the
      // handshake, but stays "connecting" for several seconds before "open".
      await prisma.whatsAppAccount.update({
        where: { tenantId },
        data: { status: "connecting", qrCode: null },
      });
    }

    if (connection === "open") {
      qrShownTenants.delete(tenantId);
      // whatsappStatus/whatsappPeriodEnd (trial or paid) is set when the
      // tenant turns the channel on (lib/tenant/channels.ts), not here —
      // pairing a phone number is a separate step from activating billing.
      await prisma.whatsAppAccount.update({
        where: { tenantId },
        data: {
          status: "connected",
          qrCode: null,
          phoneNumber: normalizePhoneNumber(state.creds.me?.id),
          connectedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
      console.log(`[whatsapp-connector] tenant ${tenantId} connected`);
    }

    if (connection === "close") {
      sockets.delete(tenantId);
      qrShownTenants.delete(tenantId);
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const terminal = statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.connectionReplaced;

      if (terminal) {
        // WhatsApp has permanently invalidated this session (logged out, or
        // replaced by a newer login elsewhere) — the stored creds/keys in
        // authState are dead. Without clearing them, usePgAuthState would
        // hand the next connect attempt this same invalidated session,
        // so it would 401 again immediately.
        await prisma.whatsAppAccount.update({
          where: { tenantId },
          data: { status: "disconnected", qrCode: null, authState: Prisma.DbNull },
        });
        console.log(`[whatsapp-connector] tenant ${tenantId} disconnected (terminal, code ${statusCode})`);
      } else {
        console.log(`[whatsapp-connector] tenant ${tenantId} connection dropped (code ${statusCode}), reconnecting`);
        await openSocketForTenant(tenantId);
      }
    }
  });

  sock.ev.on("messages.upsert", ({ messages }) => {
    for (const m of messages) {
      if (m.key.fromMe) continue;
      if (m.key.remoteJid?.endsWith("@g.us")) continue; // ignore groups, DM only
      if (m.key.remoteJid?.endsWith("@broadcast")) continue; // ignore WhatsApp Status updates & broadcast lists, not real customers
      const fromJid = m.key.remoteJid;
      if (!fromJid) continue;
      const text = extractText(m);
      if (!text) continue;

      handleInboundMessage(tenantId, sock, fromJid, text).catch((err) =>
        console.error(`[whatsapp-connector] failed to handle message for tenant ${tenantId}:`, err instanceof Error ? err.message : err)
      );
    }
  });
}

async function closeSocketForTenant(tenantId: string): Promise<void> {
  const sock = sockets.get(tenantId);
  if (!sock) return;
  sockets.delete(tenantId);
  try {
    await sock.logout();
  } catch {
    // already gone
  }
}

async function claimNextPairingJob(): Promise<Job | null> {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: { status: "pending", type: "whatsapp_pair" },
      orderBy: { createdAt: "asc" },
    });
    if (!job) return null;

    return tx.job.update({
      where: { id: job.id },
      data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
    });
  });
}

async function processPairingJobs(): Promise<void> {
  const job = await claimNextPairingJob();
  if (!job) return;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: job.tenantId }, select: { whatsappEnabled: true } });
    if (!tenant?.whatsappEnabled) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", finishedAt: new Date(), error: "WhatsApp channel not turned on for this tenant" },
      });
      return;
    }

    await prisma.whatsAppAccount.upsert({
      where: { tenantId: job.tenantId },
      create: { tenantId: job.tenantId, status: "pairing" },
      update: { status: "pairing", qrCode: null },
    });

    await openSocketForTenant(job.tenantId);
    await prisma.job.update({ where: { id: job.id }, data: { status: "done", finishedAt: new Date() } });
  } catch (err) {
    console.error(`[whatsapp-connector] pairing job ${job.id} failed:`, err instanceof Error ? err.message : err);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "failed", finishedAt: new Date(), error: err instanceof Error ? err.message : String(err) },
    });
  }
}

/** Notices a tenant flipped to "disconnected" from the dashboard (Disconnect
 * button) while a socket is still open in this process, and tears it down. */
async function syncDisconnectedAccounts(): Promise<void> {
  if (sockets.size === 0) return;
  const active = await prisma.whatsAppAccount.findMany({
    where: { tenantId: { in: Array.from(sockets.keys()) }, status: "disconnected" },
    select: { tenantId: true },
  });
  await Promise.all(active.map((a) => closeSocketForTenant(a.tenantId)));
}

async function resumeConnectedAccounts(): Promise<void> {
  const accounts = await prisma.whatsAppAccount.findMany({
    where: { status: "connected", tenant: { whatsappEnabled: true } },
    select: { tenantId: true },
  });
  for (const account of accounts) {
    await openSocketForTenant(account.tenantId);
  }
  console.log(`[whatsapp-connector] resumed ${accounts.length} connected account(s)`);
}

async function tick(): Promise<void> {
  try {
    await processPairingJobs();
  } catch (err) {
    console.error("[whatsapp-connector] pairing job poll failed:", err instanceof Error ? err.message : err);
  }
  try {
    await syncDisconnectedAccounts();
  } catch (err) {
    console.error("[whatsapp-connector] disconnect sync failed:", err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  console.log(`[whatsapp-connector] started, polling every ${POLL_INTERVAL_MS / 1000}s`);
  await resumeConnectedAccounts();
  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

main();
