import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { verifyOwnership, type VerifyMethod } from "@/lib/tenant/verify";
import { assertSafeUrl } from "@/lib/security/url";
import { fetchText } from "@/lib/crawl/fetch";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { error } = await searchParams;

  async function verifyDomain(formData: FormData) {
    "use server";
    const method = String(formData.get("method")) as VerifyMethod;
    const ok = await verifyOwnership(tenant.websiteUrl, tenant.verifyToken, method);
    if (!ok) {
      redirect("/install?error=1");
    }

    const hostname = new URL(tenant.websiteUrl).hostname;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        verified: true,
        verifyMethod: method,
        allowedDomains: { push: hostname },
      },
    });
    await prisma.job.create({
      data: { tenantId: tenant.id, type: "crawl", status: "pending", payload: { url: tenant.websiteUrl } },
    });
    revalidatePath("/install");
    redirect("/install");
  }

  const widgetSnippet = `<script\n  src="https://cdn.cybrumsolutions.dev/widget.js"\n  data-key="${tenant.publicKey}"\n  data-position="bottom-right"\n  defer\n></script>`;

  let widgetDetected: boolean | null = null;
  if (tenant.verified) {
    try {
      const url = await assertSafeUrl(tenant.websiteUrl);
      const html = await fetchText(url.toString());
      widgetDetected = html ? html.includes(tenant.publicKey) : false;
    } catch {
      widgetDetected = false;
    }
  }

  const verifyButtonClass =
    "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]";
  const codeBlockClass =
    "mt-2 overflow-x-auto rounded-xl border border-border bg-surface/80 p-3.5 text-xs text-accent-bright";

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Connect Your Website</h1>

      {!tenant.verified ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Verify you own {tenant.websiteUrl} before we crawl it. Pick one method.
          </p>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-danger-text">
              Verification failed. Make sure the change is live, then try again.
            </p>
          )}

          <div className="mt-6 space-y-5">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-heading font-semibold">Meta tag</h2>
              <p className="mt-1 text-sm text-muted">
                Add this to the <code className="text-accent-bright">&lt;head&gt;</code> of your homepage:
              </p>
              <pre className={codeBlockClass}>
                {`<meta name="cybrum-verify" content="${tenant.verifyToken}">`}
              </pre>
              <form action={verifyDomain} className="mt-4">
                <input type="hidden" name="method" value="meta" />
                <button type="submit" className={verifyButtonClass}>
                  Verify with meta tag
                </button>
              </form>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="font-heading font-semibold">File upload</h2>
              <p className="mt-1 text-sm text-muted">
                Create <code className="text-accent-bright">/.well-known/cybrum-verify.txt</code> containing:
              </p>
              <pre className={codeBlockClass}>{tenant.verifyToken}</pre>
              <form action={verifyDomain} className="mt-4">
                <input type="hidden" name="method" value="file" />
                <button type="submit" className={verifyButtonClass}>
                  Verify with file
                </button>
              </form>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="font-heading font-semibold">DNS TXT record</h2>
              <p className="mt-1 text-sm text-muted">Add a TXT record:</p>
              <pre className={codeBlockClass}>{`cybrum-verify=${tenant.verifyToken}`}</pre>
              <form action={verifyDomain} className="mt-4">
                <input type="hidden" name="method" value="dns" />
                <button type="submit" className={verifyButtonClass}>
                  Verify with DNS
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Domain verified. Add this script tag to every page of your site:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface/80 p-5 text-xs leading-relaxed text-accent-bright">
            {widgetSnippet}
          </pre>

          <div className="mt-6">
            {widgetDetected === true && (
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-success-text">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-400" />
                Widget detected on your site.
              </p>
            )}
            {widgetDetected === false && (
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-warning-text">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Widget not detected yet. Add the script tag above, then refresh this page.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
