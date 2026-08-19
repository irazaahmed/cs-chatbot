"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

type ToastTone = "neutral" | "success" | "warning" | "danger";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ push: (message: string, tone?: ToastTone) => void } | null>(null);

// Solid card + colored left accent, not a translucent tone fill like Badge/
// StatusBanner — those sit inside the page flow against a known background,
// a toast floats over arbitrary content and needs to stay legible regardless.
const TONE_ACCENT: Record<ToastTone, string> = {
  neutral: "border-l-border",
  success: "border-l-emerald-400",
  warning: "border-l-amber-400",
  danger: "border-l-red-400",
};

const AUTO_HIDE_MS = 4000;

/** The app's first Context provider. Mounted once in the dashboard layout;
 * `useToast().push(message, tone)` from any client component below it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_HIDE_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              "pointer-events-auto min-w-[240px] max-w-sm rounded-xl border border-l-4 border-border bg-card px-4 py-3 text-sm text-foreground shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5)]",
              TONE_ACCENT[t.tone]
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
