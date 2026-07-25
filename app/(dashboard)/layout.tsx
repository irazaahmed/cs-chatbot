import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant/current";
import { checkIsAdmin } from "@/lib/admin/current";
import { signOut } from "@/auth";

const TABS = [
  { href: "/playground", label: "Playground" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/customize", label: "Customize" },
  { href: "/conversations", label: "Conversations" },
  { href: "/unanswered", label: "Unanswered" },
  { href: "/leads", label: "Leads" },
  { href: "/install", label: "Install" },
  { href: "/usage", label: "Usage" },
  { href: "/billing", label: "Billing" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tenant } = await getCurrentTenant();
  const isAdmin = await checkIsAdmin();

  return (
    <div className="relative flex min-h-screen">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-30" />
        <div className="glow-orb animate-float-slow absolute right-[-14%] top-[-12%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_9%,transparent)]" />
      </div>

      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface/40 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          <p className="truncate font-heading font-semibold tracking-tight">{tenant.name}</p>
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

      <main className="min-w-0 flex-1 p-6 sm:p-8">
        {!tenant.verified && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm text-amber-200">
            Your domain isn&apos;t verified yet. Visit the{" "}
            <Link href="/install" className="font-medium underline underline-offset-2">
              Install
            </Link>{" "}
            tab to finish setup — nothing gets crawled until then.
          </div>
        )}
        {tenant.status === "past_due" && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm text-amber-200">
            Your payment is past due. Your chatbot still works, but visit{" "}
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Billing
            </Link>{" "}
            to keep it that way.
          </div>
        )}
        {(tenant.status === "suspended" || tenant.status === "canceled") && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-sm text-red-300">
            Your chatbot is currently {tenant.status === "canceled" ? "canceled" : "suspended"} and
            not responding to visitors. Visit{" "}
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
