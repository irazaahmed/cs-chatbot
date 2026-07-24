import { fetchText } from "./fetch";

const LOC_PATTERN = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
const SITEMAP_INDEX_PATTERN = /<sitemapindex[\s>]/i;

/**
 * Fetches sitemap.xml (following one level of <sitemapindex> nesting) and
 * returns same-origin page URLs. Regex extraction of <loc> is deliberate —
 * avoids pulling in a full XML parser dependency for a well-known, simple tag.
 */
export async function loadSitemapUrls(origin: string): Promise<string[]> {
  const rootText = await fetchText(new URL("/sitemap.xml", origin).toString());
  if (!rootText) return [];

  const rootLocs = extractLocs(rootText);
  if (rootLocs.length === 0) return [];

  const isIndex = SITEMAP_INDEX_PATTERN.test(rootText);
  if (!isIndex) {
    return filterSameOrigin(rootLocs, origin);
  }

  const pageUrls: string[] = [];
  for (const childSitemapUrl of rootLocs.slice(0, 20)) {
    const childText = await fetchText(childSitemapUrl);
    if (!childText) continue;
    pageUrls.push(...extractLocs(childText));
  }
  return filterSameOrigin(pageUrls, origin);
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  for (const match of xml.matchAll(LOC_PATTERN)) {
    locs.push(match[1]);
  }
  return locs;
}

function filterSameOrigin(urls: string[], origin: string): string[] {
  const originHost = new URL(origin).hostname;
  const result: string[] = [];
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (url.hostname === originHost) result.push(url.toString());
    } catch {
      // ignore malformed URLs in the sitemap
    }
  }
  return result;
}
