"use client";

import { useEffect, useRef, useState } from "react";

type Pref = "light" | "dark" | "system";

const STORAGE_KEY = "cs-theme";

/** Resolve a preference to a concrete theme and apply it to <html data-theme>. */
function applyResolved(pref: Pref) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = pref === "dark" || (pref === "system" && prefersDark);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}

function readPref(): Pref {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "light" || s === "dark" || s === "system") return s;
  } catch {
    /* ignore */
  }
  return "dark";
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
] as const;

/**
 * Theme switcher with three choices: Light, Dark, System. The active theme
 * is applied before paint by the inline script in app/layout.tsx (no
 * flash). Ported from the Cybrum Solutions marketing site's ThemeToggle,
 * without lucide-react — this project draws icons as inline SVG everywhere.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<Pref>("dark");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep the resolved theme in sync with the OS while preference is "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readPref() === "system") applyResolved("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (value: Pref) => {
    setPref(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    applyResolved(value);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          if (!open) setPref(readPref());
          setOpen((v) => !v);
        }}
        aria-label="Change color theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change color theme"
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/60 text-foreground transition-colors hover:border-accent/60 hover:text-accent-bright ${className}`}
      >
        {/* Reflects the resolved appearance via CSS ([data-theme] selectors
            in globals.css), not React state — avoids an SSR/hydration
            mismatch since the inline script sets data-theme before paint. */}
        <span className="theme-toggle-sun"><SunIcon /></span>
        <span className="theme-toggle-moon"><MoonIcon /></span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="glass absolute right-0 z-[60] mt-2 w-36 overflow-hidden rounded-xl p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = pref === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(value)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-accent/15 text-accent-bright" : "text-foreground hover:bg-surface"
                }`}
              >
                <Icon />
                <span>{label}</span>
                {active && <span className="ml-auto"><CheckIcon /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
