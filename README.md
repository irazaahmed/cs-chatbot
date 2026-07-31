<div align="center">

# 💬 CS Chatbot

### Create a free AI chatbot trained on your own website — in about a minute.

No signup. No card. No setup call. Paste your URL, watch it read your site, and start chatting.

## 👉 [**Try it live on your own website →**](https://chatbot.cybrumsolutions.dev)

**[chatbot.cybrumsolutions.dev](https://chatbot.cybrumsolutions.dev)**

<sub>A product by [Cybrum Solutions](https://www.cybrumsolutions.dev) · [Learn more](https://www.cybrumsolutions.dev/products/chatbot)</sub>

</div>

---

## What is it?

CS Chatbot turns any website into a smart assistant that answers visitors' questions **using only that website's real content** — plus any PDFs you upload (menus, brochures, price lists) — not a generic AI that makes things up about your business.

Paste your URL and, right on the landing page, you can watch it crawl your pages and then chat with a working bot trained on them — **before you sign up for anything.** Like it? Sign in, verify you own the domain, and drop **one script tag** on your site. That's the whole install, the same way you'd add Google Analytics.

## Why it's different

- **🎯 Answers from your content only** — every reply is grounded in your actual pages, with a source link under each answer. When your site doesn't cover something, it says so and offers a human instead of guessing.
- **⚡ Live in minutes, not weeks** — no developer, no scope document, no waiting. Copy, paste, done.
- **🌐 English, اردو & Roman Urdu built in** — it replies the way your customers actually type, which most chatbots built for a global audience never handle well.
- **📥 Generates leads, not just answers** — when a visitor shows real buying intent, it offers a human follow-up, collects their name and number in one natural step, and drops the lead straight into your dashboard. Switch lead capture on or off anytime.
- **📅 Books appointments in chat** — if a visitor wants to schedule a call or visit, it takes their details and preferred time right in the conversation and saves it to your Appointments tab.
- **🛡️ Never breaks your site** — the widget loads async, runs inside a Shadow DOM, and silently removes itself if anything ever goes wrong. It can't slow or break the host page.

## How it works

1. **Paste your URL** — no signup, no card.
2. **Watch it read your site** — live crawl, right in front of you.
3. **Chat with the preview** — ask it what a real visitor would.
4. **Sign in & verify your domain** — one click with Google, then prove you own the site.
5. **Paste one script tag** — and it's live.

```html
<script
  src="https://cdn.cybrumsolutions.dev/widget.js"
  data-key="pk_live_xxx"
  data-position="bottom-right"
  defer
></script>
```

## Plans

Every plan includes the full product. They differ only in how many pages the bot learns and how many visitor messages it answers each month.

| Plan | Pages | Messages / month |
|---|---|---|
| Starter | 15 | 500 |
| Pro | 50 | 2,000 |
| Business | 200 | 10,000 |

There's a free preview and a free tier to start on — you can try the whole thing on your own real website before entering a card number anywhere.

## Tech

Built to run on a plain Ubuntu VPS with `npm run build && npm start` — no vendor lock-in.

- **Next.js 16** (App Router, TypeScript) · **Tailwind CSS**
- **PostgreSQL + pgvector** for RAG retrieval · **Prisma** ORM
- **Auth.js** (Google) · **OpenAI** (mini/nano class) via a single provider abstraction
- **Vanilla-TypeScript widget** bundled with esbuild, Shadow-DOM isolated, <30KB gzipped
- Standalone **worker** process for crawling & indexing (Postgres `jobs` table, no Redis)

The app and the worker run as **two separate processes from one codebase**: the app serves the site and answers chats instantly, while the worker handles the heavy, minutes-long crawling in the background so it never slows the site down.

---

<div align="center">

**Ready to see what it says about your business?**

## [**chatbot.cybrumsolutions.dev**](https://chatbot.cybrumsolutions.dev)

<sub>Built by [Cybrum Solutions](https://www.cybrumsolutions.dev) — AI agents, automation & chatbots.</sub>

</div>
