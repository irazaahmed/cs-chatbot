import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { GlowCard } from "@/components/ui/GlowCard";
import { AlternativePricingTable } from "@/components/marketing/AlternativePricingTable";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Urdu Chatbot: Apni Website aur WhatsApp ke liye, Roman Urdu Support ke Sath",
  description:
    "CS Chatbot English, Urdu, aur Roman Urdu mein baat karta hai. Apni website ka URL paste karein aur free preview try karein. WhatsApp Business number pe bhi laga sakte hain.",
  keywords: [
    "urdu chatbot",
    "roman urdu chatbot",
    "whatsapp bot kaise banaye",
    "ai chatbot pakistan",
    "website chatbot pakistan",
  ],
  alternates: { canonical: "/urdu-chatbot" },
  openGraph: {
    title: "Urdu Chatbot: Apni Website aur WhatsApp ke liye",
    description:
      "CS Chatbot English, Urdu, aur Roman Urdu mein baat karta hai. Free preview try karein, koi signup nahi chahiye.",
    url: `${site.url}/urdu-chatbot`,
    siteName: "CS Chatbot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Urdu Chatbot: Apni Website aur WhatsApp ke liye",
    description:
      "CS Chatbot English, Urdu, aur Roman Urdu mein baat karta hai. Free preview try karein, koi signup nahi chahiye.",
  },
};

const reasons = [
  {
    title: "Customer jaisa likhta hai, waisa jawab milta hai",
    body: "\"Iska price kya hai?\" ya \"delivery kab tak hogi?\" jaisa sawal Roman Urdu mein aaye to bot samajh kar sahi jawab deta hai, ghalat ya adhoora nahi.",
  },
  {
    title: "Zyada tar chatbots sirf English mein achay hote hain",
    body: "Chatbase, Tidio, Intercom jaisi bade tools Urdu ya Roman Urdu ko support hi nahi karti, isliye Pakistani customers ke sawal miss ho jate hain.",
  },
  {
    title: "Website aur WhatsApp dono pe",
    body: "Same AI, same content se trained, apni WhatsApp Business number pe bhi jawab deta hai.",
  },
  {
    title: "Sirf apki website ke content se jawab",
    body: "Bot koi jhooti ya banayi hui baat nahi karta, sirf wahi jawab deta hai jo apki website pe likha hai, source link ke sath.",
  },
];

const faqs = [
  {
    question: "WhatsApp bot kaise banaye?",
    answer:
      "Sabse pehle apni website ka URL CS Chatbot mein paste karein, bot free preview mein turant ban jayega. Phir sign in karke dashboard se WhatsApp channel on karein aur apna WhatsApp Business number connect karein. Signup ke baad ye sab kaam khud self-serve hota hai, koi approval ka wait nahi karna padta.",
  },
  {
    question: "Kya CS Chatbot Urdu samajhta hai?",
    answer:
      "Ji haan. CS Chatbot English, Urdu, aur Roman Urdu teeno mein jawab deta hai, jaisa customer type karta hai waisa hi samajh kar jawab milta hai.",
  },
  {
    question: "Kya coding aani chahiye?",
    answer:
      "Nahi. Website pe lagana sirf ek script tag copy-paste karna hai, bilkul Google Analytics jaisa. Koi developer ya technical knowledge ki zaroorat nahi.",
  },
  {
    question: "Kya ye free hai?",
    answer:
      "Preview bilkul free hai, koi signup ya card nahi chahiye. Apni website live pe lagane ke liye paid plans Rs 3,499/month se shuru hote hain.",
  },
  {
    question: "Payment kaise kar sakte hain?",
    answer: "JazzCash, EasyPaisa, Raast, ya bank transfer se, PKR mein. Koi international card ki zaroorat nahi.",
  },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-accent-bright">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function UrduChatbotPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Urdu Chatbot: Apni Website aur WhatsApp ke liye",
        url: `${site.url}/urdu-chatbot`,
        inLanguage: "ur-Latn",
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
            Urdu chatbot
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Apni website ke liye <span className="text-shimmer">Urdu chatbot</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            CS Chatbot English, Urdu, aur Roman Urdu teeno mein baat karta hai, apki website aur
            WhatsApp Business number dono pe. Apni website ka URL paste karein aur turant free
            preview try karein, koi signup nahi chahiye.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8">
            <Link
              href="/"
              className="btn-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
            >
              Apna chatbot free preview karein
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Why */}
      <div className="mt-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Urdu chatbot ki zaroorat kyun hai
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

      {/* How it works */}
      <Reveal className="mx-auto mt-20 max-w-3xl">
        <div className="glass rounded-3xl p-8 sm:p-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">WhatsApp bot kaise banaye</h2>
          <ol className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-bright">1</span>
              Apni website ka URL yahan paste karein, bot khud website ka content parh kar seekh lega.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-bright">2</span>
              Preview mein bot se baat kar ke dekhein, koi signup ki zaroorat nahi is step pe.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-bright">3</span>
              Pasand aaye to sign in karein, dashboard se Website ya WhatsApp channel (ya dono) on karein.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-bright">4</span>
              WhatsApp ke liye apna WhatsApp Business number connect karein, website ke liye ek script tag paste karein. Bas, live ho jayega.
            </li>
          </ol>
        </div>
      </Reveal>

      {/* Pricing */}
      <Reveal className="mx-auto mt-20 max-w-3xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">PKR mein seedhi pricing</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Har plan ki apni page limit aur monthly conversation limit hai, koi chupi hui fees nahi.
        </p>
        <div className="mt-6">
          <AlternativePricingTable />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          JazzCash, EasyPaisa, Raast, ya bank transfer se payment karein. Payment submit karte hi
          access shuru ho jata hai, approval ka wait nahi karna padta.
        </p>
      </Reveal>

      {/* FAQ */}
      <div className="mx-auto mt-20 max-w-3xl">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Aksar poochay jane wale sawal</h2>
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
            Abhi free try karein
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Apni website ka URL paste karein aur ek minute se kam waqt mein apne hi content se
            trained bot ke sath chat karein. Koi signup, koi card, koi commitment nahi.
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/"
              className="btn-sheen inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
            >
              Apna chatbot preview karein
            </Link>
          </div>
        </div>
      </Reveal>
    </PageShell>
  );
}
