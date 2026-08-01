export interface BrandConfig {
  color?: string;
  botName?: string;
  greeting?: string;
  avatar?: string;
  position?: string;
  humanContact?: string;
}

export interface ConfigResponse {
  brandConfig: BrandConfig;
  language: string;
  forcedBranding: boolean;
}

export async function fetchConfig(apiBase: string, publicKey: string): Promise<ConfigResponse | null> {
  const res = await fetch(`${apiBase}/api/config?publicKey=${encodeURIComponent(publicKey)}`);
  if (!res.ok) return null;
  return (await res.json()) as ConfigResponse;
}

export function sendChatMessage(
  apiBase: string,
  publicKey: string,
  sessionId: string,
  message: string
): Promise<Response> {
  return fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey, sessionId, message }),
  });
}
