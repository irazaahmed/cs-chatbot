import { redirect } from "next/navigation";
import type { Tenant } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

/**
 * Every dashboard page calls this to resolve the signed-in user's tenant.
 * Phase 3 doesn't build multi-tenant-per-user switching UI, so this is
 * always "the first tenant this user owns" — redirects to /login or
 * /onboarding when that doesn't resolve.
 */
export async function getCurrentTenant(): Promise<{ userId: string; tenant: Tenant }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (!tenant) redirect("/onboarding");

  return { userId: session.user.id, tenant };
}
