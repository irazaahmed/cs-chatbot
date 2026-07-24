import * as cheerio from "cheerio";

const STRIP_SELECTORS = ["script", "style", "nav", "header", "footer", "noscript", "svg", "iframe"];
const MIN_WORD_COUNT = 100;

export interface ExtractedPage {
  title: string | null;
  content: string;
  wordCount: number;
}

/**
 * Pulls main readable content from raw HTML, dropping chrome (nav, header,
 * footer, script/style). Returns null if the page is too thin to be useful
 * (CLAUDE.md: skip pages under 100 words).
 */
export function extractContent(html: string): ExtractedPage | null {
  const $ = cheerio.load(html);
  $(STRIP_SELECTORS.join(",")).remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || null;

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = text.length === 0 ? 0 : text.split(" ").length;
  if (wordCount < MIN_WORD_COUNT) return null;

  return { title, content: text, wordCount };
}

/** Extracts same-origin, http(s) hrefs from a page for BFS crawling. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const origin = new URL(baseUrl).hostname;
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
      if (resolved.hostname !== origin) return;
      resolved.hash = "";
      links.add(resolved.toString());
    } catch {
      // ignore malformed hrefs
    }
  });

  return Array.from(links);
}
