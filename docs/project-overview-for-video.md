# Project Overview — Cybrum Solutions Chatbot (cs-chatbot)
*Written for use as source material for an AI-generated video presentation (Urdu voiceover).*

---

## 1. One-Line Pitch

Cybrum Solutions Chatbot is a multi-tenant SaaS platform that lets any business turn
their own website and WhatsApp number into a smart, AI-powered customer support
chatbot — without writing a single line of code — in just a few minutes.

---

## 2. The Problem

Small and medium businesses lose customers every day because:

- Visitors land on a website, have a question, and leave when nobody answers in time.
- Hiring 24/7 human support staff is expensive and impractical for a small business.
- Generic chatbots (rule-based, scripted) feel robotic and often give wrong or
  irrelevant answers because they aren't actually trained on the business's real
  content.
- Business owners are not developers — they cannot build or maintain a custom AI
  chatbot themselves.

## 3. The Solution

Cybrum Solutions Chatbot solves this by offering a **"paste your URL, get a trained
chatbot"** experience:

1. A business owner signs up and enters their website URL, or uploads documents instead.
2. It automatically crawls and reads every page of their site — services, pricing,
   FAQs, contact info, policies, everything public.
3. The owner turns on the Website channel, the WhatsApp channel, or both — each is a
   one-click, self-serve toggle, no approval and no ownership proof required.
4. Within minutes, the business gets a small piece of code (`<script>` tag) to paste
   into their website, and/or a WhatsApp number ready to pair.
5. That single script renders a chat bubble on their site, and the same bot answers
   on WhatsApp too. Visitors can now ask questions in plain language, and the bot
   answers **using only real information from that business's own content** — not
   made-up or generic answers.

This is "Retrieval-Augmented Generation" (RAG): instead of the AI guessing answers
from general internet knowledge, it looks up the business's actual content first,
then writes a natural-language answer strictly based on what it found. If it can't
find the answer anywhere on the site, it honestly says so and offers to connect the
visitor to a human — it never invents facts about the business.

---

## 4. Who Is It For

- Local service businesses (clinics, salons, real estate agents, consultancies)
- E-commerce and small retail websites
- Agencies and freelancers who want to resell "AI chatbot" as a service to their
  own clients
- Any business with a website that currently has no live chat, or has one that
  can't actually answer questions

## 5. What Makes It Different

- **Trained only on the business's own content** — no hallucinated answers about
  services the business doesn't offer.
- **Live demo before signup.** A visitor can paste any website URL on the landing
  page and immediately chat with a working preview bot trained on that site,
  before ever creating an account. This "try before you buy" moment is the single
  biggest driver of conversions.
- **Multi-channel by default, not an add-on.** The website widget and a business's
  own WhatsApp Business number are two equal, independently priced channels — a
  business can turn on either, or both, and the same trained knowledge answers
  customers on whichever channel(s) they choose.
- **Multi-tenant by design.** One codebase serves every customer; each business's
  data is completely isolated from every other business's data at the database
  level, enforced automatically rather than trusted to remember in every line of
  code.
- **Lightweight and self-hosted.** No vendor lock-in to a specific cloud platform;
  runs on a simple, affordable server (VPS), not an expensive one.
- **Manual, transparent billing for local markets.** Payments are accepted via
  JazzCash, EasyPaisa, Raast, and bank transfer — payment methods that actually
  work for the Pakistani market — with a human verifying every payment.

---

## 6. How It Works — Step by Step (Business Owner Journey)

1. **Sign up** with Google or email/password.
2. **Enter a website URL, or upload documents.** Either way trains the same
   knowledge base — no ownership proof required for the crawl.
3. **Automatic crawl.** The system reads the site's sitemap (or explores link by
   link), respects the site's `robots.txt` rules, extracts the real readable content
   from each page (ignoring menus, footers, ads), and shows live progress
   ("42 of 100 pages crawled...").
4. **Content is chunked and embedded.** Each page's text is broken into meaningful
   pieces and converted into a mathematical representation ("embedding") that lets
   the AI search by *meaning*, not just keyword matching.
5. **Customize the bot.** The owner sets the bot's name, avatar, brand color,
   greeting message, and reply language (English, Urdu, or Roman Urdu).
6. **Turn on Website and/or WhatsApp.** Two independent, self-serve toggles — flip
   either on any time from the dashboard, no approval needed. Each starts its own
   3-day trial the first time it's turned on.
7. **Install.** Copy one script tag into the website, and/or pair a WhatsApp
   number by scanning a QR code. The dashboard confirms live whether the widget
   was detected on the real site.
