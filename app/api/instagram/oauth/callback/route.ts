import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyState } from "@/lib/instagram/oauth-state";
import { exchangeCodeForToken, exchangeForLongLivedToken, fetchInstagramProfile, subscribeToWebhooks } from "@/lib/instagram/oauth";

export const runtime = "nodejs";

// Public route — Meta's redirect is a plain browser GET that may arrive
// without the dashboard's session cookie in some browsers' cross-site
// handling, so trust comes from the signed `state`, not auth(). Same
// "resolve identity from an external key" pattern CLAUDE.md already allows
// for publicKey in /api/chat.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  // Not request.nextUrl.origin: behind Coolify's Traefik proxy that resolves
  // to the container's internal http://localhost:3000, not the public host,
  // producing broken localhost redirects. INSTAGRAM_REDIRECT_URI is already
  // the one place the real public origin is configured.
  const origin = new URL(process.env.INSTAGRAM_REDIRECT_URI ?? "").origin;

  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/instagram?error=${encodeURIComponent(error)}`, origin));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/instagram?error=missing_params", origin));
  }

  const tenantId = verifyState(state);
  if (!tenantId) {
    return NextResponse.redirect(new URL("/instagram?error=invalid_state", origin));
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await fetchInstagramProfile(longLived.access_token);

    await prisma.instagramAccount.upsert({
      where: { tenantId },
      create: {
        tenantId,
        igUserId: profile.user_id,
        igUsername: profile.username,
        accessToken: longLived.access_token,
        tokenExpiresAt: new Date(Date.now() + longLived.expires_in * 1000),
        status: "connected",
        connectedAt: new Date(),
        lastSeenAt: new Date(),
      },
      update: {
        igUserId: profile.user_id,
        igUsername: profile.username,
        accessToken: longLived.access_token,
        tokenExpiresAt: new Date(Date.now() + longLived.expires_in * 1000),
        status: "connected",
        connectedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    // Best-effort: the account is already connected and usable even if this
    // fails, it just means webhook delivery (inbound DMs) won't work until a
    // retry succeeds — never block the connect flow on it.
    try {
      await subscribeToWebhooks(profile.user_id, longLived.access_token);
    } catch (err) {
      console.error("[instagram-oauth] webhook subscription failed:", err instanceof Error ? err.message : err);
    }

    return NextResponse.redirect(new URL("/instagram?connected=1", origin));
  } catch (err) {
    console.error("[instagram-oauth] callback failed:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/instagram?error=connect_failed", origin));
  }
}
