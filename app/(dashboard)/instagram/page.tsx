import { redirect } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { enableInstagramChannel, disableInstagramChannel } from "@/lib/tenant/channels";
import { signState } from "@/lib/instagram/oauth-state";
import { buildAuthorizeUrl } from "@/lib/instagram/oauth";
import { Card } from "@/components/dashboard/Card";
import { Badge } from "@/components/dashboard/Badge";
import { Button } from "@/components/dashboard/Button";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { ToastFlash } from "@/components/dashboard/ToastFlash";

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { connected, error } = await searchParams;

  async function connectInstagram() {
    "use server";
    const current = await prisma.tenant.findUnique({ where: { id: tenant.id }, select: { instagramEnabled: true } });
    if (!current?.instagramEnabled) redirect("/instagram");

    const state = signState(tenant.id);
    redirect(buildAuthorizeUrl(state));
  }

  async function disconnect() {
    "use server";
    await prisma.instagramAccount.update({
      where: { tenantId: tenant.id },
      data: { status: "disconnected", accessToken: null, tokenExpiresAt: null },
    });
    redirect("/instagram");
  }

  async function turnOnInstagram() {
    "use server";
    await enableInstagramChannel(tenant.id);
    redirect("/instagram");
  }

  async function turnOffInstagram() {
    "use server";
    await disableInstagramChannel(tenant.id);
    redirect("/instagram");
  }

  const account = await prisma.instagramAccount.findUnique({ where: { tenantId: tenant.id } });

  if (!tenant.instagramEnabled) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Instagram</h1>
        <Card className="mt-6">
          <Badge tone="neutral" size="lg" dot>
            Off
          </Badge>
          <p className="mt-4 text-sm text-foreground">
            Turn on the Instagram channel to connect your own Instagram professional account. The same AI
            that answers on your website will answer your Instagram DMs too, from the same knowledge base.
          </p>
          <p className="mt-1 text-sm text-muted">Your first activation starts a 3-day trial.</p>
          <form action={turnOnInstagram} className="mt-4">
            <Button variant="primary">Turn on Instagram</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Connect Your Instagram</h1>
        <Badge tone="success" size="md" dot pulse>
          On
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Connect your own Instagram professional account. The same AI that answers on your website will
        answer your DMs too, from the same knowledge base, with the same lead and appointment capture.
      </p>

      {connected && <ToastFlash message="Instagram connected." tone="success" />}

      {error && (
        <div className="mt-4">
          <StatusBanner tone="danger">Couldn&apos;t connect your Instagram account. Please try again.</StatusBanner>
        </div>
      )}

      {(!account || account.status === "disconnected") && (
        <Card className="mt-6">
          <h2 className="font-heading font-semibold">Connect your account</h2>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll be asked to log into Instagram and approve access. Your account must be a
            Professional (Business or Creator) account.
          </p>
          <form action={connectInstagram} className="mt-4">
            <Button variant="primary">Connect Instagram</Button>
          </form>
        </Card>
      )}

      {account?.status === "connected" && (
        <Card className="mt-6">
          <Badge tone="success" size="lg" dot pulse>
            Connected
          </Badge>
          <p className="mt-4 text-sm text-foreground">
            Account: <span className="text-muted">@{account.igUsername ?? "unknown"}</span>
          </p>
          {account.connectedAt && (
            <p className="mt-1 text-xs text-muted">
              Connected {new Date(account.connectedAt).toLocaleDateString()}
            </p>
          )}
          <form action={disconnect} className="mt-4">
            <Button variant="outline-danger">Disconnect</Button>
          </form>
        </Card>
      )}

      <form action={turnOffInstagram} className="mt-6">
        <button type="submit" className="text-sm text-muted underline decoration-border underline-offset-4 transition-colors hover:text-danger-text">
          Turn off the Instagram channel
        </button>
      </form>
    </div>
  );
}
