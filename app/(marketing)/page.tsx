"use client";

import { useState, useRef, FormEvent } from "react";
import { readSSE } from "@/lib/client/sse";
import { Reveal } from "@/components/ui/Reveal";
import { GlowCard } from "@/components/ui/GlowCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { JsonLd } from "@/components/JsonLd";

interface ProgressState {
  done: number;
  total: number;
  currentUrl: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

type Phase = "input" | "crawling" | "chat";

const CYBRUM_URL = "https://www.cybrumsolutions.dev";

const benefits = [
  {
    title: "Answers from your content only",
    description:
      "Every reply is grounded in your website's real pages, with source links under each answer. No invented facts about your business.",
  },
  {
    title: "Live in minutes, not weeks",
    description:
      "Paste your URL, watch it learn your site, and chat instantly. Installing on your website is a single script tag.",
  },
  {
    title: "Urdu & Roman Urdu built in",
    description:
      "Your bot answers the way your customers actually type — English, اردو, or Roman Urdu — and captures leads while it chats.",
  },
];

const steps = [
  { n: "1", label: "Paste your URL" },
  { n: "2", label: "Chat with the preview" },
  { n: "3", label: "Sign in & verify your domain" },
  { n: "4", label: "Paste one script tag — live" },
];

// Answers double as visible copy and FAQPage structured data below — keep
// them in sync, don't let the JSON-LD drift from what's on the page.
const faqs = [
  {
    question: "Is it free to create a chatbot for my website?",
    answer:
      "Yes. Paste your URL and chat with a working preview with no signup and no card. Creating your account and running a full crawl on your own site is free too — you only pay if you outgrow the free plan's page and message limits.",
  },
  {
    question: "How do I create a chatbot for my website?",
    answer:
      "Paste your website's URL above. We read your pages, and you can chat with a bot trained on them right away. Like it? Sign in, verify you own the domain, and paste one script tag on your site — that's the whole setup.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. The whole flow is copy, paste, done — no coding, no developer, no setup call. Installing the widget is one script tag, the same way you'd add Google Analytics.",
  },
  {
    question: "Will the chatbot make up answers about my business?",
    answer:
      "No. It only answers from content it actually crawled off your website, with a source link under every answer. If your site doesn't cover something, it says so instead of guessing.",
  },
  {
    question: "Does it support Urdu or Roman Urdu?",
    answer:
      "Yes. The chatbot replies the way your customers actually type — English, اردو, or Roman Urdu — which most website chatbots built for Pakistani businesses don't handle well.",
  },
];

export default function LandingPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState<ProgressState>({ done: 0, total: 15, currentUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function startCrawl(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setPhase("crawling");
    setProgress({ done: 0, total: 15, currentUrl: "" });

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Couldn't start the crawl. Please check the URL and try again.");
        setPhase("input");
        return;
      }

      await readSSE(res, (event) => {
        if (event.type === "progress") {
          setProgress({
            done: Number(event.done),
            total: Number(event.total),
            currentUrl: String(event.url ?? ""),
          });
        } else if (event.type === "ready") {
          setPreviewId(String(event.previewId));
          setMessages([
            {
              role: "assistant",
              content: `I've read ${event.pageCount} pages from your site. Ask me anything a visitor might ask.`,
            },
          ]);
          setPhase("chat");
        } else if (event.type === "error") {
          setError(String(event.message ?? "Something went wrong."));
          setPhase("input");
        }
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("input");
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || !previewId || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setSending(true);

    try {
      const res = await fetch("/api/preview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, message: question, history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: body.error ?? "Something went wrong." },
        ]);
        return;
      }

      let answer = "";
      let citations: string[] = [];
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      await readSSE(res, (event) => {
        if (typeof event.token === "string") {
          answer += event.token;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: answer, citations };
            return next;
          });
        } else if (event.done) {
          citations = Array.isArray(event.citations) ? (event.citations as string[]) : [];
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: answer, citations };
            return next;
          });
        }
      });
    } finally {
      setSending(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://chatbot.cybrumsolutions.dev/#product",
        name: "CS Chatbot",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Create a free AI chatbot for your website. Trained only on your own content, cites its sources, and supports English, Urdu, and Roman Urdu.",
        url: "https://chatbot.cybrumsolutions.dev",
        offers: { "@type": "Offer", price: "0", priceCurrency: "PKR", description: "Free preview and free plan to get started" },
        provider: { "@type": "Organization", name: "Cybrum Solutions", url: CYBRUM_URL },
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
        <a href={CYBRUM_URL} className="group flex items-center gap-2.5" aria-label="Cybrum Solutions">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent-bright transition-colors group-hover:bg-accent/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><text x="11.7" y="11" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none" fontSize="8.2" fontWeight="700" letterSpacing="-0.3" style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}>CS</text>
            </svg>
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            CS<span className="text-accent"> Chatbot</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <a
            href="/pricing"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:inline-block"
          >
            Pricing
          </a>
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
        <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent-bright">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent-bright shadow-[0_0_8px_var(--color-accent)]" />
              Free to try — no signup
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Stop losing customers who leave before{" "}
              <span className="text-shimmer">you reply</span>.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Cheaper than one support hire, answering every visitor 24/7.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted/80">
              Paste your URL and chat with a bot trained on your site — no signup, no card.
            </p>
          </Reveal>
        </div>

        {phase === "input" && (
          <Reveal delay={0.24}>
            <form onSubmit={startCrawl} className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="h-14 min-h-[3.5rem] w-full shrink-0 appearance-none rounded-full border border-border bg-surface px-6 text-base text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)] sm:flex-1 sm:shrink"
              />
              <button
                type="submit"
                className="btn-sheen inline-flex h-14 min-h-[3.5rem] shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-8 font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
              >
                Preview my chatbot
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>
          </Reveal>
        )}

        {error && (
          <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-center text-sm text-danger-text">
            {error}
          </p>
        )}

        {phase === "crawling" && (
          <div className="glass mx-auto mt-10 max-w-2xl rounded-3xl p-7">
            <div className="flex items-center justify-between">
              <p className="font-heading font-semibold">
                Reading your site…
              </p>
              <span className="font-heading text-sm tabular-nums text-accent-bright">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-dim via-accent to-accent-bright shadow-[0_0_12px_var(--color-accent)] transition-all duration-500"
                style={{ width: `${Math.min(100, (progress.done / Math.max(1, progress.total)) * 100)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <span className="flex items-center gap-1">
                <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright" />
                <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.15s]" />
                <span className="pv-dot h-1.5 w-1.5 rounded-full bg-accent-bright [animation-delay:0.3s]" />
              </span>
              {progress.currentUrl && <span className="truncate">{progress.currentUrl}</span>}
            </div>
          </div>
        )}

        {phase === "chat" && (
          <div className="glass mx-auto mt-10 flex h-[520px] max-w-2xl flex-col overflow-hidden rounded-3xl shadow-[0_24px_70px_-30px_var(--color-accent)]">
            {/* panel header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent-bright">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><text x="11.7" y="11" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none" fontSize="8.2" fontWeight="700" letterSpacing="-0.3" style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}>CS</text>
                </svg>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-card bg-emerald-400" />
              </span>
              <div>
                <p className="text-sm font-semibold">Your website&apos;s chatbot</p>
                <p className="text-[11px] text-muted">Preview — trained on your live content</p>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={`inline-block max-w-[85%] rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-accent text-white"
                        : "rounded-tl-sm border border-border bg-surface/80 text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content || "…"}</p>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 space-y-0.5 border-t border-border pt-2">
                        {m.citations.map((c) => (
                          <a
                            key={c}
                            href={c}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-accent-bright underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent"
                          >
                            {c}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question a visitor might ask…"
                disabled={sending}
                className="h-11 flex-1 rounded-full border border-border bg-surface/60 px-5 text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 font-medium text-white transition-all duration-300 hover:bg-accent-bright disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Steps strip */}
        <Reveal delay={0.1} className="mt-16">
          <ol className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {steps.map((s) => (
              <li key={s.n} className="flex items-center gap-2.5 text-sm text-muted">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-heading text-[11px] font-semibold text-accent-bright">
                  {s.n}
                </span>
                {s.label}
              </li>
            ))}
          </ol>
        </Reveal>

        {/* divider */}
        <div className="divider-animated mx-auto mt-16 h-px w-full max-w-3xl" />

        {/* Benefits */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.08} className="h-full">
              <GlowCard className="h-full">
                <h3 className="font-heading text-lg font-semibold tracking-tight">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.description}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>

        {/* FAQ */}
        <div className="divider-animated mx-auto mt-16 h-px w-full max-w-3xl" />
        <Reveal className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.question}
                className="group glass rounded-2xl p-5 open:pb-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                  {f.question}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
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
            <a href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href={`${CYBRUM_URL}/products/chatbot`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              About this product
            </a>
            <a href={`${CYBRUM_URL}/contact`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
