import { planMessageCap, planPageCap } from "@/lib/billing/status";
import { planPricePKR } from "@/lib/billing/instructions";

// Single source of truth for the three plans a tenant can be on (CLAUDE.md
// section 6). Billing UI and the admin approval flow both read this so a
// tenant's chosen plan, its price, and its caps never drift apart.
export const PLAN_IDS = ["starter", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const PLAN_LABELS: Record<PlanId, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

export interface PlanOption {
  id: PlanId;
  label: string;
  pricePKR: number;
  pageCap: number;
  messageCap: number;
}

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function getPlanOptions(): PlanOption[] {
  return PLAN_IDS.map((id) => ({
    id,
    label: PLAN_LABELS[id],
    pricePKR: planPricePKR(id),
    pageCap: planPageCap(id),
    messageCap: planMessageCap(id),
  }));
}
