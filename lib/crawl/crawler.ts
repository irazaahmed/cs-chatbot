import { fetchPage } from "./fetch";
import { loadRobots } from "./robots";
import { loadSitemapUrls } from "./sitemap";
import { extractContent, extractLinks } from "./extract";
import { renderPage } from "./browser";

const CONCURRENCY = 5;
const MAX_DEPTH = 3;
const DEFAULT_PAGE_CAP = 30;
// Below this many chars of extracted text, the static fetch is treated as
// "too thin to be useful" and a headless render is attempted instead — the
// signal for a CSR page whose real content only exists after JS runs.
const HEADLESS_FALLBACK_MIN_CHARS = Number(process.env.HEADLESS_FALLBACK_MIN_CHARS ?? 200);

export interface CrawledPage {
  url: string;
  title: string | null;
  content: string;
}

export interface CrawlStats {
  pagesVisited: number;
  staticResolved: number;
  headlessAttempted: number;
  headlessResolved: number;
  headlessFailed: number;
  headlessBlocked: number;
}

export interface CrawlOptions {
  maxPages?: number;
  onProgress?: (done: number, total: number, currentUrl: string) => void;
}

export interface CrawlResult {
  pages: CrawledPage[];
  stats: CrawlStats;
}

/**
 * Crawls a site starting from `startUrl`: sitemap.xml first, BFS fallback
 * (depth 3, same-origin) otherwise. Respects robots.txt, caps total pages,
 * and drops chrome/short pages. Phase 0 only — no plan-based caps yet since
 * there is no tenant model, just a flat maxPages ceiling.
 */
export async function crawlSite(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? DEFAULT_PAGE_CAP;
  const origin = new URL(startUrl).origin;
  const robots = await loadRobots(origin);

  const sitemapUrls = await loadSitemapUrls(origin);
  const usingSitemap = sitemapUrls.length > 0;
  const queue: { url: string; depth: number }[] = usingSitemap
    ? sitemapUrls.slice(0, maxPages).map((url) => ({ url, depth: 0 }))
    : [{ url: startUrl, depth: 0 }];

  const visited = new Set<string>();
  const results: CrawledPage[] = [];
  const stats: CrawlStats = {
    pagesVisited: 0,
    staticResolved: 0,
    headlessAttempted: 0,
    headlessResolved: 0,
    headlessFailed: 0,
    headlessBlocked: 0,
  };
  let active = 0;
  let queueIndex = 0;

  await new Promise<void>((resolve) => {
    const pump = () => {
      if (results.length >= maxPages) {
        if (active === 0) resolve();
        return;
      }
      while (active < CONCURRENCY && queueIndex < queue.length && results.length < maxPages) {
        const item = queue[queueIndex++];
        if (visited.has(item.url)) continue;
        visited.add(item.url);

        const path = new URL(item.url).pathname;
        if (!robots.isAllowed(path)) continue;

        active++;
        processPage(item.url, item.depth);
      }
      if (active === 0 && queueIndex >= queue.length) resolve();
    };

    const processPage = async (url: string, depth: number) => {
      stats.pagesVisited++;
      const page = await fetchPage(url);
      // page is null both for genuinely dead links (404, DNS failure) and
      // for bot-challenge responses (Cloudflare's 403 "Attention Required"
      // page, common on marketing sites) — fetchPage doesn't distinguish
      // them, so both fall through to the headless attempt below. That's an
      // intentional tradeoff: a real browser is often the only thing that
      // gets past a bot challenge, and the render concurrency/timeout caps
      // already bound the cost of retrying a truly-dead link once.
      let extracted = page ? extractContent(page.body) : null;
      let html = page?.body ?? "";
      const resolvedUrl = page?.url ?? url;

      if (!extracted || extracted.content.length < HEADLESS_FALLBACK_MIN_CHARS) {
        stats.headlessAttempted++;
        const rendered = await renderPage(url);
        const renderedExtracted = rendered.ok ? extractContent(rendered.html) : null;
        if (renderedExtracted && renderedExtracted.content.length > (extracted?.content.length ?? 0)) {
          extracted = renderedExtracted;
          html = rendered.ok ? rendered.html : html;
          stats.headlessResolved++;
        } else if (!rendered.ok && rendered.reason === "blocked") {
          stats.headlessBlocked++;
        } else {
          stats.headlessFailed++;
        }
      } else {
        stats.staticResolved++;
      }

      if (extracted) {
        results.push({ url: resolvedUrl, title: extracted.title, content: extracted.content });
        options.onProgress?.(results.length, maxPages, url);
      }

      if (!usingSitemap && depth < MAX_DEPTH && html) {
        const links = extractLinks(html, url);
        for (const link of links) {
          if (!visited.has(link)) queue.push({ url: link, depth: depth + 1 });
        }
      }

      active--;
      pump();
    };

    pump();
  });

  console.log(
    `[crawl] ${startUrl}: ${results.length}/${stats.pagesVisited} pages resolved ` +
      `(${stats.staticResolved} static, ${stats.headlessAttempted} headless attempted: ` +
      `${stats.headlessResolved} resolved, ${stats.headlessBlocked} blocked, ${stats.headlessFailed} failed)`
  );

  return { pages: results.slice(0, maxPages), stats };
}

/**
 * Picks the right visitor-facing message when a crawl comes back with zero
 * pages. Shared by worker.ts and app/api/preview/route.ts so they can't
 * drift the way lib/db/vector.ts and lib/preview/store.ts's similarity
 * floors independently did. "Blocked" (bot-protection returned a non-2xx
 * response — Cloudflare et al.) is a fundamentally different, unfixable-by-
 * rendering problem than a genuine rendering failure, and conflating them
 * produced a misleading "heavy JavaScript rendering" message for sites that
 * were never a rendering problem in the first place.
 */
export function crawlFailureMessage(stats: CrawlStats): string {
  if (stats.headlessBlocked > 0) {
    return "This site's security settings are blocking automated access. Please contact support for manual setup.";
  }
  if (stats.headlessAttempted > 0) {
    return "This site uses heavy JavaScript rendering and couldn't be crawled automatically. Please contact support for manual setup.";
  }
  return "Couldn't find any readable pages on that site.";
}
