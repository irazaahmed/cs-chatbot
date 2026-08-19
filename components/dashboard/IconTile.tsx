import type { ReactNode } from "react";
import { cx } from "./cx";

const TONE = {
  accent: "border-accent/25 bg-gradient-to-br from-accent/25 to-accent/5 text-accent-bright",
  success: "border-emerald-400/25 bg-gradient-to-br from-emerald-400/25 to-emerald-400/5 text-emerald-400",
  warning: "border-amber-400/25 bg-gradient-to-br from-amber-400/25 to-amber-400/5 text-amber-400",
  danger: "border-red-400/25 bg-gradient-to-br from-red-400/25 to-red-400/5 text-red-400",
  instagram: "border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-400/25 to-fuchsia-400/5 text-instagram-text",
};

const SIZE = {
  sm: "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 [&>svg]:h-[1.15rem] [&>svg]:w-[1.15rem]",
};

/** Rounded gradient badge behind a glyph from `./icons` — the one recipe
 * for "an icon with a bit of color behind it", used on stat cards, the
 * home page's channel rows, and empty-state CTAs. */
export function IconTile({
  icon,
  tone = "accent",
  size = "md",
  className,
}: {
  icon: ReactNode;
  tone?: keyof typeof TONE;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-xl border",
        TONE[tone],
        SIZE[size],
        className
      )}
    >
      {icon}
    </span>
  );
}
