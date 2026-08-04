# CLAUDE.md — cs-chatbot

Multi-tenant website chatbot SaaS by Cybrum Solutions.

A business signs up, enters their website URL, we verify they own it, crawl and
index the site, and give them a `<script>` tag. That script renders a RAG
chatbot on their website, trained only on their own content.

Read this file fully before writing any code. Follow it exactly.

---

## 1. NON-NEGOTIABLE RULES

These are not suggestions. Violating any of these is a bug, even if the code runs.

1. **Every database query touching tenant data MUST filter by `tenantId`.**
   No exceptions. A cross-tenant data leak kills this product. Enforce with a
   Prisma extension, not developer memory.

2. **No platform-specific APIs.** No Vercel KV, Vercel Blob, Vercel Postgres,
   Netlify Blobs, Netlify Identity, or any vendor-locked SDK. This app must run
   with `npm run build && npm start` on a plain Ubuntu VPS. Plain Node only.

3. **LLM and embedding calls go through `lib/ai/provider.ts` only.**
   Never import the OpenAI SDK directly in a route, component, or worker.
   Model names and providers change; the rest of the codebase must not care.

4. **The widget must never break the host page.** All widget code is wrapped in
   try/catch. Any failure means the widget silently does not render. It must
   never throw into the customer's website, never block page load, and never
   emit console errors on their domain.

5. **Import paths must match filenames exactly, including case.**
   Development is on Windows (case-insensitive), production is Linux
   (case-sensitive). `./components/button` will not resolve to `Button.tsx` on
   the server.

6. **Never crawl a domain that has not passed ownership verification.**

7. **Ask before adding a dependency.** Prefer the standard library and small,
   well-known packages. This project must stay easy to run on a 4GB VPS.

---

## 2. TECH STACK

| Layer | Choice | Note |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Server Components by default |
| Styling | Tailwind CSS | |
| ORM | Prisma | |
| Database | PostgreSQL + pgvector | Neon in dev, self-hosted Postgres on VPS later |
| Auth | Auth.js (NextAuth v5) | Google OAuth only in Phase 1-3 |
| Jobs | Postgres `jobs` table + polling worker | No Redis, no BullMQ in Phase 1 |
| LLM | OpenAI, mini/nano class only | Via provider abstraction |
| Embeddings | `text-embedding-3-small`, 1536 dims | |
| Widget | Vanilla TypeScript, no framework | Bundled with esbuild, Shadow DOM |
| WhatsApp | Baileys (`@whiskeysockets/baileys`) | Optional add-on. One socket per connected tenant, standalone connector process |
| Email | Resend, REST API via `fetch`, no SDK | `lib/email/provider.ts` only, sent from `chatbot@cybrumsolutions.dev` |
| File storage | VPS local disk | Payment screenshots. R2 only if disk runs out |
| Deploy target | Ubuntu VPS via Coolify | Not decided until Phase 5 |

**Do not add Redis, Docker, Kubernetes, a message broker, or a separate vector
database.** Postgres does all of it at this scale.

---

## 3. ARCHITECTURE

Single codebase, many tenants. Tenants differ only by rows in the database, never
by deployed code.

```
Visitor's browser (customer's website)
  └─ <script src="cdn.../widget.js" data-key="pk_live_xxx">
       └─ POST /api/chat  (Origin header, streaming SSE response)
            ├─ resolve tenant by publicKey
            ├─ check allowedDomains against Origin       → 403
            ├─ check tenant.status                       → disabled response
            ├─ check monthly usage vs plan cap           → disabled response
            ├─ rate limit per tenant + per IP            → 429
            ├─ embed query → pgvector search WHERE tenantId
            ├─ build prompt from top-k chunks
            ├─ stream LLM response
            └─ log conversation + token usage

Owner's browser (app.cybrumsolutions.dev)
  └─ Next.js dashboard → Auth.js → Prisma → Postgres

Worker process (node worker.js, separate terminal / process)
  └─ poll jobs table every 5s → crawl → extract → chunk → embed → store

WhatsApp connector (node whatsapp-connector.mts, separate terminal / process, opt-in per tenant)
  └─ hold a persistent Baileys socket per connected tenant
       ├─ reopen sockets for already-connected tenants on boot
       ├─ poll jobs table for pairing requests, publish QR to the dashboard
       └─ inbound message → same retrieval/prompt/LLM pipeline as /api/chat,
          non-streaming, keyed by the sender's WhatsApp id
```

