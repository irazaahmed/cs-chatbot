"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { requestSignupCode, verifySignupCode } from "@/lib/auth/actions";

const inputClass =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]";

const CODE_SECONDS = 10 * 60;

const REQUEST_ERROR_MESSAGES: Record<string, string> = {
  validation: "Please fill in every field (password: 8+ characters).",
  exists: "An account with that email already exists. Log in instead.",
  cooldown: "A code was already sent — please wait before requesting another.",
  send_failed: "Couldn't send the verification email. Please try again in a moment.",
};

const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  expired: "That code has expired. Request a new one.",
  invalid_code: "That code isn't right. Please check and try again.",
  too_many_attempts: "Too many wrong attempts. Request a new code.",
  exists: "An account with that email already exists. Log in instead.",
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SignupForm() {
  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CODE_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step !== "code") return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step]);

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestSignupCode(name, email, password);
      if (!result.ok) {
        setError(REQUEST_ERROR_MESSAGES[result.error ?? "send_failed"]);
        return;
      }
      setCode("");
      setSecondsLeft(CODE_SECONDS);
      setResendCooldown(60);
      setStep("code");
    });
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifySignupCode(name, email, password, code);
      if (!result.ok) {
        setError(VERIFY_ERROR_MESSAGES[result.error ?? "invalid_code"]);
      }
      // On success verifySignupCode redirects — no local state update needed.
    });
  }

  function handleResend() {
    setError(null);
    startTransition(async () => {
      const result = await requestSignupCode(name, email, password);
      if (!result.ok) {
        setError(REQUEST_ERROR_MESSAGES[result.error ?? "send_failed"]);
        if (result.error === "cooldown" && result.cooldownSeconds) {
          setResendCooldown(result.cooldownSeconds);
        }
        return;
      }
      setCode("");
      setSecondsLeft(CODE_SECONDS);
      setResendCooldown(60);
    });
  }

  return (
    <>
      <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4 text-left">
        <input
          type="text"
          name="name"
          required
          placeholder="Full name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email address"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {step === "details" && error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="btn-sheen mt-1 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)] disabled:opacity-70"
        >
          {isPending && step === "details" ? "Sending code…" : "Create account"}
        </button>
      </form>

      {step === "code" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        >
          <div className="glass w-full max-w-sm rounded-3xl p-8 text-center shadow-[0_24px_70px_-30px_var(--color-accent)]">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Check your email</h2>
            <p className="mt-2 text-sm text-muted">
              We sent a 6-digit code to <span className="text-foreground">{email}</span>.
            </p>

            <form onSubmit={handleCodeSubmit} className="mt-6 flex flex-col gap-4 text-left">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="Enter 6-digit code"
                className={`${inputClass} text-center text-lg tracking-[0.4em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />

              <p className="text-center text-sm text-muted">
                {secondsLeft > 0 ? (
                  <>Code expires in <span className="text-foreground">{formatCountdown(secondsLeft)}</span></>
                ) : (
                  <span className="text-red-400">Code expired — request a new one.</span>
                )}
              </p>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isPending || secondsLeft === 0 || code.length !== 6}
                className="btn-sheen inline-flex h-12 w-full items-center justify-center rounded-full bg-accent font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)] disabled:opacity-50"
              >
                {isPending ? "Verifying…" : "Verify & create account"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="text-muted hover:text-foreground"
                >
                  ← Edit details
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending || resendCooldown > 0}
                  className="text-accent-bright hover:underline disabled:text-muted disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
