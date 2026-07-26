import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { GlowCard } from "@/components/ui/GlowCard";
import { JsonLd } from "@/components/JsonLd";
import { site, cybrum } from "@/lib/site";

export const metadata: Metadata = {
  title: "About — CS Chatbot",
  description:
    "The Cybrum Solutions Chatbot is an AI chat assistant trained only on your website's content. It answers with sources, captures leads, and speaks English, Urdu, and Roman Urdu.",
  keywords: [
    "Cybrum Solutions chatbot",
    "CS Chatbot",
    "AI chatbot for website",
    "website chatbot Pakistan",
    "chatbot with source citations",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — CS Chatbot",
    description:
      "An AI chatbot trained only on your website's content. A Cybrum Solutions product.",
    url: `${site.url}/about`,
    siteName: "CS Chatbot",
    type: "website",
  },
};

const differences = [
  {
    title: "Answers from your content only",
    body: "Every reply is grounded in pages it actually crawled from your site, with a source link under each answer. It never invents facts about your business.",
  },
  {
    title: "Says so when it doesn't know",
    body: "If your site doesn't cover a question, the bot admits it and offers a human — and logs the question so you know what to add next.",
  },
  {
    title: "English, Urdu & Roman Urdu",
    body: "It replies the way your customers actually type — a fit for Pakistani businesses that most website chatbots handle poorly.",
  },
  {
    title: "Captures leads while it chats",
    body: "Interested visitors leave their name and contact in the conversation, and they land in your Leads tab ready to follow up.",
  },
  {
    title: "Never breaks your website",
    body: "The widget loads asynchronously in an isolated shadow DOM. If anything ever fails, it removes itself silently instead of throwing an error onto your page.",
  },
  {
    title: "Live in minutes, not weeks",
    body: "Paste your URL, watch it learn your site, and install it with a single script tag — the same way you'd add Google Analytics.",
  },
];

const audience = [
  "Small businesses that lose visitors who leave before anyone replies",
  "Service providers answering the same questions over and over",
  "Stores and clinics that need 24/7 answers without hiring a support agent",
  "Anyone with a website who wants instant, accurate answers for visitors",
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About CS Chatbot",
    url: `${site.url}/about`,
    about: {
      "@type": "SoftwareApplication",
      name: site.fullName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      provider: { "@type": "Organization", name: "Cybrum Solutions", url: cybrum.url },
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
            About the product
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            The <span className="text-shimmer">Cybrum Solutions Chatbot</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {site.fullName} — <b className="text-foreground">CS Chatbot</b>{" "}
            for short — is an AI chat assistant that reads your website and answers your visitors from that
            content alone. It cites its sources, captures leads, and speaks your customers&apos;
            language, so no visitor leaves without an answer.
          </p>
        </Reveal>
      </div>

      {/* What it is */}
      <Reveal className="mx-auto mt-16 max-w-3xl">
        <div className="glass rounded-3xl p-8 sm:p-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">What it is</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Most chatbots either follow rigid scripts or make things up from the open
            internet. CS Chatbot does neither. It crawls the pages of{" "}
            <b className="text-foreground">your</b> website, turns them into a private
            knowledge base, and answers strictly from it. The result is a bot that sounds
            like your business because it only knows your business — with a link to the exact
            page behind every answer.
          </p>
        </div>
      </Reveal>

      {/* How it's different */}
      <div className="mt-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            How it&apos;s different
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {differences.map((d, i) => (
            <Reveal key={d.title} delay={(i % 3) * 0.08} className="h-full">
              <GlowCard className="h-full">
                <h3 className="font-heading text-lg font-semibold tracking-tight">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d.body}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Who it's for */}
      <Reveal className="mx-auto mt-20 max-w-3xl">
        <div className="rounded-3xl border border-border bg-card/60 p-8 backdrop-blur-sm sm:p-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Who it&apos;s for</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {audience.map((a) => (
              <li key={a} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-accent-bright">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Built by Cybrum */}
      <Reveal className="mt-20">
        <div className="rounded-3xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Built by Cybrum Solutions
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            CS Chatbot is a product of Cybrum Solutions, an AI-native studio building agents,
            automation, and web systems. Same team, same support.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="btn-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
            >
              Try it on your website
            </Link>
            <a
              href={cybrum.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface/60 px-7 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              Visit Cybrum Solutions
            </a>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}
