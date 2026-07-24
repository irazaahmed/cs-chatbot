import { assertSafeUrl } from "@/lib/security/url";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "CybrumBot/1.0 (+https://cybrumsolutions.dev/bot)";

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  body: string;
}

/**
 * Fetches a URL after validating it against SSRF rules. Returns null for
 * non-HTML responses, non-2xx statuses, or any network failure — the
 * crawler treats all of these as "skip this page", never as a hard error.
 */
export async function fetchPage(rawUrl: string): Promise<FetchedPage | null> {
  let url: URL;
  try {
    url = await assertSafeUrl(rawUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return null;
    }

    const body = await res.text();
    return { url: url.toString(), status: res.status, contentType, body };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Like fetchPage but for plain text/xml resources (robots.txt, sitemap.xml). */
export async function fetchText(rawUrl: string): Promise<string | null> {
  let url: URL;
  try {
    url = await assertSafeUrl(rawUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export { USER_AGENT };
