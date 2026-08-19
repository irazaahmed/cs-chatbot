"use client";

import { useEffect } from "react";
import { useToast } from "./ToastProvider";

/** Drop this next to a page's success-only query-param check (e.g.
 * `{saved && <ToastFlash .../>}`) instead of a StatusBanner, for transient
 * confirmations. Fires once on mount, renders nothing. Error feedback stays
 * as StatusBanner — that should stay visible while the user fixes the form,
 * not disappear after a few seconds. */
export function ToastFlash({ message, tone }: { message: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const { push } = useToast();

  useEffect(() => {
    push(message, tone);
    // Fire once per mount only — message/tone/push are stable for the
    // lifetime of this element (it's conditionally rendered per navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
