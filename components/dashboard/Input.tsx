import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "./cx";

const BASE =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground placeholder:text-muted outline-none transition-shadow";
const FOCUS = {
  default: "focus:shadow-[0_0_0_2px_var(--color-accent)]",
  danger: "focus:shadow-[0_0_0_2px_rgb(239,68,68)]",
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { variant?: keyof typeof FOCUS }>(
  ({ variant = "default", className, ...props }, ref) => (
    <input ref={ref} className={cx(BASE, FOCUS[variant], className)} {...props} />
  )
);
Input.displayName = "Input";
