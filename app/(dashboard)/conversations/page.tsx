import { getCurrentTenant } from "@/lib/tenant/current";
import { ConversationTable } from "../_components/conversation-table";

export default async function ConversationsPage() {
  const { tenant } = await getCurrentTenant();

  return (
    <div>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Conversations</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Every conversation your chatbot has had with visitors.
      </p>
      <div className="mt-6">
        <ConversationTable tenantId={tenant.id} />
      </div>
    </div>
  );
}
