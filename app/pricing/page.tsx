import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { getPlanOptions, whatsappAddonPrice, BILLING_CYCLES, type BillingCycle } from "@/lib/billing/plans";
import { site, cybrum } from "@/lib/site";
import { PricingCards } from "./_components/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing — CS Chatbot for Website and WhatsApp",
  description:
    "Simple monthly pricing in PKR for the Cybrum Solutions Chatbot. Website and WhatsApp are two equal, independently priced channels — bundle both or buy either on its own. Save with quarterly or yearly billing.",
  keywords: [
    "chatbot pricing Pakistan",
    "cheap chatbot for website PKR",
    "chatbot monthly plan Pakistan",
    "website chatbot vs WhatsApp chatbot",
    "WhatsApp AI chatbot pricing Pakistan",
    "JazzCash EasyPaisa chatbot subscription",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — CS Chatbot for Website and WhatsApp",
    description:
      "Simple monthly pricing in PKR. Still cheaper than one support hire. Website and WhatsApp priced separately. Save 10% quarterly or 20% yearly.",
    url: `${site.url}/pricing`,
    siteName: "CS Chatbot",
    type: "website",
  },
};

export default function PricingPage() {
  const plans = getPlanOptions();

  // WhatsApp isn't a plan (no page/conversation caps of its own beyond
  // WHATSAPP_CONVERSATION_CAP) — resolved separately and rendered as its own
  // cards below the plan grid. No tenant session here, so "standalone" is
  // always the un-bundled rate (see lib/billing/plans.ts#whatsappAddonPrice).
  const whatsappBundlePrices = {} as Record<BillingCycle, number>;
  const whatsappStandalonePrices = {} as Record<BillingCycle, number>;
  for (const cycle of BILLING_CYCLES) {
    whatsappBundlePrices[cycle] = whatsappAddonPrice(cycle, true);
    whatsappStandalonePrices[cycle] = whatsappAddonPrice(cycle, false);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: site.fullName,
    description:
      "An AI chatbot trained on your own content, for your website and your WhatsApp Business number. Answers with sources, captures leads, and speaks English, Urdu, and Roman Urdu.",
    brand: { "@type": "Brand", name: "Cybrum Solutions" },
    offers: [
      ...plans.map((p) => ({
        "@type": "Offer",
        name: `${p.label} plan`,
        price: String(p.prices.monthly),
        priceCurrency: "PKR",
        url: `${site.url}/pricing`,
      })),
      {
        "@type": "Offer",
        name: "WhatsApp (bundled with a plan)",
        price: String(whatsappBundlePrices.monthly),
        priceCurrency: "PKR",
        url: `${site.url}/pricing`,
      },
      {
        "@type": "Offer",
        name: "WhatsApp Standalone",
        price: String(whatsappStandalonePrices.monthly),
        priceCurrency: "PKR",
        url: `${site.url}/pricing`,
      },
    ],
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
          Website and WhatsApp are two equal channels — turn on either or both. Website
          plans differ only in how many pages the bot learns and how many visitor
          conversations it answers each month.
        </p>
      </div>

      {/* Cards + cycle toggle */}
      <div className="mt-12">
        <PricingCards
          plans={plans}
          whatsappBundlePrices={whatsappBundlePrices}
          whatsappStandalonePrices={whatsappStandalonePrices}
        />
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
