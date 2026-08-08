import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to use — CS Chatbot",
  description:
    "Set up your chatbot in five steps: paste your URL, preview it, sign in, turn on Website and/or WhatsApp, and install one script tag. No coding required, no ownership proof needed.",
  keywords: [
    "how to create a free chatbot for my website",
    "how to add a chatbot to my website for free",
    "do I need to know how to code to add a chatbot",
    "how long does it take to set up a website chatbot",
    "embeddable website chatbot",
    "how to add WhatsApp AI chatbot",
  ],
  alternates: { canonical: "/how-to-use" },
  openGraph: {
    title: "How to use — CS Chatbot",
    description: "From your URL to a live chatbot in five steps — no coding required. Website and WhatsApp, your choice.",
    url: `${site.url}/how-to-use`,
    siteName: "CS Chatbot",
    type: "website",
  },
};

const steps = [
  {
    title: "Paste your URL and preview it",
    body: "On the home page, drop in your website address. CS Chatbot instantly reads up to 15 pages and opens a live chat so you can test the answers on your own content — before signing up, with no card.",
  },
  {
    title: "Sign in with Google",
    body: "Like what you see? Sign in with your Google account. One website per account keeps things simple; your dashboard is where everything is managed.",
  },
  {
    title: "Turn on Website and/or WhatsApp",
    body: "Two independent channels, your choice — turn on one, both, or switch between them any time from your dashboard. No ownership proof needed for either.",
  },
  {
    title: "Let it learn your whole site",
    body: "Start the full crawl and watch live progress as it reads your pages — up to your plan's page limit. Content changed later? Hit Recrawl and it re-reads everything.",
  },
  {
    title: "Paste one script tag — you're live",
    body: "Copy the snippet from the Install tab and paste it into your site, the same way you'd add analytics. The chat bubble appears immediately, and the Install tab confirms when it detects the widget on your domain.",
  },
];

const afterInstall = [
  { tab: "Customize", body: "Set the bot name, greeting, accent color, avatar, and bubble position — no redeploys, changes are live instantly." },
  { tab: "Conversations", body: "Read every chat your bot has had, so you always know what visitors are asking." },
  { tab: "Unanswered", body: "See the questions your content couldn't answer — a ready-made list of what to add to your site next." },
  { tab: "Leads", body: "Every visitor who shared their contact details, collected in one place to follow up." },
];

export default function HowToUsePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to add CS Chatbot to your website",
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
            How to use
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            From your URL to a live chatbot, in{" "}
            <span className="text-shimmer">five steps</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            No coding, no developer, no setup call. If you can copy and paste, you can put
            CS Chatbot on your website, your own WhatsApp number, or both — two equal
            channels, no ownership proof needed for either.
          </p>
        </Reveal>
      </div>

      {/* Steps */}
      <ol className="mx-auto mt-16 max-w-3xl space-y-4">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={(i % 3) * 0.06}>
            <li className="flex items-start gap-5 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-heading text-base font-semibold text-accent-bright">
                {i + 1}
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>

      {/* Install snippet */}
      <Reveal className="mx-auto mt-16 max-w-3xl">
        <div className="glass rounded-3xl p-8 sm:p-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">The install snippet</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            This is all that goes on your site. Your dashboard fills in the real key for you —
            just copy and paste it before the closing <code className="rounded bg-surface px-1.5 py-0.5 text-xs">&lt;/body&gt;</code> tag.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-background/70 p-5">
            <pre className="text-sm leading-relaxed text-foreground"><code>{`<script
  src="https://cdn.cybrumsolutions.dev/widget.js"
  data-key="pk_live_xxxxxxxx"
  data-position="bottom-right"
  defer
></script>`}</code></pre>
          </div>
        </div>
      </Reveal>

      {/* After install */}
      <div className="mx-auto mt-16 max-w-3xl">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">After it&apos;s live</h2>
          <p className="mt-2 text-sm text-muted">Your dashboard turns every conversation into something useful.</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {afterInstall.map((a, i) => (
            <Reveal key={a.tab} delay={(i % 2) * 0.06} className="h-full">
              <div className="h-full rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
                <p className="font-heading font-semibold">{a.tab}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* WhatsApp channel */}
      <Reveal className="mx-auto mt-16 max-w-3xl">
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-6 backdrop-blur-sm sm:p-8">
          <p className="font-heading text-lg font-semibold tracking-tight">
            Want it on WhatsApp too?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Turn on the WhatsApp channel from your dashboard any time — no request, no waiting.
            The same bot, trained on the same content, starts answering on your own WhatsApp
            Business number too, with its own 3-day trial — no separate setup, no second
            knowledge base.
          </p>
        </div>
      </Reveal>

      {/* CTA */}
      <Reveal className="mt-20">
        <div className="rounded-3xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to try it?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Paste your URL and chat with a bot trained on your own content in about a minute.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="btn-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
            >
              Preview my chatbot
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface/60 px-7 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              See pricing
            </Link>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}
