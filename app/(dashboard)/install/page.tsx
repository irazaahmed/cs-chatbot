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

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Install</h1>

      {!tenant.verified ? (
        <>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Verify you own {tenant.websiteUrl} before we crawl it. Pick one method.
          </p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              Verification failed. Make sure the change is live, then try again.
            </p>
          )}

          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="font-medium text-black dark:text-zinc-50">Meta tag</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Add this to the <code>&lt;head&gt;</code> of your homepage:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
                {`<meta name="cybrum-verify" content="${tenant.verifyToken}">`}
              </pre>
              <form action={verifyDomain} className="mt-3">
                <input type="hidden" name="method" value="meta" />
                <button
                  type="submit"
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-black"
                >
                  Verify with meta tag
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="font-medium text-black dark:text-zinc-50">File upload</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Create <code>/.well-known/cybrum-verify.txt</code> containing:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
                {tenant.verifyToken}
              </pre>
              <form action={verifyDomain} className="mt-3">
                <input type="hidden" name="method" value="file" />
                <button
                  type="submit"
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-black"
                >
                  Verify with file
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="font-medium text-black dark:text-zinc-50">DNS TXT record</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Add a TXT record:</p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
                {`cybrum-verify=${tenant.verifyToken}`}
              </pre>
              <form action={verifyDomain} className="mt-3">
                <input type="hidden" name="method" value="dns" />
                <button
                  type="submit"
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-black"
                >
                  Verify with DNS
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Domain verified. Add this script tag to every page of your site:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-100 p-4 text-xs dark:bg-zinc-900">
            {widgetSnippet}
          </pre>

          <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            {widgetDetected === true && (
              <p className="text-sm text-green-600 dark:text-green-400">Widget detected on your site.</p>
            )}
            {widgetDetected === false && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Widget not detected yet. Add the script tag above, then refresh this page.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
