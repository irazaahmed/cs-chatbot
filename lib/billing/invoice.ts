import { prisma } from "@/lib/db/client";

/** CLAUDE.md section 9: "CYB-2026-0042" style reference the customer puts in
 * transaction remarks. `exclude` lets a caller that needs two refs in the
 * same request (e.g. billing/page.tsx generating one for the website plan
 * form and one for the WhatsApp add-on form) avoid a collision — nothing is
 * reserved in the DB until a Payment row is actually created, so two calls
 * back to back would otherwise produce the identical candidate. */
export async function generateInvoiceRef(exclude: Set<string> = new Set()): Promise<string> {
  const year = new Date().getUTCFullYear();

  for (let attempt = 0; attempt < 10; attempt++) {
    const count = await prisma.payment.count({
      where: { invoiceRef: { startsWith: `CYB-${year}-` } },
    });
    const seq = String(count + 1 + attempt).padStart(4, "0");
    const candidate = `CYB-${year}-${seq}`;
    if (exclude.has(candidate)) continue;
    const exists = await prisma.payment.findUnique({ where: { invoiceRef: candidate } });
    if (!exists) return candidate;
  }

  throw new Error("Could not generate a unique invoice reference");
}
