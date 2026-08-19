import type { ReactNode } from "react";
import { cx } from "./cx";

const TONE = {
  neutral: { pill: "border-border bg-surface/60 text-muted", dot: "bg-muted" },
  success: { pill: "border-emerald-400/30 bg-emerald-400/10 text-success-text", dot: "bg-emerald-400" },
  warning: { pill: "border-amber-400/30 bg-amber-400/10 text-warning-text", dot: "bg-amber-400" },
  danger: { pill: "border-red-400/30 bg-red-400/10 text-danger-text", dot: "bg-red-400" },
  accent: { pill: "border-accent/30 bg-accent/10 text-accent-bright", dot: "bg-accent-bright" },
  // Raw Tailwind fuchsia, consistent with how the other tones' border/bg
  // are raw Tailwind classes too — only the text color needs a dedicated
  // token (see --color-instagram-text in app/globals.css) since it has to
  // swap per [data-theme] for contrast, same reason danger/success/warning
  // text already do.
  instagram: { pill: "border-fuchsia-400/30 bg-fuchsia-400/10 text-instagram-text", dot: "bg-fuchsia-400" },
};

const SIZE = {
  xs: { pill: "gap-1 px-2 py-0.5 text-[10px]", dot: "h-1.5 w-1.5" },
  sm: { pill: "gap-1.5 px-2.5 py-0.5 text-xs", dot: "h-1.5 w-1.5" },
  md: { pill: "gap-1.5 px-3 py-1 text-xs", dot: "h-1.5 w-1.5" },
  lg: { pill: "gap-2 px-4 py-2 text-sm", dot: "h-2 w-2" },
};

/** One pill component covering both small tag badges (channel, answered,
 * status) and the larger channel-connect-state pills (off/on/connected) —
 * same shape family, different size. */
export function Badge({
  tone,
  size = "sm",
  dot = false,
  pulse = false,
  children,
  className,
}: {
  tone: keyof typeof TONE;
  size?: keyof typeof SIZE;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  const s = SIZE[size];
  return (
    <span className={cx("inline-flex items-center rounded-full border font-medium", t.pill, s.pill, className)}>
      {dot && <span className={cx("rounded-full", t.dot, s.dot, pulse && "animate-pulse-soft")} />}
      {children}
    </span>
  );
}
