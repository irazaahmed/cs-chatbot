// Sends a DM reply through the Instagram API with Instagram Login (Business
// Login) flow — same graph.instagram.com host as lib/instagram/oauth.ts, no
// Facebook Page involved. The connected account's own access token authorizes
// sending on its own behalf, so there's no separate pageId/page token to look
// up like the older Facebook Page + Graph API flow would need.

const GRAPH_URL = "https://graph.instagram.com";

/**
 * Meta enforces its own 24h messaging window server-side on send — this
 * doesn't compute or check that itself, it just attempts the send and lets
 * Meta's API be the authority (a rejected send just throws, caller decides
 * whether that's fatal).
 */
export async function sendInstagramMessage(accessToken: string, recipientIgUserId: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH_URL}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgUserId },
      message: { text },
    }),
  });

  if (!res.ok) throw new Error(`Instagram send failed: ${res.status} ${await res.text()}`);
}
