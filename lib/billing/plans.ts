// Single source of truth for the three plans a tenant can be on and the three
// billing cycles each is sold in. The pricing page, the dashboard billing
// picker, the admin approval flow, and the cap-enforcement in the chat API all
// read from here so a plan's price, caps, and features never drift apart.
//
// Nothing else in the billing layer defines caps or prices — status.ts imports
// its caps from here, so this file must not import from status.ts (no cycle).

export const PLAN_IDS = ["starter", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Page cap for the Business plan — effectively unlimited, shown as "Unlimited". */
export const UNLIMITED_PAGE_CAP = 100_000;

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
  yearly: { id: "yearly", label: "Yearly", months: 12, saveLabel: "Save 20% — 2 months free" },
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
      "Email notifications",
      "Monthly usage report",
    ],
    prices: { monthly: 3500, quarterly: 9450, yearly: 33600 },
  },
  pro: {
    label: "Pro",
    mostPopular: true,
    pageCap: 500,
    conversationCap: 800,
    features: [
      "Everything in Starter",
      "Lead export to Google Sheet / CRM",
      'Remove the "Powered by Cybrum" branding',
      "Priority email support",
    ],
    prices: { monthly: 9000, quarterly: 24300, yearly: 86400 },
  },
  business: {
    label: "Business",
    mostPopular: false,
    pageCap: UNLIMITED_PAGE_CAP,
    conversationCap: 3000,
    features: [
      "Everything in Pro",
      "Full custom branding",
      "Priority support",
      "Multiple team members",
    ],
    prices: { monthly: 24000, quarterly: 64800, yearly: 230400 },
  },
};

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
