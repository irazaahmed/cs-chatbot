"use client";

import { useEffect, useState } from "react";

/** Minimum time the splash stays visible so the animation reads, not blinks. */
const MIN_VISIBLE_MS = 350;
/** Hard cap: never hold the page hostage waiting on slow assets. */
const MAX_WAIT_MS = 2000;
/** Matches the CSS fade-out duration on .preloader */
const EXIT_MS = 400;

/**
 * Brand splash shown on initial page load: the CS Chatbot mark centered
 * inside an orbiting loading arc. Ported from the Cybrum Solutions
 * marketing site's Preloader (dependency-free — no motion/react). Covers
 * the page from first paint and fades out once loaded, respecting a
 * minimum visible time. Plays once per session (see the inline head
 * script in app/layout.tsx that sets data-splash for repeat visits).
 */
export function Preloader() {
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("cs-splash")) {
        const skip = window.setTimeout(() => setPhase("done"), 0);
        return () => window.clearTimeout(skip);
      }
      sessionStorage.setItem("cs-splash", "1");
    } catch {
      /* storage blocked: show the splash normally */
    }

    const start = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minVisible = reduceMotion ? 300 : MIN_VISIBLE_MS;
    let leaveTimer: number | undefined;
    let doneTimer: number | undefined;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, minVisible - (performance.now() - start));
      leaveTimer = window.setTimeout(() => {
        setPhase("leaving");
        doneTimer = window.setTimeout(() => setPhase("done"), EXIT_MS);
      }, wait);
    };

    const capTimer = window.setTimeout(finish, MAX_WAIT_MS);
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(capTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // Keep the page from scrolling behind the splash.
  useEffect(() => {
    if (phase !== "loading") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={`preloader ${phase === "leaving" ? "preloader-leave" : ""}`}
      role="status"
      aria-label="CS Chatbot is loading"
    >
      <div className="preloader-stage">
        <span className="preloader-ring" aria-hidden="true" />
        <span className="preloader-ring preloader-ring-outer" aria-hidden="true" />
        <div className="preloader-logo">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><text x="12.5" y="11.5" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none" fontSize="8.2" fontWeight="700" letterSpacing="-0.3" style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}>CS</text>
          </svg>
        </div>
      </div>
      <p className="preloader-word">
        CS<span className="preloader-word-sub"> CHATBOT</span>
      </p>
    </div>
  );
}
