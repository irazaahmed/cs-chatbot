"use client";

import { useEffect, useState } from "react";

// r=22 circle circumference, for the scroll-progress ring's stroke-dashoffset.
const CIRCUMFERENCE = 2 * Math.PI * 22;

/**
 * Bottom-left scroll-to-top button with a circular scroll-progress ring.
 * Appears after scrolling down a bit. Dependency-free (no motion/react,
 * no lucide) — mirrors the marketing site's ScrollToTop with a plain
 * scroll listener and inline SVG, per CLAUDE.md's "avoid new deps" rule.
 */
export function ScrollToTop() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setShow(scrolled > 500);
      setProgress(max > 0 ? Math.min(1, scrolled / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      className={`group fixed bottom-5 left-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-[0_8px_30px_-10px_var(--color-accent)] backdrop-blur-md transition-all duration-300 hover:border-accent/60 hover:text-accent-bright sm:left-6 sm:h-14 sm:w-14 ${
        show ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2.5 scale-90 opacity-0"
      }`}
    >
      {/* progress ring */}
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke="var(--color-border)" strokeWidth="2" opacity="0.5" />
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="relative transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
