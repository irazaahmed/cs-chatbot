import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";

export default async function LeadsPage() {
  const { tenant } = await getCurrentTenant();

  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Leads</h1>
      <p className="mt-1 text-sm text-muted">
        Contact details visitors share with your chatbot.
      </p>

      <div className="mt-6">
        {leads.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
            No leads yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/80 text-left text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-border transition-colors hover:bg-accent/5">
                      <td className="px-5 py-3 text-foreground">{lead.name || "—"}</td>
                      <td className="px-5 py-3 text-muted">{lead.email || "—"}</td>
                      <td className="px-5 py-3 text-muted">{lead.phone || "—"}</td>
                      <td className="px-5 py-3 text-muted">
                        {lead.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
