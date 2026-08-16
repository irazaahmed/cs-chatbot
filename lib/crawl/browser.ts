import { existsSync } from "node:fs";
import { join, delimiter } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { assertSafeUrl } from "@/lib/security/url";

const RENDER_TIMEOUT_MS = Number(process.env.HEADLESS_RENDER_TIMEOUT_MS ?? 12_000);
const RENDER_CONCURRENCY = Number(process.env.HEADLESS_RENDER_CONCURRENCY ?? 2);
const HYDRATION_GRACE_MS = 1_500; // fixed post-domcontentloaded wait for CSR hydration to run

// Deliberately NOT the self-identifying "CybrumBot/1.0" UA that fetch.ts
// uses for the static crawl — confirmed in production (2026-08-16) that at
// least one Cloudflare-protected site serves a heavier challenge to a
// bot-declaring UA that reliably crashes headless Chromium under
// --disable-gpu, whereas a normal browser UA renders the same page cleanly.
// A real browser is what a human visitor's browser would present as, which
// is the entire point of this fallback — the sites being crawled here are
// always the tenant's own site (onboarding) or a visitor's own site
// (landing-page preview), never a third party.

// Checked in order; first path that exists on disk wins. The Windows paths
// are dev-machine convenience only — if nothing is found (e.g. local
// Windows dev with no Chrome installed), the fallback is simply disabled
// and the crawler behaves exactly as it did before this feature.
const CANDIDATE_PATHS = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((p): p is string => Boolean(p));

// Nix packages (see nixpacks.toml — deliberately used over an apt package:
// Ubuntu's `chromium`/`chromium-browser` apt packages are snap-only
// transitional stubs with no real binary, confirmed broken in this repo's
// own build logs) land in the Nix store and get symlinked onto PATH at a
// location Nixpacks controls, not a fixed path. Scan PATH by hand instead
// of shelling out to `which` (keeps this dependency-free and portable to
// Windows dev, where `which` doesn't exist).
const PATH_BINARY_NAMES = ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"];

function findOnPath(): string | null {
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const exeSuffixes = process.platform === "win32" ? [".exe", ""] : [""];
  for (const dir of dirs) {
    for (const name of PATH_BINARY_NAMES) {
      for (const suffix of exeSuffixes) {
        const candidate = join(dir, name + suffix);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

let cachedExecutablePath: string | null | undefined;

function resolveChromiumPath(): string | null {
  if (cachedExecutablePath !== undefined) return cachedExecutablePath;
  cachedExecutablePath = CANDIDATE_PATHS.find((p) => existsSync(p)) ?? findOnPath();
  if (!cachedExecutablePath) {
    console.warn("[crawl] no Chromium executable found — headless render fallback is disabled");
  }
  return cachedExecutablePath;
}

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser | null> {
  const executablePath = resolveChromiumPath();
  if (!executablePath) return null;

  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing.isConnected()) return existing;
    } catch {
      // launch failed last time — fall through and retry below
    }
    browserPromise = null;
  }

  browserPromise = chromium
    .launch({
      executablePath,
      headless: true,
      // container-safe flags: no setuid sandbox available to a root
      // process, and Docker's default /dev/shm (64MB) is too small for
      // Chromium's shared memory use without this
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    })
    .catch((err) => {
      browserPromise = null;
      throw err;
    });
  return browserPromise;
}

/**
 * Bounds concurrent renders — a burst of CSR pages in one crawl, or several
 * concurrent preview requests, must never spin up unbounded Chromium pages
 * on a resource-constrained VPS. Callers past the limit queue in FIFO order.
 */
class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private readonly max: number) {}

  acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve(() => this.release());
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const renderSlots = new Semaphore(RENDER_CONCURRENCY);

export type RenderOutcome =
  | { ok: true; html: string }
  | { ok: false; reason: "blocked" | "failed" };

/**
 * Renders `url` in headless Chromium and returns the post-hydration HTML, or
 * a failure reason. This is the fallback path lib/crawl/crawler.ts reaches
 * for when a static fetch yields too little readable text (CSR sites whose
 * initial HTML is an empty shell). Reuses one shared Browser process —
 * relaunched only if it disconnects — with a fresh, isolated context per
 * render so pages can't see each other's cookies/storage.
 *
 * "blocked" vs "failed" matters for the message a visitor eventually sees:
 * a bot-protection block (Cloudflare et al.) is a fundamentally different,
 * unfixable-by-rendering problem than a render that timed out or crashed,
 * and conflating them produced a genuinely misleading "heavy JavaScript
 * rendering" message for sites that were never a rendering problem at all.
 */
export async function renderPage(rawUrl: string): Promise<RenderOutcome> {
  const release = await renderSlots.acquire();
  try {
    // re-validate: the static fetch's SSRF check may have run minutes ago
    // for an earlier page in the same crawl, and DNS can change underneath us
    const url = await assertSafeUrl(rawUrl);
    const browser = await getBrowser();
    if (!browser) return { ok: false, reason: "failed" };

    const context = await browser.newContext({ javaScriptEnabled: true });
    try {
      const page = await context.newPage();
      const deadline = Date.now() + RENDER_TIMEOUT_MS;
      const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
      if (response && !response.ok()) {
        // A bot-block/WAF challenge page (Cloudflare et al. typically 403 or
        // 503) can easily have enough words to pass extractContent's
        // threshold — confirmed in production (2026-08-16), where a
        // Cloudflare "you are blocked" page was silently accepted as real
        // site content. A non-2xx final response is a much more reliable
        // signal than word count that this isn't the actual page.
        console.warn(`[crawl] headless render got HTTP ${response.status()} for ${rawUrl}, treating as blocked`);
        return { ok: false, reason: "blocked" };
      }
      const remaining = Math.max(0, deadline - Date.now());
      await page.waitForTimeout(Math.min(HYDRATION_GRACE_MS, remaining));
      return { ok: true, html: await page.content() };
    } finally {
      await context.close().catch(() => {});
    }
  } catch (err) {
    console.warn(`[crawl] headless render failed for ${rawUrl}:`, err instanceof Error ? err.message : err);
    return { ok: false, reason: "failed" };
  } finally {
    release();
  }
}

async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const current = browserPromise;
  browserPromise = null;
  const browser = await current.catch(() => null);
  await browser?.close().catch(() => {});
}

process.on("SIGTERM", closeBrowser);
process.on("SIGINT", closeBrowser);
