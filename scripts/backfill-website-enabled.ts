// One-off production migration helper for the Website/WhatsApp co-equal
// channels change. `npm run start` does `prisma db push && next start` with
// no --accept-data-loss, so it will refuse to drop verified/verifyToken/
// verifyMethod/whatsappRequestedAt on its own — good, that's a safety net,
// not a bug. Run this script against the production DATABASE_URL in
// between the two required deploys:
//
//   1. Deploy this code with schema.prisma's Tenant.verified /
//      verifyToken / verifyMethod / whatsappRequestedAt fields TEMPORARILY
//      restored (purely additive: only adds websiteEnabled). `db push`
//      succeeds with no data-loss flag needed.
//   2. Run `npm run backfill-website-enabled` against prod — sets
//      websiteEnabled = true for every tenant already using the website
//      channel under the old model, so nobody live today gets silently
//      locked out by the new default of false. whatsappEnabled needs no
//      backfill, that column and its meaning are unchanged.
//   3. Deploy this repo's actual schema.prisma (verified/etc. dropped) and
//      run `prisma db push --accept-data-loss` once by hand.
//
// Uses $executeRawUnsafe instead of the Prisma Client's typed tenant model
// so this keeps working across steps 1-3 regardless of whether the
// generated client of the moment still declares `verified`.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Tenant'`
  );
  const names = new Set(columns.map((c) => c.column_name));

  if (!names.has("websiteEnabled")) {
    console.error("Tenant.websiteEnabled doesn't exist yet — run `prisma db push` first (see step 1 above).");
    process.exit(1);
  }
  if (!names.has("verified")) {
    console.log("Tenant.verified no longer exists — already migrated, nothing to backfill.");
    process.exit(0);
  }

  // Deliberately NOT "verified = true" — the old upload-mode signup path
  // (app/onboarding/page.tsx) marked verified=true unconditionally for
  // BOTH website-target and whatsapp-target uploads, since there was no
  // crawl to justify a verification step either way. A whatsapp-target
  // upload tenant is verified=true with an empty allowedDomains (no real
  // website channel at all) — backfilling websiteEnabled=true for those
  // would put them in a broken-looking "on" state with a script tag that
  // doesn't actually work. allowedDomains being non-empty is the real
  // signal: it only gets populated by a genuine website verification or
  // website-target signup, so it reliably means "this tenant already has a
  // working website channel."
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "Tenant"
     SET "websiteEnabled" = true
     WHERE "websiteEnabled" = false
       AND "allowedDomains" IS NOT NULL
       AND cardinality("allowedDomains") > 0`
  );

  console.log(`Backfilled websiteEnabled = true for ${result} tenant(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
