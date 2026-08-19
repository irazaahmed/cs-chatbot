import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

const BASE =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cx(BASE, className)} {...props} />
);
Textarea.displayName = "Textarea";
