import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { sendWelcomeEmail } from "@/lib/email/notify";
import { detectUploadKind, saveKnowledgeFile, MAX_UPLOAD_SIZE_BYTES, type UploadKind } from "@/lib/knowledge/file-storage";

const PREVIEW_URL_COOKIE = "cybrum_preview_url";
const MAX_UPLOAD_FILES = 5;

const ONBOARDING_ERRORS: Record<string, string> = {
  "1": "Enter a business name.",
  "2": "Fill in the required field above, and add at least one file to upload.",
  "3": `You can upload up to ${MAX_UPLOAD_FILES} files at a time.`,
  "4": "That doesn't look like a valid URL.",
  "5": "Only PDF and DOCX files are supported.",
  "6": "One of those files is too large — max 10MB each.",
  "7": "Enter a valid WhatsApp number, with country code and no plus sign.",
};

// Best-effort prefill from the landing-page preview cookie (see
// signInWithGoogle's caller in app/(marketing)/page.tsx). Never throws.
// A missing/malformed cookie just means an empty form, same as today.
function readPreviewDefaults(rawUrl: string | undefined): { websiteUrl: string; name: string } {
  if (!rawUrl) return { websiteUrl: "", name: "" };
  try {
    const url = new URL(decodeURIComponent(rawUrl));
    const host = url.hostname.replace(/^www\./, "");
    const label = host.split(".")[0] ?? host;
    const name = label.charAt(0).toUpperCase() + label.slice(1);
    return { websiteUrl: url.toString(), name };
  } catch {
    return { websiteUrl: "", name: "" };
  }
}

const DEFAULT_BRAND_CONFIG = {
  color: "#1e88e8",
  botName: "Assistant",
  greeting: "Hi! How can I help?",
  position: "bottom-right",
};

