import Link from "next/link";
import { signIn } from "@/auth";
import { login } from "@/lib/auth/actions";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const inputClass =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const { deleted, error } = await searchParams;

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
        {deleted && (
          <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-success-text">
            Your account has been deleted.
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/home" });
          }}
          className="mt-7"
        >
          <GoogleSignInButton />
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={login} className="flex flex-col gap-4 text-left">
          <input type="email" name="email" required placeholder="Email address" className={inputClass} />
          <input type="password" name="password" required placeholder="Password" className={inputClass} />

          {error && (
            <p className="text-sm text-red-400">Wrong email or password. Please try again.</p>
          )}

          <button
            type="submit"
            className="btn-sheen mt-1 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent-bright hover:underline">
            Sign up
          </Link>
        </p>

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
