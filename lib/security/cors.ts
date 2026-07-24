// /api/chat and /api/config are called from arbitrary customer domains via
// the widget, so they need CORS headers or the browser blocks the response
// before the widget's JS ever sees it — even when the server-side Origin
// allowlist check (lib/security/origin.ts) already passed. CORS headers are
// not a security boundary themselves (curl ignores them entirely); the real
// access control is that allowlist check returning 403. Reflecting whatever
// Origin was sent is standard practice here — it only affects whether the
// requester's own browser can read the response, not who can reach the route.

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function corsPreflightResponse(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}
