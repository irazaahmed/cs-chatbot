import { unlink } from "node:fs/promises";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { planPageCap } from "@/lib/billing/plans";
import { detectUploadKind, readKnowledgeFile } from "@/lib/knowledge/file-storage";

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

const UPLOAD_ERRORS: Record<string, string> = {
  "1": "Choose a PDF or DOCX file first.",
  "2": "You're at your plan's page limit — remove something or upgrade before adding more.",
  "3": "That file couldn't be saved — make sure it's a PDF or DOCX under 10MB.",
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { error } = await searchParams;

  async function triggerRecrawl() {
    "use server";
    await prisma.job.create({
      data: { tenantId: tenant.id, type: "recrawl", status: "pending", payload: {} },
    });
    revalidatePath("/knowledge");
  }

  async function uploadDocument(formData: FormData) {
    "use server";
    const file = formData.get("document") as File | null;
    if (!file || file.size === 0) redirect("/knowledge?error=1");

    const kind = detectUploadKind(file);
    if (!kind) redirect("/knowledge?error=1");

    const pageCount = await prisma.document
      .findMany({ where: { tenantId: tenant.id }, select: { sourceUrl: true }, distinct: ["sourceUrl"] })
      .then((rows) => rows.length);
    if (pageCount >= planPageCap(tenant.planId)) redirect("/knowledge?error=2");

    let content: string;
    try {
      content = await readKnowledgeFile(file, kind);
    } catch {
      redirect("/knowledge?error=3");
    }

    await prisma.job.create({
      data: {
        tenantId: tenant.id,
        type: kind === "pdf" ? "pdf_ingest" : "docx_ingest",
        status: "pending",
        payload: { content, filename: file.name },
      },
    });
    revalidatePath("/knowledge");
  }

  async function deleteKnowledgeItem(formData: FormData) {
    "use server";
    const sourceUrl = String(formData.get("sourceUrl") ?? "");
    const kind = String(formData.get("kind") ?? "");
    if (!sourceUrl || !kind) return;

    const rows = await prisma.document.findMany({
      where: { tenantId: tenant.id, sourceUrl, kind },
      select: { filePath: true },
    });
    await prisma.document.deleteMany({ where: { tenantId: tenant.id, sourceUrl, kind } });
    for (const { filePath } of rows) {
      if (filePath) await unlink(filePath).catch(() => {});
    }
    revalidatePath("/knowledge");
  }

  const documents = await prisma.document.findMany({
    where: { tenantId: tenant.id },
    select: { sourceUrl: true, title: true, tokenCount: true, kind: true },
  });

  const pages = new Map<string, { title: string | null; chunkCount: number; tokenCount: number; kind: string }>();
  for (const doc of documents) {
    const existing = pages.get(doc.sourceUrl);
    if (existing) {
      existing.chunkCount += 1;
      existing.tokenCount += doc.tokenCount;
    } else {
      pages.set(doc.sourceUrl, { title: doc.title, chunkCount: 1, tokenCount: doc.tokenCount, kind: doc.kind });
    }
  }

  const latestJob = await prisma.job.findFirst({
    where: { tenantId: tenant.id, type: { in: ["crawl", "recrawl"] } },
    orderBy: { createdAt: "desc" },
  });
  const progress = latestJob ? parseProgress(latestJob.progress) : null;

  const latestUploadJob = await prisma.job.findFirst({
    where: { tenantId: tenant.id, type: { in: ["pdf_ingest", "docx_ingest"] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 text-sm text-muted">
            {pages.size} page(s), {documents.length} chunk(s) indexed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={uploadDocument} className="flex items-center gap-2">
            <input
              type="file"
              name="document"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
              className="max-w-[180px] text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent-bright hover:file:bg-accent/25"
            />
            <button
              type="submit"
              className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              Upload PDF or DOCX
            </button>
          </form>
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
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-danger-text">
          {UPLOAD_ERRORS[error] ?? "Something went wrong. Please try again."}
        </p>
      )}

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

      {latestUploadJob && (latestUploadJob.status === "pending" || latestUploadJob.status === "running") && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright" />
            <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.15s]" />
            <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.3s]" />
          </span>
          Processing uploaded document…
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
        {pages.size === 0 ? (
          <p className="p-6 text-sm text-muted">
            No pages indexed yet. Upload a PDF or DOCX above,{" "}
            {tenant.verified ? "or trigger a crawl." : "or verify your domain first on the Install tab to crawl your site."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/80 text-left text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Page</th>
                  <th className="px-5 py-3 font-medium">Chunks</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {Array.from(pages.entries()).map(([url, info]) => (
                  <tr key={url} className="border-t border-border transition-colors hover:bg-accent/5">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {info.kind === "web" ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent-bright"
                          >
                            {info.title || url}
                          </a>
                        ) : (
                          <span className="text-foreground">{info.title || url}</span>
                        )}
                        {info.kind !== "web" && (
                          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-bright">
                            {info.kind}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">{info.chunkCount}</td>
                    <td className="px-5 py-3 tabular-nums text-muted">{info.tokenCount}</td>
                    <td className="px-5 py-3 text-right">
                      <form action={deleteKnowledgeItem}>
                        <input type="hidden" name="sourceUrl" value={url} />
                        <input type="hidden" name="kind" value={info.kind} />
                        <button
                          type="submit"
                          className="rounded-full px-3 py-1 text-xs font-medium text-danger-text transition-colors hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
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
