import Link from "next/link";
import { Card } from "./Card";

/** A single number tile for the dashboard overview page. Links to the
 * relevant tab when `href` is given, mirroring GlowCard's hover treatment. */
export function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <Card className="transition-colors hover:border-accent/60">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-heading text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