**Four separately runnable pieces:** the Next.js app, the worker, the WhatsApp
connector, and the widget bundle. The worker and the WhatsApp connector must be
standalone processes, never Next.js routes — crawls run for minutes and the
WhatsApp socket must stay open, neither of which a stateless route can do.

---

## 4. DATA MODEL

Core shape. Extend as needed but do not change these fundamentals.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  tenants   Tenant[]
  createdAt DateTime @default(now())
}

model Tenant {
  id             String   @id @default(cuid())
  ownerId        String
  name           String
  publicKey      String   @unique          // pk_live_xxx, safe to expose
  websiteUrl     String
  allowedDomains String[]                  // origin allowlist

  verified       Boolean  @default(false)
  verifyToken    String                    // for meta tag / DNS TXT / file
  verifyMethod   String?                   // meta | dns | file

  status         String   @default("trialing")
  // trialing | active | past_due | suspended | canceled
  planId         String   @default("starter")
  periodEnd      DateTime?

  // WhatsApp add-on — independent of the website plan's status/periodEnd so
  // one channel lapsing never disables the other.
  whatsappStatus    String    @default("inactive") // inactive | trialing | active | past_due | suspended
  whatsappPeriodEnd DateTime?
  // Admin-only allowlist gate, separate from billing: a tenant can't see the
  // connect flow or get billed for WhatsApp until an admin flips this on.
  whatsappEnabled   Boolean   @default(false)
  whatsappRequestedAt DateTime? // set when tenant requests access, cleared on approval

  brandConfig    Json                      // color, botName, avatar, greeting, position
  systemPrompt   String   @db.Text
  language       String   @default("en")   // en | ur | roman_ur

  owner          User     @relation(fields: [ownerId], references: [id])
  documents      Document[]
  conversations  Conversation[]
  leads          Lead[]
  payments       Payment[]
  whatsappAccount WhatsAppAccount?

  @@index([publicKey])
}