8. **Go live.** Visitors can now chat on whichever channel(s) are on. Every
   conversation, every question the bot couldn't answer, and every lead
   (name/email/phone a visitor shares) shows up in the owner's dashboard.
9. **Billing.** Each channel is billed independently — monthly, quarterly (10% off),
   or yearly (20% off) — based on how many pages are indexed and how many
   conversations happen per month on that channel. Payment is manual: pay via local
   payment method, upload proof, get verified, stay active. If a payment is late,
   the service degrades gracefully in stages instead of shutting off suddenly — a
   real customer's chatbot never disappears overnight.

## 7. How It Works — Website Visitor Journey

1. Visitor opens the business's website and sees a small chat bubble in the corner.
2. They click it and ask a question in their own words — no menus, no forms.
3. Within seconds, the bot streams back an answer in real time (word by word, like
   a live conversation), pulled directly from the business's own website content,
   with a link back to the exact source page.
4. If the bot doesn't know the answer, it says so honestly and offers to connect
   them to a human, instead of making something up.
5. The whole interaction is invisible to the rest of the website — the chat widget
   is completely sandboxed so it can never break the business's site, slow it down,
   or clash with its design, even if something inside the widget fails.

---

## 8. Under the Hood — Simple Technical Explanation

*(For a general audience — not deeply technical, but accurate.)*

- **The brain**: A modern AI language model reads the retrieved website content and
  writes the answer in natural language — the same family of technology behind
  tools like ChatGPT, but scoped down to only know what's true about one specific
  business.
- **The memory**: A specialized database (Postgres with a "vector search" extension)
  stores every chunk of website content as a searchable meaning-based index, so the
  right information can be found instantly, even from a site with hundreds of pages.
- **The crawler**: A background worker process constantly checks for new "crawl
  this website" jobs, fetches pages politely (respecting the site's rules, with
  limits so it never overloads a server), and feeds new content into the memory.
- **The widget**: A tiny, self-contained piece of website code (under 30 kilobytes)
  that loads without slowing the page down and is fully isolated from the rest of
  the site's styling and scripts.
- **The WhatsApp connector**: A separate always-on process that maintains a live
  connection to WhatsApp for every business that opts in, feeding incoming messages
  through the exact same AI brain used on the website.
- **Everything runs on one affordable server** — there's no need for expensive,
  complex cloud infrastructure to serve many businesses at once.

## 9. Security & Trust

- Every business's data is walled off from every other business's data at the
  database level — enforced by the system itself, not left to chance.
- A business's chatbot only ever answers using that business's own crawled or
  uploaded content.
- Sensitive documents (like payment proof screenshots) are stored privately and
  only ever accessible through short-lived, secure links.
- Bot access is protected against abuse: rate limiting, domain checks, and
  bot-detection challenges guard against spam and misuse.

---

## 10. Business Model

- **Tiered subscription plans** (Starter, Pro, Business) based on how many website
  pages are indexed and how many monthly conversations are included.
- **Billed in Pakistani Rupees**, in monthly / quarterly / yearly cycles, with
  discounts for longer commitments.
- **Manual payment verification** via local payment rails (JazzCash, EasyPaisa,
  Raast, bank transfer) — a deliberate choice to fit how businesses in this market
  actually pay, without needing an international card processor.
- **WhatsApp is a self-serve channel, equal to Website**, priced independently —
  cheaper when bundled with an active website plan, at a standalone rate on its own.
- **Graceful degradation, never a hard cutoff** — a late payment gradually reduces
  service (a "Powered by Cybrum" badge appears, then eventually the bot politely
  tells visitors it's temporarily unavailable) rather than abruptly breaking a
  business's website.

## 11. Roadmap / Where It's Headed

The product is being built in careful phases: first proving the AI actually gives
good answers, then the core chat API, then the public widget and instant-demo
landing page, then full account/dashboard functionality, then billing, and finally
production deployment — each phase fully working before the next begins, to avoid
building on a shaky foundation.

---

## 12. Suggested Narration Flow for the Video

1. **Hook** — the problem: businesses lose customers because nobody answers their
   questions fast enough, and hiring 24/7 support isn't realistic.
2. **Solution reveal** — "What if your website could answer for you, using only
   what's actually true about your business?"
3. **Live demo moment** — show the "paste your URL, chat instantly" landing page
   experience.
4. **How it works** — crawl or upload → train → turn on a channel → install → go
   live, in one smooth flow.
5. **Trust & accuracy** — it never makes things up; it always cites the real page.
6. **Two equal channels** — Website and WhatsApp, one brain, pick one or both.
7. **Built for local businesses** — local payment methods, fair pricing, human
   support.
8. **Call to action** — "Paste your website URL and see it work in 30 seconds."
