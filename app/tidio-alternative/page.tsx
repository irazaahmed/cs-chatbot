import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { GlowCard } from "@/components/ui/GlowCard";
import { AlternativePricingTable } from "@/components/marketing/AlternativePricingTable";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "CS Chatbot: A Simpler Tidio Alternative for Pakistani Businesses",
  description:
    "See how CS Chatbot compares to Tidio: one flat PKR price instead of three separate usage meters, native WhatsApp, and Urdu + Roman Urdu support. Try free.",
  keywords: [
    "tidio alternative",
    "CS Chatbot vs Tidio",
    "AI chatbot Pakistan",
    "Urdu chatbot",
    "WhatsApp chatbot Pakistan",
  ],
  alternates: { canonical: "/tidio-alternative" },
  openGraph: {
    title: "CS Chatbot: A Simpler Tidio Alternative for Pakistani Businesses",
    description:
      "One flat PKR price instead of three separate usage meters: how CS Chatbot compares to Tidio.",
    url: `${site.url}/tidio-alternative`,
    siteName: "CS Chatbot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CS Chatbot: A Simpler Tidio Alternative for Pakistani Businesses",
    description:
      "One flat PKR price instead of three separate usage meters: how CS Chatbot compares to Tidio.",
  },
};

const reasons = [
  {
    title: "Pricing split across three meters",
    body: "Billable conversations, Lyro AI Agent conversations, and Flows visitors each have their own limit and their own upgrade tier. Working out what you'll pay each month takes real effort.",
  },
  {
    title: "USD billing",
    body: "An international card and currency conversion for a Pakistani business.",
  },
  {
    title: "No Urdu or Roman Urdu support",
    body: "Customers who type the way they actually speak don't get natural replies.",
  },
  {
    title: "WhatsApp as an integration, not the core channel",
    body: "It isn't the same-AI channel the plan pricing is built around.",
  },
];

const comparisonRows: { label: string; cs: string; tidio: string }[] = [
  { label: "Pricing structure", cs: "One flat monthly price per plan", tidio: "Three separate usage meters (conversations, AI conversations, Flows visitors)" },
  { label: "Pricing currency", cs: "PKR", tidio: "USD" },
  { label: "Local payment methods", cs: "JazzCash, EasyPaisa, Raast, bank transfer", tidio: "International card only" },
  { label: "Urdu / Roman Urdu support", cs: "Yes, built in", tidio: "Not offered" },
  { label: "WhatsApp", cs: "Native, same AI and knowledge base, from the Starter plan", tidio: "Available as an integration" },
  { label: "Trained on your own website content", cs: "Yes, with source links", tidio: "Lyro AI Agent draws from your support content" },
  { label: "Try before you sign up", cs: "Yes, no signup or card needed", tidio: "7-day free trial (limited free plan available)" },
  { label: "Install", cs: "One script tag", tidio: "Widget install" },
];

const faqs = [
  {
    question: "Is CS Chatbot cheaper than Tidio?",
    answer:
      "CS Chatbot's Starter plan is Rs 3,499/month with a single conversation and page limit. Tidio's Starter plan begins at $24.17/month for 100 billable conversations, with Lyro AI Agent conversations and Flows visitors metered and priced separately, so your actual monthly cost depends on how you use all three.",
  },
  {
    question: "Does CS Chatbot support Urdu like Tidio doesn't?",
    answer:
      "Yes. CS Chatbot answers in English, Urdu, and Roman Urdu. Tidio's pricing and help documentation don't list Urdu language support.",
  },
  {
    question: "Can I use CS Chatbot on WhatsApp?",
    answer:
      "Yes. You can connect your own WhatsApp Business number to the same AI and knowledge base your website chatbot uses, and turn it on from your dashboard any time.",
  },
  {
    question: "Do I need an international card to pay?",
    answer: "No. CS Chatbot bills in PKR through JazzCash, EasyPaisa, Raast, or bank transfer. Tidio bills in USD.",
  },
  {
    question: "Will the chatbot make up answers about my business?",
    answer: "No. Every answer is grounded in your website's real content, with source links shown under each reply.",
  },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-accent-bright">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function TidioAlternativePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "CS Chatbot: A Simpler Tidio Alternative for Pakistani Businesses",
        url: `${site.url}/tidio-alternative`,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
            Tidio alternative
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            A <span className="text-shimmer">simpler Tidio alternative</span> for Pakistani businesses
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            CS Chatbot gives you one flat monthly price in PKR for your website and WhatsApp chatbot.
            Tidio splits its pricing across three separate usage meters (billable conversations,
            Lyro AI conversations, and Flows visitors) and bills in USD.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8">
            <Link
              href="/"
              className="btn-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
            >
              Preview my chatbot, free
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Why look for an alternative */}
      <div className="mt-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Why businesses look for a Tidio alternative
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {reasons.map((r, i) => (
            <Reveal key={r.title} delay={(i % 2) * 0.08} className="h-full">
              <GlowCard className="h-full">
                <h3 className="font-heading text-lg font-semibold tracking-tight">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Feature comparison */}
      <Reveal className="mx-auto mt-20 max-w-3xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          CS Chatbot vs Tidio: feature by feature
        </h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-card/60 text-left">
                <th className="px-4 py-3 font-heading font-semibold"></th>
                <th className="px-4 py-3 font-heading font-semibold">CS Chatbot</th>
                <th className="px-4 py-3 font-heading font-semibold">Tidio</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-muted">{row.cs}</td>
                  <td className="px-4 py-3 text-muted">{row.tidio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* Pricing */}
      <Reveal className="mx-auto mt-20 max-w-3xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Straightforward PKR pricing, no separate meters to track
        </h2>
        <div className="mt-6">
          <AlternativePricingTable />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Tidio&apos;s Starter plan starts at $24.17/mo for 100 billable conversations, with Lyro AI
          Agent conversations and Flows visitors billed and capped separately on top of that. CS
          Chatbot&apos;s page and conversation limits are both included in one number, with no second
          or third meter to watch.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Pay by JazzCash, EasyPaisa, Raast, or bank transfer. Your access starts the moment you
          submit payment, with no waiting on approval and no foreign currency card needed.
        </p>
      </Reveal>

      {/* Urdu / WhatsApp callouts */}
      <div className="mt-20 grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="glass h-full rounded-3xl p-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Built for how your customers actually type
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              CS Chatbot answers naturally in English, Urdu, and Roman Urdu, so a customer typing
              &quot;iska price kya hai?&quot; gets a real answer, not a broken one.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="glass h-full rounded-3xl p-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Website and WhatsApp, the same AI
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Turn on your website widget, your WhatsApp Business number, or both, from the same
              dashboard, self-serve, any time. Same content, same leads, wherever your customer reaches out.
            </p>
          </div>
        </Reveal>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-20 max-w-3xl">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        </Reveal>
        <div className="mt-6 space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.question} delay={(i % 3) * 0.06}>
              <div className="rounded-2xl border border-border bg-card/40 p-6">
                <h3 className="flex items-start gap-2.5 font-heading text-base font-semibold tracking-tight">
                  <CheckIcon />
                  {f.question}
                </h3>
                <p className="mt-2 pl-[26px] text-sm leading-relaxed text-muted">{f.answer}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Reveal className="mt-20">
        <div className="rounded-3xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Try CS Chatbot free
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Paste your website URL and chat with a bot trained on your own pages in under a minute.
            No signup, no card, no commitment.
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/"
              className="btn-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
            >
              Preview my chatbot
            </Link>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}
