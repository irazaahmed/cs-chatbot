import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/client";

const PAYMENT_PROOF_DIR = path.join(process.cwd(), "uploads", "payments");

/**
 * Everything "delete this tenant" means, in one place, so the admin delete
 * (app/admin/tenants/[id]/page.tsx) and the self-serve account delete
 * (app/(dashboard)/settings/page.tsx) can't drift apart.
 *
 * Job has no FK relation to Tenant (schema.prisma), so nothing cascades it —
 * must be cleared explicitly, same as Payment (kept without onDelete: Cascade
 * elsewhere for an audit trail, but not here). Document, Conversation, Lead,
 * Appointment, WhatsAppAccount, and RateLimitBucket all cascade from the
 * Tenant.delete() itself.
 */
export async function deleteTenantCompletely(tenantId: string): Promise<void> {
  const [documents, payments] = await Promise.all([
    prisma.document.findMany({
      where: { tenantId, filePath: { not: null } },
      select: { filePath: true },
      distinct: ["filePath"],
    }),
    prisma.payment.findMany({ where: { tenantId }, select: { proofUrl: true } }),
  ]);

  await prisma.$transaction(
    async (tx) => {
      await tx.job.deleteMany({ where: { tenantId } });
      await tx.payment.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    },
    { timeout: 20_000, maxWait: 20_000 }
  );

  // Best-effort — the DB rows are already gone either way, so a stray file
  // that fails to unlink is a disk-hygiene issue, not a correctness one.
  for (const { filePath } of documents) {
    if (filePath) await unlink(filePath).catch(() => {});
  }
  for (const { proofUrl } of payments) {
    await unlink(path.join(PAYMENT_PROOF_DIR, proofUrl)).catch(() => {});
  }
}
