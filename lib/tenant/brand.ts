// Single source of truth for the shape of Tenant.brandConfig (stored as JSON).
// Both the customize dashboard (which writes it) and the chat route (which
// reads leadCapture to decide behavior) parse through here so the two never
// drift apart.

export interface BrandConfig {
  color: string;
  botName: string;
  greeting: string;
  position: string;
  /** Whether the bot proactively asks interested visitors for their contact
   *  details and stores them as leads. */
  leadCapture: boolean;
}

export function parseBrandConfig(raw: unknown): BrandConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    color: typeof obj.color === "string" ? obj.color : "#1e88e8",
    botName: typeof obj.botName === "string" ? obj.botName : "Assistant",
    greeting: typeof obj.greeting === "string" ? obj.greeting : "Hi! How can I help?",
    position: typeof obj.position === "string" ? obj.position : "bottom-right",
    // Default on: tenants created before this field existed (no leadCapture
    // key) keep the lead-gen behavior until they explicitly turn it off.
    leadCapture: typeof obj.leadCapture === "boolean" ? obj.leadCapture : true,
  };
}
