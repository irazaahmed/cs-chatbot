import { getCurrentTenant } from "@/lib/tenant/current";
import { ConversationTable } from "../_components/conversation-table";

export default async function ConversationsPage() {
  const { tenant } = await getCurrentTenant();

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Conversations</h1>
      <p className="mt-1 text-sm text-muted">
        Every conversation your chatbot has had with visitors.
      </p>
      <div className="mt-6">
        <ConversationTable tenantId={tenant.id} />
      </div>
    </div>
  );
}
