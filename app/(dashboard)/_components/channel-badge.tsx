import { Badge } from "@/components/dashboard/Badge";

// Small "where this came from" tag shared by the Conversations, Unanswered,
// Leads, and Appointments tables — all four read Conversation/Lead/Appointment
// rows that carry a channel of "web" | "whatsapp" | "instagram".
const CHANNELS: Record<string, { label: string; tone: "neutral" | "success" | "instagram" }> = {
  web: { label: "Website", tone: "neutral" },
  whatsapp: { label: "WhatsApp", tone: "success" },
  instagram: { label: "Instagram", tone: "instagram" },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const { label, tone } = CHANNELS[channel] ?? { label: channel, tone: "neutral" as const };
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
