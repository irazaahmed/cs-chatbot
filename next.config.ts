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
    // Default is 1MB, too small for a phone screenshot of the payment proof
    // (lib/billing/actions.ts#submitPayment) — those routinely run 2-5MB.
    // lib/billing/proof-storage.ts already enforces the real 5MB ceiling with
    // a friendly error; this just needs enough headroom (plus multipart
    // overhead) for that check to ever be reached instead of a hard 413.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
