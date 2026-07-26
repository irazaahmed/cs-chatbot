import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { getPlanOptions } from "@/lib/billing/plans";
import { site, cybrum } from "@/lib/site";
import { PricingCards } from "./_components/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing — CS Chatbot",
  description:
    "Simple monthly pricing in PKR for the Cybrum Solutions Chatbot. Every plan includes the full product — pick a plan by how many pages the bot learns and how many visitor conversations it answers each month. Save with quarterly or yearly billing.",
  keywords: [
    "chatbot pricing Pakistan",
    "cheap chatbot for website PKR",
    "chatbot monthly plan Pakistan",
    "website chatbot vs WhatsApp chatbot",
    "JazzCash EasyPaisa chatbot subscription",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — CS Chatbot",
    description:
      "Simple monthly pricing in PKR. Still cheaper than one support hire. Save 10% quarterly or 20% yearly.",
    url: `${site.url}/pricing`,
    siteName: "CS Chatbot",
    type: "website",
  },
};

export default function PricingPage() {
  const plans = getPlanOptions();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: site.fullName,
    description:
      "An AI chatbot trained only on your website's content. Answers with sources, captures leads, and speaks English, Urdu, and Roman Urdu.",
    brand: { "@type": "Brand", name: "Cybrum Solutions" },
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: `${p.label} plan`,
      price: String(p.prices.monthly),
      priceCurrency: "PKR",
      url: `${site.url}/pricing`,
    })),
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

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

      {/* Reassurance */}
      <p className="mt-10 text-center text-sm font-medium text-foreground">
        Still cheaper than one support hire.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted">
        Billed manually in PKR via JazzCash, EasyPaisa, Raast, or bank transfer. Your access
        extends the moment you submit payment — approval never blocks your chatbot. Questions?{" "}
        <a href={cybrum.contactUrl} target="_blank" rel="noopener noreferrer" className="text-accent-bright hover:text-accent">
          Talk to us
        </a>
        .
      </p>
    </PageShell>
  );
}
