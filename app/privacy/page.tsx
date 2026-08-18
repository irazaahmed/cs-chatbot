import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { site, cybrum } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — CS Chatbot",
  description: "How CS Chatbot (by Cybrum Solutions) collects, uses, and protects data across the Website, WhatsApp, and Instagram channels.",
  alternates: { canonical: "/privacy" },
};

const lastUpdated = "August 18, 2026";

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="mx-auto mt-14 max-w-3xl sm:mt-20">
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted">Last updated: {lastUpdated}</p>

        <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-muted sm:text-base">
          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">1. Who we are</h2>
            <p className="mt-3">
              {site.fullName} (&quot;CS Chatbot&quot;, &quot;we&quot;, &quot;us&quot;) is a product of Cybrum
              Solutions. Businesses (&quot;tenants&quot;) sign up to train an AI chatbot on their own website
              content, then turn it on for their website, their WhatsApp Business number, their Instagram
              professional account, or any combination — each channel opt-in and independent. This policy
              covers data collected across all channels, both from the tenants who run the chatbot and the
              visitors/customers who chat with it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">2. What we collect</h2>
            <p className="mt-3">From a tenant (business owner) who signs up:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account details: name, email, and login method (Google sign-in or password).</li>
              <li>Website content the tenant asks us to crawl, or documents they upload, to build the chatbot&apos;s knowledge base.</li>
              <li>Channel connection details: their website domain, their WhatsApp Business number, or their connected Instagram professional account and the access token needed to send and receive messages on their behalf.</li>
              <li>Payment submissions (screenshot, sender name, amount) for manual billing verification.</li>
            </ul>
            <p className="mt-3">From a visitor or customer chatting with a tenant&apos;s bot:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>The messages they send and the bot&apos;s replies, to hold a conversation and answer follow-up questions.</li>
              <li>Contact details (name, phone, email) only if they choose to share them in the chat — for example, to request a callback or book an appointment.</li>
              <li>For WhatsApp and Instagram, the platform-provided sender identifier (phone number or Instagram-scoped user ID) needed to route replies to the right person.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">3. How we use it</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To generate the chatbot&apos;s knowledge base and answer visitor questions from it.</li>
              <li>To send and receive messages on the tenant&apos;s connected WhatsApp or Instagram account, using OpenAI&apos;s API to generate replies (see Section 6).</li>
              <li>To show the tenant their conversations, captured leads, and appointment requests in their dashboard.</li>
              <li>To operate self-serve billing: usage caps, trial periods, and payment verification.</li>
            </ul>
            <p className="mt-3">
              We do not sell any data, and we do not use conversation content to train AI models beyond the
              single reply it was collected for.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">4. Instagram &amp; Meta Platform Data</h2>
            <p className="mt-3">
              When a tenant connects their Instagram professional account, we request the minimum permissions
              needed to read and reply to their direct messages and comments on their own behalf:{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">instagram_business_basic</code>,{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">instagram_business_manage_messages</code>,
              and{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">instagram_business_manage_comments</code>.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>The Instagram access token and account identifiers are stored so the connector can send replies; they are never shared with anyone outside Cybrum Solutions&apos; own systems.</li>
              <li>Incoming DM text is sent to OpenAI&apos;s API solely to generate that reply, and is not used for any other purpose.</li>
              <li>A tenant can disconnect their Instagram account at any time from their dashboard, which immediately stops the chatbot from accessing it.</li>
              <li>
                If a customer or tenant removes CS Chatbot&apos;s access from their Instagram or Facebook
                settings, Meta notifies us at our deauthorize callback and we mark that account disconnected
                and stop using its token right away — see{" "}
                <a href="/api/instagram/deauthorize" className="text-accent-bright underline underline-offset-2">
                  /api/instagram/deauthorize
                </a>.
              </li>
              <li>
                Anyone can request deletion of data tied to an Instagram-connected account through our data
                deletion endpoint — see{" "}
                <a href="/api/instagram/data-deletion" className="text-accent-bright underline underline-offset-2">
                  /api/instagram/data-deletion
                </a>{" "}
                — or by emailing us at {cybrum.email}.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">5. Data retention</h2>
            <p className="mt-3">
              Conversation transcripts are kept for 30 days of inactivity and then automatically deleted.
              Captured leads and appointment requests (which carry their own copy of the name/contact/interest
              a visitor shared) are kept until the tenant deletes them or closes their account. If a tenant&apos;s
              account is canceled, their data is retained for 30 days in case they reactivate, then permanently
              purged.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">6. Third parties we use</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><b className="text-foreground">OpenAI</b> — processes chat messages to generate AI replies and text embeddings.</li>
              <li><b className="text-foreground">Meta (WhatsApp Business Platform &amp; Instagram Platform)</b> — delivers and receives messages for tenants who connect those channels.</li>
              <li><b className="text-foreground">Resend</b> — sends transactional emails (welcome, billing, trial reminders).</li>
            </ul>
            <p className="mt-3">Each is bound by its own privacy terms and only receives the data needed to perform its function for us.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">7. Your choices</h2>
            <p className="mt-3">
              Tenants can disconnect any channel, delete their knowledge base, or close their account at any
              time from their dashboard. Visitors and customers can ask a tenant&apos;s bot to stop, or contact
              the tenant directly, to have their conversation data removed on request.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">8. Contact</h2>
            <p className="mt-3">
              Questions about this policy or a data request: {cybrum.email}, or via{" "}
              <a href={cybrum.contactUrl} className="text-accent-bright underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                Cybrum Solutions&apos; contact page
              </a>.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
