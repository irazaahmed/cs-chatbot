import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/client";
import { verifySignedRequest } from "@/lib/instagram/signed-request";

export const runtime = "nodejs";

// Meta's Data Deletion Request callback — required for App Review. Must
// respond synchronously with { url, confirmation_code } per
// https://developers.facebook.com/docs/facebook-login/guides/permissions/data-deletion
// Public route; trust comes from the HMAC-verified signed_request.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { origin } = request.nextUrl;
  const body = await request.formData();
  const signedRequest = body.get("signed_request");
  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "missing signed_request" }, { status: 400 });
  }

  const payload = verifySignedRequest(signedRequest);
  if (!payload) {
    return NextResponse.json({ error: "invalid signed_request" }, { status: 403 });
  }

  const confirmationCode = randomUUID();

  try {
    // Deleting the row (not just disconnecting) is the point of this
    // endpoint — a plain disconnect keeps the row for reconnecting later,
    // this is an explicit request to erase it.
    await prisma.instagramAccount.deleteMany({ where: { igUserId: payload.user_id } });
  } catch (err) {
    console.error("[instagram-data-deletion] failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({
    url: `${origin}/api/instagram/data-deletion/status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
