import { createHmac, timingSafeEqual } from "crypto";

// Meta's deauthorize/data-deletion callbacks POST a `signed_request` form
// field: "{base64url sig}.{base64url JSON payload}", HMAC-SHA256 signed with
// the app secret. https://developers.facebook.com/docs/facebook-login/guides/permissions/data-deletion

interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Returns the decoded payload if the signature is valid, else null. Never
 * throws — a malformed or forged request should just be rejected. */
export function verifySignedRequest(signedRequest: string): SignedRequestPayload | null {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split(".");
    if (!encodedSig || !encodedPayload) return null;

    const secret = process.env.INSTAGRAM_APP_SECRET;
    if (!secret) return null;

    const expectedSig = createHmac("sha256", secret).update(encodedPayload).digest();
    const actualSig = base64UrlDecode(encodedSig);
    if (expectedSig.length !== actualSig.length) return null;
    if (!timingSafeEqual(expectedSig, actualSig)) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
    if (typeof payload.user_id !== "string") return null;

    return payload;
  } catch {
    return null;
  }
}
