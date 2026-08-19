import { prisma } from "@/lib/db/client";
import { ChannelBadge } from "./channel-badge";
import { Table } from "@/components/dashboard/Table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Badge } from "@/components/dashboard/Badge";
import { MessageSquareIcon } from "@/components/dashboard/icons";

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

export async function ConversationTable({
  tenantId,
  answeredOnly,
  channel,
}: {
  tenantId: string;
  answeredOnly?: boolean;
  channel?: string;
}) {
  const conversations = await prisma.conversation.findMany({
    where: {
      tenantId,
      ...(answeredOnly === false ? { answered: false } : {}),
      ...(channel ? { channel } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (conversations.length === 0) {
    return (
      <EmptyState
        action={{ href: "/install", label: "Install your widget" }}
        icon={<MessageSquareIcon className="h-[1.15rem] w-[1.15rem]" />}
      >
        No conversations yet.
      </EmptyState>
    );
  }

  return (
    <Table>
      <Table.Head>
        <Table.Th>First message</Table.Th>
        <Table.Th>Channel</Table.Th>
        <Table.Th>Messages</Table.Th>
        <Table.Th>Answered</Table.Th>
        <Table.Th>Tokens</Table.Th>
        <Table.Th>Date</Table.Th>
      </Table.Head>
      <Table.Body>
        {conversations.map((c) => (
          <Table.Row key={c.id}>
            <Table.Td muted={false} className="max-w-xs truncate">
              {firstUserMessage(c.messages) || "(empty)"}
            </Table.Td>
            <Table.Td>
              <ChannelBadge channel={c.channel} />
            </Table.Td>
            <Table.Td numeric>{messageCount(c.messages)}</Table.Td>
            <Table.Td>
              {c.answered ? (
                <Badge tone="success" dot>
                  Yes
                </Badge>
              ) : (
                <Badge tone="danger" dot>
                  No
                </Badge>
              )}
            </Table.Td>
            <Table.Td numeric>{c.inputTokens + c.outputTokens}</Table.Td>
            <Table.Td>{c.createdAt.toLocaleDateString()}</Table.Td>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
