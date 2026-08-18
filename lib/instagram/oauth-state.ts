import { createHmac, timingSafeEqual } from "crypto";

// Stands in for a CSRF-state DB row without adding a table — the same secret
// Auth.js already uses (AUTH_SECRET), since this OAuth flow is independent
// of Auth.js but doesn't need its own secret.
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signState(tenantId: string): string {
  const payload = `${tenantId}:${Date.now()}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/** Returns the tenantId if the state is validly signed and not expired, else null. */
export function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [tenantId, timestamp, signature] = decoded.split(":");
    if (!tenantId || !timestamp || !signature) return null;

    const expected = sign(`${tenantId}:${timestamp}`);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

    if (Date.now() - Number(timestamp) > STATE_MAX_AGE_MS) return null;

    return tenantId;
  } catch {
    return null;
  }
}
