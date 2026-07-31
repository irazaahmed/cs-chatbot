import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

// Pulls the visitor's first question out of a conversation transcript so the
// owner can see what a lead was actually interested in, not just their number.
function firstVisitorQuestion(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      "content" in item &&
      item.role === "user" &&
      typeof item.content === "string" &&
      item.content.trim().length > 0
    ) {
      return (item as StoredMessage).content.trim();
    }
  }
  return null;
}

export default async function LeadsPage() {
  const { tenant } = await getCurrentTenant();

  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // One scoped query for the linked conversations, then match in memory —
  // avoids an N+1 lookup per lead row.
  const conversationIds = leads
    .map((l) => l.conversationId)
    .filter((id): id is string => Boolean(id));
  const conversations = conversationIds.length
    ? await prisma.conversation.findMany({
        where: { tenantId: tenant.id, id: { in: conversationIds } },
        select: { id: true, messages: true },
      })
    : [];
  const interestById = new Map(
    conversations.map((c) => [c.id, firstVisitorQuestion(c.messages)])
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Leads</h1>
      <p className="mt-1 text-sm text-muted">
        Contact details visitors share with your chatbot.
      </p>

      <div className="mt-6">
        {leads.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
            No leads yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/80 text-left text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Interested in</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const interest = lead.conversationId
                      ? interestById.get(lead.conversationId)
                      : null;
                    return (
                      <tr key={lead.id} className="border-t border-border transition-colors hover:bg-accent/5">
                        <td className="px-5 py-3 text-foreground">{lead.name || "—"}</td>
                        <td className="px-5 py-3 text-muted">{lead.email || "—"}</td>
                        <td className="px-5 py-3 text-muted">{lead.phone || "—"}</td>
                        <td className="max-w-xs px-5 py-3 text-muted">
                          <span className="line-clamp-2" title={interest || undefined}>
                            {interest || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {lead.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
