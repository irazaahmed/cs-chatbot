// Instagram API with Instagram Login (Business Login) — Meta's current
// console defaults to this over the older Facebook Page + Graph API flow, no
// Facebook Page required. Endpoints verified against Meta's docs 2026-08-18:
// https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
//
// Plain fetch, no SDK — matches lib/email/provider.ts's convention.

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_URL = "https://graph.instagram.com";

// New scope names (instagram_business_*) — the old business_basic-style names
// were deprecated January 2025. Verify against current Meta docs before
// changing; scope names on this platform have shifted before.
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("INSTAGRAM_APP_ID"),
    redirect_uri: requireEnv("INSTAGRAM_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
}

/** Server-to-server exchange of the redirect's `code` for a short-lived
 * (1 hour) token. Instagram's token endpoint wants form-encoded body, not JSON. */
export async function exchangeCodeForToken(code: string): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: requireEnv("INSTAGRAM_APP_ID"),
    client_secret: requireEnv("INSTAGRAM_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: requireEnv("INSTAGRAM_REDIRECT_URI"),
    code,
  });

  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`Instagram token exchange failed: ${res.status}`);
  return res.json();
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds, ~60 days
}

/** Short-lived tokens expire in an hour; exchange immediately for the
 * long-lived (60-day) token used for everything else. */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: requireEnv("INSTAGRAM_APP_SECRET"),
    access_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_URL}/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Instagram long-lived token exchange failed: ${res.status}`);
  return res.json();
}

interface InstagramProfile {
  user_id: string;
  username: string;
}

export async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const params = new URLSearchParams({ fields: "user_id,username", access_token: accessToken });
  const res = await fetch(`${GRAPH_URL}/me?${params.toString()}`);
  if (!res.ok) throw new Error(`Instagram profile fetch failed: ${res.status}`);
  return res.json();
}
