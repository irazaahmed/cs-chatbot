import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant/current";
import { checkIsAdmin } from "@/lib/admin/current";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const TABS = [
  { href: "/playground", label: "Playground" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/customize", label: "Customize" },
  { href: "/whatsapp", label: "WhatsApp" },
  { href: "/install", label: "Website" },
  { href: "/conversations", label: "Conversations" },
  { href: "/unanswered", label: "Unanswered" },
  { href: "/leads", label: "Leads" },
  { href: "/appointments", label: "Appointments" },
  { href: "/usage", label: "Usage" },
  { href: "/billing", label: "Billing" },
];

function trialDaysLeft(periodEnd: Date, now: Date): number {
  return Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tenant } = await getCurrentTenant();
  const isAdmin = await checkIsAdmin();
  const now = new Date();

  return (
    <div className="relative flex min-h-screen lg:h-screen lg:overflow-hidden">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-30" />
        <div className="glow-orb animate-float-slow absolute right-[-14%] top-[-12%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_9%,transparent)]" />
      </div>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><text x="12.5" y="11.5" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none" fontSize="8.2" fontWeight="700" letterSpacing="-0.3" style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}>CS</text>
            </svg>
          </span>
          <p className="min-w-0 flex-1 truncate font-heading font-semibold tracking-tight">{tenant.name}</p>
          <ThemeToggle />
        </div>

        <nav className="flex flex-col gap-1 border-t border-border pt-4">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-accent/10 hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {isAdmin && (
          <Link
            href="/admin"
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-accent-bright transition-colors hover:bg-accent/15"
          >
            Admin
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        )}

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-auto pt-6"
        >
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            Sign out
          </button>
        </form>

        <a
          href="https://www.cybrumsolutions.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 px-3 text-[11px] text-muted transition-colors hover:text-accent-bright"
        >
          by Cybrum Solutions
        </a>
      </aside>

      {/* Mobile / tablet top bar: horizontal scrollable nav instead of the fixed sidebar */}
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="min-w-0 flex-1 truncate font-heading text-sm font-semibold tracking-tight">{tenant.name}</p>
          <div className="flex shrink-0 items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="text-xs font-medium text-accent-bright">
                Admin
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
        <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 py-3">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="shrink-0"
          >
            <button
              type="submit"
              className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>

      <main className="min-w-0 flex-1 p-6 pt-[7.5rem] sm:p-8 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:pt-8">
        {!tenant.verified && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm text-warning-text">
            Your domain isn&apos;t verified yet. Visit the{" "}
            <Link href="/install" className="font-medium underline underline-offset-2">
              Website
            </Link>{" "}
            tab to finish setup. Nothing gets crawled until then.
          </div>
        )}
        {tenant.status === "trialing" && tenant.periodEnd && (
          <div className="mb-6 rounded-2xl border border-border bg-surface/60 px-5 py-3.5 text-sm text-muted">
            {(() => {
              const daysLeft = trialDaysLeft(tenant.periodEnd, now);
              const when = daysLeft <= 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
              return (
                <>
                  Your free trial ends {when} ({tenant.periodEnd.toLocaleDateString()}). Visit{" "}
                  <Link href="/billing" className="font-medium text-foreground underline underline-offset-2">
                    Billing
                  </Link>{" "}
                  to pick a plan and keep your chatbot running.
                </>
              );
            })()}
          </div>
        )}
        {tenant.status === "past_due" && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm text-warning-text">
            Your payment is past due. Your chatbot still works, but visit{" "}
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Billing
            </Link>{" "}
            to keep it that way.
          </div>
        )}
        {(tenant.status === "suspended" || tenant.status === "canceled") && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-sm text-danger-text">
            Your chatbot is currently {tenant.status === "canceled" ? "canceled" : "suspended"} and
            not responding to visitors. Visit{" "}
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Billing
            </Link>{" "}
            to restore it.
          </div>
        )}
        {tenant.whatsappStatus === "past_due" && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm text-warning-text">
            Your WhatsApp add-on payment is past due. WhatsApp still works, but visit{" "}
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Billing
            </Link>{" "}
            to keep it that way.
          </div>
        )}
        {tenant.whatsappStatus === "suspended" && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-sm text-danger-text">
            Your WhatsApp add-on is currently suspended and not responding to messages. Visit{" "}
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Billing
            </Link>{" "}
            to restore it.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
