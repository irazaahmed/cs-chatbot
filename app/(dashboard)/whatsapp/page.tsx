import { redirect } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { enableWhatsappChannel, disableWhatsappChannel } from "@/lib/tenant/channels";
import { PairingPoll } from "@/components/whatsapp/PairingPoll";

const primaryButtonClass =
  "btn-sheen rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]";
const secondaryButtonClass =
  "rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-danger-text/60 hover:text-danger-text";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ connecting?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { connecting } = await searchParams;

  async function connectWithQr() {
    "use server";
    const current = await prisma.tenant.findUnique({ where: { id: tenant.id }, select: { whatsappEnabled: true } });
    if (!current?.whatsappEnabled) redirect("/whatsapp");

    await prisma.job.create({
      data: { tenantId: tenant.id, type: "whatsapp_pair", status: "pending", payload: {} },
    });
    // The connector needs a few seconds to claim the job and generate a QR
    // (it polls every 5s). Redirect with a flag so the page polls itself in
    // the meantime instead of sitting on the stale "Connect" button, which
    // otherwise looks like the click did nothing.
    redirect("/whatsapp?connecting=1");
  }

  async function disconnect() {
    "use server";
    await prisma.whatsAppAccount.update({
      where: { tenantId: tenant.id },
      data: { status: "disconnected", qrCode: null },
    });
    redirect("/whatsapp");
  }

  async function turnOnWhatsapp() {
    "use server";
    await enableWhatsappChannel(tenant.id);
    redirect("/whatsapp");
  }

  async function turnOffWhatsapp() {
    "use server";
    await disableWhatsappChannel(tenant.id);
    redirect("/whatsapp");
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { tenantId: tenant.id } });
  const isPairing =
    account?.status === "pairing" ||
    account?.status === "connecting" ||
    (connecting === "1" && account?.status !== "connected");

  if (!tenant.whatsappEnabled) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <div className="glass mt-6 rounded-2xl p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-muted" />
            Off
          </p>
          <p className="mt-4 text-sm text-foreground">
            Turn on the WhatsApp channel to connect your own WhatsApp Business number. The same AI
            that answers on your website will answer here too, from the same knowledge base.
          </p>
          <p className="mt-1 text-sm text-muted">Your first activation starts a 3-day trial.</p>
          <form action={turnOnWhatsapp} className="mt-4">
            <button type="submit" className={primaryButtonClass}>
              Turn on WhatsApp
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Connect Your WhatsApp</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-success-text">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
          On
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Connect your own WhatsApp Business number. The same AI that answers on your website will answer here too,
        24/7, from the same knowledge base, with the same lead and appointment capture.
      </p>
      <p className="mt-3 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-xs text-muted">
        This WhatsApp bot runs on Cybrum Solutions&apos; own infrastructure. It is not Meta&apos;s official WhatsApp
        Business API.
      </p>

      {!isPairing && (!account || account.status === "disconnected") && (
        <div className="glass mt-6 rounded-2xl p-6">
          <h2 className="font-heading font-semibold">Scan a QR code</h2>
          <p className="mt-1 text-sm text-muted">
            Open WhatsApp on your phone and scan a code, the same way you&apos;d link WhatsApp Web.
            You&apos;ll need a second screen (a computer, or any other device) to show the code on.
          </p>
          <form action={connectWithQr} className="mt-4">
            <button type="submit" className={primaryButtonClass}>
              Connect with QR code
            </button>
          </form>
        </div>
      )}

      {isPairing && (
        <div className="glass mt-6 rounded-2xl p-6 text-center">
          <PairingPoll />
          {account?.status === "connecting" ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <span className="flex items-center gap-1">
                <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright" />
                <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.15s]" />
                <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.3s]" />
              </span>
              Connecting…
            </p>
          ) : account?.qrCode ? (
            <>
              <h2 className="font-heading font-semibold">Scan this QR code</h2>
              <p className="mt-1 text-sm text-muted">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote image */}
              <img
                src={account.qrCode}
                alt="WhatsApp pairing QR code"
                className="mx-auto mt-4 h-56 w-56 rounded-2xl border border-border bg-white p-3"
              />
              <p className="mt-4 text-xs text-muted">This page updates automatically once you scan.</p>
            </>
          ) : (
            <p className="py-10 text-sm text-muted">Generating your code…</p>
          )}
        </div>
      )}

      {account?.status === "connected" && (
        <div className="glass mt-6 rounded-2xl p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-success-text">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-400" />
            Connected
          </p>
          <p className="mt-4 text-sm text-foreground">
            Number: <span className="text-muted">{account.phoneNumber ?? "Unknown"}</span>
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

      <form action={turnOffWhatsapp} className="mt-6">
        <button type="submit" className="text-sm text-muted underline decoration-border underline-offset-4 transition-colors hover:text-danger-text">
          Turn off the WhatsApp channel
        </button>
      </form>
    </div>
  );
}
