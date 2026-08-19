import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { enableWebsiteChannel, disableWebsiteChannel } from "@/lib/tenant/channels";
import { assertSafeUrl } from "@/lib/security/url";
import { fetchText } from "@/lib/crawl/fetch";
import { Card } from "@/components/dashboard/Card";
import { Badge } from "@/components/dashboard/Badge";
import { Button } from "@/components/dashboard/Button";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { Input } from "@/components/dashboard/Input";
import { Label } from "@/components/dashboard/Label";

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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Website</h1>
        <Badge tone={tenant.websiteEnabled ? "success" : "neutral"} size="md" dot pulse={tenant.websiteEnabled}>
          {tenant.websiteEnabled ? "On" : "Off"}
        </Badge>
      </div>

      {!tenant.websiteEnabled ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Turn on the website channel to crawl your site and get an install snippet. Your first
            activation starts a 3-day trial.
          </p>

          {error && (
            <div className="mt-4">
              <StatusBanner tone="danger">That doesn&apos;t look like a reachable website URL. Try again.</StatusBanner>
            </div>
          )}

          <Card className="mt-6">
            <form action={turnOnWebsite}>
              <Label htmlFor="websiteUrl">Your website URL</Label>
              <Input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                required
                defaultValue={tenant.websiteUrl}
                placeholder="https://yourbusiness.com"
              />
              <p className="mt-1.5 text-xs text-muted">
                We&apos;ll crawl this site to train your chatbot and allow the widget to run on it. No
                ownership proof needed.
              </p>
              <Button variant="primary" className="mt-4">
                Turn on Website
              </Button>
            </form>
          </Card>
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
              <Badge tone="success" size="lg" dot pulse>
                Widget detected on your site.
              </Badge>
            )}
            {widgetDetected === false && (
              <Badge tone="warning" size="lg" dot>
                Widget not detected yet. Add the script tag above, then refresh this page.
              </Badge>
            )}
          </div>

          <form action={turnOffWebsite} className="mt-6">
            <Button variant="outline-danger">Turn off Website</Button>
          </form>
        </>
      )}
    </div>
  );
}
