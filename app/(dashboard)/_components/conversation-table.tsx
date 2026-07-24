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
      <p className="rounded-lg border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        No conversations yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-left text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-2 font-medium">First message</th>
            <th className="px-4 py-2 font-medium">Messages</th>
            <th className="px-4 py-2 font-medium">Answered</th>
            <th className="px-4 py-2 font-medium">Tokens</th>
            <th className="px-4 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((c) => (
            <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="max-w-xs truncate px-4 py-2 text-black dark:text-zinc-50">
                {firstUserMessage(c.messages) || "(empty)"}
              </td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{messageCount(c.messages)}</td>
              <td className="px-4 py-2">
                {c.answered ? (
                  <span className="text-green-600 dark:text-green-400">Yes</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">No</span>
                )}
              </td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                {c.inputTokens + c.outputTokens}
              </td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                {c.createdAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
