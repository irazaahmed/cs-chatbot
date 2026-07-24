import { fetchPage } from "./fetch";
import { loadRobots } from "./robots";
import { loadSitemapUrls } from "./sitemap";
import { extractContent, extractLinks } from "./extract";

const CONCURRENCY = 5;
const MAX_DEPTH = 3;
const DEFAULT_PAGE_CAP = 30;

export interface CrawledPage {
  url: string;
  title: string | null;
  content: string;
}

export interface CrawlOptions {
  maxPages?: number;
  onProgress?: (done: number, total: number, currentUrl: string) => void;
}

/**
 * Crawls a site starting from `startUrl`: sitemap.xml first, BFS fallback
 * (depth 3, same-origin) otherwise. Respects robots.txt, caps total pages,
 * and drops chrome/short pages. Phase 0 only — no plan-based caps yet since
 * there is no tenant model, just a flat maxPages ceiling.
 */
export async function crawlSite(startUrl: string, options: CrawlOptions = {}): Promise<CrawledPage[]> {
  const maxPages = options.maxPages ?? DEFAULT_PAGE_CAP;
  const origin = new URL(startUrl).origin;
  const robots = await loadRobots(origin);

  const sitemapUrls = await loadSitemapUrls(origin);
  const queue: { url: string; depth: number }[] =
    sitemapUrls.length > 0
      ? sitemapUrls.slice(0, maxPages).map((url) => ({ url, depth: 0 }))
      : [{ url: startUrl, depth: 0 }];

  const visited = new Set<string>();
  const results: CrawledPage[] = [];
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
      const page = await fetchPage(url);
      if (page) {
        const extracted = extractContent(page.body);
        if (extracted) {
          results.push({ url: page.url, title: extracted.title, content: extracted.content });
          options.onProgress?.(results.length, maxPages, url);
        }

        if (sitemapUrls.length === 0 && depth < MAX_DEPTH) {
          const links = extractLinks(page.body, url);
          for (const link of links) {
            if (!visited.has(link)) queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
      active--;
      pump();
    };

    pump();
  });

  return results.slice(0, maxPages);
}
