"use client";

import { useState } from "react";
import type { PlanOption, BillingCycle } from "@/lib/billing/plans";
import { BILLING_CYCLES, CYCLE_META, formatPages } from "@/lib/billing/plans";
import type { PaymentInstructions } from "@/lib/billing/instructions";
import { submitPayment } from "@/lib/billing/actions";
import { Card } from "@/components/dashboard/Card";
import { Input } from "@/components/dashboard/Input";
import { Select } from "@/components/dashboard/Select";
import { Label } from "@/components/dashboard/Label";
import { Checkbox } from "@/components/dashboard/Checkbox";
import { Button } from "@/components/dashboard/Button";

type Mode = "plan" | "whatsapp_only" | "instagram_only";

export function PlanPicker({
  plans,
  defaultPlanId,
  invoiceRef,
  instructions,
  websiteEnabled,
  whatsappEnabled,
  whatsappBundlePrices,
  whatsappStandaloneModePrices,
  whatsappDefaultChecked,
  instagramEnabled,
  instagramBundlePrices,
  instagramStandaloneModePrices,
  instagramDefaultChecked,
}: {
  plans: PlanOption[];
  defaultPlanId: string;
  invoiceRef: string;
  instructions: PaymentInstructions;
  websiteEnabled: boolean;
  whatsappEnabled: boolean;
  /** Rate for the "Add WhatsApp" checkbox inside plan mode: always the bundle rate. */
  whatsappBundlePrices: Record<BillingCycle, number>;
  /** Rate for whatsapp_only mode, pre-resolved server-side from the tenant's current status. */
  whatsappStandaloneModePrices: Record<BillingCycle, number>;
  whatsappDefaultChecked: boolean;
  instagramEnabled: boolean;
  /** Same role as whatsappBundlePrices, for the "Add Instagram" checkbox. */
  instagramBundlePrices: Record<BillingCycle, number>;
  /** Same role as whatsappStandaloneModePrices, for instagram_only mode. */
  instagramStandaloneModePrices: Record<BillingCycle, number>;
  instagramDefaultChecked: boolean;
}) {
  const initial = plans.find((p) => p.id === defaultPlanId) ?? plans[0];
  // More than one channel toggled on: let the tenant switch between paying
  // for the website plan (with WhatsApp or Instagram optionally bundled in,
  // not both — one add-on per payment for now) or a single channel alone.
  // Only one channel on: skip the switcher, there's only one thing to buy.
  const enabledCount = Number(websiteEnabled) + Number(whatsappEnabled) + Number(instagramEnabled);
  const showModeSwitcher = enabledCount > 1;
  const [mode, setMode] = useState<Mode>(
    websiteEnabled ? "plan" : whatsappEnabled ? "whatsapp_only" : "instagram_only"
  );
  const [planId, setPlanId] = useState(initial.id);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [includeWhatsapp, setIncludeWhatsapp] = useState(whatsappEnabled && whatsappDefaultChecked);
  const [includeInstagram, setIncludeInstagram] = useState(
    !whatsappDefaultChecked && instagramEnabled && instagramDefaultChecked
  );

  const plan = plans.find((p) => p.id === planId) ?? initial;
  const amountPKR =
    mode === "whatsapp_only"
      ? whatsappStandaloneModePrices[cycle]
      : mode === "instagram_only"
        ? instagramStandaloneModePrices[cycle]
        : plan.prices[cycle] +
          (includeWhatsapp ? whatsappBundlePrices[cycle] : includeInstagram ? instagramBundlePrices[cycle] : 0);

  function selectPlan(nextPlan: PlanOption, nextCycle: BillingCycle) {
    setPlanId(nextPlan.id);
    setCycle(nextCycle);
  }

  // Only one add-on per payment for now — checking one clears the other.
  function toggleWhatsapp(checked: boolean) {
    setIncludeWhatsapp(checked);
    if (checked) setIncludeInstagram(false);
  }
  function toggleInstagram(checked: boolean) {
    setIncludeInstagram(checked);
    if (checked) setIncludeWhatsapp(false);
  }

  return (
    <Card radius="3xl" padding="lg" className="mt-6">
      {showModeSwitcher && (
        <div className="mb-5 inline-flex rounded-full border border-border bg-surface/60 p-1 text-sm font-medium">
          {websiteEnabled && (
            <button
              type="button"
              onClick={() => setMode("plan")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === "plan" ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              Website plan
            </button>
          )}
          {whatsappEnabled && (
            <button
              type="button"
              onClick={() => setMode("whatsapp_only")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === "whatsapp_only" ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              WhatsApp only
            </button>
          )}
          {instagramEnabled && (
            <button
              type="button"
              onClick={() => setMode("instagram_only")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === "instagram_only" ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              Instagram only
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {mode === "whatsapp_only"
            ? "WhatsApp, no website plan"
            : mode === "instagram_only"
              ? "Instagram, no website plan"
              : "Choose a plan"}
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
      ) : mode === "instagram_only" ? (
        <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/[0.07] p-5">
          <p className="font-heading text-lg font-semibold tabular-nums text-accent-bright">
            Rs {instagramStandaloneModePrices[cycle].toLocaleString()}
            <span className="text-sm font-normal text-muted"> /{CYCLE_META[cycle].label.toLowerCase()}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Instagram only, no website widget or website plan. Up to 5,000 conversations a month on
            your own Instagram professional account.
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
              <Checkbox checked={includeWhatsapp} onChange={(e) => toggleWhatsapp(e.target.checked)} />
              <span className="flex-1">
                <span className="font-medium text-foreground">Add WhatsApp</span>{" "}
                <span className="text-muted">
                  Rs {whatsappBundlePrices[cycle].toLocaleString()}/{CYCLE_META[cycle].label.toLowerCase()}
                </span>
              </span>
            </label>
          )}

          {instagramEnabled && (
            <label className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm">
              <Checkbox checked={includeInstagram} onChange={(e) => toggleInstagram(e.target.checked)} />
              <span className="flex-1">
                <span className="font-medium text-foreground">Add Instagram</span>{" "}
                <span className="text-muted">
                  Rs {instagramBundlePrices[cycle].toLocaleString()}/{CYCLE_META[cycle].label.toLowerCase()}
                </span>
              </span>
            </label>
          )}

          {whatsappEnabled && instagramEnabled && (
            <p className="mt-2 text-xs text-muted">Only one add-on channel per payment for now.</p>
          )}
        </>
      )}

      <h2 className="mt-6 font-heading text-lg font-semibold tracking-tight">
        Pay Rs {amountPKR.toLocaleString()} for{" "}
        {mode === "whatsapp_only"
          ? "WhatsApp"
          : mode === "instagram_only"
            ? "Instagram"
            : `the ${plan.label} plan${includeWhatsapp ? " + WhatsApp" : includeInstagram ? " + Instagram" : ""}`}
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
        <div className="rounded-xl bg-surface/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">Bank transfer</dt>
          <dd className="mt-2 flex flex-col gap-2">
            <span className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">Bank</span>
              <span className="font-medium">{instructions.bankName}</span>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">Account title</span>
              <span className="font-medium">{instructions.bankAccountTitle}</span>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">Account number</span>
              <span className="font-medium tabular-nums">{instructions.bankAccountNumber}</span>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">IBAN</span>
              <span className="font-medium tabular-nums">{instructions.bankIban}</span>
            </span>
          </dd>
        </div>
      </dl>

      <form action={submitPayment} className="mt-6 space-y-4 border-t border-border pt-5">
        <input type="hidden" name="invoiceRef" value={invoiceRef} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="billingCycle" value={cycle} />
        <input type="hidden" name="includeWhatsapp" value={includeWhatsapp ? "on" : "off"} />
        <input type="hidden" name="includeInstagram" value={includeInstagram ? "on" : "off"} />

        <div>
          <Label htmlFor="method">Paid via</Label>
          <Select id="method" name="method">
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="bank">Bank transfer</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="senderName">Sender name</Label>
          <Input id="senderName" name="senderName" required />
        </div>

        <div>
          <Label htmlFor="amountPKR">Amount to pay (PKR)</Label>
          <Input
            id="amountPKR"
            type="text"
            value={`Rs ${amountPKR.toLocaleString()}`}
            readOnly
            disabled
            className="cursor-not-allowed opacity-80"
          />
          <p className="mt-1 text-xs text-muted">
            {mode === "whatsapp_only"
              ? "Set by the WhatsApp-only rate, not editable."
              : mode === "instagram_only"
                ? "Set by the Instagram-only rate, not editable."
                : `Set by the ${plan.label} ${CYCLE_META[cycle].label.toLowerCase()} plan${includeWhatsapp ? " plus WhatsApp" : includeInstagram ? " plus Instagram" : ""}, not editable.`}
          </p>
        </div>

        <div>
          <Label htmlFor="screenshot">Payment screenshot</Label>
          <input
            id="screenshot"
            name="screenshot"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="mt-1.5 w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-bright hover:file:bg-accent/25"
          />
        </div>

        <Button variant="primary">Submit payment</Button>
      </form>
    </Card>
  );
}
