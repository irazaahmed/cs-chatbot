"use client";

import { useState } from "react";
import type { PlanOption, BillingCycle } from "@/lib/billing/plans";
import { BILLING_CYCLES, CYCLE_META, formatPages } from "@/lib/billing/plans";

/**
 * Interactive pricing cards with a Monthly / Quarterly / Yearly toggle. Prices
 * are resolved on the server (env-overridable) and passed in as props, so no
 * price is hardcoded here — the client only switches which cycle is shown.
 */
export function PricingCards({ plans }: { plans: PlanOption[] }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div>
      {/* Billing-cycle toggle */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-surface/60 p-1 backdrop-blur-sm">
          {BILLING_CYCLES.map((c) => {
            const active = cycle === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-white shadow-[0_0_20px_-6px_var(--color-accent)]" : "text-muted hover:text-foreground"
                }`}
              >
                {CYCLE_META[c].label}
                {CYCLE_META[c].saveLabel && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      active ? "bg-white/20 text-white" : "bg-accent/15 text-accent-bright"
                    }`}
                  >
                    {c === "quarterly" ? "Save 10%" : "Save 20%"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {cycle === "yearly" && (
        <p className="mt-3 text-center text-xs font-medium text-accent-bright">
          Save 20% — 2 months free
        </p>
      )}

      {/* Cards */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex h-full flex-col rounded-3xl border p-7 backdrop-blur-sm transition-colors ${
              plan.mostPopular
                ? "border-accent/60 bg-accent/[0.07] shadow-[0_0_40px_-12px_var(--color-accent)]"
                : "border-border bg-card/60"
            }`}
          >
            {plan.mostPopular && (
              <span className="mb-3 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-bright">
                Most Popular
              </span>
            )}
            <h3 className="font-heading text-lg font-semibold tracking-tight">{plan.label}</h3>

            <p className="mt-3">
              <span className="font-heading text-3xl font-semibold tabular-nums">
                Rs {plan.prices[cycle].toLocaleString()}
              </span>
              <span className="text-sm text-muted"> / {CYCLE_META[cycle].label.toLowerCase()}</span>
            </p>

            <div className="mt-5 space-y-1.5 text-sm">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Dot /> {formatPages(plan.pageCap)} learned
              </p>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Dot /> {plan.conversationCap.toLocaleString()} conversations / month
              </p>
            </div>

            <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-border pt-5 text-sm text-muted">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check /> {f}
                </li>
              ))}
            </ul>

            <a
              href="/login"
              className={`mt-7 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                plan.mostPopular
                  ? "bg-accent text-white hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]"
                  : "border border-border bg-surface/60 text-foreground hover:border-accent"
              }`}
            >
              Get started
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright" />;
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-0.5 shrink-0 text-accent-bright"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
