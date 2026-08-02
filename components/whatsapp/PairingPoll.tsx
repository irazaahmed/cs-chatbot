"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes the /whatsapp page every few seconds while we're waiting for the
 * connector to publish a QR code or flip the account to connected — the rest
 * of the app is deliberately server-rendered with no client polling, but the
 * pairing step needs the page to update itself without the user hitting
 * refresh (Baileys QR codes also rotate periodically while unscanned).
 */
export function PairingPoll({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
