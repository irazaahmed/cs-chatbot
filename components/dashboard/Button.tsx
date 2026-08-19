import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

const VARIANT = {
  // btn-sheen is baked in here so a primary button can no longer be built
  // without it — two dashboard pages had previously forgotten it.
  primary:
    "btn-sheen rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)] disabled:pointer-events-none disabled:opacity-50",
  outline:
    "rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-50",
  "outline-danger":
    "rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-danger-text/60 hover:text-danger-text disabled:pointer-events-none disabled:opacity-50",
  danger:
    "rounded-full border border-red-400/40 px-5 py-2 text-sm font-medium text-danger-text transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant: keyof typeof VARIANT }
>(({ variant, type = "submit", className, ...props }, ref) => (
  <button ref={ref} type={type} className={cx(VARIANT[variant], className)} {...props} />
));
Button.displayName = "Button";
