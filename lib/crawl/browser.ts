import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright-core";
import { assertSafeUrl } from "@/lib/security/url";

const RENDER_TIMEOUT_MS = Number(process.env.HEADLESS_RENDER_TIMEOUT_MS ?? 12_000);
const RENDER_CONCURRENCY = Number(process.env.HEADLESS_RENDER_CONCURRENCY ?? 2);
const HYDRATION_GRACE_MS = 1_500; // fixed post-domcontentloaded wait for CSR hydration to run

const USER_AGENT = "CybrumBot/1.0 (+https://cybrumsolutions.dev/bot)";

// Checked in order; first path that exists on disk wins. Debian/Ubuntu's
// `chromium` apt package (see nixpacks.toml) lands at one of the first two.
// The Windows paths are dev-machine convenience only — if none of these
// exist (e.g. local Windows dev with no Chrome installed), the fallback is
// simply disabled and the crawler behaves exactly as it did before this
// feature, which is the intended degrade-safe default.
const CANDIDATE_PATHS = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((p): p is string => Boolean(p));

let cachedExecutablePath: string | null | undefined;

function resolveChromiumPath(): string | null {
  if (cachedExecutablePath !== undefined) return cachedExecutablePath;
  cachedExecutablePath = CANDIDATE_PATHS.find((p) => existsSync(p)) ?? null;
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

/**
 * Renders `url` in headless Chromium and returns the post-hydration HTML, or
 * null on any failure (missing browser, navigation timeout, crash). This is
 * the fallback path lib/crawl/crawler.ts reaches for when a static fetch
 * yields too little readable text (CSR sites whose initial HTML is an empty
 * shell). Reuses one shared Browser process — relaunched only if it
 * disconnects — with a fresh, isolated context per render so pages can't
 * see each other's cookies/storage.
 */
export async function renderPage(rawUrl: string): Promise<string | null> {
  const release = await renderSlots.acquire();
  try {
    // re-validate: the static fetch's SSRF check may have run minutes ago
    // for an earlier page in the same crawl, and DNS can change underneath us
    const url = await assertSafeUrl(rawUrl);
    const browser = await getBrowser();
    if (!browser) return null;

    const context = await browser.newContext({ userAgent: USER_AGENT, javaScriptEnabled: true });
    try {
      const page = await context.newPage();
      const deadline = Date.now() + RENDER_TIMEOUT_MS;
      await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: RENDER_TIMEOUT_MS });
      const remaining = Math.max(0, deadline - Date.now());
      await page.waitForTimeout(Math.min(HYDRATION_GRACE_MS, remaining));
      return await page.content();
    } finally {
      await context.close().catch(() => {});
    }
  } catch (err) {
    console.warn(`[crawl] headless render failed for ${rawUrl}:`, err instanceof Error ? err.message : err);
    return null;
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
