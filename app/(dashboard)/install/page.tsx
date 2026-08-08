import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { enableWebsiteChannel, disableWebsiteChannel } from "@/lib/tenant/channels";
import { assertSafeUrl } from "@/lib/security/url";
import { fetchText } from "@/lib/crawl/fetch";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { error } = await searchParams;

  async function turnOnWebsite(formData: FormData) {
    "use server";
    const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
    if (!websiteUrl) redirect("/install?error=1");

    try {
      await enableWebsiteChannel(tenant.id, websiteUrl);
    } catch {
      redirect("/install?error=1");
    }
    revalidatePath("/install");
    redirect("/install");
  }

  async function turnOffWebsite() {
    "use server";
    await disableWebsiteChannel(tenant.id);
    revalidatePath("/install");
    redirect("/install");
  }

  const widgetSnippet = `<script\n  src="https://cdn.cybrumsolutions.dev/widget.js"\n  data-key="${tenant.publicKey}"\n  data-position="bottom-right"\n  defer\n></script>`;

  let widgetDetected: boolean | null = null;
  if (tenant.websiteEnabled) {
    try {
      const url = await assertSafeUrl(tenant.websiteUrl);
      const html = await fetchText(url.toString());
      widgetDetected = html ? html.includes(tenant.publicKey) : false;
    } catch {
      widgetDetected = false;
    }
  }

  const primaryButtonClass =
    "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]";
  const secondaryButtonClass =
    "rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-danger-text/60 hover:text-danger-text";
  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Website</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            tenant.websiteEnabled
              ? "border-emerald-400/30 bg-emerald-400/10 text-success-text"
              : "border-border bg-surface/60 text-muted"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tenant.websiteEnabled ? "animate-pulse-soft bg-emerald-400" : "bg-muted"}`} />
          {tenant.websiteEnabled ? "On" : "Off"}
        </span>
      </div>

      {!tenant.websiteEnabled ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Turn on the website channel to crawl your site and get an install snippet. Your first
            activation starts a 3-day trial.
          </p>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-danger-text">
              That doesn&apos;t look like a reachable website URL. Try again.
            </p>
          )}

          <form action={turnOnWebsite} className="glass mt-6 rounded-2xl p-6">
            <label htmlFor="websiteUrl" className="block text-sm font-medium">
              Your website URL
            </label>
            <input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              required
              defaultValue={tenant.websiteUrl}
              placeholder="https://yourbusiness.com"
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs text-muted">
              We&apos;ll crawl this site to train your chatbot and allow the widget to run on it. No
              ownership proof needed.
            </p>
            <button type="submit" className={`${primaryButtonClass} mt-4`}>
              Turn on Website
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Add this script tag to every page of your site:
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

          <form action={turnOffWebsite} className="mt-6">
            <button type="submit" className={secondaryButtonClass}>
              Turn off Website
            </button>
          </form>
        </>
      )}
    </div>
  );
}
