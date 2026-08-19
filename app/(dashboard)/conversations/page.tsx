import { getCurrentTenant } from "@/lib/tenant/current";
import { ConversationTable } from "../_components/conversation-table";
import { ChannelFilterForm } from "@/components/dashboard/ChannelFilterForm";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { channel } = await searchParams;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Conversations</h1>
          <p className="mt-1 text-sm text-muted">
            Every conversation your chatbot has had with visitors.
          </p>
        </div>
        <ChannelFilterForm channel={channel} basePath="/conversations" />
      </div>
      <div className="mt-6">
        <ConversationTable tenantId={tenant.id} channel={channel} />
      </div>
    </div>
  );
}
