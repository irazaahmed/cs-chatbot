import { redirect } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { enableInstagramChannel, disableInstagramChannel } from "@/lib/tenant/channels";
import { signState } from "@/lib/instagram/oauth-state";
import { buildAuthorizeUrl } from "@/lib/instagram/oauth";

const primaryButtonClass =
  "btn-sheen rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]";
const secondaryButtonClass =
  "rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-danger-text/60 hover:text-danger-text";

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { error } = await searchParams;

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
        <div className="glass mt-6 rounded-2xl p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-muted" />
            Off
          </p>
          <p className="mt-4 text-sm text-foreground">
            Turn on the Instagram channel to connect your own Instagram professional account. The same AI
            that answers on your website will answer your Instagram DMs too, from the same knowledge base.
          </p>
          <p className="mt-1 text-sm text-muted">Your first activation starts a 3-day trial.</p>
          <form action={turnOnInstagram} className="mt-4">
            <button type="submit" className={primaryButtonClass}>
              Turn on Instagram
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Connect Your Instagram</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-success-text">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
          On
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Connect your own Instagram professional account. The same AI that answers on your website will
        answer your DMs too, from the same knowledge base, with the same lead and appointment capture.
      </p>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-danger-text">
          Couldn&apos;t connect your Instagram account. Please try again.
        </p>
      )}

      {(!account || account.status === "disconnected") && (
        <div className="glass mt-6 rounded-2xl p-6">
          <h2 className="font-heading font-semibold">Connect your account</h2>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll be asked to log into Instagram and approve access. Your account must be a
            Professional (Business or Creator) account.
          </p>
          <form action={connectInstagram} className="mt-4">
            <button type="submit" className={primaryButtonClass}>
              Connect Instagram
            </button>
          </form>
        </div>
      )}

      {account?.status === "connected" && (
        <div className="glass mt-6 rounded-2xl p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-success-text">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-400" />
            Connected
          </p>
          <p className="mt-4 text-sm text-foreground">
            Account: <span className="text-muted">@{account.igUsername ?? "unknown"}</span>
          </p>
          {account.connectedAt && (
            <p className="mt-1 text-xs text-muted">
              Connected {new Date(account.connectedAt).toLocaleDateString()}
            </p>
          )}
          <form action={disconnect} className="mt-4">
            <button type="submit" className={secondaryButtonClass}>
              Disconnect
            </button>
          </form>
        </div>
      )}

      <form action={turnOffInstagram} className="mt-6">
        <button type="submit" className="text-sm text-muted underline decoration-border underline-offset-4 transition-colors hover:text-danger-text">
          Turn off the Instagram channel
        </button>
      </form>
    </div>
  );
}
