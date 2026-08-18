import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifySignedRequest } from "@/lib/instagram/signed-request";

export const runtime = "nodejs";

// Meta calls this whenever a tenant removes CS Chatbot's access from their
// Instagram/Facebook settings — required for App Review. Public route, no
// session: trust comes from the HMAC-verified signed_request, the same
// "resolve identity from an external key" exception CLAUDE.md allows for
// publicKey/igUserId elsewhere.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.formData();
  const signedRequest = body.get("signed_request");
  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "missing signed_request" }, { status: 400 });
  }

  const payload = verifySignedRequest(signedRequest);
  if (!payload) {
    return NextResponse.json({ error: "invalid signed_request" }, { status: 403 });
  }

  try {
    await prisma.instagramAccount.updateMany({
      where: { igUserId: payload.user_id },
      data: { status: "disconnected", accessToken: null, tokenExpiresAt: null },
    });
  } catch (err) {
    console.error("[instagram-deauthorize] failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ success: true });
}
