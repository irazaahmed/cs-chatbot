"use client";

import { useState } from "react";
import type { PlanOption, BillingCycle } from "@/lib/billing/plans";
import { BILLING_CYCLES, CYCLE_META, formatPages } from "@/lib/billing/plans";
import type { PaymentInstructions } from "@/lib/billing/instructions";
import { submitPayment } from "@/lib/billing/actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

type Mode = "plan" | "whatsapp_only";

export function PlanPicker({
  plans,
  defaultPlanId,
  invoiceRef,
  instructions,
  whatsappEnabled,
  whatsappBundlePrices,
  whatsappStandaloneModePrices,
  whatsappDefaultChecked,
}: {
  plans: PlanOption[];
  defaultPlanId: string;
  invoiceRef: string;
  instructions: PaymentInstructions;
  whatsappEnabled: boolean;
  /** Rate for the "Add WhatsApp" checkbox inside plan mode: always the bundle rate. */
  whatsappBundlePrices: Record<BillingCycle, number>;
  /** Rate for whatsapp_only mode, pre-resolved server-side from the tenant's current status. */
  whatsappStandaloneModePrices: Record<BillingCycle, number>;
  whatsappDefaultChecked: boolean;
}) {
  const initial = plans.find((p) => p.id === defaultPlanId) ?? plans[0];
  const [mode, setMode] = useState<Mode>("plan");
  const [planId, setPlanId] = useState(initial.id);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [includeWhatsapp, setIncludeWhatsapp] = useState(whatsappEnabled && whatsappDefaultChecked);

  const plan = plans.find((p) => p.id === planId) ?? initial;
  const amountPKR =
    mode === "whatsapp_only"
      ? whatsappStandaloneModePrices[cycle]
      : plan.prices[cycle] + (includeWhatsapp ? whatsappBundlePrices[cycle] : 0);

  function selectPlan(nextPlan: PlanOption, nextCycle: BillingCycle) {
    setPlanId(nextPlan.id);
    setCycle(nextCycle);
  }

  return (
    <div className="glass mt-6 rounded-3xl p-7">
      {whatsappEnabled && (
        <div className="mb-5 inline-flex rounded-full border border-border bg-surface/60 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("plan")}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              mode === "plan" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Website plan
          </button>
          <button
            type="button"
            onClick={() => setMode("whatsapp_only")}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              mode === "whatsapp_only" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            WhatsApp only
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {mode === "whatsapp_only" ? "WhatsApp, no website plan" : "Choose a plan"}
        </h2>
        <div className="inline-flex rounded-full border border-border bg-surface/60 p-1 text-xs font-medium">
          {BILLING_CYCLES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => selectPlan(plan, c)}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                cycle === c ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {CYCLE_META[c].label}
            </button>
          ))}
        </div>
      </div>

      {mode === "whatsapp_only" ? (
        <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/[0.07] p-5">
          <p className="font-heading text-lg font-semibold tabular-nums text-accent-bright">
            Rs {whatsappStandaloneModePrices[cycle].toLocaleString()}
            <span className="text-sm font-normal text-muted"> /{CYCLE_META[cycle].label.toLowerCase()}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            WhatsApp only, no website widget or website plan. Up to 5,000 conversations a month on
            your own WhatsApp Business number.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {plans.map((p) => {
              const active = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p, cycle)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    active
                      ? "border-accent bg-accent/10 shadow-[0_0_0_1px_var(--color-accent)]"
                      : "border-border bg-surface/60 hover:border-accent/50"
                  }`}
                >
                  <p className="font-heading font-semibold capitalize">{p.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-accent-bright">
                    Rs {p.prices[cycle].toLocaleString()}
                    <span className="text-xs font-normal text-muted"> /{CYCLE_META[cycle].label.toLowerCase()}</span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {formatPages(p.pageCap)} · {p.conversationCap.toLocaleString()} conversations/mo
                  </p>
                </button>
              );
            })}
          </div>

          {whatsappEnabled && (
            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={includeWhatsapp}
                onChange={(e) => setIncludeWhatsapp(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              <span className="flex-1">
                <span className="font-medium text-foreground">Add WhatsApp</span>{" "}
                <span className="text-muted">
                  Rs {whatsappBundlePrices[cycle].toLocaleString()}/{CYCLE_META[cycle].label.toLowerCase()}
                </span>
              </span>
            </label>
          )}
        </>
      )}

      <h2 className="mt-6 font-heading text-lg font-semibold tracking-tight">
        Pay Rs {amountPKR.toLocaleString()} for{" "}
        {mode === "whatsapp_only" ? "WhatsApp" : `the ${plan.label} plan${includeWhatsapp ? " + WhatsApp" : ""}`}
        <span className="text-sm font-normal text-muted"> ({CYCLE_META[cycle].label.toLowerCase()})</span>
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        Put this reference in your transaction remarks:{" "}
        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-sm font-medium text-accent-bright">
          {invoiceRef}
        </span>
      </p>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between rounded-xl bg-surface/60 px-4 py-2.5">
          <dt className="text-muted">JazzCash</dt>
          <dd className="font-medium tabular-nums">{instructions.jazzCash}</dd>
        </div>
        <div className="flex justify-between rounded-xl bg-surface/60 px-4 py-2.5">
          <dt className="text-muted">EasyPaisa</dt>
          <dd className="font-medium tabular-nums">{instructions.easyPaisa}</dd>
        </div>
        <div className="flex justify-between gap-6 rounded-xl bg-surface/60 px-4 py-2.5">
          <dt className="text-muted">Bank</dt>
          <dd className="text-right font-medium">
            {instructions.bankName}
            <br />
            {instructions.bankAccountTitle}, {instructions.bankAccountNumber}
            <br />
            <span className="tabular-nums">{instructions.bankIban}</span>
          </dd>
        </div>
      </dl>

      <form action={submitPayment} className="mt-6 space-y-4 border-t border-border pt-5">
        <input type="hidden" name="invoiceRef" value={invoiceRef} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="billingCycle" value={cycle} />
        <input type="hidden" name="includeWhatsapp" value={includeWhatsapp ? "on" : "off"} />

        <div>
          <label htmlFor="method" className="block text-sm font-medium">Paid via</label>
          <select
            id="method"
            name="method"
            className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none"
          >
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="bank">Bank transfer</option>
          </select>
        </div>

        <div>
          <label htmlFor="senderName" className="block text-sm font-medium">Sender name</label>
          <input id="senderName" name="senderName" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="amountPKR" className="block text-sm font-medium">Amount to pay (PKR)</label>
          <input
            id="amountPKR"
            type="text"
            value={`Rs ${amountPKR.toLocaleString()}`}
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed opacity-80`}
          />
          <p className="mt-1 text-xs text-muted">
            {mode === "whatsapp_only"
              ? "Set by the WhatsApp-only rate, not editable."
              : `Set by the ${plan.label} ${CYCLE_META[cycle].label.toLowerCase()} plan${includeWhatsapp ? " plus the WhatsApp add-on" : ""}, not editable.`}
          </p>
        </div>

        <div>
          <label htmlFor="screenshot" className="block text-sm font-medium">Payment screenshot</label>
          <input
            id="screenshot"
            name="screenshot"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="mt-1.5 w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-bright hover:file:bg-accent/25"
          />
        </div>

        <button
          type="submit"
          className="btn-sheen rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]"
        >
          Submit payment
        </button>
      </form>
    </div>
  );
}
