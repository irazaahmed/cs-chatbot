import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";

const STATUS_IDS = ["requested", "confirmed", "canceled"] as const;
type StatusId = (typeof STATUS_IDS)[number];
function isStatusId(v: string): v is StatusId {
  return (STATUS_IDS as readonly string[]).includes(v);
}

const STATUS_PILLS: Record<string, string> = {
  requested: "border-amber-400/30 bg-amber-400/10 text-warning-text",
  confirmed: "border-emerald-400/30 bg-emerald-400/10 text-success-text",
  canceled: "border-red-400/30 bg-red-400/10 text-danger-text",
};

export default async function AppointmentsPage() {
  const { tenant } = await getCurrentTenant();

  async function updateStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const statusRaw = String(formData.get("status"));
    if (!isStatusId(statusRaw)) return;

    await prisma.appointment.updateMany({
      where: { id, tenantId: tenant.id },
      data: { status: statusRaw },
    });
    revalidatePath("/appointments");
  }

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Appointments</h1>
      <p className="mt-1 text-sm text-muted">
        Booking requests visitors made through your chatbot. Confirm the exact time with them
        directly, then mark it here.
      </p>

      <div className="mt-6">
        {appointments.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted backdrop-blur-sm">
            No appointment requests yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/80 text-left text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">Requested time</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="border-t border-border transition-colors hover:bg-accent/5">
                      <td className="px-5 py-3 text-foreground">{appt.name || "—"}</td>
                      <td className="px-5 py-3 text-muted">{appt.contact || "—"}</td>
                      <td className="px-5 py-3 text-muted">{appt.requestedTime || "—"}</td>
                      <td className="px-5 py-3 text-muted">{appt.notes || "—"}</td>
                      <td className="px-5 py-3">
                        <form action={updateStatus} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={appt.id} />
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_PILLS[appt.status] ?? "border-border bg-surface/60 text-muted"}`}
                          >
                            {appt.status}
                          </span>
                          <select
                            name="status"
                            defaultValue={appt.status}
                            className="rounded-lg border border-border bg-surface/60 px-2 py-1 text-xs text-foreground outline-none"
                          >
                            {STATUS_IDS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                      <td className="px-5 py-3 text-muted">{appt.createdAt.toLocaleDateString()}</td>
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
