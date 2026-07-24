import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isOriginAllowed } from "@/lib/security/origin";
import { corsHeaders, corsPreflightResponse } from "@/lib/security/cors";

export const runtime = "nodejs";

const QuerySchema = z.object({ publicKey: z.string().min(1) });

// Section 9 status ladder: day 3 of past_due forces "Powered by Cybrum"
// branding back on. There's no separate "days since failure" field yet
// (that's Phase 4 billing), so this derives it from periodEnd, which is
// already the anchor the ladder is built around.
const PAST_DUE_BRANDING_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export async function OPTIONS(request: Request): Promise<Response> {
  return corsPreflightResponse(request);
}

export async function GET(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  const json = (data: unknown, status: number) => Response.json(data, { status, headers: cors });

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({ publicKey: url.searchParams.get("publicKey") });
  if (!parsed.success) {
    return json({ error: "Missing publicKey" }, 400);
  }

  const tenant = await prisma.tenant.findUnique({ where: { publicKey: parsed.data.publicKey } });
  if (!tenant) {
    return json({ error: "Not found" }, 404);
  }

  if (!isOriginAllowed(origin, tenant.allowedDomains)) {
    return json({ error: "Origin not allowed" }, 403);
  }

  const forcedBranding =
    tenant.status === "past_due" &&
    tenant.periodEnd !== null &&
    Date.now() - tenant.periodEnd.getTime() >= PAST_DUE_BRANDING_GRACE_MS;

  return json({ brandConfig: tenant.brandConfig, language: tenant.language, forcedBranding }, 200);
}
