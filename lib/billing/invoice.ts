import { prisma } from "@/lib/db/client";

/** CLAUDE.md section 9: "CYB-2026-0042" style reference the customer puts in transaction remarks. */
export async function generateInvoiceRef(): Promise<string> {
  const year = new Date().getUTCFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.payment.count({
      where: { invoiceRef: { startsWith: `CYB-${year}-` } },
    });
    const seq = String(count + 1 + attempt).padStart(4, "0");
    const candidate = `CYB-${year}-${seq}`;
    const exists = await prisma.payment.findUnique({ where: { invoiceRef: candidate } });
    if (!exists) return candidate;
  }

  throw new Error("Could not generate a unique invoice reference");
}
