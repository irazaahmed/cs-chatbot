import type { NextConfig } from "next";

// Baseline security headers on every response. CSP is intentionally left out
// here — the widget embeds on arbitrary customer domains and the dashboard
// loads Google's OAuth/Turnstile origins, so a safe CSP needs its own pass
// rather than a guess bolted on alongside these.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    // Default is 1MB. Payment proof screenshots (lib/billing/actions.ts#submitPayment)
    // routinely run 2-5MB. The onboarding knowledge upload
    // (app/onboarding/page.tsx, mode="upload") allows up to 5 files at up to
    // 10MB each in one submission (see MAX_UPLOAD_FILES / MAX_UPLOAD_SIZE_BYTES
    // in lib/knowledge/file-storage.ts) — worst case ~50MB raw. This just needs
    // enough headroom (plus multipart overhead) for those real per-file/per-request
    // ceilings to ever be reached instead of a hard 413 before validation runs.
    serverActions: {
      bodySizeLimit: "55mb",
      // Coolify/Traefik serves this app on three hosts (Configuration >
      // Domains): the canonical apex, www (DNS-only, exists only to 308 to
      // the apex per middleware.ts), and the widget CDN host. Without this
      // list, Next.js's own Server Action origin check only trusts whichever
      // host it auto-detects and 403s any POST whose Origin doesn't match —
      // intermittently, depending on which Cloudflare edge/forwarded-host
      // the request lands on. That 403 surfaces to the browser as "This page
      // couldn't load" since the client expects an RSC action response, not
      // a plain error page.
      allowedOrigins: ["chatbot.cybrumsolutions.dev", "www.chatbot.cybrumsolutions.dev"],
    },
  },
};

export default nextConfig;
