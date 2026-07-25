"use client";

import { useState } from "react";
import type { PlanOption } from "@/lib/billing/plans";
import type { PaymentInstructions } from "@/lib/billing/instructions";
import { submitPayment } from "@/lib/billing/actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

export function PlanPicker({
  plans,
  defaultPlanId,
  invoiceRef,
  instructions,
}: {
  plans: PlanOption[];
  defaultPlanId: string;
  invoiceRef: string;
  instructions: PaymentInstructions;
}) {
  const initial = plans.find((p) => p.id === defaultPlanId) ?? plans[0];
  const [planId, setPlanId] = useState(initial.id);
  const [amountPKR, setAmountPKR] = useState(initial.pricePKR);

  const plan = plans.find((p) => p.id === planId) ?? initial;

  function choosePlan(next: PlanOption) {
    setPlanId(next.id);
    setAmountPKR(next.pricePKR);
  }

  return (
    <div className="glass mt-6 rounded-3xl p-7">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Choose a plan</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const active = p.id === planId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => choosePlan(p)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                active
                  ? "border-accent bg-accent/10 shadow-[0_0_0_1px_var(--color-accent)]"
                  : "border-border bg-surface/60 hover:border-accent/50"
              }`}
            >
              <p className="font-heading font-semibold capitalize">{p.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-accent-bright">
                Rs. {p.pricePKR.toLocaleString()}
                <span className="text-xs font-normal text-muted"> /mo</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {p.pageCap.toLocaleString()} pages · {p.messageCap.toLocaleString()} messages/mo
              </p>
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 font-heading text-lg font-semibold tracking-tight">
        Pay Rs. {plan.pricePKR.toLocaleString()} for the {plan.label} plan
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

      <form action={submitPayment} className="mt-6 space-y-4 border-t border-border pt-5">
        <input type="hidden" name="invoiceRef" value={invoiceRef} />
        <input type="hidden" name="planId" value={planId} />

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
          <label htmlFor="amountPKR" className="block text-sm font-medium">Amount paid (PKR)</label>
          <input
            id="amountPKR"
            name="amountPKR"
            type="number"
            min="1"
            value={amountPKR}
            onChange={(e) => setAmountPKR(Number(e.target.value))}
            required
            className={inputClass}
          />
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
