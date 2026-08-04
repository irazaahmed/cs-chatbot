import { prisma } from "@/lib/db/client";
import { sendTrialEndedEmail } from "@/lib/email/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

// CLAUDE.md section 9 status ladder. Day 3's forced "Powered by" branding is
// derived dynamically in /api/config from periodEnd, not a separate status
// value, so it doesn't need a branch here.
function statusForDaysOverdue(daysOverdue: number): string {
  if (daysOverdue >= 30) return "canceled";
  if (daysOverdue >= 7) return "suspended";
  return "past_due";
}

// The WhatsApp add-on has no "canceled" state (see Tenant.whatsappStatus in
// schema.prisma) — it's a smaller, simpler ladder than the website plan's.
function whatsappStatusForDaysOverdue(daysOverdue: number): string {
  if (daysOverdue >= 7) return "suspended";
  return "past_due";
}

/**
 * Scans tenants past their billing period and demotes status per the ladder.
 * Called from worker.ts's existing poll loop — no separate cron needed at
 * this scale. Deliberately does NOT implement the "purge 30 days after
 * cancellation" step: automated deletion of customer data is a big enough
 * decision to deserve its own careful pass, not a line item bundled in here.
 */
export async function applyStatusLadder(): Promise<number> {
  const now = new Date();
  const overdueTenants = await prisma.tenant.findMany({
    where: {
      status: { in: ["active", "past_due", "suspended"] },
      periodEnd: { lt: now },
    },
    select: { id: true, status: true, periodEnd: true },
  });

  let changed = 0;
  for (const tenant of overdueTenants) {
    if (!tenant.periodEnd) continue;
    const daysOverdue = Math.floor((now.getTime() - tenant.periodEnd.getTime()) / DAY_MS);
    const nextStatus = statusForDaysOverdue(daysOverdue);
    if (nextStatus !== tenant.status) {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { status: nextStatus } });
      changed++;
    }
  }

  // A trial (admin-granted via periodEnd, no invoice involved) isn't a billing
  // dunning case — there's nothing to chase payment for, so it doesn't ride
  // the past_due/suspended/canceled ladder above. It just ends: suspended the
  // moment periodEnd passes, same graceful "chat unavailable" response as any
  // other suspended tenant, never a 404/500 on the customer's site.
  // findMany + loop instead of updateMany so each tenant's owner can be
  // emailed that their trial ended (see lib/email/notify.ts).
  const expiredTrials = await prisma.tenant.findMany({
    where: { status: "trialing", periodEnd: { lt: now } },
    select: { id: true, name: true, owner: { select: { email: true } } },
  });
  for (const tenant of expiredTrials) {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "suspended" } });
    if (tenant.owner.email) {
      await sendTrialEndedEmail(tenant.owner.email, tenant.name);
    }
    changed++;
  }

  // Parallel pass for the WhatsApp add-on — entirely independent of the
  // website plan's ladder above, keyed off whatsappStatus/whatsappPeriodEnd.
  const overdueWhatsApp = await prisma.tenant.findMany({
    where: {
      whatsappStatus: { in: ["active", "past_due", "suspended"] },
      whatsappPeriodEnd: { lt: now },
    },
    select: { id: true, whatsappStatus: true, whatsappPeriodEnd: true },
  });

  for (const tenant of overdueWhatsApp) {
    if (!tenant.whatsappPeriodEnd) continue;
    const daysOverdue = Math.floor((now.getTime() - tenant.whatsappPeriodEnd.getTime()) / DAY_MS);
    const nextStatus = whatsappStatusForDaysOverdue(daysOverdue);
    if (nextStatus !== tenant.whatsappStatus) {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { whatsappStatus: nextStatus } });
      changed++;
    }
  }

  const expiredWhatsAppTrials = await prisma.tenant.updateMany({
    where: { whatsappStatus: "trialing", whatsappPeriodEnd: { lt: now } },
    data: { whatsappStatus: "suspended" },
  });
  changed += expiredWhatsAppTrials.count;

  return changed;
}
