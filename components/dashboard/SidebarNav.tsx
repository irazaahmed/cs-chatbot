"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./cx";
import {
  HomeIcon,
  FlaskIcon,
  BookIcon,
  SlidersIcon,
  GlobeIcon,
  MessageCircleIcon,
  CameraIcon,
  MessageSquareIcon,
  QuestionCircleIcon,
  UserPlusIcon,
  CalendarIcon,
  BarChartIcon,
  CreditCardIcon,
  GearIcon,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const HOME_ITEM: NavItem = { href: "/home", label: "Home", icon: HomeIcon };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Build",
    items: [
      { href: "/playground", label: "Playground", icon: FlaskIcon },
      { href: "/knowledge", label: "Knowledge", icon: BookIcon },
      { href: "/customize", label: "Customize", icon: SlidersIcon },
    ],
  },
  {
    label: "Channels",
    items: [
      { href: "/install", label: "Website", icon: GlobeIcon },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircleIcon },
      { href: "/instagram", label: "Instagram", icon: CameraIcon },
    ],
  },
  {
    label: "Activity",
    items: [
      { href: "/conversations", label: "Conversations", icon: MessageSquareIcon },
      { href: "/unanswered", label: "Unanswered", icon: QuestionCircleIcon },
      { href: "/leads", label: "Leads", icon: UserPlusIcon },
      { href: "/appointments", label: "Appointments", icon: CalendarIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/usage", label: "Usage", icon: BarChartIcon },
      { href: "/billing", label: "Billing", icon: CreditCardIcon },
      { href: "/settings", label: "Settings", icon: GearIcon },
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
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent-bright"
                  : "border-border text-muted hover:border-accent hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
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
          "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors",
          pathname === HOME_ITEM.href
            ? "border-l-accent bg-accent/10 text-foreground"
            : "border-l-transparent text-muted hover:bg-accent/10 hover:text-foreground"
        )}
      >
        <HomeIcon className="h-4 w-4 shrink-0" />
        {HOME_ITEM.label}
      </Link>
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted/70">{group.label}</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-l-accent bg-accent/10 text-foreground"
                      : "border-l-transparent text-muted hover:bg-accent/10 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
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
