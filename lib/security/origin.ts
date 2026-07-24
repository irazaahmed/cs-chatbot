/**
 * Checks a request's Origin header hostname against a tenant's allowlist
 * (CLAUDE.md section 10, rule 1). Returns false if the header is missing,
 * malformed, or the hostname isn't in allowedDomains.
 */
export function isOriginAllowed(originHeader: string | null, allowedDomains: string[]): boolean {
  if (!originHeader) return false;

  let hostname: string;
  try {
    hostname = new URL(originHeader).hostname.toLowerCase();
  } catch {
    return false;
  }

  return allowedDomains.some((domain) => domain.toLowerCase() === hostname);
}
