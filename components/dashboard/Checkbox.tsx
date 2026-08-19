import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "./cx";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cx("h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-accent", className)}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";
