import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { site, cybrum } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — CS Chatbot",
  description:
    "Talk to the Cybrum Solutions team about CS Chatbot — on WhatsApp, by email, or through the Cybrum Solutions contact page.",
  keywords: [
    "Cybrum Solutions chatbot",
    "chatbot for small business Pakistan",
    "website chatbot Pakistan",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — CS Chatbot",
    description: "Talk to the Cybrum Solutions team about CS Chatbot.",
    url: `${site.url}/contact`,
    siteName: "CS Chatbot",
    type: "website",
  },
};

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.94 9.94 0 0 0-8.5 15.13L2 22l4.98-1.3A9.94 9.94 0 1 0 12.04 2zm0 1.8a8.14 8.14 0 0 1 6.9 12.48l-.2.32.68 2.48-2.55-.67-.31.18a8.13 8.13 0 1 1-4.52-14.99zm-3.2 4.2c-.15 0-.4.06-.6.3-.2.24-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.55 2.47 3.83 3.37 1.9.75 2.28.6 2.69.56.41-.04 1.32-.54 1.5-1.06.19-.52.19-.97.13-1.06-.05-.09-.2-.15-.42-.26-.22-.11-1.32-.65-1.53-.73-.2-.07-.35-.11-.5.11-.15.22-.57.72-.7.87-.13.15-.26.17-.48.06-.22-.11-.94-.35-1.79-1.11-.66-.59-1.11-1.32-1.24-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.22-.69-1.67-.18-.43-.36-.37-.5-.38h-.43z"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact CS Chatbot",
    url: `${site.url}/contact`,
    about: {
      "@type": "Organization",
      name: "Cybrum Solutions",
      url: cybrum.url,
      email: cybrum.email,
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <div className="mx-auto mt-14 max-w-2xl text-center sm:mt-20">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
            Contact
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Let&apos;s <span className="text-shimmer">talk</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            CS Chatbot is a product of Cybrum Solutions. Questions about setup, billing, or a
            custom build? Reach the team through any channel below.
          </p>
        </Reveal>
      </div>

      {/* Channels */}
      <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
        <Reveal className="h-full">
          <a
            href={cybrum.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full flex-col rounded-3xl border border-border bg-card/60 p-7 backdrop-blur-sm transition-colors hover:border-accent"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-bright">
              <WhatsAppIcon />
            </span>
            <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">WhatsApp</h2>
            <p className="mt-1.5 text-sm text-muted">Quickest way to reach us. Message the team directly.</p>
            <span className="mt-4 text-sm font-medium text-accent-bright">{cybrum.whatsappDisplay}</span>
          </a>
        </Reveal>

        <Reveal delay={0.08} className="h-full">
          <a
            href={`mailto:${cybrum.email}`}
            className="group flex h-full flex-col rounded-3xl border border-border bg-card/60 p-7 backdrop-blur-sm transition-colors hover:border-accent"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-bright">
              <MailIcon />
            </span>
            <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">Email</h2>
            <p className="mt-1.5 text-sm text-muted">For detailed questions, invoices, or documents.</p>
            <span className="mt-4 text-sm font-medium text-accent-bright">{cybrum.email}</span>
          </a>
        </Reveal>
      </div>

      {/* Cybrum contact page link */}
      <Reveal className="mx-auto mt-6 max-w-3xl">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent p-7 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">Prefer a form?</h2>
            <p className="mt-1 text-sm text-muted">
              Use the Cybrum Solutions contact page and mention CS Chatbot — it reaches the same team.
            </p>
          </div>
          <a
            href={cybrum.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sheen inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
          >
            Open contact page
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
      </Reveal>
    </PageShell>
  );
}
