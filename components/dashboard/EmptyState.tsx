import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { Button } from "./Button";
import { IconTile } from "./IconTile";

/** "No X yet" message. `bordered` (default) is a self-contained Card;
 * pass `bordered={false}` when nesting inside a wrapper that already
 * supplies the card chrome (e.g. Knowledge's shared table wrapper).
 * `action` renders an optional outline button/link below the message.
 * `icon` renders an optional IconTile above the message, centered. */
export function EmptyState({
  children,
  bordered = true,
  action,
  icon,
}: {
  children: ReactNode;
  bordered?: boolean;
  action?: { href: string; label: string };
  icon?: ReactNode;
}) {
  const body = (
    <div className={icon ? "text-center" : undefined}>
      {icon && (
        <div className="mb-3 flex justify-center">
          <IconTile icon={icon} tone="accent" />
        </div>
      )}
      <p className="text-sm text-muted">{children}</p>
      {action && (
        <Link href={action.href} className="mt-3 inline-block">
          <Button variant="outline" type="button">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
  return bordered ? <Card>{body}</Card> : <div className="p-6">{body}</div>;
}
