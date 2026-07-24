import { getCurrentTenant } from "@/lib/tenant/current";
import { ConversationTable } from "../_components/conversation-table";

export default async function UnansweredPage() {
  const { tenant } = await getCurrentTenant();

  return (
    <div>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Unanswered</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Questions your chatbot couldn&apos;t answer from your site content. Add this content to your
        site and recrawl, or adjust your system prompt.
      </p>
      <div className="mt-6">
        <ConversationTable tenantId={tenant.id} answeredOnly={false} />
      </div>
    </div>
  );
}