// One WhatsApp Business number per tenant. authState holds the Baileys
// AuthenticationState as JSON so the connector survives redeploys without a
// mounted volume (see lib/whatsapp/pg-auth-state.ts).
model WhatsAppAccount {
  id          String    @id @default(cuid())
  tenantId    String    @unique
  phoneNumber String?
  status      String    @default("disconnected") // disconnected | pairing | connected
  authState   Json?
  qrCode      String?
  connectedAt DateTime?
  lastSeenAt  DateTime?

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model Document {
  id        String  @id @default(cuid())
  tenantId  String
  sourceUrl String
  title     String?
  content   String  @db.Text
  embedding Unsupported("vector(1536)")
  tokenCount Int

  tenant    Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model Job {
  id         String    @id @default(cuid())
  tenantId   String
  type       String    // crawl | recrawl | preview_crawl
  status     String    @default("pending")  // pending | running | done | failed
  payload    Json
  progress   Json?     // { done: 42, total: 100, currentUrl: "..." }
  error      String?
  attempts   Int       @default(0)
  createdAt  DateTime  @default(now())
  startedAt  DateTime?
  finishedAt DateTime?

  @@index([status, createdAt])
}

model Conversation {
  id        String   @id @default(cuid())
  tenantId  String
  sessionId String
  messages  Json     // [{ role, content, citations?, ts }]
  answered  Boolean  @default(true)   // false = bot could not answer
  inputTokens  Int   @default(0)
  outputTokens Int   @default(0)
  channel   String   @default("web") // web | whatsapp — counted against separate caps
  createdAt DateTime @default(now())

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
}

model Lead {
  id             String   @id @default(cuid())
  tenantId       String
  name           String?
  email          String?
  phone          String?
  conversationId String?
  createdAt      DateTime @default(now())

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model Payment {
  id          String    @id @default(cuid())
  tenantId    String
  invoiceRef  String    @unique   // CYB-2026-0042, customer puts this in transaction remarks
  planId      String    @default("starter") // applied to Tenant.planId on approval
  billingCycle String   @default("monthly") // monthly | quarterly | yearly
  addon       String?             // null = plan payment; "whatsapp" = WhatsApp add-on payment
  amountPKR   Int
  method      String              // jazzcash | easypaisa | raast | bank
  senderName  String
  proofUrl    String              // R2 key
  status      String    @default("submitted")  // submitted | verified | rejected
  periodStart DateTime
  periodEnd   DateTime
  reviewedAt  DateTime?
  note        String?

  tenant      Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

pgvector needs raw SQL for similarity search since Prisma does not support the
vector type natively. Keep all vector SQL in `lib/db/vector.ts` and nowhere else.

---

## 5. MULTI-TENANCY

Enforce isolation at the data layer, not in each route.

```ts
// lib/db/scoped.ts
export function scopedDb(tenantId: string) {
  return prisma.$extends({
    query: {
      document:     { $allOperations: injectTenant(tenantId) },
      conversation: { $allOperations: injectTenant(tenantId) },
      lead:         { $allOperations: injectTenant(tenantId) },
    },
  });
}
```

Rules:
- Route handlers resolve the tenant first, then use `scopedDb(tenantId)`.
- Raw SQL for vector search must include `WHERE "tenantId" = $1`. Always.
- Never accept `tenantId` from the request body. Derive it from the session
  (dashboard) or from `publicKey` (widget).

---

## 6. CRAWL AND INGESTION

### Ownership verification (before any full crawl)

Three methods, user picks one:
- **Meta tag:** `<meta name="cybrum-verify" content="{verifyToken}">` in `<head>`
- **File:** `/.well-known/cybrum-verify.txt` containing the token
- **DNS:** TXT record `cybrum-verify={verifyToken}`

Verification is a fetch and a string check. On success set `verified = true` and
add the hostname to `allowedDomains`.

**Exception:** the public landing page preview crawl (see Phase 2) is capped at
15 pages, is not stored against a tenant permanently, and does not require
verification. Everything else does.

### Crawl rules

1. Fetch and respect `robots.txt`. Skip disallowed paths.
2. Try `sitemap.xml` first. Fall back to BFS from the homepage, max depth 3.
3. Same origin only. No subdomains unless explicitly added.
4. Concurrency 5. Per-request timeout 15s. Skip non-HTML content types.
5. Hard page cap by plan. Never unbounded.
6. Extract main content and drop nav, header, footer, and script tags.
7. Skip pages under 100 words.
8. Update `Job.progress` after every page so the UI can show live status.

### Chunking

- 800 tokens per chunk, 150 token overlap.
- Never split mid-sentence.
- Store `sourceUrl` and `title` on every chunk. Citations depend on it.

### Plan caps

| Plan | Pages | Conversations/month |
|---|---|---|
| starter | 100 | 200 |
| pro | 500 | 800 |
| business | unlimited (100,000 internally) | 3,000 |

The billing unit is a **conversation** — one visitor chat session (one
`sessionId`), not an individual message. Each plan is sold in three billing
cycles: monthly (base), quarterly (10% off 3 months), yearly (20% off 12
months). Prices and caps live in `lib/billing/plans.ts` (the single source of
truth); env vars `PLAN_PRICE_PKR_<PLAN>_<CYCLE>` override the compiled defaults.

The WhatsApp add-on has its own conversation cap, tracked separately from the
website plan's (`WHATSAPP_CONVERSATION_CAP` in `lib/billing/plans.ts`), keyed
off `Conversation.channel`. See section 9 for its pricing and gating.

---

## 7. RAG

Retrieval: embed the query, cosine similarity over `Document` filtered by
`tenantId`, take top 5, drop anything below a similarity floor.

Prompt shape:
- System prompt from `tenant.systemPrompt`, plus retrieved chunks with their
  source URLs, plus the last 6 messages of history.
- **The model must answer only from the provided context.** If the context does
  not contain the answer, it says so and offers to connect the visitor to a human.
  Never invent facts about someone's business.
- Responses cite source URLs.
- Respond in `tenant.language`. For `roman_ur`, use Roman Urdu, not Urdu script.

When the model cannot answer, set `Conversation.answered = false`. This feeds the
Unanswered tab, which is a core retention feature. Do not hide these.

Streaming is required. Use SSE and stream tokens as they arrive.

---

## 8. WIDGET

Separate build in `widget/`, bundled with esbuild to a single file, served from
the VPS at `cdn.cybrumsolutions.dev/widget.js` with the Cloudflare proxy enabled
and a cache rule set on that path. Cloudflare caches the file at every edge
location, so the VPS is hit once per edge, not once per visitor. This gives
global CDN delivery with no R2 account and no extra cost.

Requirements:
- Under 30KB gzipped. Check this on every build.
- Vanilla TypeScript. No React, no framework.
- **Shadow DOM is mandatory.** The host page's CSS must not touch the widget and
  the widget's CSS must not touch the host page.
- Loads async, never blocks page render.
- Every entry point wrapped in try/catch. On any error, remove itself silently.
- Session ID in `sessionStorage` (widget only, not the dashboard app).
- Reads config from data attributes:

```html
<script
  src="https://cdn.cybrumsolutions.dev/widget.js"
  data-key="pk_live_xxx"
  data-position="bottom-right"
  defer
></script>
```

Brand config (color, bot name, greeting, avatar) is fetched from the API, not
hardcoded in the tag, so the customer can change it without editing their site.

---

## 9. BILLING AND STATUS

Phase 1 billing is manual. There is no Stripe, no card processing, no automated
payment gateway. Do not build one.

### Flow

1. Customer clicks Pay in the dashboard.
2. System generates an invoice with a unique `invoiceRef` like `CYB-2026-0042`.
3. Instructions page shows JazzCash, EasyPaisa, Raast, and bank details, plus the
   ref code the customer must put in the transaction remarks.
4. Customer pays, uploads a screenshot, enters sender name and amount.
5. On submit: `Payment.status = submitted`, and the tenant gets a **3-day
   provisional extension immediately**. Approval must never block access.
6. Admin verifies the ref against the real bank statement, then approves.
7. On approval: `tenant.status = active`, `periodEnd = +30 days`, receipt emailed.

The screenshot is a supporting document, not proof. Verification is always
against the actual statement using `invoiceRef`.

### Status ladder

Never hard-kill a live widget. Degrade in steps.

| Day after failure | Status | Widget behaviour |
|---|---|---|
| 0 | `past_due` | Works normally. Dashboard banner + email |
| 3 | `past_due` | Works, but "Powered by Cybrum" is forced on |
| 7 | `suspended` | Returns a graceful "Chat is temporarily unavailable" |
| 30 | `canceled` | Off. Data retained 30 more days, then purged |

A suspended tenant returns HTTP 200 with `{ disabled: true, message }`. Never a
404 or 500, which would surface as an error on the customer's website.

### WhatsApp add-on

Optional, opt-in, admin-gated — never self-serve. `Tenant.whatsappEnabled` is
flipped by an admin only; a tenant who wants it clicks "Request WhatsApp
access" and waits (`whatsappRequestedAt`, surfaced on `/admin`).

Pricing is two-rate, resolved in `lib/billing/plans.ts#whatsappAddonPrice`:
- **Bundle rate** when paid alongside an active/being-purchased website plan.
- **Standalone rate** (higher) when the tenant has no website plan at all.

Both are sold through the same combined checkout as the website plan
(`lib/billing/actions.ts#submitPayment`) — one payment, one screenshot, one
`invoiceRef`, `Payment.addon = "whatsapp"` marks the add-on portion.

WhatsApp has its own, simpler status ladder (`Tenant.whatsappStatus`, driven
by `whatsappPeriodEnd`), independent of the website plan's so one channel
lapsing never disables the other: `past_due` immediately, `suspended` at day
7. No forced-branding step and no `canceled` state.

---

## 10. SECURITY

`publicKey` is public by design. Anyone can read it in the page source. Defence
is layered:

1. **Origin allowlist.** Check the `Origin` header hostname against
   `tenant.allowedDomains`. Reject otherwise.
2. **Rate limit** per tenant and per IP. Postgres-backed counter is fine at this
   scale.
3. **Monthly cap** enforced server side, never trusted from the client.
4. **Cloudflare Turnstile** on the widget before the first message of a session.

Other rules:
- Never log full message content at info level. Conversations belong to the tenant.
- Payment screenshots in R2 are private. Serve only via short-lived signed URLs.
- Secrets in `.env`, never committed. Keep `.env.example` current.
- Validate every URL before fetching. Block private IP ranges, `localhost`, and
  non-http schemes. SSRF is a real risk in a crawler that accepts user URLs.

---

## 11. DEVELOPMENT ENVIRONMENT

Development on Windows, production on Ubuntu Linux. This mismatch causes real bugs.

```
.gitattributes:
* text=auto eol=lf
```

- Import paths must match filenames exactly, including case.
- Use `path.join()`, never hardcoded `\` or `/`.
- No Windows-only shell commands in npm scripts. Use `cross-env` if needed.

Running locally, two terminals:

```
npm run dev        # Next.js
node worker.js     # job worker
```

Database is Neon (cloud Postgres with pgvector preinstalled). No local Postgres
install needed. Connection string in `.env` as `DATABASE_URL`.

To test the widget on a real website, use Cloudflare Tunnel to expose localhost
over HTTPS. Do not deploy just to test.

---

## 12. PROJECT STRUCTURE

```
cs-chatbot/
├── CLAUDE.md
├── .env.example
├── .gitattributes
├── prisma/
│   └── schema.prisma
├── app/
│   ├── (marketing)/page.tsx        # landing + URL-to-preview
│   ├── (dashboard)/
│   │   ├── playground/
│   │   ├── knowledge/
│   │   ├── customize/
│   │   ├── conversations/
│   │   ├── unanswered/
│   │   ├── leads/
│   │   ├── install/
│   │   ├── usage/
│   │   └── billing/
│   ├── admin/                      # owner only: payment approvals
│   └── api/
│       ├── chat/route.ts           # public, widget hits this, streaming
│       ├── preview/route.ts        # public, landing page instant demo
│       ├── config/route.ts         # public, widget brand config
│       └── ...                     # authenticated dashboard routes
├── lib/
│   ├── ai/provider.ts              # THE ONLY place LLM SDKs are imported
│   ├── ai/embed.ts
│   ├── ai/rag.ts
│   ├── db/scoped.ts
│   ├── db/vector.ts                # all raw pgvector SQL
│   ├── crawl/                      # fetch, robots, sitemap, extract, chunk
│   ├── billing/status.ts
│   ├── billing/plans.ts            # plan + WhatsApp add-on prices and caps
│   ├── whatsapp/pg-auth-state.ts   # Baileys auth state persisted in Postgres
│   ├── email/provider.ts           # THE ONLY place the Resend API is called
│   ├── email/templates.ts          # branded HTML builders per lifecycle event
│   ├── email/notify.ts             # high-level, best-effort send-per-event functions
│   └── security/                   # origin check, rate limit, url validation
├── worker.js                       # standalone job runner
├── whatsapp-connector.mts          # standalone WhatsApp connector (opt-in add-on)
└── widget/
    ├── src/index.ts
    └── build.mjs                   # esbuild
```

---

## 13. BUILD PHASES

Build in this order. **Do not start a phase before the previous one works.**
Do not scaffold the whole product in one pass.

**Phase 0 — Prove retrieval quality.** Two CLI scripts only, no UI, no Next.js
routes: `scripts/ingest.js <url>` and `scripts/ask.js "<question>"`. Run against
5 real websites and read the answers. If retrieval is bad, nothing else matters.

**Phase 1 — Chat API.** `/api/chat` with streaming, tenant resolution, origin
check, and RAG. Test with curl.

**Phase 2 — Widget + landing preview.** The widget bundle, then the landing page
where a visitor pastes a URL, sees a 15-page crawl with live progress, and chats
with a working bot **before any signup**. This flow is the product's single
biggest conversion lever. Build it carefully.

**Phase 3 — Auth + dashboard.** Signup, domain verification, full crawl, and the
dashboard tabs. Install tab includes a live "widget detected on your site" check.

**Phase 4 — Billing.** Invoice generation, payment submission with screenshot
upload, admin approval, status ladder, usage caps.

**Phase 5 — Deploy.** Ubuntu VPS via Coolify. Widget served from the VPS behind
the Cloudflare cache. Nightly `pg_dump` compressed to a second location. Uptime
monitoring via UptimeRobot free tier.

---

## 14. CONVENTIONS

- TypeScript strict mode. No `any`. Use `unknown` and narrow.
- Server Components by default. `"use client"` only where interactivity requires it.
- Zod for every external input: request bodies, env vars, LLM JSON output.
- Errors: throw typed errors, catch at the route boundary, return structured JSON.
  Never leak stack traces to the client.
- Money is always integer PKR. Never floats.
- Timestamps always UTC in the database. Format at display time.
- Comments explain *why*, not *what*.
- Prefer boring, readable code over clever code.

---

## 15. DO NOT

- Do not add Docker, Redis, BullMQ, Pinecone, Qdrant, or Kubernetes.
- Do not add Stripe or any card processor in Phase 1 to 4.
- Do not build Instagram or Slack channels. WhatsApp is the one approved
  additional channel (opt-in, admin-gated add-on — see section 9).
- Do not build voice. Text only.
- Do not use a flagship LLM model. Mini or nano class only. A flagship model
  costs more per customer than the customer pays.
- Do not build an admin analytics suite, a team seats system, an affiliate
  program, or a public API. None of these matter before 20 paying customers.
- Do not generate more than one phase at a time.
