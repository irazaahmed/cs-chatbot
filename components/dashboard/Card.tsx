import type { ReactNode } from "react";
import { cx } from "./cx";

const PADDING = {
  none: "",
  md: "p-6",
  lg: "p-7",
};

const RADIUS = {
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

/** The one frosted-card surface for dashboard content — wraps the existing
 * `glass` utility (app/globals.css) instead of the separate hand-rolled
 * `border-border bg-card/60 backdrop-blur-sm` recipe some pages used, since
 * both produced the same visual effect. */
export function Card({
  children,
  padding = "md",
  radius = "2xl",
  className,
}: {
  children: ReactNode;
  padding?: keyof typeof PADDING;
  radius?: keyof typeof RADIUS;
  className?: string;
}) {
  return (
    <div className={cx("glass overflow-hidden", RADIUS[radius], PADDING[padding], className)}>
      {children}
    </div>
  );
}