async function createTenant(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // One tenant per account. The page-load check below redirects away before
  // this form ever renders for a returning user, but that doesn't stop a
  // resubmitted/double-clicked form from racing a second tenant into
  // existence, so check again here, at the point that actually writes.
  const existing = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (existing) redirect("/playground");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/onboarding?error=1");

  const mode = String(formData.get("mode") ?? "website");

  if (mode === "upload") {
    const installTarget = String(formData.get("installTarget") ?? "website");
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) redirect("/onboarding?error=2");
    if (files.length > MAX_UPLOAD_FILES) redirect("/onboarding?error=3");

    const kinds: UploadKind[] = [];
    for (const file of files) {
      const kind = detectUploadKind(file);
      if (!kind) redirect("/onboarding?error=5");
      if (file.size > MAX_UPLOAD_SIZE_BYTES) redirect("/onboarding?error=6");
      kinds.push(kind);
    }

    // Two install targets, both skip domain-ownership verification since
    // there's no crawl to justify one (see CLAUDE.md section 10 for the
    // website case; WhatsApp has no origin concept at all).
    let websiteUrl: string;
    let allowedDomains: string[];
    let whatsappRequestedAt: Date | null = null;

    if (installTarget === "whatsapp") {
      // WhatsApp is admin-gated, never self-serve (CLAUDE.md section 9) — this
      // only records a request, same as the dashboard's "Request WhatsApp
      // access" button (app/(dashboard)/whatsapp/page.tsx#requestAccess). An
      // admin still has to enable it, and the tenant still pairs the number
      // for real via QR/pairing code from the dashboard afterwards. The
      // number here is just a wa.me placeholder for Tenant.websiteUrl (still
      // a required field) that doubles as a readable hint for the admin on
      // the WhatsApp requests list, which already renders `tenant.websiteUrl`.
      const rawNumber = String(formData.get("whatsappNumber") ?? "").trim();
      const digits = rawNumber.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) redirect("/onboarding?error=7");
      websiteUrl = `https://wa.me/${digits}`;
      allowedDomains = [];
      whatsappRequestedAt = new Date();
    } else {
      const domainInput = String(formData.get("domain") ?? "").trim();
      if (!domainInput) redirect("/onboarding?error=2");
      let normalizedDomain: URL;
      try {
        normalizedDomain = new URL(domainInput);
      } catch {
        redirect("/onboarding?error=4");
      }
      websiteUrl = normalizedDomain.toString();
      allowedDomains = [normalizedDomain.hostname];
    }

    // Trained from uploaded files, not a crawl, so there's nothing to verify
    // ownership of — mark verified immediately.
    const tenant = await prisma.tenant.create({
      data: {
        ownerId: session.user.id,
        name,
        publicKey: `pk_live_${randomBytes(16).toString("hex")}`,
        websiteUrl,
        allowedDomains,
        verified: true,
        verifyToken: randomBytes(16).toString("hex"),
        periodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        brandConfig: DEFAULT_BRAND_CONFIG,
        systemPrompt: `You are a helpful support assistant for ${name}.`,
        whatsappRequestedAt,
      },
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const kind = kinds[i];
      const docId = randomUUID();
      const filePath = await saveKnowledgeFile(tenant.id, docId, file, kind);
      await prisma.job.create({
        data: {
          tenantId: tenant.id,
          type: kind === "pdf" ? "pdf_ingest" : "docx_ingest",
          status: "pending",
          payload: { filePath, filename: file.name },
        },
      });
    }

    if (session.user.email) {
      await sendWelcomeEmail(session.user.email, name);
    }

    redirect("/install");
  }

  const websiteUrlInput = String(formData.get("websiteUrl") ?? "").trim();
  if (!websiteUrlInput) redirect("/onboarding?error=2");

  let normalizedUrl: URL;
  try {
    normalizedUrl = new URL(websiteUrlInput);
  } catch {
    redirect("/onboarding?error=4");
  }

  await prisma.tenant.create({
    data: {
      ownerId: session.user.id,
      name,
      publicKey: `pk_live_${randomBytes(16).toString("hex")}`,
      websiteUrl: normalizedUrl.toString(),
      allowedDomains: [],
      verifyToken: randomBytes(16).toString("hex"),
      periodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      brandConfig: DEFAULT_BRAND_CONFIG,
      systemPrompt: `You are a helpful support assistant for ${name}.`,
    },
  });

  if (session.user.email) {
    await sendWelcomeEmail(session.user.email, name);
  }

  redirect("/install");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (existing) redirect("/playground");

  const cookieStore = await cookies();
  const defaults = readPreviewDefaults(cookieStore.get(PREVIEW_URL_COOKIE)?.value);
  const { error } = await searchParams;

  const tabLabelClass =
    "flex-1 cursor-pointer rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition-colors has-[:checked]:bg-accent has-[:checked]:text-white";
  const fieldLabelClass = "mt-4 block text-sm font-medium";
  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
      </div>

      <form
        action={createTenant}
        className="group glass w-full max-w-md rounded-3xl p-8 shadow-[0_24px_70px_-30px_var(--color-accent)]"
      >
        <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-bright shadow-[0_0_8px_var(--color-accent)]" />
          Step 1 of 2
        </span>
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">Set up your chatbot</h1>
        <p className="mt-2 text-sm text-muted">Tell us about your business.</p>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-danger-text">
            {ONBOARDING_ERRORS[error] ?? "Something went wrong. Please try again."}
          </p>
        )}

        <label htmlFor="name" className="mt-6 block text-sm font-medium">
          Business name
        </label>
        <input id="name" name="name" required defaultValue={defaults.name} className={fieldClass} />

        <p className="mt-6 text-sm font-medium">Train your chatbot from</p>
        <div className="mt-2 flex gap-1 rounded-full border border-border bg-surface/60 p-1">
          <label className={tabLabelClass}>
            <input type="radio" name="mode" value="website" defaultChecked className="sr-only" />
            Website
          </label>
          <label className={tabLabelClass}>
            <input type="radio" name="mode" value="upload" className="sr-only" />
            Upload files
          </label>
        </div>

        {/* Website mode: crawled after domain-ownership verification on /install. */}
        <div className="group-has-[input[name=mode][value=upload]:checked]:hidden">
          <label htmlFor="websiteUrl" className={fieldLabelClass}>
            Website URL
          </label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={defaults.websiteUrl}
            placeholder="https://yourbusiness.com"
            className={fieldClass}
          />
        </div>

        {/* Upload mode: no crawl, no ownership check — see createTenant above. */}
        <div className="hidden group-has-[input[name=mode][value=upload]:checked]:block">
          <p className="mt-6 text-sm font-medium">Install on</p>
          <div className="mt-2 flex gap-1 rounded-full border border-border bg-surface/60 p-1">
            <label className={tabLabelClass}>
              <input type="radio" name="installTarget" value="website" defaultChecked className="sr-only" />
              Website
            </label>
            <label className={tabLabelClass}>
              <input type="radio" name="installTarget" value="whatsapp" className="sr-only" />
              WhatsApp
            </label>
          </div>

          <div className="group-has-[input[name=installTarget][value=whatsapp]:checked]:hidden">
            <label htmlFor="domain" className={fieldLabelClass}>
              Where will you install the chatbot?
            </label>
            <input id="domain" name="domain" type="url" placeholder="https://yourbusiness.com" className={fieldClass} />
            <p className="mt-1 text-xs text-muted">The domain the chat widget will be allowed to run on.</p>
          </div>

          <div className="hidden group-has-[input[name=installTarget][value=whatsapp]:checked]:block">
            <label htmlFor="whatsappNumber" className={fieldLabelClass}>
              Your WhatsApp Business number
            </label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              placeholder="923001234567 (country code, no +)"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-muted">
              We&apos;ll enable WhatsApp for your account and you&apos;ll connect this number from the dashboard.
            </p>
          </div>

          <label htmlFor="files" className={fieldLabelClass}>
            Upload PDF or DOCX
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-1.5 w-full text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent-bright hover:file:bg-accent/25"
          />
          <p className="mt-1 text-xs text-muted">Up to {MAX_UPLOAD_FILES} files, 10MB each.</p>
        </div>

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
