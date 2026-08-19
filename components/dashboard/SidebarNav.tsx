"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./cx";

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const HOME_ITEM: NavItem = { href: "/home", label: "Home" };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Build",
    items: [
      { href: "/playground", label: "Playground" },
      { href: "/knowledge", label: "Knowledge" },
      { href: "/customize", label: "Customize" },
    ],
  },
  {
    label: "Channels",
    items: [
      { href: "/install", label: "Website" },
      { href: "/whatsapp", label: "WhatsApp" },
      { href: "/instagram", label: "Instagram" },
    ],
  },
  {
    label: "Activity",
    items: [
      { href: "/conversations", label: "Conversations" },
      { href: "/unanswered", label: "Unanswered" },
      { href: "/leads", label: "Leads" },
      { href: "/appointments", label: "Appointments" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/usage", label: "Usage" },
      { href: "/billing", label: "Billing" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

const FLAT_ITEMS = [HOME_ITEM, ...NAV_GROUPS.flatMap((g) => g.items)];

/** Desktop: grouped vertical list with section headers and an active-item
 * accent bar. Mobile: today's flat horizontal pill strip (group headers
 * don't read well in a horizontal scroll strip), same active-state color. */
export function SidebarNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <>
        {FLAT_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent-bright"
                  : "border-border text-muted hover:border-accent hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <nav className="flex flex-col gap-4 border-t border-border pt-4">
      <Link
        href={HOME_ITEM.href}
        aria-current={pathname === HOME_ITEM.href ? "page" : undefined}
        className={cx(
          "rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors",
          pathname === HOME_ITEM.href
            ? "border-l-accent bg-accent/10 text-foreground"
            : "border-l-transparent text-muted hover:bg-accent/10 hover:text-foreground"
        )}
      >
        {HOME_ITEM.label}
      </Link>
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted/70">{group.label}</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-l-accent bg-accent/10 text-foreground"
                      : "border-l-transparent text-muted hover:bg-accent/10 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
