import Link from "next/link";
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
      </div>

      <Link
        href="/"
        className="fixed left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-foreground sm:left-6 sm:top-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
        </svg>
        Back to home
      </Link>

      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center shadow-[0_24px_70px_-30px_var(--color-accent)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-bright">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><text x="12.5" y="11.5" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none" fontSize="8.2" fontWeight="700" letterSpacing="-0.3" style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}>CS</text>
          </svg>
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          CS<span className="text-accent"> Chatbot</span>
        </h1>
        <p className="mt-2 text-sm text-muted">Sign in to manage your chatbot.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/playground" });
          }}
          className="mt-7"
        >
          <button
            type="submit"
            className="btn-sheen inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-accent font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
            </svg>
            Sign in with Google
          </button>
        </form>
        <p className="mt-6 text-xs text-muted">
          A product by{" "}
          <a
            href="https://www.cybrumsolutions.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-bright transition-colors hover:text-accent"
          >
            Cybrum Solutions
          </a>
        </p>
      </div>
    </div>
  );
}
