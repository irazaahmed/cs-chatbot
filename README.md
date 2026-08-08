<div align="center">

# 💬 CS Chatbot

### Create a free AI chatbot trained on your own website, in about a minute.

No signup. No card. No setup call. Paste your URL, watch it read your site, and start chatting.

## 👉 [**Try it live on your own website →**](https://chatbot.cybrumsolutions.dev)

**[chatbot.cybrumsolutions.dev](https://chatbot.cybrumsolutions.dev)**

<sub>A product by [Cybrum Solutions](https://www.cybrumsolutions.dev) · [Learn more](https://www.cybrumsolutions.dev/products/chatbot)</sub>

</div>

---

## What is it?

CS Chatbot turns any website into a smart assistant that answers visitors' questions **using only that website's real content**, plus any PDFs you upload (menus, brochures, price lists), not a generic AI that makes things up about your business.

Paste your URL and, right on the landing page, you can watch it crawl your pages and then chat with a working bot trained on them, before you sign up for anything. Like it? Sign in, turn on the Website channel, and drop **one script tag** on your site. That's the whole install, the same way you'd add Google Analytics — no ownership proof needed.

## Why it's different

- **🎯 Answers from your content only**: every reply is grounded in your actual pages. When your site doesn't cover something, it says so and offers a human instead of guessing.
- **⚡ Live in minutes, not weeks**: no developer, no scope document, no waiting. Copy, paste, done.
- **🌐 English, اردو & Roman Urdu built in**: it replies the way your customers actually type, which most chatbots built for a global audience never handle well.
- **📥 Generates leads, not just answers**: when a visitor shows real buying intent, it offers a human follow-up, collects their name and number in one natural step, and drops the lead straight into your dashboard. Switch lead capture on or off anytime.
- **📅 Books appointments in chat**: if a visitor wants to schedule a call or visit, it takes their details and preferred time right in the conversation and saves it to your Appointments tab.
- **💬 Website and WhatsApp — pick one or both**: connect your own WhatsApp Business number and the exact same AI, same knowledge base, same lead capture, answers there too. Two equal, independent channels, each a self-serve toggle in your dashboard.
- **🛡️ Never breaks your site**: the widget loads async, runs inside a Shadow DOM, and silently removes itself if anything ever goes wrong. It can't slow or break the host page.

## How it works

1. **Paste your URL**, no signup, no card.
2. **Watch it read your site**, live crawl, right in front of you.
3. **Chat with the preview**, ask it what a real visitor would.
4. **Sign in & turn on Website or WhatsApp**, one click with Google, then flip the channel(s) you want on.
5. **Paste one script tag**, and it's live.

```html
<script
  src="https://cdn.cybrumsolutions.dev/widget.js"
  data-key="pk_live_xxx"
  data-position="bottom-right"
  defer
></script>
```

## Plans

Website plans differ only in how many pages the bot learns and how many visitor conversations it answers each month. WhatsApp is priced and billed independently — turn it on with a website plan, or entirely on its own.

| Plan | Pages | Conversations / month | Price (PKR/mo) |
|---|---|---|---|
| Starter | 100 | 200 | 3,499 |
| Pro | 500 | 800 | 8,999 |
| Business | Unlimited | 3,000 | 23,999 |

| WhatsApp channel | Price (PKR/mo) |
|---|---|
| Bundled with any plan above | 4,499 |
| Standalone, no website plan | 4,999 |

Quarterly billing saves 10%, yearly saves 20%. There's a free preview and a free trial to start on, you can try the whole thing on your own real website before entering a card number anywhere.

## Tech

Built to run on a plain Ubuntu VPS with `npm run build && npm start`, no vendor lock-in.

- **Next.js 16** (App Router, TypeScript) · **Tailwind CSS**
- **PostgreSQL + pgvector** for RAG retrieval · **Prisma** ORM
- **Auth.js** (Google) · **OpenAI** (mini/nano class) via a single provider abstraction
- **Vanilla-TypeScript widget** bundled with esbuild, Shadow-DOM isolated, <30KB gzipped
- **Baileys** for the WhatsApp channel, one socket per connected tenant
- Standalone **worker** process for crawling & indexing (Postgres `jobs` table, no Redis)

The app runs as **three separate processes from one codebase**: the app serves the site and answers chats instantly, the worker handles heavy, minutes-long crawling in the background, and the WhatsApp connector keeps a persistent socket open per tenant that's enabled for it. None of them ever slow the site down.

---

<div align="center">

**Ready to see what it says about your business?**

## [**chatbot.cybrumsolutions.dev**](https://chatbot.cybrumsolutions.dev)

<sub>Built by [Cybrum Solutions](https://www.cybrumsolutions.dev), AI agents, automation & chatbots.</sub>

</div>
