import { requireAdmin } from "@/lib/admin/current";
import { prisma } from "@/lib/db/client";
import { readProofFile } from "@/lib/billing/proof-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  await requireAdmin();

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const file = await readProofFile(payment.proofUrl);
  if (!file) {
    return Response.json({ error: "Proof file not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(file.buffer), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store" },
  });
}
