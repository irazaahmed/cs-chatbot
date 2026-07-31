"use client";

import { useFormStatus } from "react-dom";

// Lives inside a <form> whose action is the Google server action. useFormStatus
// flips to pending the instant the form submits, so the button shows a spinner
// immediately — the OAuth redirect takes a moment, and without this the button
// just sits there looking frozen, which reads as "the site is slow".
const DEFAULT_CLASS =
  "btn-sheen inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-accent font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)] disabled:opacity-70";

export function GoogleSignInButton({ className = DEFAULT_CLASS }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            className="animate-spin"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Signing in…
        </>
      ) : (
        <>
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
            />
          </svg>
          Sign in with Google
        </>
      )}
    </button>
  );
}
