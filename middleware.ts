import { NextResponse, type NextRequest } from "next/server";

// chatbot.cybrumsolutions.dev is canonical — it's the one that can sit
// behind Cloudflare's proxy on the free plan (Universal SSL only covers
// one level of subdomain, and www.chatbot.* is two levels deep). The www
// host is DNS-only (unproxied) in Cloudflare and exists solely to redirect
// here; it has no other traffic to protect.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host === "www.chatbot.cybrumsolutions.dev") {
    // Build the target from scratch rather than cloning nextUrl — behind
    // the Traefik/Coolify proxy, nextUrl's port reflects the container's
    // internal listen port (3000), and cloning it bakes that bogus port
    // into the redirect Location header.
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://chatbot.cybrumsolutions.dev");
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
