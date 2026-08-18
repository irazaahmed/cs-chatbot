import { createHmac, timingSafeEqual } from "crypto";

// Verifies Meta's X-Hub-Signature-256 header on webhook deliveries (Instagram
// messaging, and any future Meta webhook). Distinct from
// lib/instagram/signed-request.ts, which verifies the different
// signed_request form field Meta uses for deauthorize/data-deletion
// callbacks — this one HMACs the raw POST body against a header.
//
// The signature must be computed over the exact raw bytes Meta sent, so the
// caller must pass request.text() output, never a re-serialized JSON.parse
// result (whitespace/key-order differences would break the HMAC).
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;
  const [scheme, hexDigest] = signatureHeader.split("=");
  if (scheme !== "sha256" || !hexDigest) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(hexDigest, "hex");
  } catch {
    return false;
  }
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
