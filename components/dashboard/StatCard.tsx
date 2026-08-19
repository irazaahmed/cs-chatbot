import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { IconTile } from "./IconTile";

/** A single number tile for the dashboard overview page. Links to the
 * relevant tab when `href` is given, mirroring GlowCard's hover treatment. */
export function StatCard({
  label,
  value,
  href,
  icon,
  tone = "accent",
}: {
  label: string;
  value: number | string;
  href?: string;
  icon: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "instagram";
}) {
  const content = (
    <Card className="transition-colors hover:border-accent/60">
      <IconTile icon={icon} tone={tone} />
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
