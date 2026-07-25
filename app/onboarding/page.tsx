import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

async function createTenant(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // One tenant per account. The page-load check below redirects away before
  // this form ever renders for a returning user, but that doesn't stop a
  // resubmitted/double-clicked form from racing a second tenant into
  // existence — check again here, at the point that actually writes.
  const existing = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (existing) redirect("/playground");

  const name = String(formData.get("name") ?? "").trim();
  const websiteUrlInput = String(formData.get("websiteUrl") ?? "").trim();
  if (!name || !websiteUrlInput) return;

  let normalizedUrl: URL;
  try {
    normalizedUrl = new URL(websiteUrlInput);
  } catch {
    return;
  }

  await prisma.tenant.create({
    data: {
      ownerId: session.user.id,
      name,
      publicKey: `pk_live_${randomBytes(16).toString("hex")}`,
      websiteUrl: normalizedUrl.toString(),
      allowedDomains: [],
      verifyToken: randomBytes(16).toString("hex"),
      brandConfig: {
        color: "#1e88e8",
        botName: "Assistant",
        greeting: "Hi! How can I help?",
        position: "bottom-right",
      },
      systemPrompt: `You are a helpful support assistant for ${name}.`,
    },
  });

  redirect("/install");
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (existing) redirect("/playground");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
      </div>

      <form
        action={createTenant}
        className="glass w-full max-w-md rounded-3xl p-8 shadow-[0_24px_70px_-30px_var(--color-accent)]"
      >
        <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-bright shadow-[0_0_8px_var(--color-accent)]" />
          Step 1 of 2
        </span>
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">Set up your chatbot</h1>
        <p className="mt-2 text-sm text-muted">Tell us about your business.</p>

        <label htmlFor="name" className="mt-6 block text-sm font-medium">
          Business name
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]"
        />

        <label htmlFor="websiteUrl" className="mt-4 block text-sm font-medium">
          Website URL
        </label>
        <input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          required
          placeholder="https://yourbusiness.com"
          className="mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]"
        />

        <button
          type="submit"
          className="btn-sheen mt-7 w-full rounded-full bg-accent px-4 py-3 font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
