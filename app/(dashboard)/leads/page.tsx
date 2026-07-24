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
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Leads</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Contact details visitors share with your chatbot.
      </p>

      <div className="mt-6">
        {leads.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No leads yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-2 text-black dark:text-zinc-50">{lead.name || "—"}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{lead.email || "—"}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{lead.phone || "—"}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {lead.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
