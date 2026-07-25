import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";

interface JobProgress {
  done: number;
  total: number;
  currentUrl: string;
}

function parseProgress(raw: unknown): JobProgress | null {
  if (
    raw &&
    typeof raw === "object" &&
    "done" in raw &&
    "total" in raw &&
    typeof raw.done === "number" &&
    typeof raw.total === "number"
  ) {
    return { done: raw.done, total: raw.total, currentUrl: "currentUrl" in raw ? String(raw.currentUrl) : "" };
  }
  return null;
}

export default async function KnowledgePage() {
  const { tenant } = await getCurrentTenant();

  async function triggerRecrawl() {
    "use server";
    await prisma.job.create({
      data: { tenantId: tenant.id, type: "recrawl", status: "pending", payload: {} },
    });
    revalidatePath("/knowledge");
  }

  const documents = await prisma.document.findMany({
    where: { tenantId: tenant.id },
    select: { sourceUrl: true, title: true, tokenCount: true },
  });

  const pages = new Map<string, { title: string | null; chunkCount: number; tokenCount: number }>();
  for (const doc of documents) {
    const existing = pages.get(doc.sourceUrl);
    if (existing) {
      existing.chunkCount += 1;
      existing.tokenCount += doc.tokenCount;
    } else {
      pages.set(doc.sourceUrl, { title: doc.title, chunkCount: 1, tokenCount: doc.tokenCount });
    }
  }

  const latestJob = await prisma.job.findFirst({
    where: { tenantId: tenant.id, type: { in: ["crawl", "recrawl"] } },
    orderBy: { createdAt: "desc" },
  });
  const progress = latestJob ? parseProgress(latestJob.progress) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 text-sm text-muted">
            {pages.size} page(s), {documents.length} chunk(s) indexed.
          </p>
        </div>
        <form action={triggerRecrawl}>
          <button
            type="submit"
            disabled={!tenant.verified}
            className="btn-sheen rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)] disabled:opacity-40"
          >
            Recrawl site
          </button>
        </form>
      </div>

      {latestJob && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          {latestJob.status === "running" && (
            <span className="flex items-center gap-1">
              <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright" />
              <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.15s]" />
              <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.3s]" />
            </span>
          )}
          Last crawl: {latestJob.status}
          {latestJob.status === "running" && progress ? ` (${progress.done}/${progress.total})` : ""}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
        {pages.size === 0 ? (
          <p className="p-6 text-sm text-muted">
            No pages indexed yet.{" "}
            {tenant.verified ? "Trigger a crawl above." : "Verify your domain first on the Install tab."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/80 text-left text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Page</th>
                  <th className="px-5 py-3 font-medium">Chunks</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(pages.entries()).map(([url, info]) => (
                  <tr key={url} className="border-t border-border transition-colors hover:bg-accent/5">
                    <td className="px-5 py-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent-bright"
                      >
                        {info.title || url}
                      </a>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">{info.chunkCount}</td>
                    <td className="px-5 py-3 tabular-nums text-muted">{info.tokenCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
