"use client";

import { useState } from "react";
import type { BillingCycle } from "@/lib/billing/plans";
import { BILLING_CYCLES, CYCLE_META } from "@/lib/billing/plans";
import type { PaymentInstructions } from "@/lib/billing/instructions";
import { submitWhatsAppAddonPayment } from "@/lib/billing/actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

export function WhatsAppAddonPicker({
  prices,
  isBundle,
  invoiceRef,
  instructions,
}: {
  prices: Record<BillingCycle, number>;
  isBundle: boolean;
  invoiceRef: string;
  instructions: PaymentInstructions;
}) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const amountPKR = prices[cycle];

  return (
    <div className="glass mt-6 rounded-3xl p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">WhatsApp add-on</h2>
          <p className="mt-1 text-xs text-muted">
            {isBundle
              ? "Bundle rate — you already have an active website plan."
              : "Standalone rate — no active website plan yet."}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-surface/60 p-1 text-xs font-medium">
          {BILLING_CYCLES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                cycle === c ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {CYCLE_META[c].label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="mt-6 font-heading text-lg font-semibold tracking-tight">
        Pay Rs {amountPKR.toLocaleString()} for WhatsApp
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
            {instructions.bankAccountTitle} — {instructions.bankAccountNumber}
            <br />
            <span className="tabular-nums">{instructions.bankIban}</span>
          </dd>
        </div>
      </dl>

      <form action={submitWhatsAppAddonPayment} className="mt-6 space-y-4 border-t border-border pt-5">
        <input type="hidden" name="invoiceRef" value={invoiceRef} />
        <input type="hidden" name="billingCycle" value={cycle} />

        <div>
          <label htmlFor="wa-method" className="block text-sm font-medium">Paid via</label>
          <select
            id="wa-method"
            name="method"
            className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none"
          >
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="bank">Bank transfer</option>
          </select>
        </div>

        <div>
          <label htmlFor="wa-senderName" className="block text-sm font-medium">Sender name</label>
          <input id="wa-senderName" name="senderName" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="wa-amountPKR" className="block text-sm font-medium">Amount to pay (PKR)</label>
          <input
            id="wa-amountPKR"
            type="text"
            value={`Rs ${amountPKR.toLocaleString()}`}
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed opacity-80`}
          />
          <p className="mt-1 text-xs text-muted">
            Set by the {isBundle ? "bundle" : "standalone"} {CYCLE_META[cycle].label.toLowerCase()} rate — not editable.
          </p>
        </div>

        <div>
          <label htmlFor="wa-screenshot" className="block text-sm font-medium">Payment screenshot</label>
          <input
            id="wa-screenshot"
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
