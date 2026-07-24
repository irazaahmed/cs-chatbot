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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Knowledge</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {pages.size} page(s), {documents.length} chunk(s) indexed.
          </p>
        </div>
        <form action={triggerRecrawl}>
          <button
            type="submit"
            disabled={!tenant.verified}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
          >
            Recrawl site
          </button>
        </form>
      </div>

      {latestJob && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Last crawl: {latestJob.status}
          {latestJob.status === "running" && progress ? ` (${progress.done}/${progress.total})` : ""}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        {pages.size === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            No pages indexed yet.{" "}
            {tenant.verified ? "Trigger a crawl above." : "Verify your domain first on the Install tab."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Page</th>
                <th className="px-4 py-2 font-medium">Chunks</th>
                <th className="px-4 py-2 font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(pages.entries()).map(([url, info]) => (
                <tr key={url} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black underline dark:text-zinc-50"
                    >
                      {info.title || url}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{info.chunkCount}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{info.tokenCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
