export type ChannelStatusTone = "neutral" | "success" | "warning" | "danger";

const STATUS_TONE: Record<string, { label: string; tone: ChannelStatusTone }> = {
  inactive: { label: "Not connected", tone: "neutral" },
  trialing: { label: "Trial", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  past_due: { label: "Past due", tone: "warning" },
  suspended: { label: "Suspended", tone: "danger" },
  canceled: { label: "Canceled", tone: "danger" },
};

/** Shared by the Billing page and the dashboard overview page so both read
 * a tenant's channel status (website `status`, `whatsappStatus`,
 * `instagramStatus`) the same way. */
export function channelStatusTone(status: string): { label: string; tone: ChannelStatusTone } {
  return STATUS_TONE[status] ?? { label: status, tone: "neutral" };
}
