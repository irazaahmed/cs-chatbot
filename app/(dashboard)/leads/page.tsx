import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { ChannelBadge } from "../_components/channel-badge";
import { Table } from "@/components/dashboard/Table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { parseBrandConfig } from "@/lib/tenant/brand";
import { ChannelFilterForm } from "@/components/dashboard/ChannelFilterForm";
import { UserPlusIcon } from "@/components/dashboard/icons";

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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { channel } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id, ...(channel ? { channel } : {}) },
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted">
            Contact details visitors share with your chatbot.
          </p>
        </div>
        <ChannelFilterForm channel={channel} basePath="/leads" />
      </div>

      <div className="mt-6">
        {leads.length === 0 ? (
          <EmptyState
            icon={<UserPlusIcon className="h-[1.15rem] w-[1.15rem]" />}
            action={
              parseBrandConfig(tenant.brandConfig).leadCapture
                ? undefined
                : { href: "/customize", label: "Turn on lead capture" }
            }
          >
            No leads yet.
          </EmptyState>
        ) : (
          <Table>
            <Table.Head>
              <Table.Th>Name</Table.Th>
              <Table.Th>Channel</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Interested in</Table.Th>
              <Table.Th>Date</Table.Th>
            </Table.Head>
            <Table.Body>
              {leads.map((lead) => {
                // Prefer the LLM-extracted summary saved on the lead; fall
                // back to the conversation's first question for older rows
                // captured before we stored the interest directly.
                const interest =
                  lead.interest ||
                  (lead.conversationId ? interestById.get(lead.conversationId) : null);
                return (
                  <Table.Row key={lead.id}>
                    <Table.Td muted={false}>{lead.name || "—"}</Table.Td>
                    <Table.Td>
                      <ChannelBadge channel={lead.channel} />
                    </Table.Td>
                    <Table.Td>{lead.email || "—"}</Table.Td>
                    <Table.Td>{lead.phone || "—"}</Table.Td>
                    <Table.Td className="max-w-xs">
                      <span className="line-clamp-2" title={interest || undefined}>
                        {interest || "—"}
                      </span>
                    </Table.Td>
                    <Table.Td>{lead.createdAt.toLocaleDateString()}</Table.Td>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  );
}
