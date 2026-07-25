"use client";

import { useRef, type ReactNode } from "react";

type GlowCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Card with a cursor-following radial spotlight, a subtle 3D tilt (mouse
 * only), and an accent border on hover. Ported from the Cybrum Solutions
 * marketing site; dependency-free.
 */
export function GlowCard({ children, className = "" }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    if (e.pointerType === "mouse") {
      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;
      el.style.setProperty("--rx", `${(py * -4).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * 5).toFixed(2)}deg`);
    }
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        transform:
          "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
        transformStyle: "preserve-3d",
      }}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 ease-out will-change-transform hover:border-accent/60 hover:shadow-[0_18px_50px_-20px_var(--color-accent)] ${className}`}
    >
      {/* spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx) var(--my), color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
