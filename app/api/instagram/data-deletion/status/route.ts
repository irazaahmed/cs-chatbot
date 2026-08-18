import { NextRequest } from "next/server";

export const runtime = "nodejs";

// The status-check page Meta's data-deletion confirmation URL points to.
// Deletion happens synchronously in the POST /api/instagram/data-deletion
// handler, so by the time anyone opens this link it has already completed —
// this just confirms that in a human-readable page.
export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get("code") ?? "unknown";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Data Deletion Status — CS Chatbot</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1.5rem; color: #1a1a1a;">
  <h1 style="font-size: 1.25rem;">Data deletion complete</h1>
  <p>Your Instagram-connected account data has been deleted from CS Chatbot.</p>
  <p style="color: #666; font-size: 0.875rem;">Confirmation code: ${code}</p>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
