// Single source of truth for the three plans a tenant can be on and the three
// billing cycles each is sold in. The pricing page, the dashboard billing
// picker, the admin approval flow, and the cap-enforcement in the chat API all
// read from here so a plan's price, caps, and features never drift apart.
//
// Nothing else in the billing layer defines caps or prices. status.ts imports
// its caps from here, so this file must not import from status.ts (no cycle).

export const PLAN_IDS = ["starter", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Page cap for the Business plan, effectively unlimited, shown as "Unlimited". */
export const UNLIMITED_PAGE_CAP = 100_000;

/** Free trial length granted at signup, see app/onboarding/page.tsx. */
export const TRIAL_DAYS = 3;

export interface CycleMeta {
  id: BillingCycle;
  label: string;
  months: number;
  /** Marketing badge shown on the cycle toggle; null for the monthly base. */
  saveLabel: string | null;
}

export const CYCLE_META: Record<BillingCycle, CycleMeta> = {
  monthly: { id: "monthly", label: "Monthly", months: 1, saveLabel: null },
  quarterly: { id: "quarterly", label: "Quarterly", months: 3, saveLabel: "Save 10%" },
  yearly: { id: "yearly", label: "Yearly", months: 12, saveLabel: "Save 20%, 2 months free" },
};

interface PlanDef {
  label: string;
  mostPopular: boolean;
  pageCap: number;
  conversationCap: number;
  features: string[];
  // Monthly base plus the discounted quarterly (10% off 3 months) and yearly
  // (20% off 12 months) prices, precomputed. Env vars can override any of them.
  prices: Record<BillingCycle, number>;
}

const PLAN_DEFS: Record<PlanId, PlanDef> = {
  starter: {
    label: "Starter",
    mostPopular: false,
    pageCap: 100,
    conversationCap: 200,
    features: [
      "The full product & website widget",
      "Lead capture into your dashboard",
      "Appointment requests from chat",
      "Real-time usage dashboard",
    ],
    prices: { monthly: 3499, quarterly: 9447, yearly: 33590 },
  },
  pro: {
    label: "Pro",
    mostPopular: true,
    pageCap: 500,
    conversationCap: 800,
    features: [
      "Everything in Starter",
      "PDF upload as a knowledge source",
      'Remove the "Powered by Cybrum Solutions" branding',
      "Priority email support",
    ],
    prices: { monthly: 8999, quarterly: 24297, yearly: 86390 },
  },
  business: {
    label: "Business",
    mostPopular: false,
    pageCap: UNLIMITED_PAGE_CAP,
    conversationCap: 3000,
    features: [
      "Everything in Pro",
      "Highest page & conversation caps",
      "Priority support",
    ],
    prices: { monthly: 23999, quarterly: 64797, yearly: 230390 },
  },
};

// WhatsApp has two rates: "standalone" for a tenant with no active website
// plan, "bundle" (cheaper) when it's paid alongside an active/being-purchased
// website plan — an upsell incentive for buying both channels, not a
// permission gate (either channel can be turned on and paid for on its own).
// Both are sold through the one combined checkout in
// lib/billing/actions.ts#submitPayment — bundle when the plan portion is
// included in the same payment or the tenant already has an active plan,
// standalone otherwise.
const WHATSAPP_STANDALONE_PRICES: Record<BillingCycle, number> = {
  monthly: 4999,
  quarterly: 13497,
  yearly: 47990,
};

const WHATSAPP_BUNDLE_PRICES: Record<BillingCycle, number> = {
  monthly: 4499,
  quarterly: 12147,
  yearly: 43190,
};

/** WhatsApp conversations get their own monthly cap, tracked separately from
 * the website widget's plan-based cap (see channel-scoped usage in
 * lib/billing/status.ts). Deliberately high rather than truly unlimited, so
 * a real business never notices it while abuse still has a ceiling. */
export const WHATSAPP_CONVERSATION_CAP = 5000;

/** hasWebsitePlan should be true when this payment also includes a website
 * plan, or the tenant already has one active. */
export function whatsappAddonPrice(cycle: BillingCycle, hasWebsitePlan: boolean): number {
  const table = hasWebsitePlan ? WHATSAPP_BUNDLE_PRICES : WHATSAPP_STANDALONE_PRICES;
  const keyPrefix = hasWebsitePlan ? "WHATSAPP_BUNDLE" : "WHATSAPP_STANDALONE";
  const key = `PLAN_PRICE_PKR_${keyPrefix}_${cycle.toUpperCase()}`;
  const fromEnv = process.env[key];
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return table[cycle];
}

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function isBillingCycle(value: string): value is BillingCycle {
  return (BILLING_CYCLES as readonly string[]).includes(value);
}

/**
 * Resolve a plan+cycle price. Env wins so prices can change without a deploy
 * (CLAUDE.md: no hardcoded prices in components); the compiled-in numbers above
 * are the fallback. Env key shape: PLAN_PRICE_PKR_STARTER_MONTHLY.
 */
export function planPrice(planId: PlanId, cycle: BillingCycle): number {
  const key = `PLAN_PRICE_PKR_${planId.toUpperCase()}_${cycle.toUpperCase()}`;
  const fromEnv = process.env[key];
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return PLAN_DEFS[planId].prices[cycle];
}

export function planPageCap(planId: string): number {
  return (PLAN_DEFS[planId as PlanId] ?? PLAN_DEFS.starter).pageCap;
}

export function planConversationCap(planId: string): number {
  return (PLAN_DEFS[planId as PlanId] ?? PLAN_DEFS.starter).conversationCap;
}

export function planLabel(planId: string): string {
  return (PLAN_DEFS[planId as PlanId] ?? PLAN_DEFS.starter).label;
}

export function cycleMonths(cycle: BillingCycle): number {
  return CYCLE_META[cycle].months;
}

/** Calendar-month arithmetic for period extension: +1 / +3 / +12 months. */
export function addMonths(from: Date, months: number): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function formatPages(cap: number): string {
  return cap >= UNLIMITED_PAGE_CAP ? "Unlimited pages" : `${cap.toLocaleString()} pages`;
}

export interface PlanOption {
  id: PlanId;
  label: string;
  mostPopular: boolean;
  pageCap: number;
  conversationCap: number;
  features: string[];
  /** All three cycle prices, env-resolved, ready for the client toggle. */
  prices: Record<BillingCycle, number>;
}

export function getPlanOptions(): PlanOption[] {
  return PLAN_IDS.map((id) => {
    const def = PLAN_DEFS[id];
    return {
      id,
      label: def.label,
      mostPopular: def.mostPopular,
      pageCap: def.pageCap,
      conversationCap: def.conversationCap,
      features: def.features,
      prices: {
        monthly: planPrice(id, "monthly"),
        quarterly: planPrice(id, "quarterly"),
        yearly: planPrice(id, "yearly"),
      },
    };
  });
}
