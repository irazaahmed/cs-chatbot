import { prisma } from "@/lib/db/client";
import { assertSafeUrl } from "@/lib/security/url";
import { TRIAL_DAYS } from "@/lib/billing/plans";

const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Turns the website channel on. No ownership proof required — allowedDomains
 * is set straight from the hostname of the URL the tenant gives us, which is
 * why the origin allowlist, rate limiting, usage caps, and Turnstile matter
 * as the remaining defense layers (see lib/security/origin.ts).
 *
 * Grants a fresh trial only the first time this tenant's website is ever
 * turned on (periodEnd still null) — re-enabling after a disable resumes
 * whatever status/periodEnd it already had, so toggling off/on can't be used
 * to farm free trials.
 */
export async function enableWebsiteChannel(tenantId: string, websiteUrlInput: string): Promise<void> {
  const url = await assertSafeUrl(websiteUrlInput);

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { periodEnd: true },
  });

  const isFirstActivation = tenant.periodEnd === null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      websiteEnabled: true,
      websiteUrl: url.toString(),
      allowedDomains: [url.hostname],
      ...(isFirstActivation
        ? { status: "trialing", periodEnd: new Date(Date.now() + TRIAL_MS) }
        : {}),
    },
  });

  await prisma.job.create({
    data: { tenantId, type: "crawl", status: "pending", payload: { url: url.toString() } },
  });
}

export async function disableWebsiteChannel(tenantId: string): Promise<void> {
  await prisma.tenant.update({ where: { id: tenantId }, data: { websiteEnabled: false } });
}

/** Same first-activation-only trial rule as enableWebsiteChannel, mirrored
 * against whatsappStatus/whatsappPeriodEnd. No crawl job — WhatsApp has no
 * crawl concept, training is shared with the website channel via Document. */
export async function enableWhatsappChannel(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { whatsappPeriodEnd: true },
  });

  const isFirstActivation = tenant.whatsappPeriodEnd === null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      whatsappEnabled: true,
      ...(isFirstActivation
        ? { whatsappStatus: "trialing", whatsappPeriodEnd: new Date(Date.now() + TRIAL_MS) }
        : {}),
    },
  });
}

export async function disableWhatsappChannel(tenantId: string): Promise<void> {
  await prisma.tenant.update({ where: { id: tenantId }, data: { whatsappEnabled: false } });
}

/** Same first-activation-only trial rule as enableWhatsappChannel, mirrored
 * against instagramStatus/instagramPeriodEnd. No crawl job, training is
 * shared via Document like WhatsApp. */
export async function enableInstagramChannel(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { instagramPeriodEnd: true },
  });

  const isFirstActivation = tenant.instagramPeriodEnd === null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      instagramEnabled: true,
      ...(isFirstActivation
        ? { instagramStatus: "trialing", instagramPeriodEnd: new Date(Date.now() + TRIAL_MS) }
        : {}),
    },
  });
}

export async function disableInstagramChannel(tenantId: string): Promise<void> {
  await prisma.tenant.update({ where: { id: tenantId }, data: { instagramEnabled: false } });
}
