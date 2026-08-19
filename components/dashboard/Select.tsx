import { forwardRef, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

// Same base recipe as Input — the hand-rolled selects this replaces
// (customize's language/position pickers, plan-picker's method select)
// had silently dropped `w-full` and the focus ring that inputs get.
const BASE =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cx(BASE, className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
