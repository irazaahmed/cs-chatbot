import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { ChannelBadge } from "../_components/channel-badge";
import { Table } from "@/components/dashboard/Table";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Badge } from "@/components/dashboard/Badge";
import { ChannelFilterForm } from "@/components/dashboard/ChannelFilterForm";

const STATUS_IDS = ["requested", "confirmed", "canceled"] as const;
type StatusId = (typeof STATUS_IDS)[number];
function isStatusId(v: string): v is StatusId {
  return (STATUS_IDS as readonly string[]).includes(v);
}

const STATUS_TONE: Record<StatusId, "warning" | "success" | "danger"> = {
  requested: "warning",
  confirmed: "success",
  canceled: "danger",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const { channel } = await searchParams;

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
    where: { tenantId: tenant.id, ...(channel ? { channel } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm text-muted">
            Booking requests visitors made through your chatbot. Confirm the exact time with them
            directly, then mark it here.
          </p>
        </div>
        <ChannelFilterForm channel={channel} basePath="/appointments" />
      </div>

      <div className="mt-6">
        {appointments.length === 0 ? (
          <EmptyState>No appointment requests yet.</EmptyState>
        ) : (
          <Table>
            <Table.Head>
              <Table.Th>Name</Table.Th>
              <Table.Th>Channel</Table.Th>
              <Table.Th>Contact</Table.Th>
              <Table.Th>Requested time</Table.Th>
              <Table.Th>Notes</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
            </Table.Head>
            <Table.Body>
              {appointments.map((appt) => {
                const status = isStatusId(appt.status) ? appt.status : null;
                return (
                  <Table.Row key={appt.id}>
                    <Table.Td muted={false}>{appt.name || "—"}</Table.Td>
                    <Table.Td>
                      <ChannelBadge channel={appt.channel} />
                    </Table.Td>
                    <Table.Td>{appt.contact || "—"}</Table.Td>
                    <Table.Td>{appt.requestedTime || "—"}</Table.Td>
                    <Table.Td>{appt.notes || "—"}</Table.Td>
                    <Table.Td>
                      <form action={updateStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={appt.id} />
                        <Badge tone={status ? STATUS_TONE[status] : "neutral"}>{appt.status}</Badge>
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
                    </Table.Td>
                    <Table.Td>{appt.createdAt.toLocaleDateString()}</Table.Td>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  );
}
