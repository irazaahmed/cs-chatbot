# SEO keyword strategy — CS Chatbot

Target site: `chatbot.cybrumsolutions.dev` (product landing page + preview flow).
Last updated: 2026-07-26.

This is the living reference for keyword targeting. Update it whenever copy,
titles, or the FAQ change so the two stay in sync — don't let the page drift
from this list.

## Why these keywords, not just volume

No paid keyword-volume tool (Ahrefs/SEMrush/Google Keyword Planner) was
available for this pass — this list is built from the seed terms given,
expanded with standard modifier patterns (free / create / how to / for
website / for business), and checked against what actually ranks today via
web search. Treat search-volume claims from any source as directional, not
exact, until verified in Google Search Console after the site has traffic.

The one grounded competitive finding: the Pakistan "chatbot" search results
are dominated by **WhatsApp Business API** agencies (Botsify, TekkPak, Epik
Funnel, WAB2C). Almost nobody in that set targets a **website-embedded**,
**RAG-grounded** (answers only from the business's own pages, with source
citations), **Roman Urdu** chatbot. That gap is this product's realistic
wedge — lean into "website chatbot" and "Roman Urdu" phrasing rather than
competing head-on for generic "chatbot Pakistan".

## Primary (head terms — title, H1, meta description)

| Keyword | Intent | Notes |
|---|---|---|
| create a chatbot | informational/transactional | broad, high competition, still worth the H1 |
| create free chatbot | transactional | strong buying signal, low friction phrase |
| free chatbot for website | transactional | matches the actual free-preview flow |
| AI chatbot for website | informational/commercial | category term |
| chatbot for website free | transactional | word-order variant, keep both in copy naturally |

## Secondary (subheads, body copy, alt text)

- easy way to create a chatbot
- how to create a chatbot for a website
- website chatbot builder
- no-code chatbot builder
- train a chatbot on your website
- AI chatbot trained on your website content
- chatbot with source citations / chatbot that cites sources
- embeddable website chatbot

## Long-tail / question keywords (FAQ section + future blog posts)

These map directly to FAQPage structured data — each one answered in ≤2
sentences is worth more than a paragraph, since the target is the featured
snippet / AI-overview box, not just the blue link.

- how to create a free chatbot for my website
- how to add a chatbot to my website for free
- best free chatbot for a small business website
- chatbot that only answers from my website's content
- AI chatbot that doesn't make up answers (hallucination-avoidance angle)
- how long does it take to set up a website chatbot
- do I need to know how to code to add a chatbot
- website chatbot in Roman Urdu
- chatbot for a Pakistani business website

## Local / differentiated niche (lower competition, real advantage)

- website chatbot Pakistan
- Roman Urdu chatbot for website
- Urdu AI chatbot for business
- AI chatbot for small business Pakistan (website — not WhatsApp)
- lead-capture chatbot Pakistan
- JazzCash EasyPaisa chatbot subscription (billing-method long-tail — genuinely unique)

## Commercial / bottom-of-funnel (pricing & comparison intent)

- chatbot pricing Pakistan
- cheap chatbot for website PKR
- website chatbot vs WhatsApp chatbot
- chatbot monthly plan Pakistan

## Branded

- CS Chatbot
- Cybrum Solutions chatbot
- Cybrum Chatbot (legacy name — keep a mention so old links/searches still resolve)

## Content-to-keyword mapping

| Page | Primary target | Notes |
|---|---|---|
| `chatbot.cybrumsolutions.dev` (landing) | create free chatbot / AI chatbot for website | title + H1 + meta description, `app/layout.tsx` |
| Landing page FAQ section | long-tail question set above | new section, also feeds FAQPage JSON-LD |
| `/pricing` | chatbot pricing Pakistan / cheap chatbot for website PKR | own `keywords` meta added 2026-07-26, was inheriting the homepage's generic set before |
| `/how-to-use` | long-tail "how to" question set | own `keywords` meta added 2026-07-26 |
| `/about` | Cybrum Solutions chatbot / AI chatbot for website | own `keywords` meta added 2026-07-26 |
| `/contact` | branded + local ("chatbot for small business Pakistan") | own `keywords` meta added 2026-07-26 |
| `cybrumsolutions.dev/products/chatbot` | AI chatbot for website (comparison/BOFU) | title/description retuned + `keywords` meta added 2026-07-26 (was missing entirely); added a "vs WhatsApp chatbot" FAQ entry to actually answer the comparison-intent keyword instead of just targeting it in meta. Repo: `cybrum-solutions`, separate from this one. |
| Future: `/blog` or `/guide` on the app subdomain | long-tail + local | not built yet — candidate for a future phase, not this one |

## Technical SEO checklist (status as of this pass)

- [x] `app/sitemap.ts` — added
- [x] `app/robots.ts` — added
- [x] Title/description tuned to primary keywords — `app/layout.tsx`
- [x] Open Graph + Twitter card metadata — `app/layout.tsx`
- [x] `SoftwareApplication` + `FAQPage` JSON-LD — landing page
- [x] Per-page `keywords` meta on `/pricing`, `/how-to-use`, `/about`, `/contact` — 2026-07-26, previously all four silently inherited the homepage's keyword list via Next.js metadata fallback instead of targeting their own intent
- [x] `cybrumsolutions.dev/products/chatbot` keywords + title/description retuned, plus a WhatsApp-comparison FAQ — 2026-07-26
- [ ] OG image (`/og.png`) — placeholder path only, no actual image generated yet, ask before spending time on design here
- [x] Google Search Console verification — domain property for `cybrumsolutions.dev` verified via DNS 2026-07-26, covers every subdomain
