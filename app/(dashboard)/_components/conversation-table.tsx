import { prisma } from "@/lib/db/client";

interface DisplayMessage {
  role: string;
  content: string;
}

function firstUserMessage(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  for (const item of raw as DisplayMessage[]) {
    if (item && typeof item === "object" && item.role === "user" && typeof item.content === "string") {
      return item.content;
    }
  }
  return "";
}

function messageCount(raw: unknown): number {
  return Array.isArray(raw) ? raw.length : 0;
}

export async function ConversationTable({ tenantId, answeredOnly }: { tenantId: string; answeredOnly?: boolean }) {
  const conversations = await prisma.conversation.findMany({
    where: { tenantId, ...(answeredOnly === false ? { answered: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (conversations.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
        No conversations yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/80 text-left text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">First message</th>
              <th className="px-5 py-3 font-medium">Messages</th>
              <th className="px-5 py-3 font-medium">Answered</th>
              <th className="px-5 py-3 font-medium">Tokens</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id} className="border-t border-border transition-colors hover:bg-accent/5">
                <td className="max-w-xs truncate px-5 py-3 text-foreground">
                  {firstUserMessage(c.messages) || "(empty)"}
                </td>
                <td className="px-5 py-3 tabular-nums text-muted">{messageCount(c.messages)}</td>
                <td className="px-5 py-3">
                  {c.answered ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-medium text-red-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      No
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 tabular-nums text-muted">
                  {c.inputTokens + c.outputTokens}
                </td>
                <td className="px-5 py-3 text-muted">
                  {c.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
