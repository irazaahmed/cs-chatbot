import type { LabelHTMLAttributes } from "react";
import { cx } from "./cx";

export function Label({
  size = "md",
  muted = false,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { size?: "sm" | "md"; muted?: boolean }) {
  return (
    <label
      className={cx(
        "block font-medium",
        size === "sm" ? "text-xs" : "text-sm",
        muted && "text-muted",
        className
      )}
      {...props}
    />
  );
}
