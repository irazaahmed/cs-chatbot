// Small "where this came from" tag shared by the Conversations, Unanswered,
// Leads, and Appointments tables — all four read Conversation/Lead/Appointment
// rows that carry a channel of "web" | "whatsapp".
export function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "whatsapp") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-success-text">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-2.5 py-0.5 text-xs font-medium text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" />
      Website
    </span>
  );
}
