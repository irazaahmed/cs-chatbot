import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

/**
 * Standard marketing page frame: ambient backdrop, sticky nav, a centered
 * content column, and the shared footer. Every static marketing route
 * (about, how-to-use, contact, pricing) renders through this so the chrome
 * stays identical.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-[-12%] top-[-10%] h-[34rem] w-[34rem] [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
        <div className="glow-orb animate-float-slower absolute bottom-[-15%] right-[-10%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_10%,transparent)]" />
      </div>
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-10 sm:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
