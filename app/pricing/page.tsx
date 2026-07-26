import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { JsonLd } from "@/components/JsonLd";
import { getPlanOptions } from "@/lib/billing/plans";
import { PricingCards } from "./_components/pricing-cards";

const CYBRUM_URL = "https://www.cybrumsolutions.dev";

export const metadata: Metadata = {
  title: "Pricing — CS Chatbot",
  description:
    "Simple monthly pricing in PKR for the Cybrum Solutions Chatbot. Every plan includes the full product — pick a plan by how many pages the bot learns and how many visitor conversations it answers each month. Save with quarterly or yearly billing.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — CS Chatbot",
    description:
      "Simple monthly pricing in PKR. Still cheaper than one support hire. Save 10% quarterly or 20% yearly.",
    url: "https://chatbot.cybrumsolutions.dev/pricing",
    siteName: "CS Chatbot",
    type: "website",
  },
};

export default function PricingPage() {
  const plans = getPlanOptions();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cybrum Solutions Chatbot",
    description:
      "An AI chatbot trained only on your website's content. Answers with sources, captures leads, and speaks English, Urdu, and Roman Urdu.",
    brand: { "@type": "Brand", name: "Cybrum Solutions" },
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: `${p.label} plan`,
      price: String(p.prices.monthly),
      priceCurrency: "PKR",
      url: "https://chatbot.cybrumsolutions.dev/pricing",
    })),
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <JsonLd data={jsonLd} />
      {/* Ambient backdrop */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-[-12%] top-[-10%] h-[34rem] w-[34rem] [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
        <div className="glow-orb animate-float-slower absolute bottom-[-15%] right-[-10%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_10%,transparent)]" />
      </div>

      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
        <a href="/" className="group flex items-center gap-2.5" aria-label="CS Chatbot">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent-bright transition-colors group-hover:bg-accent/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            CS<span className="text-accent"> Chatbot</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/login"
            className="rounded-full border border-border bg-surface/60 px-5 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-accent"
          >
            Sign in
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 sm:px-8">
        {/* Hero */}
        <div className="mx-auto mt-14 max-w-2xl text-center sm:mt-20">
          <h1 className="font-heading text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Simple monthly pricing in PKR
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
            Every plan includes the full product. Plans differ only in how many pages the
            bot learns and how many visitor conversations it answers each month.
          </p>
        </div>

        {/* Cards + cycle toggle */}
        <div className="mt-12">
          <PricingCards plans={plans} />
        </div>

        {/* Reassurance line */}
        <p className="mt-10 text-center text-sm font-medium text-foreground">
          Still cheaper than one support hire.
        </p>

        <p className="mt-3 text-center text-xs text-muted">
          Billed manually in PKR via JazzCash, EasyPaisa, Raast, or bank transfer. Your
          access extends the moment you submit payment — approval never blocks your chatbot.
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-5 py-7 text-sm text-muted sm:flex-row sm:px-8">
          <p>
            A product by{" "}
            <a
              href={CYBRUM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-bright transition-colors hover:text-accent"
            >
              Cybrum Solutions
            </a>
          </p>
          <div className="flex items-center gap-5">
            <a href="/" className="transition-colors hover:text-foreground">
              Home
            </a>
            <a href={`${CYBRUM_URL}/products/chatbot`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              About this product
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
