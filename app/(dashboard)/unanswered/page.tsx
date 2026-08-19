import { getCurrentTenant } from "@/lib/tenant/current";
import { ConversationTable } from "../_components/conversation-table";
import { ChannelFilterForm } from "@/components/dashboard/ChannelFilterForm";

export default async function UnansweredPage({
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
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Unanswered</h1>
          <p className="mt-1 text-sm text-muted">
            Questions your chatbot couldn&apos;t answer from your site content. Add this content to your
            site and recrawl, or adjust your system prompt.
          </p>
        </div>
        <ChannelFilterForm channel={channel} basePath="/unanswered" />
      </div>
      <div className="mt-6">
        <ConversationTable tenantId={tenant.id} answeredOnly={false} channel={channel} />
      </div>
    </div>
  );
}
