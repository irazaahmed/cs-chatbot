import { prisma } from "@/lib/db/client";
import { getCurrentTenant } from "@/lib/tenant/current";
import { deleteTenantCompletely } from "@/lib/tenant/delete";
import { signOut } from "@/auth";
import { DeleteTenantForm } from "@/components/admin/DeleteTenantForm";

export default async function SettingsPage() {
  const { tenant } = await getCurrentTenant();

  async function deleteAccount(formData: FormData) {
    "use server";
    const { tenant, userId } = await getCurrentTenant();
    // Guards against a stale/forged form pointing at a different tenant id.
    if (String(formData.get("id")) !== tenant.id) return;

    await deleteTenantCompletely(tenant.id);
    // Tenant is gone; the User row is the last piece. auth.ts's jwt callback
    // upserts User by email on every sign-in, so if this person ever signs
    // in again they get a fresh row and go through onboarding from scratch —
    // exactly what "delete my account" should mean.
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});

    // signOut (not a plain redirect) matters: sessions are JWT-only with no
    // DB adapter, so the old token's userId would otherwise keep pointing at
    // a now-deleted row until it expired, and the next /onboarding visit
    // would throw a Prisma FK error on tenant.create.
    await signOut({ redirectTo: "/login?deleted=1" });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">Manage your account.</p>

      <div className="glass mt-6 rounded-2xl border border-red-500/20 p-6">
        <p className="text-sm font-medium text-foreground">Delete account</p>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your account and everything tied to it: crawled data, uploaded files,
          conversations, leads, appointments, your WhatsApp connection, and payment history. This
          cannot be undone.
        </p>
        <DeleteTenantForm
          tenantId={tenant.id}
          tenantName={tenant.name}
          action={deleteAccount}
          actionLabel="Permanently delete my account"
        />
      </div>
    </div>
  );
}
