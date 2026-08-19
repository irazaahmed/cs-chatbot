import type { ReactNode } from "react";
import { cx } from "./cx";

/** Lighter, non-blurred panel for secondary/nested content inside a Card
 * (e.g. an inline disclaimer, a nested checkbox group) — not elevated
 * enough to be its own Card. */
export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-border bg-surface/60 p-4", className)}>
      {children}
    </div>
  );
}
