import { getPlanOptions, whatsappAddonPrice, formatPages } from "@/lib/billing/plans";

/**
 * Shared PKR pricing table for the "[competitor] alternative" comparison
 * pages (chatbase-alternative, tidio-alternative, intercom-alternative).
 * Pulls straight from lib/billing/plans.ts, the single source of truth, so
 * these landing pages can never drift from the real /pricing numbers.
 */
export function AlternativePricingTable() {
  const plans = getPlanOptions();
  const whatsappBundleMonthly = whatsappAddonPrice("monthly", true);
  const whatsappStandaloneMonthly = whatsappAddonPrice("monthly", false);

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-card/60 text-left">
              <th className="px-4 py-3 font-heading font-semibold">Plan</th>
              <th className="px-4 py-3 font-heading font-semibold">Price</th>
              <th className="px-4 py-3 font-heading font-semibold">Pages learned</th>
              <th className="px-4 py-3 font-heading font-semibold">Conversations/month</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  {plan.label}
                  {plan.mostPopular && (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-bright">
                      Most popular
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">Rs {plan.prices.monthly.toLocaleString()}/mo</td>
                <td className="px-4 py-3 text-muted">{formatPages(plan.pageCap)}</td>
                <td className="px-4 py-3 text-muted">{plan.conversationCap.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Add WhatsApp to any plan for <b className="text-foreground">Rs {whatsappBundleMonthly.toLocaleString()}/mo</b>,
        or get WhatsApp only for <b className="text-foreground">Rs {whatsappStandaloneMonthly.toLocaleString()}/mo</b>.
      </p>
    </div>
  );
}
