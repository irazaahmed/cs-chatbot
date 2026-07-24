import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant/current";
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
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tenant } = await getCurrentTenant();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <aside className="w-56 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
        <p className="mb-4 truncate font-semibold text-black dark:text-zinc-50">{tenant.name}</p>
        <nav className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <button type="submit" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">
        {!tenant.verified && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Your domain isn&apos;t verified yet. Visit the{" "}
            <Link href="/install" className="underline">
              Install
            </Link>{" "}
            tab to finish setup — nothing gets crawled until then.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
