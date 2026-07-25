import { NextResponse, type NextRequest } from "next/server";

// www.chatbot.cybrumsolutions.dev is canonical, matching the marketing
// site's bare-domain-to-www behavior. Both hostnames resolve and have a
// valid cert (see Coolify domain config) so this redirect is the only
// place the choice is enforced — everything else in the app assumes www.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host === "chatbot.cybrumsolutions.dev") {
    const url = request.nextUrl.clone();
    url.hostname = "www.chatbot.cybrumsolutions.dev";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
